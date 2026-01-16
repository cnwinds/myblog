import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { articleService, Article } from '../../services/article';
import { useAuth } from '../../hooks/useAuth';
import { formatChinaDateTime } from '../../utils/dateUtils';
import ImagePreview from './ImagePreview';
import './ArticleDetail.css';

const DELETE_CONFIRM_MESSAGES = {
  first: (title: string) => `确定要删除文章《${title}》吗？\n\n此操作不可撤销！`,
  second: (title: string) => `请再次确认：您真的要删除文章《${title}》吗？\n\n删除后将无法恢复！`,
} as const;

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
      loadArticle(articleId);
    }
  }, [id, loadArticle]);

  const handleDelete = useCallback(async () => {
    if (!article) return;

    const firstConfirm = window.confirm(DELETE_CONFIRM_MESSAGES.first(article.title));
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(DELETE_CONFIRM_MESSAGES.second(article.title));
    if (!secondConfirm) return;

    try {
      await articleService.deleteArticle(article.id);
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除失败';
      alert(errorMessage);
      console.error('Failed to delete article:', err);
    }
  }, [article, navigate]);

  const handleImageClick = useCallback((src: string) => {
    setPreviewImage(src);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  const markdownComponents: Components = {
    img: ({ src, alt, ...props }) => (
      <img
        {...props}
        src={src}
        onClick={() => src && handleImageClick(src)}
        style={{ cursor: 'pointer' }}
        alt={alt || '图片'}
      />
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote className="markdown-blockquote" {...props}>
        {children}
      </blockquote>
    ),
    a: ({ href, children, ...props }) => (
      <a
        {...props}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error || !article) {
    return <div className="error">{error || '文章不存在'}</div>;
  }

  const isAuthor = isAuthenticated && user?.id === article.authorId;
  const isUpdated = article.updatedAt !== article.createdAt;

  return (
    <div className="article-detail">
      <div className="article-header">
        <Link to="/" className="back-link">← 返回列表</Link>
        {isAuthor && (
          <div className="article-actions">
            <Link to={`/edit/${article.id}`} className="btn btn-primary edit-btn">
              <span>编辑</span>
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger delete-btn"
            >
              <span>删除</span>
            </button>
          </div>
        )}
      </div>
      <article className="article-content">
        <h1>{article.title}</h1>
        <div className="article-meta">
          <span>{formatChinaDateTime(article.createdAt)}</span>
          {isUpdated && (
            <span className="updated">
              更新于 {formatChinaDateTime(article.updatedAt)}
            </span>
          )}
        </div>
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
            {article.content}
          </ReactMarkdown>
        </div>
      </article>
      <div className="article-footer">
        <Link to="/" className="back-link">← 返回列表</Link>
      </div>
      {previewImage && (
        <ImagePreview imageUrl={previewImage} onClose={handleClosePreview} />
      )}
    </div>
  );
}
