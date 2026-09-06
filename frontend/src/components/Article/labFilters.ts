import { Article } from '../../services/article';

export const LAB_FILTER_CATEGORIES = ['游戏', 'AI', '工具', '阅读'] as const;

export function getArticleTags(article: Pick<Article, 'tags'>): string[] {
  return Array.isArray(article.tags) ? article.tags.filter(Boolean) : [];
}

export function collectFilterTags(articles: Array<Pick<Article, 'tags'>>): string[] {
  const present = new Set<string>();

  for (const article of articles) {
    for (const tag of getArticleTags(article)) {
      present.add(tag);
    }
  }

  return LAB_FILTER_CATEGORIES.filter((tag) => present.has(tag));
}

export function articleMatchesFilter(article: Pick<Article, 'tags'>, selectedTag: string): boolean {
  if (!selectedTag) {
    return true;
  }
  return getArticleTags(article).includes(selectedTag);
}
