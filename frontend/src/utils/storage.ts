const TOKEN_KEY = 'blog_token';
const USER_KEY = 'blog_user';

export interface StoredUser {
  id: number;
  username: string;
}

/**
 * 安全地执行 localStorage 操作
 */
function safeLocalStorageOperation<T>(
  operation: () => T,
  errorMessage: string
): T | null {
  try {
    return operation();
  } catch (error) {
    console.error(errorMessage, error);
    return null;
  }
}

export const storage = {
  getToken: (): string | null => {
    return safeLocalStorageOperation(
      () => localStorage.getItem(TOKEN_KEY),
      'Failed to get token from localStorage:'
    );
  },

  setToken: (token: string): void => {
    safeLocalStorageOperation(
      () => {
        localStorage.setItem(TOKEN_KEY, token);
        return null;
      },
      'Failed to set token to localStorage:'
    );
  },

  removeToken: (): void => {
    safeLocalStorageOperation(
      () => {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      },
      'Failed to remove token from localStorage:'
    );
  },

  getUser: (): StoredUser | null => {
    const userStr = safeLocalStorageOperation(
      () => localStorage.getItem(USER_KEY),
      'Failed to get user from localStorage:'
    );

    if (!userStr) {
      return null;
    }

    try {
      return JSON.parse(userStr) as StoredUser;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  },

  setUser: (user: StoredUser): void => {
    safeLocalStorageOperation(
      () => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return null;
      },
      'Failed to set user to localStorage:'
    );
  },

  removeUser: (): void => {
    safeLocalStorageOperation(
      () => {
        localStorage.removeItem(USER_KEY);
        return null;
      },
      'Failed to remove user from localStorage:'
    );
  },

  clear: (): void => {
    storage.removeToken();
    storage.removeUser();
  },
};

// 草稿存储相关类型和常量
const DRAFT_KEY = 'article_draft';

export interface ArticleDraft {
  title: string;
  content: string;
  imagePlans: unknown[] | null;
  savedAt: string;
}

// 本地存储服务 - 用于保存文章草稿
export const draftStorage = {
  DRAFT_KEY,

  saveDraft: (title: string, content: string, imagePlans: unknown[] | null = null): void => {
    const draft: ArticleDraft = {
      title,
      content,
      imagePlans,
      savedAt: new Date().toISOString(),
    };

    safeLocalStorageOperation(
      () => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        return null;
      },
      'Failed to save draft:'
    );
  },

  getDraft: (): ArticleDraft | null => {
    const draftStr = safeLocalStorageOperation(
      () => localStorage.getItem(DRAFT_KEY),
      'Failed to get draft from localStorage:'
    );

    if (!draftStr) {
      return null;
    }

    try {
      return JSON.parse(draftStr) as ArticleDraft;
    } catch (error) {
      console.error('Failed to parse draft data:', error);
      return null;
    }
  },

  clearDraft: (): void => {
    safeLocalStorageOperation(
      () => {
        localStorage.removeItem(DRAFT_KEY);
        return null;
      },
      'Failed to clear draft:'
    );
  },

  hasDraft: (): boolean => {
    const draftStr = safeLocalStorageOperation(
      () => localStorage.getItem(DRAFT_KEY),
      'Failed to check draft:'
    );
    return Boolean(draftStr);
  },
} as const;
