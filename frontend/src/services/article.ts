import api from './api';

export interface Article {
  id: number;
  title: string;
  content: string;
  authorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleData {
  title: string;
  content: string;
}

export interface UpdateArticleData {
  title?: string;
  content?: string;
}

export const articleService = {
  getArticles: async (): Promise<Article[]> => {
    const response = await api.get<Article[]>('/articles');
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
};
