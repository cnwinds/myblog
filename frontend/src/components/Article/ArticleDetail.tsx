import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { articleService, Article } from '../../services/article';
import { useAuth } from '../../hooks/useAuth';
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
    if (!article || !window.confirm('确定要删除这篇文章吗？')) {
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
          <span>{new Date(article.createdAt).toLocaleString('zh-CN')}</span>
          {article.updatedAt !== article.createdAt && (
            <span className="updated">
              更新于 {new Date(article.updatedAt).toLocaleString('zh-CN')}
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
