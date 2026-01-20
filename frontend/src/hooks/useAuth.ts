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

  useEffect(() => {
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
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const response = await authService.register({ username, password });
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  // 使用 useMemo 优化 token 和 isAuthenticated 的计算
  const token = useMemo(() => storage.getToken(), [user]);
  const isAuthenticated = useMemo(() => Boolean(token && user), [token, user]);

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
  };
}
