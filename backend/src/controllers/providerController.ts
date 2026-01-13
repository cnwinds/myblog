import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProviderModel, CreateProviderData, UpdateProviderData } from '../models/Provider';

export function getProviders(req: AuthRequest, res: Response) {
  try {
    const providers = ProviderModel.findAll();
    // 解析models JSON字符串
    const providersWithParsedModels = providers.map(p => ({
      ...p,
      models: JSON.parse(p.models),
      enabled: p.enabled === 1,
    }));
    res.json(providersWithParsedModels);
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function getProvider(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const provider = ProviderModel.findById(id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      ...provider,
      models: JSON.parse(provider.models),
      enabled: provider.enabled === 1,
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function createProvider(req: AuthRequest, res: Response) {
  try {
    const data: CreateProviderData = req.body;

    if (!data.name || !data.type || !data.models || data.models.length === 0) {
      return res.status(400).json({ error: 'Name, type, and models are required' });
    }

    // 检查名称是否已存在
    const existing = ProviderModel.findByName(data.name);
    if (existing) {
      return res.status(409).json({ error: 'Provider name already exists' });
    }

    const provider = ProviderModel.create(data);
    res.status(201).json({
      ...provider,
      models: JSON.parse(provider.models),
      enabled: provider.enabled === 1,
    });
  } catch (error) {
    console.error('Create provider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function updateProvider(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const data: UpdateProviderData = req.body;

    const provider = ProviderModel.update(id, data);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({
      ...provider,
      models: JSON.parse(provider.models),
      enabled: provider.enabled === 1,
    });
  } catch (error) {
    console.error('Update provider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function deleteProvider(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);

    const success = ProviderModel.delete(id);

    if (!success) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
