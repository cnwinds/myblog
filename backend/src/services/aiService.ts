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

// OpenAI API 响应类型
interface OpenAICompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// OpenAI Embedding API 响应类型
interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

// 百炼文生图 API 响应类型
interface DashScopeImageResponse {
  output?: {
    results?: Array<{
      url?: string;
      image_url?: string;
      image_base64?: string;
      image?: string;
    }>;
    task_id?: string;
  };
}

/**
 * 调用大模型生成内容
 */
export async function callLLM(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
  const settingStr = SettingModel.get('llm_provider');
  if (!settingStr) {
    throw new Error('LLM provider not configured');
  }

  const setting = JSON.parse(settingStr);
  const provider = ProviderModel.findById(setting.providerId);
  
  if (!provider || !provider.enabled) {
    throw new Error('LLM provider not found or disabled');
  }

  // 根据提供商类型调用不同的API
  // 这里是一个通用接口，实际使用时需要根据不同的提供商实现
  return await callProviderAPI(provider, setting.model, prompt, options);
}

/**
 * 调用向量模型生成嵌入
 */
export async function callEmbedding(text: string): Promise<EmbeddingResponse> {
  const settingStr = SettingModel.get('embedding_provider');
  if (!settingStr) {
    throw new Error('Embedding provider not configured');
  }

  const setting = JSON.parse(settingStr);
  const provider = ProviderModel.findById(setting.providerId);
  
  if (!provider || !provider.enabled) {
    throw new Error('Embedding provider not found or disabled');
  }

  // 根据提供商类型调用不同的API
  return await callEmbeddingAPI(provider, setting.model, text);
}

/**
 * 调用提供商API
 * 大模型和向量模型使用OpenAI兼容模式
 */
async function callProviderAPI(
  provider: Provider,
  model: string,
  prompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<LLMResponse> {
  if (!provider.apiKey) {
    throw new Error('API key not configured');
  }

  // 大模型和向量模型使用OpenAI兼容模式
  let apiBase = provider.apiBase || 'https://api.openai.com';
  // 移除末尾的 /v1（如果存在），因为后面会添加
  apiBase = apiBase.replace(/\/v1\/?$/, '');
  const response = await fetch(`${apiBase}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API call failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as OpenAICompletionResponse;
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
  };
}

/**
 * 调用向量模型API
 * 使用OpenAI兼容模式
 */
async function callEmbeddingAPI(provider: Provider, model: string, text: string): Promise<EmbeddingResponse> {
  if (!provider.apiKey) {
    throw new Error('API key not configured');
  }

  // 使用OpenAI兼容模式
  let apiBase = provider.apiBase || 'https://api.openai.com';
  // 移除末尾的 /v1（如果存在），因为后面会添加
  apiBase = apiBase.replace(/\/v1\/?$/, '');
  const response = await fetch(`${apiBase}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API call failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as OpenAIEmbeddingResponse;
  return {
    embedding: data.data[0]?.embedding || [],
  };
}

/**
 * 调用文生图模型生成图片
 * 使用百炼（阿里云）接口
 */
export async function callImageGeneration(
  prompt: string,
  options?: { width?: number; height?: number; n?: number }
): Promise<ImageGenerationResponse> {
  const settingStr = SettingModel.get('image_provider');
  if (!settingStr) {
    throw new Error('Image provider not configured');
  }

  const setting = JSON.parse(settingStr);
  const provider = ProviderModel.findById(setting.providerId);
  
  if (!provider || !provider.enabled) {
    throw new Error('Image provider not found or disabled');
  }

  if (provider.type !== 'image') {
    throw new Error('Provider is not an image generation provider');
  }

  if (!provider.apiKey) {
    throw new Error('API key not configured');
  }

  // 百炼API地址
  // 默认使用阿里云百炼的API地址 (DashScope)
  const apiBase = provider.apiBase || 'https://dashscope.aliyuncs.com';
  const model = setting.model;

  // 百炼文生图API调用
  // 参考文档: https://bailian.console.aliyun.com/cn-beijing/?tab=api#/api/?type=model&url=3002354
  // 百炼使用 DashScope API，支持同步和异步调用
  const size = options?.width && options?.height 
    ? `${options.width}*${options.height}`
    : '1024*1024';

  // 先尝试同步调用（不设置 X-DashScope-Async 头）
  const response = await fetch(`${apiBase}/api/v1/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        prompt,
      },
      parameters: {
        size,
        n: options?.n || 1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Image generation API call failed: ${response.statusText}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error?.message || errorMessage;
    } catch {
      errorMessage += ` - ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json() as DashScopeImageResponse;
  
  // 百炼API返回格式处理
  // 同步调用：直接返回结果在 output.results 中
  if (data.output?.results && data.output.results.length > 0) {
    const result = data.output.results[0];
    // 百炼返回的图片URL或base64
    return {
      imageUrl: result.url || result.image_url || '',
      imageBase64: result.image_base64 || result.image,
    };
  }

  // 如果返回task_id，说明是异步任务
  if (data.output?.task_id) {
    // 异步任务需要轮询，这里先抛出错误提示
    // 实际使用时可以实现轮询逻辑
    throw new Error(`Async task created. Task ID: ${data.output.task_id}. Please implement polling logic.`);
  }

  throw new Error('Invalid response from image generation API: ' + JSON.stringify(data));
}
