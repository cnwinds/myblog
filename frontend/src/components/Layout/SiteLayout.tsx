import { useCallback, useEffect, useState, type ReactNode } from 'react';
import SettingsDrawer from '../Settings/SettingsDrawer';
import Backdrop from './Backdrop';
import CommandPalette from './CommandPalette';
import SiteFooter from './SiteFooter';
import SiteHeader, { type SiteSection } from './SiteHeader';
import './Layout.css';

interface SiteLayoutProps {
  section: SiteSection;
  children: ReactNode;
  className?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)));
}

export default function SiteLayout({ section, children, className }: SiteLayoutProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      } else if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`site ${className ?? ''}`}>
      <Backdrop />
      <SiteHeader section={section} onOpenSearch={openSearch} onOpenSettings={() => setSettingsOpen(true)} />
      <main className="site-main">{children}</main>
      <SiteFooter />
      <CommandPalette open={searchOpen} onClose={closeSearch} />
      <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
