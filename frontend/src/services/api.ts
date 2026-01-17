import axios from 'axios';
import { storage } from '../utils/storage';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 判断是否为公开路由（不需要认证）
const isPublicRoute = (url: string, method: string = 'get') => {
  const methodLower = method.toLowerCase();
  
  // GET 请求到 /articles 或 /articles/:id 都是公开的
  // 但是 /articles/unpublished 需要认证，所以要排除
  if (methodLower === 'get' && url.startsWith('/articles')) {
    // 排除需要认证的路由
    if (url === '/articles/unpublished') {
      return false;
    }
    return true;
  }
  
  return false;
};

// 请求拦截器：添加token（公开路由不添加）
api.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const method = config.method || 'get';
    
    // 公开路由不添加 token，避免过期 token 导致问题
    if (!isPublicRoute(url, method)) {
      const token = storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // 如果是 FormData，删除 Content-Type，让浏览器自动设置（包括 boundary）
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const method = error.config?.method || 'get';
      
      // 公开路由的 401 错误，完全不处理（不跳转，不清除 token，不记录）
      if (isPublicRoute(url, method)) {
        // 公开路由不应该返回 401，如果返回了，可能是后端问题
        // 这里不做任何处理，让错误正常抛出，由组件自己处理
        return Promise.reject(error);
      }
      
      // 需要认证的路由返回 401，只清除 token，不跳转
      // 完全禁用自动跳转，让组件自己处理
      storage.clear();
      console.warn('401 Unauthorized for protected route:', url);
    }
    return Promise.reject(error);
  }
);

export default api;
