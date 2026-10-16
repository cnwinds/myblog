import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit3, FiFileText, FiMoreHorizontal, FiSearch, FiSettings } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { siteConfig } from '../../config/site';
import ThemeToggle from '../ThemeToggle';
import BrandMark from './BrandMark';

export type SiteSection = 'blog' | 'lab' | null;

interface SiteHeaderProps {
  section: SiteSection;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function SiteHeader({ section, onOpenSearch, onOpenSettings }: SiteHeaderProps) {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handlePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [menuOpen]);

  const adminLinks = (
    <>
      <Link to="/editor" className="icon-btn" title="写文章" aria-label="写文章" onClick={() => setMenuOpen(false)}>
        <FiEdit3 />
      </Link>
      <Link to="/drafts" className="icon-btn" title="草稿箱" aria-label="草稿箱" onClick={() => setMenuOpen(false)}>
        <FiFileText />
      </Link>
      <button
        type="button"
        className="icon-btn"
        title="系统设置"
        aria-label="系统设置"
        onClick={() => {
          setMenuOpen(false);
          onOpenSettings();
        }}
      >
        <FiSettings />
      </button>
    </>
  );

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="主导航">
        <Link to="/" className="brand" aria-label={`${siteConfig.name} 首页`}>
          <BrandMark className="brand-mark" />
          <span className="brand-name">
            {siteConfig.name}
            <i aria-hidden="true">_</i>
          </span>
        </Link>

        <div className="site-tabs">
          <Link to="/" className={`site-tab ${section === 'blog' ? 'active' : ''}`} aria-current={section === 'blog' ? 'page' : undefined}>
            {section === 'blog' && <span className="dot" />}博客
          </Link>
          <Link to="/lab" className={`site-tab ${section === 'lab' ? 'active' : ''}`} aria-current={section === 'lab' ? 'page' : undefined}>
            {section === 'lab' && <span className="dot" />}实验室
          </Link>
        </div>

        <div className="site-nav-right">
          <span className="site-status">
            <span className="pulse" />
            {siteConfig.status}
          </span>
          <button type="button" className="search-trigger" onClick={onOpenSearch} aria-label="搜索文章与实验">
            <FiSearch />
            <span className="search-trigger-text">搜索文章与实验</span>
            <kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
          </button>
          <ThemeToggle />
          {isAuthenticated && (
            <>
              <span className="site-nav-divider" />
              <div className="admin-links">{adminLinks}</div>
              <div className="admin-menu" ref={menuRef}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="更多操作"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <FiMoreHorizontal />
                </button>
                {menuOpen && <div className="admin-menu-pop">{adminLinks}</div>}
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
