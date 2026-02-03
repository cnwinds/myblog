import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SettingModel } from '../models/Setting';
import { ProviderModel } from '../models/Provider';
import { DEFAULT_IMAGE_PROMPT_TEMPLATE, DEFAULT_SINGLE_IMAGE_PROMPT_TEMPLATE } from '../utils/imagePromptTemplate';
import { DEFAULT_POLISH_PROMPT, DEFAULT_REWRITE_PROMPT } from '../utils/textPromptTemplate';
import { createApiError, handleError } from '../utils/errorHandler';

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const llmProvider = SettingModel.get('llm_provider');
    const embeddingProvider = SettingModel.get('embedding_provider');
    const imageProvider = SettingModel.get('image_provider');

    res.json({
      llmProvider: llmProvider ? JSON.parse(llmProvider) : null,
      embeddingProvider: embeddingProvider ? JSON.parse(embeddingProvider) : null,
      imageProvider: imageProvider ? JSON.parse(imageProvider) : null,
    });
  } catch (error) {
    handleError(res, error, '获取设置失败');
  }
}

export async function saveSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { llmProvider, embeddingProvider, imageProvider } = req.body;

    // 验证并保存提供商设置
    const validateAndSaveProvider = (
      providerData: { providerId: number; model: string } | undefined,
      settingKey: string,
      providerType: string
    ): void => {
      if (!providerData) return;

      const provider = ProviderModel.findById(providerData.providerId);
      if (!provider) {
        throw createApiError(`${providerType} provider not found`, 400);
      }

      const models = JSON.parse(provider.models) as string[];
      if (!models.includes(providerData.model)) {
        throw createApiError(`${providerType} model not found in provider`, 400);
      }

      SettingModel.set(settingKey, JSON.stringify(providerData));
    };

    validateAndSaveProvider(llmProvider, 'llm_provider', 'LLM');
    validateAndSaveProvider(embeddingProvider, 'embedding_provider', 'Embedding');
    validateAndSaveProvider(imageProvider, 'image_provider', 'Image');

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    handleError(res, error, '保存设置失败');
  }
}


// 获取图片生成提示词模板
export async function getImagePromptTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const type = req.query.type as string | undefined; // type: 'multi' | 'single'
    
    if (type === 'single') {
      // 获取单图模板
      let template = SettingModel.get('image_prompt_template_single');
      
      // 如果数据库中没有模板，使用默认模板并保存到数据库
      if (!template) {
        template = DEFAULT_SINGLE_IMAGE_PROMPT_TEMPLATE;
        SettingModel.set('image_prompt_template_single', template);
      }
      
      res.json({ template });
    } else {
      // 获取多图模板（默认）
      let template = SettingModel.get('image_prompt_template');
      
      // 如果数据库中没有模板，使用默认模板并保存到数据库
      if (!template) {
        template = DEFAULT_IMAGE_PROMPT_TEMPLATE;
        SettingModel.set('image_prompt_template', template);
      }
      
      res.json({ template });
    }
  } catch (error) {
    console.error('获取图片提示词模板错误:', error);
    handleError(res, error, '获取图片提示词模板失败');
  }
}

// 保存图片生成提示词模板
export async function saveImagePromptTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { template, type } = req.body; // type: 'multi' | 'single'

    if (typeof template !== 'string') {
      throw createApiError('Template must be a string', 400);
    }

    if (type === 'single') {
      SettingModel.set('image_prompt_template_single', template);
    } else {
      SettingModel.set('image_prompt_template', template);
    }
    
    res.json({ message: 'Image prompt template saved successfully' });
  } catch (error) {
    handleError(res, error, '保存图片提示词模板失败');
  }
}

// 获取文字处理提示词（润色/重写）
export async function getTextProcessPrompt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const mode = req.query.mode as string | undefined; // mode: 'polish' | 'rewrite'
    if (mode !== 'polish' && mode !== 'rewrite') {
      throw createApiError('Invalid mode', 400);
    }

    const settingKey = mode === 'polish' ? 'text_process_prompt_polish' : 'text_process_prompt_rewrite';
    let prompt = SettingModel.get(settingKey);

    if (!prompt) {
      prompt = mode === 'polish' ? DEFAULT_POLISH_PROMPT : DEFAULT_REWRITE_PROMPT;
      SettingModel.set(settingKey, prompt);
    }

    res.json({ prompt });
  } catch (error) {
    handleError(res, error, '获取文字处理提示词失败');
  }
}

// 保存文字处理提示词（润色/重写）
export async function saveTextProcessPrompt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { prompt, mode } = req.body as { prompt?: string; mode?: string };
    if (mode !== 'polish' && mode !== 'rewrite') {
      throw createApiError('Invalid mode', 400);
    }
    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw createApiError('Prompt must be a non-empty string', 400);
    }

    const settingKey = mode === 'polish' ? 'text_process_prompt_polish' : 'text_process_prompt_rewrite';
    SettingModel.set(settingKey, prompt);

    res.json({ message: 'Text process prompt saved successfully' });
  } catch (error) {
    handleError(res, error, '保存文字处理提示词失败');
  }
}
