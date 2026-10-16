import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiCornerDownLeft, FiSearch } from 'react-icons/fi';
import { useArticles } from '../../hooks/useArticles';
import type { Article } from '../../services/article';
import { getArticleExcerpt } from '../../utils/articleText';
import { formatChinaDotDate, parseChinaDateTime } from '../../utils/dateUtils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const MAX_RESULTS = 8;

function matches(article: Article, keywords: string[]): boolean {
  const haystack = [article.title, article.excerpt ?? '', ...(article.tags ?? []), article.content.slice(0, 2000)]
    .join(' ')
    .toLowerCase();
  return keywords.every((keyword) => haystack.includes(keyword));
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const blog = useArticles('blog', open);
  const lab = useArticles('lab', open);
  const loading = blog.loading || lab.loading;

  const results = useMemo(() => {
    const all = [...blog.articles, ...lab.articles].sort(
      (a, b) => parseChinaDateTime(b.createdAt).getTime() - parseChinaDateTime(a.createdAt).getTime(),
    );
    const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = keywords.length ? all.filter((article) => matches(article, keywords)) : all;
    return filtered.slice(0, MAX_RESULTS);
  }, [blog.articles, lab.articles, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) {
    return null;
  }

  const go = (article: Article) => {
    onClose();
    navigate(`/article/${article.id}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      go(results[activeIndex]);
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  return createPortal(
    <div className="palette-overlay" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="搜索文章与实验"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette-input">
          <FiSearch />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索标题、摘要或标签…"
            aria-label="搜索关键词"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="palette-label">{query.trim() ? `结果 · ${results.length}` : '最近更新'}</div>
        <ul className="palette-list" role="listbox">
          {loading && results.length === 0 && <li className="palette-empty">加载中…</li>}
          {!loading && results.length === 0 && <li className="palette-empty">没有找到相关内容，换个关键词试试</li>}
          {results.map((article, index) => (
            <li
              key={article.id}
              role="option"
              aria-selected={index === activeIndex}
              className={`palette-item ${index === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => go(article)}
            >
              <span className={`chip ${article.category === 'lab' ? 'chip-violet' : 'chip-coral'}`}>
                {article.category === 'lab' ? '实验室' : '博客'}
              </span>
              <span className="palette-item-main">
                <b>{article.title}</b>
                <small>{getArticleExcerpt(article, 60)}</small>
              </span>
              <span className="palette-item-date">{formatChinaDotDate(article.createdAt)}</span>
              <FiCornerDownLeft className="palette-enter" />
            </li>
          ))}
        </ul>
        <div className="palette-foot">
          <span>↑↓ 选择</span>
          <span>↵ 打开</span>
          <span>esc 关闭</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
