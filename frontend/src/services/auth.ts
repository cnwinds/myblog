import api from './api';
import { storage } from '../utils/storage';

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
  };
}

export const authService = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    if (response.data.token) {
      storage.setToken(response.data.token);
      storage.setUser(response.data.user);
    }
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    storage.setToken(response.data.token);
    storage.setUser(response.data.user);
    return response.data;
  },

  logout: (): void => {
    storage.clear();
  },

  changePassword: async (data: ChangePasswordData): Promise<void> => {
    await api.post('/auth/change-password', data);
  },

  isAuthenticated: (): boolean => {
    return !!storage.getToken();
  },
};
