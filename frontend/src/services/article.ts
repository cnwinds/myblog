import api from './api';
import { ImagePlan } from './ai';

export interface Article {
  id: number;
  title: string;
  content: string;
  authorId: number;
  imagePlans?: string; // JSON字符串，存储图片规划数据
  category?: string; // 'blog' 或 'lab'
  published?: number; // 0 = 未发布（草稿）, 1 = 已发布
  sortOrder?: number; // 排序顺序（主要用于实验室文章）
  excerpt?: string; // 文章摘要
  demoUrl?: string | null;
  repoUrl?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleData {
  title: string;
  content: string;
  imagePlans?: ImagePlan[];
  category?: string;
  published?: boolean; // true = 已发布, false = 草稿
  excerpt?: string; // 文章摘要
  demoUrl?: string | null;
  repoUrl?: string | null;
  tags?: string[];
}

export interface UpdateArticleData {
  title?: string;
  content?: string;
  imagePlans?: ImagePlan[];
  category?: string;
  published?: boolean; // true = 已发布, false = 草稿
  sortOrder?: number; // 排序顺序（主要用于实验室文章）
  excerpt?: string; // 文章摘要
  demoUrl?: string | null;
  repoUrl?: string | null;
  tags?: string[];
}

const listCache = new Map<string, Promise<Article[]>>();

function invalidateListCache(): void {
  listCache.clear();
}

export const articleService = {
  getArticles: async (category?: string): Promise<Article[]> => {
    const params = category ? { category } : {};
    const response = await api.get<Article[]>('/articles', { params });
    return response.data;
  },

  /** 同一会话内复用已发布列表；任何写操作都会清空缓存。 */
  getArticlesCached: (category: string): Promise<Article[]> => {
    let pending = listCache.get(category);
    if (!pending) {
      pending = articleService.getArticles(category);
      listCache.set(category, pending);
      pending.catch(() => listCache.delete(category));
    }
    return pending;
  },

  getArticle: async (id: number): Promise<Article> => {
    const response = await api.get<Article>(`/articles/${id}`);
    return response.data;
  },

  createArticle: async (data: CreateArticleData): Promise<Article> => {
    const response = await api.post<Article>('/articles', data);
    invalidateListCache();
    return response.data;
  },

  updateArticle: async (
    id: number,
    data: UpdateArticleData
  ): Promise<Article> => {
    const response = await api.put<Article>(`/articles/${id}`, data);
    invalidateListCache();
    return response.data;
  },

  deleteArticle: async (id: number): Promise<void> => {
    await api.delete(`/articles/${id}`);
    invalidateListCache();
  },

  getUnpublishedArticles: async (): Promise<Article[]> => {
    const response = await api.get<Article[]>('/articles/unpublished');
    return response.data;
  },

  fetchArticleFromUrl: async (url: string): Promise<{ title: string; content: string }> => {
    const response = await api.post<{ title: string; content: string }>('/articles/fetch-from-url', { url });
    return response.data;
  },
};
