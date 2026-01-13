import { useState, useEffect } from 'react';
import { FiRefreshCw, FiSave, FiHelpCircle, FiInfo } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { settingsService, Provider, Settings } from '../../services/settings';
import Tooltip from './Tooltip';
import './Settings.css';

export default function ProviderSelection() {
  const { isAuthenticated } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [settings, setSettings] = useState<Settings>({
    llmProvider: null,
    embeddingProvider: null,
    imageProvider: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 只有登录用户才加载数据
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      const [providersData, settingsData] = await Promise.all([
        settingsService.getProviders(),
        settingsService.getSettings(),
      ]);
      setProviders(providersData.filter(p => p.enabled));
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.llmProvider && !settings.embeddingProvider) {
      setError('请至少选择一个提供商');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await settingsService.saveSettings(settings);
      alert('配置保存成功！');
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('确定要重置配置吗？')) {
      setSettings({
        llmProvider: null,
        embeddingProvider: null,
        imageProvider: null,
      });
      setError('');
    }
  };

  const getLLMProviders = () => {
    return providers.filter(p => p.type === 'llm' || p.type === 'both');
  };

  const getEmbeddingProviders = () => {
    return providers.filter(p => p.type === 'embedding' || p.type === 'both');
  };

  const getLLMModels = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return [];
    return provider.type === 'llm' || provider.type === 'both' ? provider.models : [];
  };

  const getEmbeddingModels = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return [];
    return provider.type === 'embedding' || provider.type === 'both' ? provider.models : [];
  };

  const handleLLMProviderChange = (providerId: number) => {
    const models = getLLMModels(providerId);
    setSettings({
      ...settings,
      llmProvider: {
        providerId,
        model: models[0] || '',
      },
    });
  };

  const handleLLMModelChange = (model: string) => {
    if (settings.llmProvider) {
      setSettings({
        ...settings,
        llmProvider: {
          ...settings.llmProvider,
          model,
        },
      });
    }
  };

  const handleEmbeddingProviderChange = (providerId: number) => {
    const models = getEmbeddingModels(providerId);
    setSettings({
      ...settings,
      embeddingProvider: {
        providerId,
        model: models[0] || '',
      },
    });
  };

  const handleEmbeddingModelChange = (model: string) => {
    if (settings.embeddingProvider) {
      setSettings({
        ...settings,
        embeddingProvider: {
          ...settings.embeddingProvider,
          model,
        },
      });
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  const llmProviders = getLLMProviders();
  const embeddingProviders = getEmbeddingProviders();

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>提供商选择</h2>
      </div>

      <div className="info-box">
        <span className="info-icon">
          <FiInfo />
        </span>
        <div>
          <strong>提供商选择说明：</strong>
          选择要使用的大模型提供商和向量模型提供商。请确保至少选择一个提供商才能正常使用AI功能。
        </div>
      </div>

      <div className="selection-form">
        <div className="form-group">
          <label>
            <span className="required">*</span> 大模型提供商
            <Tooltip content="选择用于生成文本内容的大模型提供商">
              <span className="help-icon">
                <FiHelpCircle />
              </span>
            </Tooltip>
          </label>
          <select
            value={settings.llmProvider?.providerId || ''}
            onChange={(e) => handleLLMProviderChange(parseInt(e.target.value))}
            disabled={saving}
          >
            <option value="">请选择</option>
            {llmProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          {settings.llmProvider && (
            <select
              value={settings.llmProvider.model}
              onChange={(e) => handleLLMModelChange(e.target.value)}
              disabled={saving}
              className="model-select"
            >
              {getLLMModels(settings.llmProvider.providerId).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="form-group">
          <label>
            <span className="required">*</span> 向量模型提供商
            <Tooltip content="选择用于生成文本嵌入向量的模型提供商">
              <span className="help-icon">
                <FiHelpCircle />
              </span>
            </Tooltip>
          </label>
          <select
            value={settings.embeddingProvider?.providerId || ''}
            onChange={(e) => handleEmbeddingProviderChange(parseInt(e.target.value))}
            disabled={saving}
          >
            <option value="">请选择</option>
            {embeddingProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          {settings.embeddingProvider && (
            <select
              value={settings.embeddingProvider.model}
              onChange={(e) => handleEmbeddingModelChange(e.target.value)}
              disabled={saving}
              className="model-select"
            >
              {getEmbeddingModels(settings.embeddingProvider.providerId).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button onClick={handleReset} className="btn btn-secondary" disabled={saving}>
            <FiRefreshCw />
            <span>重置</span>
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            <FiSave />
            <span>保存配置</span>
          </button>
        </div>
      </div>
    </div>
  );
}
