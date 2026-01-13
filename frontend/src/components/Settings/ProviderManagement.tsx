import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiInfo } from 'react-icons/fi';
import { settingsService, Provider, CreateProviderData } from '../../services/settings';
import ProviderForm from './ProviderForm';
import './Settings.css';

export default function ProviderManagement() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await settingsService.getProviders();
      setProviders(data);
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
    } catch (error: any) {
      alert(error.response?.data?.error || '删除失败');
    }
  };

  const handleToggleEnabled = async (provider: Provider) => {
    try {
      await settingsService.updateProvider(provider.id, {
        enabled: !provider.enabled,
      });
      loadProviders();
    } catch (error: any) {
      alert(error.response?.data?.error || '更新失败');
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
        <h2>提供商管理</h2>
        <button onClick={handleAdd} className="btn btn-primary">
          <FiPlus />
          <span>添加提供商</span>
        </button>
      </div>

      <div className="info-box">
        <span className="info-icon">
          <FiInfo />
        </span>
        <div>
          <strong>提供商管理说明：</strong>
          可以配置多个AI提供商，并分别选择使用哪个提供商的大模型和向量模型。某些提供商可能只提供大模型而没有向量模型。
        </div>
      </div>

      {showForm && (
        <ProviderForm
          provider={editingProvider}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      <div className="table-container">
        <table className="providers-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>大模型</th>
              <th>向量模型</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  暂无提供商，请添加
                </td>
              </tr>
            ) : (
              providers.map((provider) => {
                const llmModels = provider.type === 'llm' || provider.type === 'both' 
                  ? provider.models 
                  : [];
                const embeddingModels = provider.type === 'embedding' || provider.type === 'both' 
                  ? provider.models 
                  : [];

                return (
                  <tr key={provider.id}>
                    <td>{provider.name}</td>
                    <td>
                      {provider.type === 'llm' && '大模型'}
                      {provider.type === 'embedding' && '向量模型'}
                      {provider.type === 'both' && '大模型+向量模型'}
                    </td>
                    <td>
                      {llmModels.length > 0 ? (
                        <div className="models-list">
                          {llmModels.map((model, idx) => (
                            <span key={idx} className="model-tag">{model}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {embeddingModels.length > 0 ? (
                        <div className="models-list">
                          {embeddingModels.map((model, idx) => (
                            <span key={idx} className="model-tag">{model}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={provider.enabled}
                          onChange={() => handleToggleEnabled(provider)}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
