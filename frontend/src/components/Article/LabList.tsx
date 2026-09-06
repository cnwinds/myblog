import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { articleService, Article } from '../../services/article';
import { useAuth } from '../../hooks/useAuth';
import './LabList.css';

export default function LabList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated, user } = useAuth();

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

  const getArticleTags = (article: Article): string[] => {
    return Array.isArray(article.tags) ? article.tags.filter(Boolean) : [];
  };

  const isAuthor = (article: Article) => {
    return isAuthenticated && user && user.id === article.authorId;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isAuthor(articles[index])) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    e.stopPropagation();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newArticles = [...articles];
    const draggedArticle = newArticles[draggedIndex];

    newArticles.splice(draggedIndex, 1);
    newArticles.splice(dropIndex, 0, draggedArticle);

    const updatedArticles = newArticles.map((article, index) => ({
      ...article,
      sortOrder: index,
    }));

    setArticles(updatedArticles);
    setDraggedIndex(null);
    setDragOverIndex(null);

    setSaving(true);
    try {
      const startIndex = Math.min(draggedIndex, dropIndex);
      const endIndex = Math.max(draggedIndex, dropIndex);
      const articlesToUpdate = updatedArticles.slice(startIndex, endIndex + 1);

      for (const article of articlesToUpdate) {
        await articleService.updateArticle(article.id, {
          sortOrder: article.sortOrder,
        });
      }
    } catch (error) {
      console.error('Failed to save sort order:', error);
      alert('保存排序失败');
      loadArticles();
    } finally {
      setSaving(false);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="lab-page">
      {saving && (
        <div className="saving-indicator">保存排序中...</div>
      )}
      {loading ? (
        <div className="loading">加载中...</div>
      ) : articles.length === 0 ? (
        <div className="empty-state">暂无实验室内容</div>
      ) : (
        <div className="lab-list">
          {articles.map((article, index) => {
            const coverImage = getCoverImage(article);
            const tags = getArticleTags(article);
            const canDrag = isAuthor(article);
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <article
                key={article.id}
                className={`lab-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${canDrag ? 'draggable' : ''}`}
                draggable={canDrag || undefined}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="lab-card">
                  <Link
                    to={`/article/${article.id}`}
                    className="lab-card-main"
                    onClick={(e) => {
                      if (draggedIndex !== null) {
                        e.preventDefault();
                      }
                    }}
                  >
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
                          onClick={handleActionClick}
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
                          onClick={handleActionClick}
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
    </div>
  );
}
