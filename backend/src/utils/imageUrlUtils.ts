/**
 * Markdown / imagePlans 中的远程图片 URL 提取、本地判断与改写。
 */

const LOCAL_UPLOAD_HOSTS = new Set([
  'blog.news-tracker.work',
  'www.blog.news-tracker.work',
  'localhost',
  '127.0.0.1',
]);

const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*\]\(\s*<?([^>\s)]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/gi;
const HTML_IMG_SRC_RE = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isAlreadyLocalUpload(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/') || trimmed === '/uploads') {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (parsed.pathname === '/uploads' || parsed.pathname.startsWith('/uploads/')) {
      if (LOCAL_UPLOAD_HOSTS.has(host)) {
        return true;
      }
      const extraHost = process.env.PUBLIC_SITE_HOST?.toLowerCase();
      if (extraHost && host === extraHost) {
        return true;
      }
    }
  } catch {
    // 相对路径或非法 URL：仅 /uploads 已在上面处理
  }

  return false;
}

export function extractMarkdownImageUrls(markdown: string): string[] {
  const urls = new Set<string>();
  if (!markdown) {
    return [];
  }

  for (const re of [MARKDOWN_IMAGE_RE, HTML_IMG_SRC_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(markdown)) !== null) {
      const url = match[1]?.trim();
      if (url) {
        urls.add(url);
      }
    }
  }

  return Array.from(urls);
}

function collectImagePlanUrlsFromValue(value: unknown, out: Set<string>): void {
  if (value == null) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectImagePlanUrlsFromValue(item, out);
    }
    return;
  }
  if (typeof value !== 'object') {
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if ((key === 'url' || key === 'imageUrl' || key === 'src') && typeof nested === 'string') {
      const url = nested.trim();
      if (url) {
        out.add(url);
      }
    } else {
      collectImagePlanUrlsFromValue(nested, out);
    }
  }
}

export function parseImagePlans(imagePlans: unknown): unknown {
  if (imagePlans == null || imagePlans === '') {
    return undefined;
  }
  if (typeof imagePlans === 'string') {
    try {
      return JSON.parse(imagePlans);
    } catch {
      return undefined;
    }
  }
  return imagePlans;
}

export function extractImagePlanUrls(imagePlans: unknown): string[] {
  const parsed = parseImagePlans(imagePlans);
  const urls = new Set<string>();
  collectImagePlanUrlsFromValue(parsed, urls);
  return Array.from(urls);
}

export function collectRemoteImageUrls(markdown: string, imagePlans?: unknown): string[] {
  const urls = new Set<string>();
  for (const url of extractMarkdownImageUrls(markdown)) {
    if (isHttpUrl(url) && !isAlreadyLocalUpload(url)) {
      urls.add(url);
    }
  }
  for (const url of extractImagePlanUrls(imagePlans)) {
    if (isHttpUrl(url) && !isAlreadyLocalUpload(url)) {
      urls.add(url);
    }
  }
  return Array.from(urls);
}

export function rewriteMarkdownUrls(markdown: string, replacements: Map<string, string>): string {
  if (!markdown || replacements.size === 0) {
    return markdown;
  }

  const keys = Array.from(replacements.keys()).sort((a, b) => b.length - a.length);
  let result = markdown;
  for (const from of keys) {
    const to = replacements.get(from);
    if (!to || from === to) {
      continue;
    }
    result = result.split(from).join(to);
  }
  return result;
}

export function rewriteImagePlanUrls(imagePlans: unknown, replacements: Map<string, string>): unknown {
  const parsed = parseImagePlans(imagePlans);
  if (parsed == null || replacements.size === 0) {
    return parsed;
  }

  const rewrite = (value: unknown): unknown => {
    if (value == null) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(rewrite);
    }
    if (typeof value !== 'object') {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if ((key === 'url' || key === 'imageUrl' || key === 'src') && typeof nested === 'string') {
        result[key] = replacements.get(nested) ?? replacements.get(nested.trim()) ?? nested;
      } else {
        result[key] = rewrite(nested);
      }
    }
    return result;
  };

  return rewrite(parsed);
}

export interface ImageRewriteSuccess {
  from: string;
  to: string;
}

export interface ImageRewriteFailure {
  url: string;
  reason: string;
}

export interface ImageRewriteResult {
  succeeded: ImageRewriteSuccess[];
  failed: ImageRewriteFailure[];
}
