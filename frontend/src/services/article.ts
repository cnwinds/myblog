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
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleData {
  title: string;
  content: string;
  imagePlans?: ImagePlan[];
  category?: string;
  published?: boolean; // true = 已发布, false = 草稿
}

export interface UpdateArticleData {
  title?: string;
  content?: string;
  imagePlans?: ImagePlan[];
  category?: string;
  published?: boolean; // true = 已发布, false = 草稿
  sortOrder?: number; // 排序顺序（主要用于实验室文章）
}

export const articleService = {
  getArticles: async (category?: string): Promise<Article[]> => {
    const params = category ? { category } : {};
    const response = await api.get<Article[]>('/articles', { params });
    return response.data;
  },

  getArticle: async (id: number): Promise<Article> => {
    const response = await api.get<Article>(`/articles/${id}`);
    return response.data;
  },

  createArticle: async (data: CreateArticleData): Promise<Article> => {
    const response = await api.post<Article>('/articles', data);
    return response.data;
  },

  updateArticle: async (
    id: number,
    data: UpdateArticleData
  ): Promise<Article> => {
    const response = await api.put<Article>(`/articles/${id}`, data);
    return response.data;
  },

  deleteArticle: async (id: number): Promise<void> => {
    await api.delete(`/articles/${id}`);
  },

  getUnpublishedArticles: async (): Promise<Article[]> => {
    const response = await api.get<Article[]>('/articles/unpublished');
    return response.data;
  },
};
