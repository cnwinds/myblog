import api from './api';
import { storage } from '../utils/storage';

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
 * 分析文章并生成图片提示词和位置信息（流式版本）
 * @param title 文章标题
 * @param content 文章内容
 * @param onItem 每解析出一个完整的图片规划项时的回调
 * @param onComplete 所有项解析完成时的回调
 * @param onError 错误回调
 */
export async function analyzeArticleForImagesStream(
  title: string,
  content: string,
  onItem: (items: ImagePlan[]) => void,
  onComplete: (items: ImagePlan[]) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const token = storage.getToken();
    if (!token) {
      throw new Error('未登录');
    }

    // 使用与api实例相同的baseURL
    const baseURL = '/api';
    const response = await fetch(`${baseURL}/ai/analyze-article-for-images-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(errorData.error || '请求失败');
    }

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'item' && parsed.items) {
                // 新解析出的项
                onItem(parsed.items);
              } else if (parsed.type === 'final' && parsed.items) {
                // 最终结果
                onComplete(parsed.items);
                return;
              } else if (parsed.type === 'done') {
                // 流式输出完成
                return;
              } else if (parsed.type === 'error') {
                // 错误
                onError(parsed.error || '未知错误');
                return;
              }
            } catch (e) {
              // 忽略解析错误，继续处理下一行
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }

      // 处理剩余的buffer
      if (buffer.trim()) {
        if (buffer.startsWith('data: ')) {
          const data = buffer.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'final' && parsed.items) {
              onComplete(parsed.items);
            } else if (parsed.type === 'error') {
              onError(parsed.error || '未知错误');
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error: any) {
    onError(error.message || '分析文章失败');
  }
}

/**
 * 分析文章并生成图片提示词和位置信息（非流式版本，保持向后兼容）
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

/**
 * 获取图片生成提示词模板
 */
export async function getImagePromptTemplate(): Promise<string> {
  const response = await api.get<{ template: string }>('/settings/image-prompt-template');
  return response.data.template || '';
}

/**
 * 保存图片生成提示词模板
 */
export async function saveImagePromptTemplate(template: string): Promise<void> {
  await api.post('/settings/image-prompt-template', { template });
}
