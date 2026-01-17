import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import ArticleList from '../components/Article/ArticleList';
import LabList from '../components/Article/LabList';
import ThemeToggle from '../components/ThemeToggle';
import SettingsDrawer from '../components/Settings/SettingsDrawer';
import logo from '../assets/logo.svg';
import './HomePage.css';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // 从URL路径判断当前分类，/lab 表示实验室，其他表示博客
  const currentCategory = location.pathname === '/lab' ? 'lab' : 'blog';

  const handleCategoryChange = (category: 'blog' | 'lab') => {
    if (category === 'lab') {
      navigate('/lab');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="home-page">
      <header className="header">
        <div className="header-content container">
          <div className="header-top">
            <Link to="/" className="logo">
              <img src={logo} alt="cnwinds" className="logo-image" />
              <h1>cnwinds</h1>
            </Link>
            <div className="category-nav-inline">
              <button
                className={`category-tab ${currentCategory === 'blog' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('blog')}
              >
                博客
              </button>
              <button
                className={`category-tab ${currentCategory === 'lab' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('lab')}
              >
                实验室
              </button>
            </div>
            <nav className="nav">
              {isAuthenticated ? (
                <>
                  <Link to="/editor" className="nav-link">写文章</Link>
                  <Link to="/drafts" className="nav-link">草稿箱</Link>
                  <div className="nav-divider"></div>
                  <span className="user-name">{user?.username}</span>
                  <ThemeToggle />
                  <button 
                    onClick={() => setIsSettingsOpen(true)} 
                    className="settings-icon" 
                    title="系统设置"
                  >
                    <FiSettings />
                  </button>
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
        </div>
      </header>
      <main className="main-content">
        {currentCategory === 'lab' ? <LabList /> : <ArticleList />}
      </main>
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
