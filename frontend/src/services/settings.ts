import api from './api';

export interface Provider {
  id: number;
  name: string;
  type: 'llm' | 'embedding' | 'both' | 'image';
  apiKey: string | null;
  apiBase: string | null;
  models: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderData {
  name: string;
  type: 'llm' | 'embedding' | 'both' | 'image';
  apiKey?: string;
  apiBase?: string;
  models: string[];
  enabled?: boolean;
}

export interface UpdateProviderData {
  name?: string;
  type?: 'llm' | 'embedding' | 'both' | 'image';
  apiKey?: string;
  apiBase?: string;
  models?: string[];
  enabled?: boolean;
}

export interface ProviderSelection {
  providerId: number;
  model: string;
}

export interface Settings {
  llmProvider: ProviderSelection | null;
  embeddingProvider: ProviderSelection | null;
  imageProvider: ProviderSelection | null;
}

export const settingsService = {
  // 提供商管理
  getProviders: async (): Promise<Provider[]> => {
    const response = await api.get<Provider[]>('/settings/providers');
    return response.data;
  },

  getProvider: async (id: number): Promise<Provider> => {
    const response = await api.get<Provider>(`/settings/providers/${id}`);
    return response.data;
  },

  createProvider: async (data: CreateProviderData): Promise<Provider> => {
    const response = await api.post<Provider>('/settings/providers', data);
    return response.data;
  },

  updateProvider: async (id: number, data: UpdateProviderData): Promise<Provider> => {
    const response = await api.put<Provider>(`/settings/providers/${id}`, data);
    return response.data;
  },

  deleteProvider: async (id: number): Promise<void> => {
    await api.delete(`/settings/providers/${id}`);
  },

  // 设置管理
  getSettings: async (): Promise<Settings> => {
    const response = await api.get<Settings>('/settings/selection');
    return response.data;
  },

  saveSettings: async (settings: Settings): Promise<void> => {
    await api.post('/settings/selection', settings);
  },
};

// 草稿存储接口
export interface ArticleDraft {
  title: string;
  content: string;
  imagePlans: any[] | null;
  savedAt: string;
}

// 本地存储服务 - 用于保存文章草稿
export const draftStorage = {
  DRAFT_KEY: 'article_draft',

  // 保存草稿
  saveDraft: (title: string, content: string, imagePlans: any[] | null = null) => {
    try {
      const draft: ArticleDraft = {
        title,
        content,
        imagePlans,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('article_draft', JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  },

  // 获取草稿
  getDraft: (): ArticleDraft | null => {
    try {
      const draftStr = localStorage.getItem('article_draft');
      if (!draftStr) return null;
      return JSON.parse(draftStr) as ArticleDraft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  },

  // 清除草稿
  clearDraft: () => {
    try {
      localStorage.removeItem('article_draft');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  },

  // 检查是否有草稿
  hasDraft: (): boolean => {
    return !!localStorage.getItem('article_draft');
  },
};
