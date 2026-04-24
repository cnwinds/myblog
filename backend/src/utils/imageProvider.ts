import { Provider } from '../models/Provider';

export type ImageProviderKind = 'openai' | 'zhipu' | 'bailian';

type ImageProviderLike = Pick<Provider, 'name' | 'apiBase' | 'models'> | {
  name?: string | null;
  apiBase?: string | null;
  models?: string[] | string | null;
};

function parseModels(models?: string[] | string | null): string[] {
  if (Array.isArray(models)) {
    return models;
  }

  if (typeof models !== 'string' || !models.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(models);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return models.split(',').map(model => model.trim()).filter(Boolean);
  }
}

export function detectImageProviderKind(provider: ImageProviderLike): ImageProviderKind {
  const name = provider.name?.toLowerCase() || '';
  const apiBase = provider.apiBase?.toLowerCase() || '';
  const models = parseModels(provider.models).map(model => model.toLowerCase());

  if (
    apiBase.includes('bigmodel.cn')
    || name.includes('zhipu')
    || provider.name?.includes('智谱')
    || models.some(model => model.startsWith('glm-image'))
  ) {
    return 'zhipu';
  }

  if (
    apiBase.includes('api.openai.com')
    || name.includes('openai')
    || models.some(model => model.startsWith('gpt-image'))
  ) {
    return 'openai';
  }

  return 'bailian';
}

export function buildImageApiUrl(apiBase: string, kind: ImageProviderKind): string {
  const trimmedBase = apiBase.trim();

  if (kind === 'zhipu') {
    if (/\/images\/generations\/?$/i.test(trimmedBase)) {
      return trimmedBase;
    }

    return 'https://open.bigmodel.cn/api/paas/v4/images/generations';
  }

  if (kind === 'openai') {
    if (/\/images\/generations\/?$/i.test(trimmedBase)) {
      return trimmedBase;
    }

    const base = (trimmedBase || 'https://api.openai.com')
      .replace(/\/v1\/?$/i, '')
      .replace(/\/$/, '');

    return `${base}/v1/images/generations`;
  }

  const base = trimmedBase || 'https://dashscope.aliyuncs.com';
  if (base.includes('/api/v1/services/aigc/')) {
    return base;
  }

  try {
    const url = new URL(base);
    return `${url.protocol}//${url.host}/api/v1/services/aigc/multimodal-generation/generation`;
  } catch {
    return `${base.replace(/\/.*$/, '').replace(/\/$/, '')}/api/v1/services/aigc/multimodal-generation/generation`;
  }
}
