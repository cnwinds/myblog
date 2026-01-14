import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../ThemeToggle';
import ProviderManagement from './ProviderManagement';
import ProviderSelection from './ProviderSelection';
import ImageProviderManagement from './ImageProviderManagement';
import ImageProviderSelection from './ImageProviderSelection';
import ChangePassword from './ChangePassword';
import SettingsTabs from './SettingsTabs';
import './SettingsDrawer.css';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { user, logout, isAuthenticated } = useAuth();

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 处理登出
  const handleLogout = () => {
    logout();
    onClose(); // 关闭抽屉
  };

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div className="drawer-overlay" onClick={onClose} />
      )}
      
      {/* 抽屉 */}
      <div className={`settings-drawer ${isOpen ? 'drawer-open' : ''}`}>
        <div className="drawer-header">
          <h2>系统设置</h2>
          <div className="drawer-header-actions">
            <ThemeToggle />
            <span className="username">{user?.username}</span>
            <button onClick={handleLogout} className="btn btn-secondary logout-btn">
              <span>登出</span>
            </button>
            <button onClick={onClose} className="drawer-close-btn" title="关闭">
              <FiX />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          {isAuthenticated ? (
            // 只有当抽屉打开时才渲染内容，避免不必要的 API 调用
            isOpen ? (
              <SettingsTabs
                tabs={[
                  {
                    id: 'llm',
                    label: 'LLM配置',
                    content: (
                      <>
                        <ProviderManagement />
                        <ProviderSelection />
                      </>
                    ),
                  },
                  {
                    id: 'image',
                    label: '文生图配置',
                    content: (
                      <>
                        <ImageProviderManagement />
                        <ImageProviderSelection />
                      </>
                    ),
                  },
                  {
                    id: 'password',
                    label: '修改密码',
                    content: <ChangePassword />,
                  },
                ]}
                defaultTab="llm"
              />
            ) : null
          ) : (
            <div className="settings-login-prompt">
              <p>请先登录以访问系统设置</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
