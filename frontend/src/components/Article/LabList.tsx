import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { articleService, Article } from '../../services/article';
import { articleMatchesFilter, collectFilterTags, getArticleTags } from './labFilters';
import './LabList.css';

export default function LabList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag')?.trim() ?? '';

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const data = await articleService.getArticles('lab');
      setArticles(data);
    } catch (error) {
      console.error('Failed to load lab articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractFirstImage = (content: string): string | null => {
    const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/;
    const match = content.match(imageRegex);
    if (match && match[2]) {
      return match[2];
    }
    return null;
  };

  const extractExcerpt = (content: string) => {
    const textWithoutImages = content
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();

    const lines = textWithoutImages.split(/\r?\n/);
    let firstNonEmptyLine = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        firstNonEmptyLine = trimmedLine;
        break;
      }
    }

    if (firstNonEmptyLine.length > 80) {
      return firstNonEmptyLine.substring(0, 80) + '...';
    }

    return firstNonEmptyLine || '暂无预览内容';
  };

  const getArticleExcerpt = (article: Article) => {
    if (article.excerpt && article.excerpt.trim()) {
      return article.excerpt.trim();
    }
    return extractExcerpt(article.content);
  };

  const getCoverImage = (article: Article): string | null => {
    const fromContent = extractFirstImage(article.content);
    if (fromContent) {
      return fromContent;
    }

    if (article.imagePlans) {
      try {
        const imagePlans = JSON.parse(article.imagePlans);
        if (Array.isArray(imagePlans) && imagePlans.length > 0) {
          const firstPlan = imagePlans[0];
          if (firstPlan.imageUrl) {
            return firstPlan.imageUrl;
          }
        }
      } catch {
        // 解析失败则视为无封面
      }
    }

    return null;
  };

  const filterTags = useMemo(() => collectFilterTags(articles), [articles]);

  const visibleArticles = useMemo(() => {
    return articles.filter((article) => articleMatchesFilter(article, selectedTag));
  }, [articles, selectedTag]);

  const selectFilter = (tag: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!tag) {
      next.delete('tag');
    } else {
      next.set('tag', tag);
    }
    setSearchParams(next, { replace: true });
  };

  const handleTagClick = (tag: string) => {
    if (tag === selectedTag) {
      return;
    }
    selectFilter(tag);
  };

  return (
    <div className="lab-page">
      {loading ? (
        <div className="loading">加载中...</div>
      ) : articles.length === 0 ? (
        <div className="empty-state">暂无实验室内容</div>
      ) : (
        <>
          <div className="lab-filters" role="toolbar" aria-label="按类型筛选">
            <button
              type="button"
              className={`lab-filter ${selectedTag === '' ? 'active' : ''}`}
              aria-pressed={selectedTag === ''}
              onClick={() => selectFilter(null)}
            >
              全部
            </button>
            {filterTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`lab-filter ${selectedTag === tag ? 'active' : ''}`}
                aria-pressed={selectedTag === tag}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          {visibleArticles.length === 0 ? (
            <div className="empty-state">该类型暂无项目</div>
          ) : (
            <div className="lab-list">
              {visibleArticles.map((article) => {
                const coverImage = getCoverImage(article);
                const tags = getArticleTags(article);

                return (
                  <article key={article.id} className="lab-item">
                    <div className="lab-card">
                      <Link to={`/article/${article.id}`} className="lab-card-main">
                        <div className="lab-card-cover">
                          {coverImage ? (
                            <img src={coverImage} alt={article.title} />
                          ) : (
                            <div className="lab-card-cover-placeholder" aria-hidden="true">
                              <span>暂无封面</span>
                            </div>
                          )}
                        </div>
                        <div className="lab-card-body">
                          <h2 className="lab-title">{article.title}</h2>
                          <p className="lab-tagline">{getArticleExcerpt(article)}</p>
                          {tags.length > 0 && (
                            <ul className="lab-tags">
                              {tags.map((tag) => (
                                <li key={tag} className="lab-tag">{tag}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </Link>
                      {(article.demoUrl || article.repoUrl) && (
                        <div className="lab-card-actions">
                          {article.demoUrl && (
                            <a
                              href={article.demoUrl}
                              className="lab-action lab-action-demo"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              体验
                            </a>
                          )}
                          {article.repoUrl && (
                            <a
                              href={article.repoUrl}
                              className="lab-action lab-action-repo"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              GitHub
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
