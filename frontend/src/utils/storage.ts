const TOKEN_KEY = 'blog_token';
const USER_KEY = 'blog_user';

export interface StoredUser {
  id: number;
  username: string;
}

export const storage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token from localStorage:', error);
      return null;
    }
  },

  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to set token to localStorage:', error);
    }
  },

  removeToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token from localStorage:', error);
    }
  },

  getUser: (): StoredUser | null => {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      if (!userStr) return null;
      return JSON.parse(userStr) as StoredUser;
    } catch (error) {
      console.error('Failed to get user from localStorage:', error);
      return null;
    }
  },

  setUser: (user: StoredUser): void => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to set user to localStorage:', error);
    }
  },

  removeUser: (): void => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user from localStorage:', error);
    }
  },

  clear: (): void => {
    storage.removeToken();
    storage.removeUser();
  },
};
