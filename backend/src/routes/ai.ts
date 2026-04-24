import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { callLLM, callEmbedding, callImageGeneration, callLLMStream } from '../services/aiService';
import { IncrementalJSONParser } from '../utils/jsonStreamParser';
import { SettingModel } from '../models/Setting';
import { ProviderModel } from '../models/Provider';
import { detectImageProviderKind } from '../utils/imageProvider';
import { DEFAULT_IMAGE_PROMPT_TEMPLATE, DEFAULT_SINGLE_IMAGE_PROMPT_TEMPLATE, replaceTemplatePlaceholders, replaceSingleImageTemplatePlaceholders } from '../utils/imagePromptTemplate';
import { parseJSONFromText } from '../utils/jsonUtils';

const router = Router();

// 获取图片生成提示词模板（从数据库读取，如果没有则使用默认值）
function getImagePromptTemplate(): string {
  const template = SettingModel.get('image_prompt_template');
  return template || DEFAULT_IMAGE_PROMPT_TEMPLATE;
}

// 登录用户可以访问AI功能
// 调用大模型生成内容（使用OpenAI兼容模式）
router.post('/llm', authenticateToken, async (req, res) => {
  try {
    const { prompt, temperature, maxTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await callLLM(prompt, { temperature, maxTokens });
    res.json(response);
  } catch (error: any) {
    console.error('LLM call error:', error);
    res.status(500).json({ error: error.message || 'Failed to call LLM' });
  }
});

// 登录用户可以访问AI功能
// 调用向量模型生成嵌入（使用OpenAI兼容模式）
router.post('/embedding', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await callEmbedding(text);
    res.json(response);
  } catch (error: any) {
    console.error('Embedding call error:', error);
    res.status(500).json({ error: error.message || 'Failed to call embedding' });
  }
});

// 登录用户可以访问AI功能
// 调用文生图模型生成图片（支持 OpenAI、智谱AI 和百炼接口）
router.post('/image', authenticateToken, async (req, res) => {
  try {
    const { prompt, width, height, aspectRatio, n, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 如果提供了 model 参数（格式为 "providerId:model"），使用指定的模型
    let provider: any = null;
    let selectedModel: string | undefined = undefined;
    
    if (model) {
      const [providerIdStr, modelName] = model.split(':');
      const providerId = parseInt(providerIdStr);
      provider = ProviderModel.findById(providerId);
      if (!provider || !provider.enabled || provider.type !== 'image') {
        return res.status(400).json({ error: 'Invalid image provider specified' });
      }
      selectedModel = modelName;
    } else {
      // 使用默认配置的提供商
      const settingStr = SettingModel.get('image_provider');
      if (!settingStr) {
        return res.status(400).json({ error: 'Image provider not configured' });
      }
      const setting = JSON.parse(settingStr);
      provider = ProviderModel.findById(setting.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'Image provider not found' });
      }
      selectedModel = setting.model;
    }
    
    // 如果提供了 aspectRatio，转换为 width 和 height
    let finalWidth = width;
    let finalHeight = height;
    
    if (aspectRatio && !width && !height) {
      const dimensions = convertAspectRatioToDimensions(aspectRatio, provider.name, provider.apiBase);
      finalWidth = dimensions.width;
      finalHeight = dimensions.height;
    }

    const response = await callImageGeneration(prompt, { 
      width: finalWidth, 
      height: finalHeight, 
      n,
      providerId: provider.id,
      model: selectedModel
    });
    res.json(response);
  } catch (error: any) {
    console.error('Image generation call error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

/**
 * 将宽高比转换为具体的宽高尺寸
 * 支持 OpenAI、智谱AI 和百炼（阿里云）提供商的推荐尺寸
 */
function convertAspectRatioToDimensions(
  aspectRatio: string,
  providerName?: string,
  providerApiBase?: string
): { width: number; height: number } {
  const ratio = aspectRatio.trim().toLowerCase();
  const kind = detectImageProviderKind({ name: providerName, apiBase: providerApiBase });
  
  if (kind === 'zhipu') {
    // 智谱AI推荐尺寸（根据文档）
    switch (ratio) {
      case '3:4':
        return { width: 1088, height: 1472 };
      case '9:16':
        return { width: 960, height: 1728 };
      case '16:9':
        return { width: 1728, height: 960 };
      case '4:3':
        return { width: 1472, height: 1088 };
      case '1:1':
        return { width: 1280, height: 1280 };
      default:
        // 尝试解析自定义比例
        const match = ratio.match(/^(\d+):(\d+)$/);
        if (match) {
          const w = parseInt(match[1], 10);
          const h = parseInt(match[2], 10);
          // 智谱AI推荐尺寸范围：1024px-2048px，且需为32的整数倍
          const baseSize = 1280;
          const scale = baseSize / w;
          const width = Math.round(w * scale);
          const height = Math.round(h * scale);
          // 确保是32的整数倍
          return {
            width: Math.floor(width / 32) * 32,
            height: Math.floor(height / 32) * 32,
          };
        }
        return { width: 1280, height: 1280 };
    }
  } else if (kind === 'openai') {
    switch (ratio) {
      case '3:4':
      case '9:16':
        return { width: 1024, height: 1536 };
      case '16:9':
      case '4:3':
        return { width: 1536, height: 1024 };
      case '1:1':
        return { width: 1024, height: 1024 };
      default: {
        const match = ratio.match(/^(\d+):(\d+)$/);
        if (match) {
          const w = parseInt(match[1], 10);
          const h = parseInt(match[2], 10);
          if (w === h) {
            return { width: 1024, height: 1024 };
          }
          return w > h
            ? { width: 1536, height: 1024 }
            : { width: 1024, height: 1536 };
        }
        return { width: 1024, height: 1024 };
      }
    }
  } else {
    // 百炼（阿里云）推荐尺寸
    switch (ratio) {
      case '3:4':
        return { width: 768, height: 1024 };
      case '9:16':
        return { width: 720, height: 1280 };
      case '16:9':
        return { width: 1280, height: 720 };
      case '4:3':
        return { width: 1024, height: 768 };
      case '1:1':
        return { width: 1024, height: 1024 };
      default:
        // 尝试解析自定义比例
        const match = ratio.match(/^(\d+):(\d+)$/);
        if (match) {
          const w = parseInt(match[1], 10);
          const h = parseInt(match[2], 10);
          const baseSize = 768;
          const scale = baseSize / w;
          return {
            width: Math.round(w * scale),
            height: Math.round(h * scale),
          };
        }
        return { width: 768, height: 1024 };
    }
  }
}

// 分析文章并生成图片提示词和位置信息
router.post('/analyze-article-for-images', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // 获取提示词模板（从数据库读取，如果没有则使用默认值）
    const template = getImagePromptTemplate();
    // 替换模板中的占位符
    const prompt = replaceTemplatePlaceholders(template, title, content);
 
    const response = await callLLM(prompt, { temperature: 0.7, maxTokens: 4000 });
    
    // 解析JSON响应
    const imagePlans = parseJSONFromText(response.content);

    res.json({ imagePlans });
  } catch (error: any) {
    console.error('Analyze article error:', error);
    res.status(500).json({ error: error.message || '分析文章失败' });
  }
});

// 流式分析文章并生成图片提示词和位置信息
router.post('/analyze-article-for-images-stream', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用nginx缓冲

    // 获取提示词模板（从数据库读取，如果没有则使用默认值）
    const template = getImagePromptTemplate();
    // 替换模板中的占位符
    const prompt = replaceTemplatePlaceholders(template, title, content);

    const parser = new IncrementalJSONParser();
    let fullContent = '';

    try {
      // 流式调用LLM
      for await (const chunk of callLLMStream(prompt, { temperature: 0.7, maxTokens: 4000 })) {
        fullContent += chunk;
        
        // 尝试解析已完成的项
        const newItems = parser.addChunk(chunk);
        
        // 如果有新完成的项，发送给前端
        if (newItems.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'item', items: newItems })}\n\n`);
        }
      }

      // 流式输出完成，尝试解析最终结果
      const finalItems = parser.tryParseFinal();
      if (finalItems && finalItems.length > 0) {
        // 发送最终结果
        res.write(`data: ${JSON.stringify({ type: 'final', items: finalItems })}\n\n`);
      } else {
        // 如果最终解析失败，尝试从完整内容中提取
        try {
          const imagePlans = parseJSONFromText(fullContent);
          res.write(`data: ${JSON.stringify({ type: 'final', items: imagePlans })}\n\n`);
        } catch (e) {
          // 如果还是失败，发送已解析的项
          const completed = parser.getCompletedItems();
          if (completed.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'final', items: completed })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ type: 'error', error: '无法解析AI返回的图片规划' })}\n\n`);
          }
        }
      }

      // 发送完成信号
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('Stream analyze article error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || '分析文章失败' })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('Analyze article stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || '分析文章失败' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || '分析文章失败' })}\n\n`);
      res.end();
    }
  }
});

// 智能判断图片插入位置（单张图片）
router.post('/find-image-position', authenticateToken, async (req, res) => {
  try {
    const { content, imageCoreMessage } = req.body;

    if (!content || !imageCoreMessage) {
      return res.status(400).json({ error: 'Content and imageCoreMessage are required' });
    }

    // 构建提示词，让大模型判断图片应该插入到文章的哪个位置
    const prompt = `你是一位专业的内容编辑助手。请分析以下文章内容，判断一张图片应该插入到文章的哪个位置。

文章内容：
${content}

图片说明（coreMessage）：${imageCoreMessage}

**重要规则**：
- 图片只能插入在段落之间（段落结束后的空行处）
- 或者插入在句子之间（句号、问号、感叹号之后）
- **绝对不能插入在一句话的中间**

请根据图片说明与文章内容的匹配度，判断图片应该插入的位置。返回格式为JSON：
{
  "position": "开头" | "结尾" | "第X段后" | "第X句后",
  "reason": "插入原因说明"
}

其中：
- "开头"：插入到文章开头（第一个段落之前）
- "结尾"：插入到文章结尾（最后一个段落之后）
- "第X段后"：插入到第X个段落后（X为数字，从1开始，段落之间用空行分隔）
- "第X句后"：插入到第X个句子后（X为数字，从1开始，句子以句号、问号、感叹号结尾）

请只返回JSON，不要返回其他内容。`;

    const response = await callLLM(prompt, { temperature: 0.3 });
    
    // 解析JSON响应，失败时返回默认位置
    let positionData;
    try {
      positionData = parseJSONFromText(response.content);
    } catch (parseError) {
      console.warn('Failed to parse position response:', parseError);
      positionData = { position: '结尾', reason: '无法解析AI响应，默认插入到结尾' };
    }

    res.json({
      position: positionData.position || '结尾',
      reason: positionData.reason || 'AI判断的插入位置',
    });
  } catch (error: any) {
    console.error('Find image position error:', error);
    res.status(500).json({ error: error.message || 'Failed to find image position' });
  }
});

// 批量智能判断多张图片插入位置（一次调用判断所有图片）
router.post('/find-image-positions', authenticateToken, async (req, res) => {
  try {
    const { content, imageCoreMessages } = req.body;

    if (!content || !Array.isArray(imageCoreMessages) || imageCoreMessages.length === 0) {
      return res.status(400).json({ error: 'Content and imageCoreMessages array are required' });
    }

    // 构建提示词，让大模型一次性判断所有图片的插入位置
    const messagesList = imageCoreMessages.map((msg: string, idx: number) => `图片${idx + 1}：${msg}`).join('\n');
    
    const prompt = `你是一位专业的内容编辑助手。请分析以下文章内容，判断多张图片应该插入到文章的哪个位置。

文章内容：
${content}

图片说明列表：
${messagesList}

**重要规则**：
- 图片只能插入在段落之间（段落结束后的空行处）
- 或者插入在句子之间（句号、问号、感叹号之后）
- **绝对不能插入在一句话的中间**
- 每张图片的插入位置应该不同，避免重复

请根据每张图片的说明与文章内容的匹配度，判断每张图片应该插入的位置。返回格式为JSON数组：
[
  {
    "index": 1,
    "position": "开头" | "结尾" | "第X段后" | "第X句后",
    "reason": "插入原因说明"
  },
  {
    "index": 2,
    "position": "开头" | "结尾" | "第X段后" | "第X句后",
    "reason": "插入原因说明"
  }
]

其中：
- "开头"：插入到文章开头（第一个段落之前）
- "结尾"：插入到文章结尾（最后一个段落之后）
- "第X段后"：插入到第X个段落后（X为数字，从1开始，段落之间用空行分隔）
- "第X句后"：插入到第X个句子后（X为数字，从1开始，句子以句号、问号、感叹号结尾）

请只返回JSON数组，不要返回其他内容。`;

    const response = await callLLM(prompt, { temperature: 0.3 });
    
    // 解析JSON响应，失败时为每张图片返回默认位置
    let positionsData;
    try {
      positionsData = parseJSONFromText(response.content);
      
      // 确保返回的是数组
      if (!Array.isArray(positionsData)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.warn('Failed to parse positions response:', parseError);
      positionsData = imageCoreMessages.map((_: string, idx: number) => ({
        index: idx + 1,
        position: '结尾',
        reason: '无法解析AI响应，默认插入到结尾',
      }));
    }

    // 确保返回的数组长度与输入的图片数量一致
    const results = imageCoreMessages.map((_: string, idx: number) => {
      const result = positionsData[idx] || positionsData.find((p: any) => p.index === idx + 1);
      return {
        position: result?.position || '结尾',
        reason: result?.reason || 'AI判断的插入位置',
      };
    });

    res.json({ positions: results });
  } catch (error: any) {
    console.error('Find image positions error:', error);
    res.status(500).json({ error: error.message || 'Failed to find image positions' });
  }
});

// 文字处理（润色/重写统一接口）
router.post('/process-text', authenticateToken, async (req, res) => {
  try {
    const { text, fullArticleContent, prompt } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 构建完整的提示词
    let fullPrompt = prompt.trim();

    // 如果有整篇文章内容，作为上下文参考
    if (fullArticleContent && typeof fullArticleContent === 'string' && fullArticleContent.trim()) {
      fullPrompt += `\n\n**整篇文章内容（作为上下文参考）**：
${fullArticleContent.trim()}

请参考整篇文章的语境、风格和主题，确保处理后的文字与整篇文章保持一致。`;
    }

    fullPrompt += `\n\n**需要处理的文字**：
${text}

请直接返回处理后的文字，不要添加任何说明或注释。`;

    const response = await callLLM(fullPrompt, { temperature: 0.7, maxTokens: 2000 });
    res.json({ processedText: response.content.trim() });
  } catch (error: any) {
    console.error('Process text error:', error);
    res.status(500).json({ error: error.message || '文字处理失败' });
  }
});

// 获取单图提示词模板（从数据库读取，如果没有则使用默认值）
function getSingleImagePromptTemplate(): string {
  const template = SettingModel.get('image_prompt_template_single');
  return template || DEFAULT_SINGLE_IMAGE_PROMPT_TEMPLATE;
}

// 根据选定文本生成图片提示词
router.post('/generate-image-prompt', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // 使用单图提示词模板
    const template = getSingleImagePromptTemplate();
    const prompt = replaceSingleImageTemplatePlaceholders(template, text.trim());

    const response = await callLLM(prompt, { temperature: 0.7, maxTokens: 2000 });
    
    // 解析JSON响应
    const imagePlan = parseJSONFromText(response.content);

    res.json({ imagePlan });
  } catch (error: any) {
    console.error('Generate image prompt error:', error);
    res.status(500).json({ error: error.message || '生成图片提示词失败' });
  }
});

export default router;
