/**
 * 实验室项目字段：tags 在 SQLite 中存 JSON 文本，API 对外暴露为字符串数组。
 */

export function parseTags(input: unknown): string[] {
  if (input == null || input === '') {
    return [];
  }

  if (Array.isArray(input)) {
    return uniqueTrimmed(input.map((item) => String(item)));
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return uniqueTrimmed(parsed.map((item) => String(item)));
        }
      } catch {
        // 不是合法 JSON 数组时，按逗号拆分
      }
    }

    return uniqueTrimmed(trimmed.split(/[,，]/));
  }

  return [];
}

export function stringifyTags(input: unknown): string | null {
  const tags = parseTags(input);
  return tags.length > 0 ? JSON.stringify(tags) : null;
}

export function normalizeOptionalUrl(input: unknown): string | null | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (input == null) {
    return null;
  }
  const value = String(input).trim();
  return value ? value : null;
}

export interface ArticleLabFields {
  demoUrl?: string | null;
  repoUrl?: string | null;
  tags?: string | string[] | null;
}

export function serializeArticle<T extends ArticleLabFields>(
  article: T
): T & { demoUrl: string | null; repoUrl: string | null; tags: string[] } {
  return {
    ...article,
    demoUrl: article.demoUrl ?? null,
    repoUrl: article.repoUrl ?? null,
    tags: parseTags(article.tags),
  };
}

export function serializeArticles<T extends ArticleLabFields>(
  articles: T[]
): Array<T & { demoUrl: string | null; repoUrl: string | null; tags: string[] }> {
  return articles.map(serializeArticle);
}

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}
