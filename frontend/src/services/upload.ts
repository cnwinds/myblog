import api from './api';

export interface UploadResponse {
  url: string;
}

export const uploadService = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    // 不要手动设置 Content-Type，让浏览器自动设置（包括 boundary）
    const response = await api.post<UploadResponse>('/upload/image', formData);

    return response.data.url;
  },
};
