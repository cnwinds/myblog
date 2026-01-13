import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiInfo } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { settingsService, Provider } from '../../services/settings';
import ProviderForm from './ProviderForm';
import './Settings.css';

export default function ImageProviderManagement() {
  const { isAuthenticated } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  useEffect(() => {
    // 只有登录用户才加载数据
    if (isAuthenticated) {
      loadProviders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadProviders = async () => {
    try {
      const data = await settingsService.getProviders();
      // 只显示文生图类型的提供商
      setProviders(data.filter(p => p.type === 'image'));
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这个提供商吗？')) {
      return;
    }

    try {
      await settingsService.deleteProvider(id);
      loadProviders();
    } catch (error) {
      console.error('Failed to delete provider:', error);
      alert('删除失败');
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingProvider(null);
    loadProviders();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProvider(null);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>文生图提供商管理</h2>
        <button onClick={handleAdd} className="btn btn-primary">
          <FiPlus />
          <span>添加提供商</span>
        </button>
      </div>

      <div className="info-box">
        <span className="info-icon"><FiInfo /></span>
        <div>
          <strong>文生图提供商管理说明：</strong>
          可以配置多个文生图提供商，每个提供商可以配置多个模型。在下方选择要使用的提供商和模型。
        </div>
      </div>

      {providers.length === 0 ? (
        <div className="empty-state">暂无提供商，请先添加</div>
      ) : (
        <div className="table-container">
          <table className="providers-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>API地址</th>
                <th>模型数量</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => (
                <tr key={provider.id}>
                  <td>{provider.name}</td>
                  <td className="text-muted">
                    {provider.apiBase || '默认'}
                  </td>
                  <td>
                    <div className="models-list">
                      {provider.models.length > 0 ? (
                        provider.models.map((model, index) => (
                          <span key={index} className="model-tag">
                            {model}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">无</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={async (e) => {
                          try {
                            await settingsService.updateProvider(provider.id, {
                              enabled: e.target.checked,
                            });
                            loadProviders();
                          } catch (error) {
                            console.error('Failed to update provider:', error);
                          }
                        }}
                      />
                      <span className="slider"></span>
                    </label>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEdit(provider)}
                        className="btn-icon"
                        title="编辑"
                      >
                        <FiEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="btn-icon btn-danger"
                        title="删除"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ProviderForm
          provider={editingProvider}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          defaultType="image"
        />
      )}
    </div>
  );
}
