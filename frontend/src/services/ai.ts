import api from './api';

export interface ImagePlan {
  index: number;
  type?: string;
  coreMessage: string;
  position: string;
  title: string;
  subtitle?: string;
  description?: string;
  prompt: string;
  aspectRatio?: string; // 图片比例，如 "3:4", "16:9", "1:1" 等
  imageUrl?: string; // 已生成的图片URL（可选）
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
  options?: { width?: number; height?: number; aspectRatio?: string; n?: number }
): Promise<ImageGenerationResponse> {
  const response = await api.post<ImageGenerationResponse>('/ai/image', {
    prompt,
    ...options,
  });
  return response.data;
}

export interface FindImagePositionResponse {
  position: string;
  reason: string;
}

/**
 * 智能判断图片插入位置（单张图片）
 */
export async function findImagePosition(
  content: string,
  imageCoreMessage: string
): Promise<FindImagePositionResponse> {
  const response = await api.post<FindImagePositionResponse>('/ai/find-image-position', {
    content,
    imageCoreMessage,
  });
  return response.data;
}

export interface FindImagePositionsResponse {
  positions: FindImagePositionResponse[];
}

/**
 * 批量智能判断多张图片插入位置（一次调用判断所有图片）
 */
export async function findImagePositions(
  content: string,
  imageCoreMessages: string[]
): Promise<FindImagePositionsResponse> {
  const response = await api.post<FindImagePositionsResponse>('/ai/find-image-positions', {
    content,
    imageCoreMessages,
  });
  return response.data;
}
