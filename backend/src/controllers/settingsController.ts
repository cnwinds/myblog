import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SettingModel } from '../models/Setting';
import { ProviderModel } from '../models/Provider';

export function getSettings(req: AuthRequest, res: Response) {
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
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function saveSettings(req: AuthRequest, res: Response) {
  try {
    const { llmProvider, embeddingProvider, imageProvider } = req.body;

    // 验证提供商是否存在
    if (llmProvider) {
      const provider = ProviderModel.findById(llmProvider.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'LLM provider not found' });
      }
      const models = JSON.parse(provider.models);
      if (!models.includes(llmProvider.model)) {
        return res.status(400).json({ error: 'LLM model not found in provider' });
      }
      SettingModel.set('llm_provider', JSON.stringify(llmProvider));
    }

    if (embeddingProvider) {
      const provider = ProviderModel.findById(embeddingProvider.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'Embedding provider not found' });
      }
      const models = JSON.parse(provider.models);
      if (!models.includes(embeddingProvider.model)) {
        return res.status(400).json({ error: 'Embedding model not found in provider' });
      }
      SettingModel.set('embedding_provider', JSON.stringify(embeddingProvider));
    }

    if (imageProvider) {
      const provider = ProviderModel.findById(imageProvider.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'Image provider not found' });
      }
      const models = JSON.parse(provider.models);
      if (!models.includes(imageProvider.model)) {
        return res.status(400).json({ error: 'Image model not found in provider' });
      }
      SettingModel.set('image_provider', JSON.stringify(imageProvider));
    }

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
