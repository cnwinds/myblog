import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProviderModel, CreateProviderData, UpdateProviderData } from '../models/Provider';
import { createApiError, handleError } from '../utils/errorHandler';

export async function getProviders(req: AuthRequest, res: Response): Promise<void> {
  try {
    const providers = ProviderModel.findAll();
    // 解析models JSON字符串
    const providersWithParsedModels = providers.map(p => ({
      ...p,
      models: JSON.parse(p.models) as string[],
      enabled: p.enabled === 1,
    }));
    res.json(providersWithParsedModels);
  } catch (error) {
    handleError(res, error, '获取提供商列表失败');
  }
}

export async function getProvider(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw createApiError('Invalid provider ID', 400);
    }

    const provider = ProviderModel.findById(id);
    if (!provider) {
      throw createApiError('Provider not found', 404);
    }

    res.json({
      ...provider,
      models: JSON.parse(provider.models) as string[],
      enabled: provider.enabled === 1,
    });
  } catch (error) {
    handleError(res, error, '获取提供商详情失败');
  }
}

export async function createProvider(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data: CreateProviderData = req.body;

    if (!data.name || !data.type || !data.models || data.models.length === 0) {
      throw createApiError('Name, type, and models are required', 400);
    }

    // 检查名称是否已存在
    const existing = ProviderModel.findByName(data.name);
    if (existing) {
      throw createApiError('Provider name already exists', 409);
    }

    const provider = ProviderModel.create(data);
    res.status(201).json({
      ...provider,
      models: JSON.parse(provider.models) as string[],
      enabled: provider.enabled === 1,
    });
  } catch (error) {
    handleError(res, error, '创建提供商失败');
  }
}

export async function updateProvider(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw createApiError('Invalid provider ID', 400);
    }

    const data: UpdateProviderData = req.body;
    const provider = ProviderModel.update(id, data);

    if (!provider) {
      throw createApiError('Provider not found', 404);
    }

    res.json({
      ...provider,
      models: JSON.parse(provider.models) as string[],
      enabled: provider.enabled === 1,
    });
  } catch (error) {
    handleError(res, error, '更新提供商失败');
  }
}

export async function deleteProvider(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw createApiError('Invalid provider ID', 400);
    }

    const success = ProviderModel.delete(id);
    if (!success) {
      throw createApiError('Provider not found', 404);
    }

    res.json({ message: 'Provider deleted successfully' });
  } catch (error) {
    handleError(res, error, '删除提供商失败');
  }
}
