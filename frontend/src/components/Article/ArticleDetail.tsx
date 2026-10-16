import { useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { FaGithub } from 'react-icons/fa';
import { FiArrowUp, FiCheck, FiEdit3, FiLink, FiPlay, FiTrash2 } from 'react-icons/fi';
import { articleService, type Article } from '../../services/article';
import { useAuth } from '../../hooks/useAuth';
import { useArticles, type ArticleCategory } from '../../hooks/useArticles';
import { siteConfig } from '../../config/site';
import { countWords, extractHeadings, readingMinutes, slugifyHeading, splitLeadingCover } from '../../utils/articleText';
import { formatChinaDotDate, formatChinaDotDateTime } from '../../utils/dateUtils';
import { visitService } from '../../services/visit';
import SiteLayout from '../Layout/SiteLayout';
import BrandMark from '../Layout/BrandMark';
import ImagePreview from './ImagePreview';
import { tagChipClass } from './labFilters';
import './ArticleDetail.css';

const DELETE_CONFIRM_MESSAGES = {
  first: (title: string): string => `确定要删除文章《${title}》吗？\n\n此操作不可撤销！`,
  second: (title: string): string => `请再次确认：您真的要删除文章《${title}》吗？\n\n删除后将无法恢复！`,
} as const;

function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return nodeText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

function useReadingProgress(target: React.RefObject<HTMLElement>, headingIds: string[]) {
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const element = target.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const value = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
      setProgress(value);

      const activationLine = Math.max(140, window.innerHeight * 0.3);
      let current: string | null = null;
      for (const id of headingIds) {
        const heading = document.getElementById(id);
        if (heading && heading.getBoundingClientRect().top <= activationLine) {
          current = id;
        }
      }
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [target, headingIds]);

  return { progress, activeId };
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const proseRef = useRef<HTMLDivElement>(null);

  const category: ArticleCategory = article?.category === 'lab' ? 'lab' : 'blog';
  const siblings = useArticles(category, Boolean(article));

  const loadArticle = useCallback(async (articleId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await articleService.getArticle(articleId);
      setArticle(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文章失败';
      setError(errorMessage);
      console.error('Failed to load article:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      const articleId = parseInt(id, 10);
      if (isNaN(articleId)) {
        setError('无效的文章ID');
        setLoading(false);
        return;
      }
      window.scrollTo(0, 0);
      loadArticle(articleId);
      visitService.recordVisit(articleId);
    }
  }, [id, loadArticle]);

  const { cover, coverAlt, body, headings } = useMemo(() => {
    if (!article) {
      return { cover: null, coverAlt: '', body: '', headings: [] };
    }
    const split = splitLeadingCover(article.content);
    return { cover: split.cover, coverAlt: split.alt, body: split.body, headings: extractHeadings(split.body) };
  }, [article]);

  const headingIds = useMemo(() => headings.map((heading) => heading.id), [headings]);
  const h2Ids = useMemo(() => headings.filter((heading) => heading.level === 2).map((heading) => heading.id), [headings]);
  const { progress, activeId } = useReadingProgress(proseRef, headingIds);

  const handleDelete = useCallback(async () => {
    if (!article) return;

    const firstConfirm = window.confirm(DELETE_CONFIRM_MESSAGES.first(article.title));
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(DELETE_CONFIRM_MESSAGES.second(article.title));
    if (!secondConfirm) return;

    try {
      await articleService.deleteArticle(article.id);
      navigate(article.category === 'lab' ? '/lab' : '/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      alert(errorMessage);
      console.error('Failed to delete article:', err);
    }
  }, [article, navigate]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  const markdownComponents: Components = useMemo(
    () => ({
      img: ({ src, alt, node: _node, ...props }) => (
        <img
          {...props}
          src={src}
          loading="lazy"
          onClick={() => src && setPreviewImage(src)}
          alt={alt || '图片'}
        />
      ),
      h2: ({ children, node: _node, ...props }) => {
        const headingId = slugifyHeading(nodeText(children));
        const index = h2Ids.indexOf(headingId);
        return (
          <h2 {...props} id={headingId}>
            {index >= 0 && <span className="h-num">{String(index + 1).padStart(2, '0')}</span>}
            <span>{children}</span>
          </h2>
        );
      },
      h3: ({ children, node: _node, ...props }) => (
        <h3 {...props} id={slugifyHeading(nodeText(children))}>
          {children}
        </h3>
      ),
      a: ({ href, children, node: _node, ...props }) => (
        <a {...props} href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
    }),
    [h2Ids],
  );

  if (loading || error || !article) {
    return (
      <SiteLayout section={null}>
        {loading ? (
          <div className="loading">LOADING</div>
        ) : (
          <div className="post-missing container">
            <span className="latin">404.</span>
            <p>{error || '文章不存在'}</p>
            <Link to="/" className="btn btn-ink">
              回到首页
            </Link>
          </div>
        )}
      </SiteLayout>
    );
  }

  const isAuthor = isAuthenticated && user?.id === article.authorId;
  const isUpdated = article.updatedAt !== article.createdAt;
  const isLabArticle = article.category === 'lab';
  const labTags = isLabArticle && Array.isArray(article.tags) ? article.tags.filter((tag) => Boolean(tag && tag.trim())) : [];
  const demoUrl = isLabArticle ? article.demoUrl?.trim() || '' : '';
  const repoUrl = isLabArticle ? article.repoUrl?.trim() || '' : '';
  const backLink = isLabArticle ? '/lab' : '/';
  const minutes = readingMinutes(article.content);
  const remaining = Math.max(0, Math.ceil(minutes * (1 - progress)));
  const lead = article.excerpt?.trim();

  const index = siblings.articles.findIndex((item) => item.id === article.id);
  const older = index >= 0 ? siblings.articles[index + 1] : undefined;
  const newer = index > 0 ? siblings.articles[index - 1] : undefined;

  return (
    <SiteLayout section={category}>
      <div className="read-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

      <article className="post">
        <header className="post-head container">
          <div className="post-crumbs">
            <Link to={backLink} className="post-back">
              ← {isLabArticle ? '实验室' : '博客'}
            </Link>
            <span>/</span>
            <span>{isLabArticle ? `EXP.${String(article.id).padStart(3, '0')}` : `#${article.id}`}</span>
            <span>/</span>
            <span>{formatChinaDotDate(article.createdAt)}</span>
          </div>
          <h1>{article.title}</h1>
          {lead && <p className="post-lead">{lead}</p>}

          {labTags.length > 0 && (
            <ul className="post-tags" aria-label="项目标签">
              {labTags.map((tag) => (
                <li key={tag} className={tagChipClass(tag)}>
                  {tag}
                </li>
              ))}
            </ul>
          )}

          {(demoUrl || repoUrl) && (
            <section className="post-links" aria-label="项目链接">
              {demoUrl && (
                <a href={demoUrl} className="post-link" target="_blank" rel="noopener noreferrer">
                  <span className="post-link-btn play">
                    <FiPlay /> 立即体验
                  </span>
                  <span className="post-link-url">{demoUrl}</span>
                </a>
              )}
              {repoUrl && (
                <a href={repoUrl} className="post-link" target="_blank" rel="noopener noreferrer">
                  <span className="post-link-btn">
                    <FaGithub /> GitHub
                  </span>
                  <span className="post-link-url">{repoUrl}</span>
                </a>
              )}
            </section>
          )}

          <div className="post-byline">
            <div className="post-avatar">
              <BrandMark variant="plain" size={24} />
            </div>
            <div className="post-byline-text">
              <b>{siteConfig.name}</b>
              <span>
                {formatChinaDotDateTime(article.createdAt)} · 阅读 {minutes} 分钟 · {countWords(article.content).toLocaleString()} 字
                {isAuthenticated && isUpdated && ` · 更新于 ${formatChinaDotDateTime(article.updatedAt)}`}
              </span>
            </div>
            <div className="post-tools">
              <button type="button" className="chip" onClick={handleCopyLink}>
                {copied ? <FiCheck /> : <FiLink />}
                {copied ? '已复制' : '复制链接'}
              </button>
              {isAuthor && (
                <>
                  <Link to={`/edit/${article.id}`} className="btn btn-ink btn-sm">
                    <FiEdit3 /> 编辑
                  </Link>
                  <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm">
                    <FiTrash2 /> 删除
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {cover && (
          <figure className="post-cover container">
            <img src={cover} alt={coverAlt || article.title} onClick={() => setPreviewImage(cover)} />
            <figcaption>
              <span>FIG.00 — {coverAlt || '封面'}</span>
              <span>点击图片可放大</span>
            </figcaption>
          </figure>
        )}

        <div className={`reader container ${headings.length > 1 ? 'has-toc' : ''}`}>
          <div className="reader-rail">
            <button type="button" className="icon-btn" onClick={handleCopyLink} title="复制链接" aria-label="复制链接">
              {copied ? <FiCheck /> : <FiLink />}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="回到顶部"
              aria-label="回到顶部"
            >
              <FiArrowUp />
            </button>
            <small>SCROLL · {Math.round(progress * 100)}%</small>
          </div>

          <div className="prose" ref={proseRef}>
            <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
              {body}
            </ReactMarkdown>
          </div>

          {headings.length > 1 && (
            <aside className="toc" aria-label="目录">
              <h5>CONTENTS · 目录</h5>
              <ol>
                {headings.map((heading) => {
                  const activeIndex = activeId ? headingIds.indexOf(activeId) : -1;
                  const headingIndex = headingIds.indexOf(heading.id);
                  const state = heading.id === activeId ? 'active' : headingIndex < activeIndex ? 'done' : '';
                  return (
                    <li key={`${heading.id}-${headingIndex}`} className={`toc-l${heading.level} ${state}`}>
                      <a
                        href={`#${heading.id}`}
                        onClick={(event) => {
                          event.preventDefault();
                          document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        {heading.text}
                      </a>
                    </li>
                  );
                })}
              </ol>
              <div className="toc-meter">
                <div>
                  <b className="latin">{Math.round(progress * 100)}</b>% 已读
                </div>
                <div className="toc-bar">
                  <i style={{ transform: `scaleX(${progress})` }} />
                </div>
                <div className="toc-left">{remaining > 0 ? `剩余约 ${remaining} 分钟` : '读完啦'}</div>
              </div>
            </aside>
          )}
        </div>

        <footer className="post-end container">
          <div className="post-fin latin">~ fin ~</div>
          <nav className="post-pn" aria-label="相邻文章">
            {older ? (
              <Link to={`/article/${older.id}`}>
                <small>← {isLabArticle ? '上一个' : '上一篇'}</small>
                <b>{older.title}</b>
              </Link>
            ) : (
              <span className="dim">
                <small>← {isLabArticle ? '上一个' : '上一篇'}</small>
                <b>已经是最早的了</b>
              </span>
            )}
            {newer ? (
              <Link to={`/article/${newer.id}`} className="next">
                <small>{isLabArticle ? '下一个' : '下一篇'} →</small>
                <b>{newer.title}</b>
              </Link>
            ) : (
              <span className="next dim">
                <small>{isLabArticle ? '下一个' : '下一篇'} →</small>
                <b>已经是最新的了</b>
              </span>
            )}
          </nav>
        </footer>
      </article>

      {previewImage && <ImagePreview imageUrl={previewImage} onClose={handleClosePreview} />}
    </SiteLayout>
  );
}
