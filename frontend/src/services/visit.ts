import api from './api';

export const visitService = {
  recordVisit: async (articleId: number | null = null): Promise<void> => {
    try {
      await api.post('/visit', { articleId });
    } catch (error) {
      // 记录访问失败不应该影响用户体验，静默失败
      console.warn('Failed to record visit:', error);
    }
  },
};
