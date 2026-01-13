import { SettingModel } from '../models/Setting';
import { ProviderModel, Provider } from '../models/Provider';

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingResponse {
  embedding: number[];
}

export interface ImageGenerationResponse {
  imageUrl: string;
  imageBase64?: string;
}

interface OpenAICompletionResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

/**
 * 获取配置的提供商信息
 */
function getProvider(settingKey: string) {
  const settingStr = SettingModel.get(settingKey);
  if (!settingStr) throw new Error(`${settingKey} not configured`);
  
  const setting = JSON.parse(settingStr);
  const provider = ProviderModel.findById(setting.providerId);
  if (!provider || !provider.enabled) {
    throw new Error('Provider not found or disabled');
  }
  return { provider, model: setting.model };
}

/**
 * 规范化API基础URL，移除末尾的/v1（如果存在）
 */
function normalizeApiBase(apiBase: string, defaultBase: string): string {
  return (apiBase || defaultBase).replace(/\/v1\/?$/, '');
}

/**
 * 调用OpenAI兼容API
 */
async function fetchOpenAIAPI(
  apiBase: string,
  endpoint: string,
  apiKey: string,
  body: any
): Promise<Response> {
  const base = normalizeApiBase(apiBase, 'https://api.openai.com');
  const response = await fetch(`${base}/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.statusText} - ${errorText}`);
  }
  return response;
}

/**
 * 调用大模型生成内容
 */
export async function callLLM(
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  const { provider, model } = getProvider('llm_provider');
  if (!provider.apiKey) throw new Error('API key not configured');

  const response = await fetchOpenAIAPI(
    provider.apiBase || '',
    'chat/completions',
    provider.apiKey,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000,
    }
  );

  const data = await response.json() as OpenAICompletionResponse;
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
  };
}

/**
 * 调用向量模型生成嵌入
 */
export async function callEmbedding(text: string): Promise<EmbeddingResponse> {
  const { provider, model } = getProvider('embedding_provider');
  if (!provider.apiKey) throw new Error('API key not configured');

  const response = await fetchOpenAIAPI(
    provider.apiBase || '',
    'embeddings',
    provider.apiKey,
    { model, input: text }
  );

  const data = await response.json() as OpenAIEmbeddingResponse;
  return { embedding: data.data[0]?.embedding || [] };
}

/**
 * 构建图片生成API的URL
 * 支持完整URL或基础域名两种配置方式
 */
function buildImageApiUrl(apiBase: string): string {
  const base = apiBase || 'https://dashscope.aliyuncs.com';
  if (base.includes('/api/v1/services/aigc/')) return base;
  
  try {
    const url = new URL(base);
    return `${url.protocol}//${url.host}/api/v1/services/aigc/multimodal-generation/generation`;
  } catch {
    return `${base.replace(/\/.*$/, '').replace(/\/$/, '')}/api/v1/services/aigc/multimodal-generation/generation`;
  }
}

/**
 * 解析图片生成API响应
 * 支持两种格式：output.choices（新API）和 output.results（旧API）
 */
function parseImageResponse(data: any): ImageGenerationResponse {
  // 格式1: output.choices (新API格式 - multimodal-generation/generation)
  if (data.output?.choices?.[0]?.message?.content) {
    for (const item of data.output.choices[0].message.content) {
      if (item.image || item.image_url) {
        const imageUrl = item.image_url || (item.image?.startsWith('http') ? item.image : '');
        const imageBase64 = item.image?.startsWith('http') ? undefined : item.image;
        return { imageUrl, imageBase64 };
      }
    }
  }
  
  // 格式2: output.results (旧格式 - text2image/image-synthesis)
  if (data.output?.results?.[0]) {
    const r = data.output.results[0];
    return {
      imageUrl: r.url || r.image_url || '',
      imageBase64: r.image_base64 || r.image,
    };
  }
  
  // 异步任务
  if (data.output?.task_id) {
    throw new Error(`Async task created. Task ID: ${data.output.task_id}`);
  }
  
  throw new Error('Invalid response format: ' + JSON.stringify(data).substring(0, 200));
}

/**
 * 调用文生图模型生成图片
 * 使用百炼（阿里云）接口
 */
export async function callImageGeneration(
  prompt: string,
  options?: { width?: number; height?: number; n?: number }
): Promise<ImageGenerationResponse> {
  const { provider, model } = getProvider('image_provider');
  if (provider.type !== 'image') throw new Error('Provider is not an image generation provider');
  if (!provider.apiKey) throw new Error('API key not configured');

  const apiUrl = buildImageApiUrl(provider.apiBase || '');
  const size = options?.width && options?.height 
    ? `${options.width}*${options.height}` 
    : '1024*1024';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
      parameters: { size, prompt_extend: false },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Image generation failed: ${response.statusText}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error?.message || errorMessage;
    } catch {
      errorMessage += ` - ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  return parseImageResponse(await response.json());
}
