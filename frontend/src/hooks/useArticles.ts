import { useEffect, useState } from 'react';
import { articleService, type Article } from '../services/article';

export type ArticleCategory = 'blog' | 'lab';

interface UseArticlesResult {
  articles: Article[];
  loading: boolean;
  error: boolean;
}

/** 首页、搜索、详情页的上一篇/下一篇共用同一份列表请求（articleService 写操作后会清空缓存）。 */
export function useArticles(category: ArticleCategory, enabled = true): UseArticlesResult {
  const [state, setState] = useState<UseArticlesResult>({ articles: [], loading: enabled, error: false });

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: false }));
    articleService
      .getArticlesCached(category)
      .then((articles) => {
        if (!cancelled) {
          setState({ articles, loading: false, error: false });
        }
      })
      .catch((error) => {
        console.error(`Failed to load ${category} articles:`, error);
        if (!cancelled) {
          setState({ articles: [], loading: false, error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category, enabled]);

  return state;
}
