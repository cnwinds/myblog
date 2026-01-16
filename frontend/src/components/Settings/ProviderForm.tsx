import { useState, useEffect } from 'react';
import { FiX, FiEye, FiEyeOff, FiHelpCircle } from 'react-icons/fi';
import { settingsService, Provider, CreateProviderData } from '../../services/settings';
import Tooltip from './Tooltip';
import './Settings.css';

// 默认配置常量
const DEFAULT_CONFIG = {
  llm: {
    apiBase: 'https://api.openai.com/v1',
    models: 'gpt-4, gpt-3.5-turbo',
  },
  embedding: {
    apiBase: 'https://api.openai.com/v1',
    models: 'text-embedding-3-small, text-embedding-3-large',
  },
  imageZhipu: {
    apiBase: 'https://open.bigmodel.cn/api/paas/v4/images/generations',
    models: 'glm-image',
    name: '文生图(智谱)',
  },
  imageBailian: {
    apiBase: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    models: '',
    name: '文生图(百炼)',
  },
} as const;

interface ProviderFormProps {
  provider: Provider | null;
  onSubmit: () => void;
  onCancel: () => void;
  defaultType?: 'llm' | 'embedding' | 'both' | 'image';
}

export default function ProviderForm({ provider, onSubmit, onCancel, defaultType }: ProviderFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'llm' | 'embedding' | 'both' | 'image' | 'image-zhipu' | 'image-bailian'>(defaultType || 'llm');
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState('https://api.openai.com');
  const [llmModels, setLlmModels] = useState('');
  const [embeddingModels, setEmbeddingModels] = useState('');
  const [imageModels, setImageModels] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setType(provider.type);
      setApiKey(provider.apiKey || '');
      setApiBase(provider.apiBase || 'https://api.openai.com');
      setEnabled(provider.enabled);
      
      // 根据类型分离模型
      const models = provider.models;
      if (provider.type === 'llm' || provider.type === 'both') {
        setLlmModels(models.join(', '));
      }
      if (provider.type === 'embedding' || provider.type === 'both') {
        setEmbeddingModels(models.join(', '));
      }
      if (provider.type === 'image') {
        setImageModels(models.join(', '));
        // 根据名称判断是智谱还是百炼，设置对应的类型值
        const isZhipu = provider.name && (provider.name.includes('智谱') || provider.name.toLowerCase().includes('zhipu'));
        setType(isZhipu ? 'image-zhipu' : 'image-bailian');
      }
    } else if (defaultType) {
      setType(defaultType);
      // 设置默认值
      if (defaultType === 'llm') {
        setLlmModels(DEFAULT_CONFIG.llm.models);
        setApiBase(DEFAULT_CONFIG.llm.apiBase);
      } else if (defaultType === 'embedding') {
        setEmbeddingModels(DEFAULT_CONFIG.embedding.models);
        setApiBase(DEFAULT_CONFIG.embedding.apiBase);
      } else if (defaultType === 'both') {
        setLlmModels(DEFAULT_CONFIG.llm.models);
        setEmbeddingModels(DEFAULT_CONFIG.embedding.models);
        setApiBase(DEFAULT_CONFIG.llm.apiBase);
      } else if (defaultType === 'image') {
        // 默认使用百炼
        setType('image-bailian');
        setImageModels(DEFAULT_CONFIG.imageBailian.models);
        setApiBase(DEFAULT_CONFIG.imageBailian.apiBase);
      }
    } else {
      // 默认类型为 llm
      setLlmModels(DEFAULT_CONFIG.llm.models);
      setApiBase(DEFAULT_CONFIG.llm.apiBase);
    }
  }, [provider, defaultType]);


  // 解析逗号分隔的模型字符串
  const parseModels = (modelString: string): string[] => {
    return modelString
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 根据类型收集模型
    let models: string[] = [];
    const actualType: 'llm' | 'embedding' | 'both' | 'image' = type.startsWith('image-') ? 'image' : type as 'llm' | 'embedding' | 'both' | 'image';
    
    if (actualType === 'llm') {
      models = parseModels(llmModels);
    } else if (actualType === 'embedding') {
      models = parseModels(embeddingModels);
    } else if (actualType === 'both') {
      models = [...parseModels(llmModels), ...parseModels(embeddingModels)];
    } else if (actualType === 'image') {
      models = parseModels(imageModels);
    }

    if (models.length === 0) {
      setError('至少需要添加一个模型');
      return;
    }

    setLoading(true);
    try {
      const data: CreateProviderData = {
        name: name.trim(),
        type: actualType as 'llm' | 'embedding' | 'both' | 'image',
        apiKey: apiKey.trim() || undefined,
        apiBase: apiBase.trim() || undefined,
        models,
        enabled,
      };

      if (provider) {
        await settingsService.updateProvider(provider.id, data);
      } else {
        await settingsService.createProvider(data);
      }

      onSubmit();
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-overlay">
      <div className="form-modal">
        <div className="form-header">
          <h3>{provider ? '编辑提供商' : '添加提供商'}</h3>
          <button onClick={onCancel} className="btn-close" title="关闭">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <span className="required">*</span> 提供商名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const newName = e.target.value;
                setName(newName);
                // 当类型为image且名称变化时，自动调整配置
                if ((type === 'image-zhipu' || type === 'image-bailian') && !provider) {
                  const isZhipu = newName.includes('智谱') || newName.toLowerCase().includes('zhipu');
                  if (isZhipu && type !== 'image-zhipu') {
                    setType('image-zhipu');
                    setApiBase(DEFAULT_CONFIG.imageZhipu.apiBase);
                    if (!imageModels || imageModels === '') {
                      setImageModels(DEFAULT_CONFIG.imageZhipu.models);
                    }
                  } else if (!isZhipu && type !== 'image-bailian') {
                    setType('image-bailian');
                    setApiBase(DEFAULT_CONFIG.imageBailian.apiBase);
                  }
                }
              }}
              placeholder={type === 'image-zhipu' ? `例如: ${DEFAULT_CONFIG.imageZhipu.name}` : type === 'image-bailian' ? `例如: ${DEFAULT_CONFIG.imageBailian.name}` : '例如: OpenAI'}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>
              <span className="required">*</span> 类型
            </label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as 'llm' | 'embedding' | 'both' | 'image' | 'image-zhipu' | 'image-bailian';
                setType(newType);
                // 切换类型时清空不相关的模型字段并设置默认值
                if (newType === 'llm') {
                  setEmbeddingModels('');
                  setImageModels('');
                  setLlmModels(DEFAULT_CONFIG.llm.models);
                  setApiBase(DEFAULT_CONFIG.llm.apiBase);
                } else if (newType === 'embedding') {
                  setLlmModels('');
                  setImageModels('');
                  setEmbeddingModels(DEFAULT_CONFIG.embedding.models);
                  setApiBase(DEFAULT_CONFIG.embedding.apiBase);
                } else if (newType === 'image-zhipu') {
                  setLlmModels('');
                  setEmbeddingModels('');
                  setImageModels(DEFAULT_CONFIG.imageZhipu.models);
                  setApiBase(DEFAULT_CONFIG.imageZhipu.apiBase);
                  // 如果名称为空，自动设置名称
                  if (!name) {
                    setName(DEFAULT_CONFIG.imageZhipu.name);
                  }
                } else if (newType === 'image-bailian') {
                  setLlmModels('');
                  setEmbeddingModels('');
                  setImageModels(DEFAULT_CONFIG.imageBailian.models);
                  setApiBase(DEFAULT_CONFIG.imageBailian.apiBase);
                  // 如果名称为空，自动设置名称
                  if (!name) {
                    setName(DEFAULT_CONFIG.imageBailian.name);
                  }
                } else if (newType === 'both') {
                  setImageModels('');
                  setLlmModels(DEFAULT_CONFIG.llm.models);
                  setEmbeddingModels(DEFAULT_CONFIG.embedding.models);
                  setApiBase(DEFAULT_CONFIG.llm.apiBase);
                }
              }}
              required
              disabled={loading}
            >
              {(() => {
                // 如果正在编辑现有提供商，根据提供商的类型限制选项
                if (provider) {
                  if (provider.type === 'image') {
                    // 图片提供商只能选择图片类型，显示两个选项
                    return (
                      <>
                        <option value="image-bailian">文生图(百炼)</option>
                        <option value="image-zhipu">文生图(智谱)</option>
                      </>
                    );
                  } else {
                    // LLM提供商（llm, embedding, both）只能选择LLM相关类型
                    return (
                      <>
                        <option value="llm">大模型 OpenAI</option>
                        <option value="embedding">向量模型 OpenAI</option>
                        <option value="both">大模型+向量模型 OpenAI</option>
                      </>
                    );
                  }
                }
                
                // 新建提供商时，根据 defaultType 决定显示哪些选项
                if (defaultType === 'image') {
                  // 从文生图提供商管理页面添加时，显示文生图选项（智谱和百炼）
                  return (
                    <>
                      <option value="image-bailian">文生图(百炼)</option>
                      <option value="image-zhipu">文生图(智谱)</option>
                    </>
                  );
                } else if (defaultType === 'llm') {
                  // 从LLM配置页面添加时，只显示大模型相关选项（不含文生图）
                  return (
                    <>
                      <option value="llm">大模型 OpenAI</option>
                      <option value="embedding">向量模型 OpenAI</option>
                      <option value="both">大模型+向量模型 OpenAI</option>
                    </>
                  );
                } else if (defaultType === 'embedding') {
                  // 从向量模型提供商管理页面添加时，只显示向量模型选项
                  return <option value="embedding">向量模型 OpenAI</option>;
                } else {
                  // 没有 defaultType 时，显示所有选项
                  return (
                    <>
                      <option value="llm">大模型 OpenAI</option>
                      <option value="embedding">向量模型 OpenAI</option>
                      <option value="both">大模型+向量模型 OpenAI</option>
                      <option value="image-bailian">文生图(百炼)</option>
                      <option value="image-zhipu">文生图(智谱)</option>
                    </>
                  );
                }
              })()}
            </select>
          </div>

          <div className="form-group">
            <label>
              <span className="required">*</span> API密钥
            </label>
            <div className="password-input-wrapper">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={loading}
              >
                {showApiKey ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>
              <span className="required">*</span> API基础URL
            </label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.openai.com"
              required
              disabled={loading}
            />
            <small className="form-hint">
              请输入基础URL（不包含 /v1），例如：https://api.openai.com
            </small>
          </div>

          {(type === 'llm' || type === 'both') && (
            <div className="form-group">
              <label>
                <span className="required">*</span> 大模型名称
                <Tooltip content="输入大模型名称，多个模型用逗号分隔">
                  <span className="help-icon">
                    <FiHelpCircle />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                value={llmModels}
                onChange={(e) => setLlmModels(e.target.value)}
                placeholder="gpt-4, gpt-3.5-turbo"
                required
                disabled={loading}
              />
            </div>
          )}

          {(type === 'embedding' || type === 'both') && (
            <div className="form-group">
              <label>
                {type === 'embedding' && <span className="required">*</span>}
                {type === 'embedding' && ' '}
                向量模型名称
                <Tooltip content="输入向量模型名称，多个模型用逗号分隔（可选）">
                  <span className="help-icon">
                    <FiHelpCircle />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                value={embeddingModels}
                onChange={(e) => setEmbeddingModels(e.target.value)}
                placeholder="text-embedding-3-small, text-embedding-3-large"
                required={type === 'embedding'}
                disabled={loading}
              />
            </div>
          )}

          {(type === 'image-zhipu' || type === 'image-bailian') && (
            <div className="form-group">
              <label>
                <span className="required">*</span> 文生图模型名称
                <Tooltip content="输入文生图模型名称，多个模型用逗号分隔">
                  <span className="help-icon">
                    <FiHelpCircle />
                  </span>
                </Tooltip>
              </label>
              <input
                type="text"
                value={imageModels}
                onChange={(e) => setImageModels(e.target.value)}
                placeholder="模型名称，多个用逗号分隔"
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="toggle-label">
              <span>启用</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  disabled={loading}
                />
                <span className="slider"></span>
              </label>
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
              <span>取消</span>
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <span>{loading ? '保存中...' : '确定'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
