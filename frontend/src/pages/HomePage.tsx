import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import ArticleList from '../components/Article/ArticleList';
import ThemeToggle from '../components/ThemeToggle';
import SettingsDrawer from '../components/Settings/SettingsDrawer';
import './HomePage.css';

export default function HomePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="home-page">
      <header className="header">
        <div className="header-content container">
          <Link to="/" className="logo">
            <h1>我的博客</h1>
          </Link>
          <nav className="nav">
            {isAuthenticated ? (
              <>
                <Link to="/editor" className="nav-link">写文章</Link>
                <div className="nav-divider"></div>
                <div className="nav-right">
                  <span className="user-name">{user?.username}</span>
                  <ThemeToggle />
                  <button 
                    onClick={() => setIsSettingsOpen(true)} 
                    className="settings-icon" 
                    title="系统设置"
                  >
                    <FiSettings />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">登录</Link>
                <div className="nav-divider"></div>
                <ThemeToggle />
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main-content">
        <ArticleList />
      </main>
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
