import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaGithub } from 'react-icons/fa';
import { FiPlay } from 'react-icons/fi';
import { useArticles } from '../../hooks/useArticles';
import type { Article } from '../../services/article';
import { siteConfig } from '../../config/site';
import { getArticleExcerpt, getCoverImage } from '../../utils/articleText';
import { formatChinaDotDate } from '../../utils/dateUtils';
import CoverImage from './CoverImage';
import { articleMatchesFilter, collectFilterTags, getArticleTags, tagChipClass } from './labFilters';
import { assignCellSizes, type CellSize } from './labLayout';
import './LabList.css';

function LabCell({ article, size, index }: { article: Article; size: CellSize; index: number }) {
  const tags = getArticleTags(article);
  const playable = Boolean(article.demoUrl);
  const code = `EXP.${String(article.id).padStart(3, '0')}`;

  return (
    <article
      className={`cell cell-${size}`}
      style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
    >
      <Link to={`/article/${article.id}`} className="cell-link" aria-label={article.title} />
      <div className="cell-img">
        <CoverImage src={getCoverImage(article)} title={article.title} seed={article.id} eager={index < 3} />
      </div>
      {playable && (
        <span className="cell-badge">
          <i />
          PLAYABLE
        </span>
      )}
      <span className="cell-code">{code}</span>
      <div className="cell-body">
        <span className="cell-meta">
          {code} · {formatChinaDotDate(article.createdAt)}
        </span>
        <h3>{article.title}</h3>
        <p>{getArticleExcerpt(article, 60)}</p>
        {tags.length > 0 && (
          <ul className="cell-tags">
            {tags.map((tag) => (
              <li key={tag} className={tagChipClass(tag)}>
                {tag}
              </li>
            ))}
          </ul>
        )}
        {(article.demoUrl || article.repoUrl) && (
          <div className="cell-actions">
            {article.demoUrl && (
              <a href={article.demoUrl} className="lab-act lab-act-play" target="_blank" rel="noopener noreferrer">
                <FiPlay />
                体验
              </a>
            )}
            {article.repoUrl && (
              <a href={article.repoUrl} className="lab-act" target="_blank" rel="noopener noreferrer">
                <FaGithub />
                GitHub
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function LabList() {
  const { articles, loading, error } = useArticles('lab');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag')?.trim() ?? '';
  const playableOnly = searchParams.get('playable') === '1';

  const filterTags = useMemo(() => collectFilterTags(articles), [articles]);
  const playableCount = useMemo(() => articles.filter((article) => article.demoUrl).length, [articles]);

  const pool = useMemo(
    () => (playableOnly ? articles.filter((article) => article.demoUrl) : articles),
    [articles, playableOnly],
  );

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of pool) {
      for (const tag of getArticleTags(article)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }, [pool]);

  const visibleArticles = useMemo(
    () => pool.filter((article) => articleMatchesFilter(article, selectedTag)),
    [pool, selectedTag],
  );
  const sizes = useMemo(() => assignCellSizes(visibleArticles.length), [visibleArticles.length]);

  const updateParams = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  const counter = [
    { value: articles.length, label: 'PROJECTS' },
    { value: playableCount, label: 'PLAYABLE', live: true },
    { value: filterTags.length, label: 'CATEGORIES' },
  ];

  return (
    <div className="lab-page container">
      <section className="lab-hero">
        <div>
          <span className="eyebrow">playground / 好玩的东西都在这</span>
          <h1>
            实验室 <span className="latin">Lab.</span>
          </h1>
          <p>{siteConfig.labLead}</p>
        </div>
        <dl className="lab-counter">
          {counter.map((item) => (
            <div key={item.label} className={item.live ? 'live' : ''}>
              <dt>{item.label}</dt>
              <dd className="latin">{loading ? '—' : item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {loading ? (
        <div className="loading">LOADING</div>
      ) : error ? (
        <div className="empty-state">实验室加载失败，请稍后刷新重试</div>
      ) : articles.length === 0 ? (
        <div className="empty-state">实验室还空着，新玩具正在路上</div>
      ) : (
        <>
          <div className="lab-toolbar">
            <div className="lab-filters" role="toolbar" aria-label="按类型筛选">
              <button
                type="button"
                className={`lab-filter ${selectedTag === '' ? 'active' : ''}`}
                aria-pressed={selectedTag === ''}
                onClick={() => updateParams('tag', null)}
              >
                全部 <sup>{String(pool.length).padStart(2, '0')}</sup>
              </button>
              {filterTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`lab-filter ${selectedTag === tag ? 'active' : ''}`}
                  aria-pressed={selectedTag === tag}
                  onClick={() => updateParams('tag', tag)}
                >
                  {tag} <sup>{String(tagCounts.get(tag) ?? 0).padStart(2, '0')}</sup>
                </button>
              ))}
            </div>
            {playableCount > 0 && (
              <label className="lab-toggle">
                只看可在线体验
                <input
                  type="checkbox"
                  role="switch"
                  checked={playableOnly}
                  onChange={(event) => updateParams('playable', event.target.checked ? '1' : null)}
                />
                <span className="lab-switch" aria-hidden="true" />
              </label>
            )}
          </div>

          {visibleArticles.length === 0 ? (
            <div className="empty-state">这个分类下暂时没有项目</div>
          ) : (
            <div className="bento">
              {visibleArticles.map((article, i) => (
                <LabCell key={article.id} article={article} size={sizes[i]} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
