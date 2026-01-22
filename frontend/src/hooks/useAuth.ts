import { useState, useEffect, useMemo, useCallback } from 'react';
import { storage } from '../utils/storage';
import { authService, type AuthResponse } from '../services/auth';

export interface User {
  id: number;
  username: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (username: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 从存储中同步用户状态
  const syncUserFromStorage = useCallback(() => {
    const storedUser = storage.getUser();
    const token = storage.getToken();

    // 如果token和user都存在，才认为已登录
    if (token && storedUser) {
      setUser(storedUser);
    } else {
      // 如果只有其中一个，清除所有（数据不一致）
      if (token || storedUser) {
        storage.clear();
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // 初始化时同步状态
    syncUserFromStorage();
    setLoading(false);

    // 监听存储变化事件
    const handleStorageCleared = () => {
      setUser(null);
    };

    const handleTokenSet = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string | null }>;
      if (!customEvent.detail?.token) {
        // token被清除
        setUser(null);
      } else {
        // token被设置，检查 user 是否也存在
        // 注意：在登录时，token 和 user 会依次设置，所以这里需要检查 user 是否已存在
        const storedUser = storage.getUser();
        if (storedUser) {
          // user 也存在，设置 user
          setUser(storedUser);
        }
        // 如果 user 还不存在，等待 USER_SET 事件来处理
      }
    };

    const handleUserSet = (event: Event) => {
      const customEvent = event as CustomEvent<{ user: User | null }>;
      if (!customEvent.detail?.user) {
        // user被清除
        setUser(null);
      } else {
        // user被设置，检查 token 是否存在，如果存在才设置 user
        const token = storage.getToken();
        if (token) {
          setUser(customEvent.detail.user);
        } else {
          // token 不存在，清除 user（数据不一致）
          setUser(null);
        }
      }
    };

    window.addEventListener(storage.events.STORAGE_CLEARED, handleStorageCleared);
    window.addEventListener(storage.events.TOKEN_SET, handleTokenSet);
    window.addEventListener(storage.events.USER_SET, handleUserSet);

    return () => {
      window.removeEventListener(storage.events.STORAGE_CLEARED, handleStorageCleared);
      window.removeEventListener(storage.events.TOKEN_SET, handleTokenSet);
      window.removeEventListener(storage.events.USER_SET, handleUserSet);
    };
  }, [syncUserFromStorage]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    // authService.login 已经保存了 token 和 user 到 storage，并触发了事件
    // 事件处理器会自动更新 user 状态，但为了确保立即更新，这里也直接设置
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const response = await authService.register({ username, password });
    // authService.register 已经保存了 token 和 user 到 storage，并触发了事件
    // 事件处理器会自动更新 user 状态，但为了确保立即更新，这里也直接设置
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    // authService.logout 会清除 storage 并触发事件，事件处理器会自动更新 user 状态
    setUser(null);
  }, []);

  // isAuthenticated 基于 user 状态和 storage 中的 token
  // 不使用 useMemo 缓存 token，而是每次都从 storage 读取，确保与存储同步
  const isAuthenticated = useMemo(() => {
    const token = storage.getToken();
    return Boolean(token && user);
  }, [user]);

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
  };
}
