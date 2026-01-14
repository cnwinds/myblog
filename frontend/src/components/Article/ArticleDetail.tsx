import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { articleService, Article } from '../../services/article';
import { useAuth } from '../../hooks/useAuth';
import { formatChinaDateTime } from '../../utils/dateUtils';
import './ArticleDetail.css';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadArticle(parseInt(id));
    }
  }, [id]);

  const loadArticle = async (articleId: number) => {
    try {
      const data = await articleService.getArticle(articleId);
      setArticle(data);
    } catch (error) {
      console.error('Failed to load article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!article) {
      return;
    }

    // 第一次确认
    const firstConfirm = window.confirm(
      `确定要删除文章《${article.title}》吗？\n\n此操作不可撤销！`
    );
    if (!firstConfirm) {
      return;
    }

    // 第二次确认
    const secondConfirm = window.confirm(
      `请再次确认：您真的要删除文章《${article.title}》吗？\n\n删除后将无法恢复！`
    );
    if (!secondConfirm) {
      return;
    }

    try {
      await articleService.deleteArticle(article.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('删除失败');
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!article) {
    return <div className="error">文章不存在</div>;
  }

  const isAuthor = isAuthenticated && user?.id === article.authorId;

  return (
    <div className="article-detail">
      <div className="article-header">
        <Link to="/" className="back-link">← 返回列表</Link>
        {isAuthor && (
          <div className="article-actions">
            <Link to={`/edit/${article.id}`} className="btn btn-primary edit-btn">
              <span>编辑</span>
            </Link>
            <button onClick={handleDelete} className="btn btn-danger delete-btn">
              <span>删除</span>
            </button>
          </div>
        )}
      </div>
      <article className="article-content">
        <h1>{article.title}</h1>
        <div className="article-meta">
          <span>{formatChinaDateTime(article.createdAt)}</span>
          {article.updatedAt !== article.createdAt && (
            <span className="updated">
              更新于 {formatChinaDateTime(article.updatedAt)}
            </span>
          )}
        </div>
        <div className="markdown-body">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </article>
    </div>
  );
}
