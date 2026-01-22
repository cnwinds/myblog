const TOKEN_KEY = 'blog_token';
const USER_KEY = 'blog_user';

// 存储变化事件名称
const STORAGE_CLEARED_EVENT = 'storage:cleared';
const STORAGE_TOKEN_SET_EVENT = 'storage:token:set';
const STORAGE_USER_SET_EVENT = 'storage:user:set';

/**
 * 触发自定义存储事件
 */
function emitStorageEvent(eventName: string, data?: unknown): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }
}

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
        emitStorageEvent(STORAGE_TOKEN_SET_EVENT, { token });
        return null;
      },
      'Failed to set token to localStorage:'
    );
  },

  removeToken: (): void => {
    safeLocalStorageOperation(
      () => {
        localStorage.removeItem(TOKEN_KEY);
        emitStorageEvent(STORAGE_TOKEN_SET_EVENT, { token: null });
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
        emitStorageEvent(STORAGE_USER_SET_EVENT, { user });
        return null;
      },
      'Failed to set user to localStorage:'
    );
  },

  removeUser: (): void => {
    safeLocalStorageOperation(
      () => {
        localStorage.removeItem(USER_KEY);
        emitStorageEvent(STORAGE_USER_SET_EVENT, { user: null });
        return null;
      },
      'Failed to remove user from localStorage:'
    );
  },

  clear: (): void => {
    storage.removeToken();
    storage.removeUser();
    emitStorageEvent(STORAGE_CLEARED_EVENT);
  },

  // 导出事件名称，供其他模块使用
  events: {
    STORAGE_CLEARED: STORAGE_CLEARED_EVENT,
    TOKEN_SET: STORAGE_TOKEN_SET_EVENT,
    USER_SET: STORAGE_USER_SET_EVENT,
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
