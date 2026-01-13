import { useState, useEffect } from 'react';
import { FiRefreshCw, FiSave, FiInfo, FiHelpCircle } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { settingsService, Provider, Settings } from '../../services/settings';
import Tooltip from './Tooltip';
import './Settings.css';

export default function ImageProviderSelection() {
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
      // 只显示文生图类型的提供商
      setProviders(providersData.filter(p => p.enabled && p.type === 'image'));
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.imageProvider) {
      setError('请选择一个文生图提供商');
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

  const getImageModels = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return [];
    return provider.type === 'image' ? provider.models : [];
  };

  // 生成文生图选项列表：格式为 "提供商名(模型名)"
  const getImageOptions = () => {
    const options: Array<{ value: string; label: string; providerId: number; model: string }> = [];
    providers.forEach((provider) => {
      const models = getImageModels(provider.id);
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

  // 处理文生图选择（一次性选择提供商和模型）
  const handleImageSelection = (value: string) => {
    if (!value) {
      setSettings({
        ...settings,
        imageProvider: null,
      });
      return;
    }

    const [providerIdStr, model] = value.split(':');
    const providerId = parseInt(providerIdStr);
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    setSettings({
      ...settings,
      imageProvider: {
        providerId,
        model,
      },
    });
  };

  // 获取当前选择的文生图选项值
  const getCurrentImageValue = () => {
    if (!settings.imageProvider) return '';
    return `${settings.imageProvider.providerId}:${settings.imageProvider.model}`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  const imageOptions = getImageOptions();

  return (
    <div className="settings-section provider-selection-container">
      <div className="section-header">
        <h2>文生图提供商选择</h2>
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
          <strong>文生图提供商选择说明：</strong>
          选择要使用的文生图提供商和模型。请确保已在上方添加并启用了文生图提供商。
        </div>
      </div>

      <div className="selection-form">
        <div className="form-group">
          <label>
            <span className="required">*</span> 文生图提供商
            <Tooltip content="选择用于生成图片的文生图提供商和模型">
              <span className="help-icon">
                <FiHelpCircle />
              </span>
            </Tooltip>
          </label>
          <select
            value={getCurrentImageValue()}
            onChange={(e) => handleImageSelection(e.target.value)}
            disabled={saving}
          >
            <option value="">请选择</option>
            {imageOptions.map((option) => (
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
