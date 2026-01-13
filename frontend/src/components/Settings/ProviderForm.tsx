import { useState, useEffect } from 'react';
import { FiX, FiEye, FiEyeOff, FiHelpCircle } from 'react-icons/fi';
import { settingsService, Provider, CreateProviderData } from '../../services/settings';
import Tooltip from './Tooltip';
import './Settings.css';

interface ProviderFormProps {
  provider: Provider | null;
  onSubmit: () => void;
  onCancel: () => void;
  defaultType?: 'llm' | 'embedding' | 'both' | 'image';
}

export default function ProviderForm({ provider, onSubmit, onCancel, defaultType }: ProviderFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'llm' | 'embedding' | 'both' | 'image'>(defaultType || 'llm');
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState('https://api.openai.com/v1');
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
      setApiBase(provider.apiBase || 'https://api.openai.com/v1');
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
      }
    } else if (defaultType) {
      setType(defaultType);
      // 设置默认值
      if (defaultType === 'llm') {
        setLlmModels('gpt-4, gpt-3.5-turbo');
        setApiBase('https://api.openai.com/v1');
      } else if (defaultType === 'embedding') {
        setEmbeddingModels('text-embedding-3-small, text-embedding-3-large');
        setApiBase('https://api.openai.com/v1');
      } else if (defaultType === 'both') {
        setLlmModels('gpt-4, gpt-3.5-turbo');
        setEmbeddingModels('text-embedding-3-small, text-embedding-3-large');
        setApiBase('https://api.openai.com/v1');
      } else if (defaultType === 'image') {
        setImageModels('');
        setApiBase('https://dashscope.aliyuncs.com');
      }
    } else {
      // 默认类型为 llm
      setLlmModels('gpt-4, gpt-3.5-turbo');
      setApiBase('https://api.openai.com/v1');
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
    if (type === 'llm') {
      models = parseModels(llmModels);
    } else if (type === 'embedding') {
      models = parseModels(embeddingModels);
    } else if (type === 'both') {
      models = [...parseModels(llmModels), ...parseModels(embeddingModels)];
    } else if (type === 'image') {
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
        type,
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
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: OpenAI"
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
                const newType = e.target.value as 'llm' | 'embedding' | 'both' | 'image';
                setType(newType);
                // 切换类型时清空不相关的模型字段并设置默认值
                if (newType === 'llm') {
                  setEmbeddingModels('');
                  setImageModels('');
                  setLlmModels('gpt-4, gpt-3.5-turbo');
                  setApiBase('https://api.openai.com/v1');
                } else if (newType === 'embedding') {
                  setLlmModels('');
                  setImageModels('');
                  setEmbeddingModels('text-embedding-3-small, text-embedding-3-large');
                  setApiBase('https://api.openai.com/v1');
                } else if (newType === 'image') {
                  setLlmModels('');
                  setEmbeddingModels('');
                  setImageModels('');
                  setApiBase('https://dashscope.aliyuncs.com');
                } else if (newType === 'both') {
                  setImageModels('');
                  setLlmModels('gpt-4, gpt-3.5-turbo');
                  setEmbeddingModels('text-embedding-3-small, text-embedding-3-large');
                  setApiBase('https://api.openai.com/v1');
                }
              }}
              required
              disabled={loading}
            >
              {(() => {
                // 根据 defaultType 决定显示哪些选项
                if (defaultType === 'image' && !provider) {
                  // 从文生图提供商管理页面添加时，只显示文生图选项
                  return <option value="image">文生图BaiLian</option>;
                } else if (defaultType === 'llm' && !provider) {
                  // 从LLM配置页面添加时，只显示大模型相关选项（不含文生图）
                  return (
                    <>
                      <option value="llm">大模型 OpenAI</option>
                      <option value="embedding">向量模型 OpenAI</option>
                      <option value="both">大模型+向量模型 OpenAI</option>
                    </>
                  );
                } else if (defaultType === 'embedding' && !provider) {
                  // 从向量模型提供商管理页面添加时，只显示向量模型选项
                  return <option value="embedding">向量模型 OpenAI</option>;
                } else {
                  // 编辑现有提供商或没有 defaultType 时，显示所有选项
                  return (
                    <>
                      <option value="llm">大模型 OpenAI</option>
                      <option value="embedding">向量模型 OpenAI</option>
                      <option value="both">大模型+向量模型 OpenAI</option>
                      <option value="image">文生图BaiLian</option>
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
              placeholder="https://api.openai.com/v1"
              required
              disabled={loading}
            />
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

          {type === 'image' && (
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
