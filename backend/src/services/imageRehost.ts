import net from 'net';
import dns from 'dns/promises';
import { saveProcessedImage } from './imageStorage';
import {
  collectRemoteImageUrls,
  isHttpUrl,
  isAlreadyLocalUpload,
  parseImagePlans,
  rewriteImagePlanUrls,
  rewriteMarkdownUrls,
  ImageRewriteResult,
} from '../utils/imageUrlUtils';

const DOWNLOAD_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const DOWNLOAD_USER_AGENT =
  'Mozilla/5.0 (compatible; myblog-image-rehost/1.0; +https://blog.news-tracker.work/)';

export type ImageDownloader = (url: string) => Promise<Buffer>;

function isPrivateIpv4(parts: number[]): boolean {
  const a = parts[0];
  const b = parts[1];
  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }
  return false;
}

export function isPrivateIpAddress(address: string): boolean {
  let ip = address.toLowerCase();
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map((n) => Number(n));
    return isPrivateIpv4(parts);
  }

  if (net.isIP(ip) === 6) {
    if (ip === '::' || ip === '::1') {
      return true;
    }
    // Unique local fc00::/7, link-local fe80::/10
    const first = ip.split(':')[0];
    const prefix = parseInt(first || '0', 16);
    if ((prefix & 0xfe00) === 0xfc00) {
      return true;
    }
    if ((prefix & 0xffc0) === 0xfe80) {
      return true;
    }
    return false;
  }

  return true;
}

async function assertPublicHttpUrl(urlString: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('URL host is not allowed');
  }

  const records = await dns.lookup(hostname, { all: true });
  if (records.length === 0) {
    throw new Error('URL host could not be resolved');
  }
  if (records.some((record) => isPrivateIpAddress(record.address))) {
    throw new Error('URL host is not allowed');
  }

  return parsed;
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length') || '0');
  if (declared > maxBytes) {
    throw new Error('Image too large');
  }

  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > maxBytes) {
      throw new Error('Image too large');
    }
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Image too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function downloadRemoteImage(url: string): Promise<Buffer> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'User-Agent': DOWNLOAD_USER_AGENT,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download timed out');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect without Location (${response.status})`);
      }
      current = new URL(location, current).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      throw new Error(`Unsupported content type: ${contentType.split(';')[0]}`);
    }

    return readLimitedBody(response, MAX_IMAGE_BYTES);
  }

  throw new Error('Too many redirects');
}

export async function persistRemoteImageUrl(
  url: string,
  download: ImageDownloader = downloadRemoteImage
): Promise<string> {
  if (!isHttpUrl(url)) {
    throw new Error('Only http(s) URLs are allowed');
  }
  if (isAlreadyLocalUpload(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/uploads')) {
        return parsed.pathname;
      }
    } catch {
      if (url.startsWith('/uploads')) {
        return url;
      }
    }
    return url;
  }

  const buffer = await download(url);
  return saveProcessedImage(buffer);
}

export interface RehostArticleImagesResult {
  content: string;
  imagePlans?: unknown;
  imageRewrites: ImageRewriteResult;
}

export async function rehostArticleImages(
  content: string,
  imagePlans?: unknown,
  download: ImageDownloader = downloadRemoteImage
): Promise<RehostArticleImagesResult> {
  const remoteUrls = collectRemoteImageUrls(content || '', imagePlans);
  const succeeded: ImageRewriteResult['succeeded'] = [];
  const failed: ImageRewriteResult['failed'] = [];
  const replacements = new Map<string, string>();

  const CONCURRENCY = 4;
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= remoteUrls.length) {
        return;
      }
      const url = remoteUrls[index];
      try {
        const localUrl = await persistRemoteImageUrl(url, download);
        replacements.set(url, localUrl);
        succeeded.push({ from: url, to: localUrl });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Download failed';
        failed.push({ url, reason });
      }
    }
  }

  const workers = Math.min(CONCURRENCY, remoteUrls.length);
  if (workers > 0) {
    await Promise.all(Array.from({ length: workers }, () => worker()));
  }

  const rewrittenContent = rewriteMarkdownUrls(content || '', replacements);
  const parsedPlans = parseImagePlans(imagePlans);
  const rewrittenPlans =
    parsedPlans === undefined ? undefined : rewriteImagePlanUrls(parsedPlans, replacements);

  return {
    content: rewrittenContent,
    imagePlans: rewrittenPlans,
    imageRewrites: { succeeded, failed },
  };
}
