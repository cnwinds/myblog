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
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // 只有登录用户才加载数据
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // 监听提供商更新事件，当添加/更新提供商后自动刷新
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleProviderUpdate = () => {
      // 重新加载数据
      loadData();
    };

    // 监听自定义事件
    window.addEventListener('providerUpdated', handleProviderUpdate);
    return () => {
      window.removeEventListener('providerUpdated', handleProviderUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setSuccess('');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await settingsService.saveSettings(settings);
      setSuccess('配置保存成功！');
      // 3秒后自动清除成功消息
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
      setSuccess('');
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
      setSuccess('');
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

  // 生成大模型选项列表：格式为 "提供商名(模型名)"
  const getLLMOptions = () => {
    const options: Array<{ value: string; label: string; providerId: number; model: string }> = [];
    llmProviders.forEach((provider) => {
      const models = getLLMModels(provider.id);
      models.forEach((model) => {
        options.push({
          value: `${provider.id}:${model}`,
          label: `${provider.name}(${model})`,
          providerId: provider.id,
          model: model,
        });
      });
    });
    return options;
  };

  // 生成向量模型选项列表：格式为 "提供商名(模型名)"
  const getEmbeddingOptions = () => {
    const options: Array<{ value: string; label: string; providerId: number; model: string }> = [];
    embeddingProviders.forEach((provider) => {
      const models = getEmbeddingModels(provider.id);
      models.forEach((model) => {
        options.push({
          value: `${provider.id}:${model}`,
          label: `${provider.name}(${model})`,
          providerId: provider.id,
          model: model,
        });
      });
    });
    return options;
  };

  // 处理大模型选择（一次性选择提供商和模型）
  const handleLLMSelection = (value: string) => {
    if (!value) {
      setSettings({
        ...settings,
        llmProvider: null,
      });
      return;
    }

    const [providerIdStr, model] = value.split(':');
    const providerId = parseInt(providerIdStr);
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    const embeddingModels = getEmbeddingModels(providerId);

    // 如果选择的是 type='both' 的提供商，同时设置大模型和向量模型
    if (provider.type === 'both' && embeddingModels.length > 0) {
      setSettings({
        ...settings,
        llmProvider: {
          providerId,
          model,
        },
        embeddingProvider: {
          providerId,
          model: embeddingModels[0] || '',
        },
      });
    } else {
      // 只设置大模型
      setSettings({
        ...settings,
        llmProvider: {
          providerId,
          model,
        },
      });
    }
  };

  // 处理向量模型选择（一次性选择提供商和模型）
  const handleEmbeddingSelection = (value: string) => {
    if (!value) {
      setSettings({
        ...settings,
        embeddingProvider: null,
      });
      return;
    }

    const [providerIdStr, model] = value.split(':');
    const providerId = parseInt(providerIdStr);
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    const llmModels = getLLMModels(providerId);

    // 如果选择的是 type='both' 的提供商，同时设置大模型和向量模型
    if (provider.type === 'both' && llmModels.length > 0) {
      setSettings({
        ...settings,
        llmProvider: {
          providerId,
          model: llmModels[0] || '',
        },
        embeddingProvider: {
          providerId,
          model,
        },
      });
    } else {
      // 只设置向量模型
      setSettings({
        ...settings,
        embeddingProvider: {
          providerId,
          model,
        },
      });
    }
  };

  // 获取当前选择的大模型选项值
  const getCurrentLLMValue = () => {
    if (!settings.llmProvider) return '';
    return `${settings.llmProvider.providerId}:${settings.llmProvider.model}`;
  };

  // 获取当前选择的向量模型选项值
  const getCurrentEmbeddingValue = () => {
    if (!settings.embeddingProvider) return '';
    return `${settings.embeddingProvider.providerId}:${settings.embeddingProvider.model}`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  const llmProviders = getLLMProviders();
  const embeddingProviders = getEmbeddingProviders();
  const llmOptions = getLLMOptions();
  const embeddingOptions = getEmbeddingOptions();

  return (
    <div className="settings-section provider-selection-container">
      <div className="section-header">
        <h2>提供商选择</h2>
        <button onClick={loadData} className="btn btn-secondary" disabled={loading} title="刷新提供商列表">
          <FiRefreshCw />
          <span>刷新</span>
        </button>
      </div>

      <div className="info-box">
        <span className="info-icon">
          <FiInfo />
        </span>
        <div>
          <strong>提供商选择说明：</strong>
          选择要使用的大模型提供商和向量模型提供商。如果选择"大模型+向量模型"类型的提供商，将同时设置大模型和向量模型。请确保至少选择一个提供商才能正常使用AI功能。
        </div>
      </div>

      <div className="selection-form">
        <div className="form-group">
          <label>
            <span className="required">*</span> 大模型提供商
            <Tooltip content="选择用于生成文本内容的大模型提供商和模型">
              <span className="help-icon">
                <FiHelpCircle />
              </span>
            </Tooltip>
          </label>
          <select
            value={getCurrentLLMValue()}
            onChange={(e) => handleLLMSelection(e.target.value)}
            disabled={saving}
          >
            <option value="">请选择</option>
            {llmOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            向量模型提供商
            <Tooltip content="选择用于生成文本嵌入向量的模型提供商和模型（可选）">
              <span className="help-icon">
                <FiHelpCircle />
              </span>
            </Tooltip>
          </label>
          <select
            value={getCurrentEmbeddingValue()}
            onChange={(e) => handleEmbeddingSelection(e.target.value)}
            disabled={saving}
          >
            <option value="">请选择</option>
            {embeddingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

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
