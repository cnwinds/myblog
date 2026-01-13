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

// 百炼文生图 API 响应类型（支持两种格式）
interface DashScopeImageResponse {
  output?: {
    results?: Array<{
      url?: string;
      image_url?: string;
      image_base64?: string;
      image?: string;
      // 新API格式可能返回的字段
      content?: Array<{
        image?: string;
        image_url?: string;
      }>;
    }>;
    task_id?: string;
    // 新API格式直接返回在output中
    choices?: Array<{
      message?: {
        content?: Array<{
          image?: string;
          image_url?: string;
        }>;
      };
    }>;
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
  // 支持两种配置方式：
  // 1. 完整URL：https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation
  // 2. 基础域名：https://dashscope.aliyuncs.com（会自动拼接默认路径）
  let apiUrl = provider.apiBase || 'https://dashscope.aliyuncs.com';
  
  // 检查是否已经包含完整路径
  if (!apiUrl.includes('/api/v1/services/aigc/')) {
    // 如果没有完整路径，使用新的 multimodal-generation API
    try {
      const url = new URL(apiUrl);
      apiUrl = `${url.protocol}//${url.host}/api/v1/services/aigc/multimodal-generation/generation`;
    } catch {
      // 如果解析失败，使用正则表达式清理后拼接
      apiUrl = apiUrl.replace(/\/.*$/, '').replace(/\/$/, '');
      apiUrl = `${apiUrl}/api/v1/services/aigc/multimodal-generation/generation`;
    }
  }
  
  const model = setting.model;
  const size = options?.width && options?.height 
    ? `${options.width}*${options.height}`
    : '1024*1024';

  // 使用新的 multimodal-generation API 格式
  // 参考文档: https://help.aliyun.com/zh/model-studio/z-image-api-reference
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      parameters: {
        size,
        prompt_extend: false,
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

  const data = await response.json() as any;
  
  // 百炼API返回格式处理（支持多种响应格式）
  
  // 格式1: output.choices (新API格式 - multimodal-generation/generation)
  // 响应格式: { output: { choices: [{ message: { content: [{ image: "...", image_url: "..." }] } }] } }
  if (data.output?.choices && data.output.choices.length > 0) {
    const choice = data.output.choices[0];
    if (choice.message?.content && Array.isArray(choice.message.content)) {
      // 查找包含图片的content项
      for (const contentItem of choice.message.content) {
        if (contentItem.image || contentItem.image_url) {
          let imageUrl = '';
          let imageBase64: string | undefined = undefined;
          
          // 优先使用 image_url（通常是 URL）
          if (contentItem.image_url) {
            imageUrl = contentItem.image_url;
          }
          
          // 处理 image 字段：可能是 URL 也可能是 base64
          if (contentItem.image) {
            const imageValue = contentItem.image;
            // 判断是 URL 还是 base64
            const isUrl = imageValue.startsWith('http://') || imageValue.startsWith('https://');
            
            if (isUrl) {
              // 如果是 URL，且 imageUrl 为空，则使用它
              if (!imageUrl) {
                imageUrl = imageValue;
              }
            } else {
              // 如果是 base64，放在 imageBase64 中
              imageBase64 = imageValue;
            }
          }
          
          return {
            imageUrl,
            imageBase64,
          };
        }
      }
    }
  }
  
  // 格式2: output.results (旧格式 - text2image/image-synthesis)
  if (data.output?.results && data.output.results.length > 0) {
    const result = data.output.results[0];
    return {
      imageUrl: result.url || result.image_url || '',
      imageBase64: result.image_base64 || result.image,
    };
  }

  // 如果返回task_id，说明是异步任务
  if (data.output?.task_id) {
    throw new Error(`Async task created. Task ID: ${data.output.task_id}. Please implement polling logic.`);
  }

  // 调试：输出实际响应以便排查
  console.error('Unexpected API response format:', JSON.stringify(data).substring(0, 500));
  throw new Error('Invalid response from image generation API: ' + JSON.stringify(data).substring(0, 200));
}
