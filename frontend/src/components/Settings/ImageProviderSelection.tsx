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
        ...settings,
        imageProvider: null,
      });
      setError('');
    }
  };

  const getImageModels = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return [];
    return provider.type === 'image' ? provider.models : [];
  };

  const handleImageProviderChange = (providerId: number) => {
    const models = getImageModels(providerId);
    setSettings({
      ...settings,
      imageProvider: {
        providerId,
        model: models[0] || '',
      },
    });
  };

  const handleImageModelChange = (model: string) => {
    if (settings.imageProvider) {
      setSettings({
        ...settings,
        imageProvider: {
          ...settings.imageProvider,
          model,
        },
      });
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>文生图提供商选择</h2>
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
            <Tooltip content="选择用于生成图片的文生图提供商">
              <span className="help-icon">
                <FiHelpCircle />
              </span>
            </Tooltip>
          </label>
          <select
            value={settings.imageProvider?.providerId || ''}
            onChange={(e) => handleImageProviderChange(Number(e.target.value))}
          >
            <option value="">请选择</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          {settings.imageProvider && (
            <select
              value={settings.imageProvider.model || ''}
              onChange={(e) => handleImageModelChange(e.target.value)}
              disabled={saving}
              className="model-select"
            >
              {getImageModels(settings.imageProvider.providerId).map((model) => (
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
