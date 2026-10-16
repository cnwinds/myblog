import type { Article } from '../services/article';

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const IMAGE_PATTERN_GLOBAL = new RegExp(IMAGE_PATTERN.source, 'g');
const CODE_FENCE_PATTERN = /```[\s\S]*?```/g;

function stripInline(text: string): string {
  return text
    .replace(IMAGE_PATTERN_GLOBAL, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, '');
}

/** 去掉 Markdown 标记后的纯文本，用于字数统计和搜索。 */
export function stripMarkdown(content: string): string {
  return stripInline(content.replace(CODE_FENCE_PATTERN, ''))
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .trim();
}

/** 跳过图片后的第一行正文。 */
export function extractExcerpt(content: string, maxLength = 150): string {
  const firstLine = stripMarkdown(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return '';
  }
  return firstLine.length > maxLength ? `${firstLine.substring(0, maxLength)}…` : firstLine;
}

export function getArticleExcerpt(article: Pick<Article, 'excerpt' | 'content'>, maxLength = 150): string {
  const excerpt = article.excerpt?.trim();
  return excerpt || extractExcerpt(article.content, maxLength);
}

export function extractFirstImage(content: string): string | null {
  return content.match(IMAGE_PATTERN)?.[2] ?? null;
}

/** 封面：正文第一张图，其次是 imagePlans 里的第一张。 */
export function getCoverImage(article: Pick<Article, 'content' | 'imagePlans'>): string | null {
  const fromContent = extractFirstImage(article.content);
  if (fromContent) {
    return fromContent;
  }
  if (!article.imagePlans) {
    return null;
  }
  try {
    const plans = JSON.parse(article.imagePlans);
    const first = Array.isArray(plans) ? plans[0] : null;
    return first?.imageUrl || first?.url || null;
  } catch {
    return null;
  }
}

/** 正文以图片开头时，把它拆出来作为详情页封面。 */
export function splitLeadingCover(content: string): { cover: string | null; alt: string; body: string } {
  const trimmed = content.replace(/^\s+/, '');
  const match = trimmed.match(IMAGE_PATTERN);
  if (!match || match.index !== 0) {
    return { cover: null, alt: '', body: content };
  }
  return { cover: match[2], alt: match[1], body: trimmed.slice(match[0].length).replace(/^\s+/, '') };
}

/** 中文按字、英文按词计数。 */
export function countWords(content: string): number {
  const text = stripMarkdown(content);
  const cjk = text.match(/[\u3400-\u9fff\uf900-\ufaff]/g)?.length ?? 0;
  const latin = text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ').match(/[A-Za-z0-9]+(?:[.'-][A-Za-z0-9]+)*/g)?.length ?? 0;
  return cjk + latin;
}

const WORDS_PER_MINUTE = 400;

export function readingMinutes(content: string): number {
  return Math.max(1, Math.round(countWords(content) / WORDS_PER_MINUTE));
}

export interface Heading {
  level: 2 | 3;
  text: string;
  id: string;
}

export function slugifyHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `h-${slug || 'section'}`;
}

/** 提取 h2/h3 作为目录（忽略代码块里的 #）。 */
export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  for (const line of content.replace(CODE_FENCE_PATTERN, '').split(/\r?\n/)) {
    const match = line.match(/^\s{0,3}(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) {
      continue;
    }
    const text = stripInline(match[2]).trim();
    if (text) {
      headings.push({ level: match[1].length as 2 | 3, text, id: slugifyHeading(text) });
    }
  }
  return headings;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** 最近 weeks 周每周发布数量，从旧到新。 */
export function weeklyActivity(dates: Date[], weeks: number, now: Date = new Date()): number[] {
  const counts = new Array<number>(weeks).fill(0);
  const end = now.getTime();
  for (const date of dates) {
    const age = end - date.getTime();
    if (age < 0) {
      continue;
    }
    const weekIndex = Math.floor(age / WEEK_MS);
    if (weekIndex < weeks) {
      counts[weeks - 1 - weekIndex] += 1;
    }
  }
  return counts;
}

export function formatIndex(index: number): string {
  return `№ ${String(index).padStart(2, '0')}`;
}
