import api from './api';

export interface ImagePlan {
  index: number;
  type: string;
  coreMessage: string;
  position: string;
  title: string;
  subtitle?: string;
  description?: string;
  prompt: string;
}

export interface AnalyzeArticleResponse {
  imagePlans: ImagePlan[];
}

export interface ImageGenerationResponse {
  imageUrl: string;
  imageBase64?: string;
}

/**
 * 分析文章并生成图片提示词和位置信息
 */
export async function analyzeArticleForImages(
  title: string,
  content: string
): Promise<AnalyzeArticleResponse> {
  const response = await api.post<AnalyzeArticleResponse>('/ai/analyze-article-for-images', {
    title,
    content,
  });
  return response.data;
}

/**
 * 生成图片
 */
export async function generateImage(
  prompt: string,
  options?: { width?: number; height?: number; n?: number }
): Promise<ImageGenerationResponse> {
  const response = await api.post<ImageGenerationResponse>('/ai/image', {
    prompt,
    ...options,
  });
  return response.data;
}
