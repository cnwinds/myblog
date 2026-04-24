import { Provider } from '../services/settings';

export type ImageProviderFormType = 'image-openai' | 'image-zhipu' | 'image-bailian';

type ImageProviderLike = Pick<Provider, 'name' | 'apiBase' | 'models'> | {
  name?: string | null;
  apiBase?: string | null;
  models?: string[] | null;
};

export function detectImageProviderFormType(provider: ImageProviderLike): ImageProviderFormType {
  const name = provider.name?.toLowerCase() || '';
  const apiBase = provider.apiBase?.toLowerCase() || '';
  const models = (provider.models || []).map(model => model.toLowerCase());

  if (
    apiBase.includes('bigmodel.cn')
    || name.includes('zhipu')
    || provider.name?.includes('智谱')
    || models.some(model => model.startsWith('glm-image'))
  ) {
    return 'image-zhipu';
  }

  if (
    apiBase.includes('api.openai.com')
    || name.includes('openai')
    || models.some(model => model.startsWith('gpt-image'))
  ) {
    return 'image-openai';
  }

  return 'image-bailian';
}

export function getImageProviderTypeLabel(type: ImageProviderFormType): string {
  switch (type) {
    case 'image-openai':
      return '文生图(OpenAI)';
    case 'image-zhipu':
      return '文生图(智谱)';
    default:
      return '文生图(百炼)';
  }
}
