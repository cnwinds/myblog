import { Link } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import ThemeToggle from '../components/ThemeToggle';
import ProviderManagement from '../components/Settings/ProviderManagement';
import ProviderSelection from '../components/Settings/ProviderSelection';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="header-content container">
          <Link to="/" className="close-link">× 系统设置</Link>
          <div className="user-section">
            <span className="username">{user?.username}</span>
            <ThemeToggle />
            <Link to="/settings" className="settings-icon active" title="系统设置">
              <FiSettings />
            </Link>
          </div>
        </div>
      </header>

      <main className="settings-content container">
        <ProviderManagement />
        <ProviderSelection />
      </main>
    </div>
  );
}
