import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { authService } from '../services/auth';

export interface User {
  id: number;
  username: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从localStorage读取用户信息
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

  const login = async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    setUser(response.user);
    return response;
  };

  const register = async (username: string, password: string) => {
    const response = await authService.register({ username, password });
    setUser(response.user);
    return response;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const token = storage.getToken();
  const isAuthenticated = !!(token && user);

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
  };
}
