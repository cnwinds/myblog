import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { visitService } from '../services/visit';
import ArticleList from '../components/Article/ArticleList';
import LabList from '../components/Article/LabList';
import ThemeToggle from '../components/ThemeToggle';
import SettingsDrawer from '../components/Settings/SettingsDrawer';
import logo from '../assets/logo.svg';
import './HomePage.css';

type Category = 'blog' | 'lab';

const LAB_PATH = '/lab';
const HOME_PATH = '/';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // 从URL路径判断当前分类，/lab 表示实验室，其他表示博客
  const currentCategory = useMemo<Category>(
    () => (location.pathname === LAB_PATH ? 'lab' : 'blog'),
    [location.pathname]
  );

  const handleCategoryChange = useCallback(
    (category: Category) => {
      navigate(category === 'lab' ? LAB_PATH : HOME_PATH);
    },
    [navigate]
  );

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // 记录首页访问量
  useEffect(() => {
    visitService.recordVisit(null);
  }, []);

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
                type="button"
              >
                博客
              </button>
              <button
                className={`category-tab ${currentCategory === 'lab' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('lab')}
                type="button"
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
                  <ThemeToggle />
                  <button
                    onClick={handleOpenSettings}
                    className="settings-icon"
                    title="系统设置"
                    type="button"
                  >
                    <FiSettings />
                  </button>
                </>
              ) : (
                <ThemeToggle />
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="main-content">
        {currentCategory === 'lab' ? <LabList /> : <ArticleList />}
      </main>
      <SettingsDrawer isOpen={isSettingsOpen} onClose={handleCloseSettings} />
    </div>
  );
}
