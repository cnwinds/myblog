import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { articleService, Article } from '../../services/article';
import './ArticleList.css';

export default function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const data = await articleService.getArticles();
      setArticles(data);
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (articles.length === 0) {
    return <div className="empty-state">暂无文章</div>;
  }

  return (
    <div className="article-list">
      {articles.map((article) => (
        <article key={article.id} className="article-item">
          <Link to={`/article/${article.id}`}>
            <h2>{article.title}</h2>
            <div className="article-meta">
              <span>{new Date(article.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
            <p className="article-excerpt">
              {article.content.substring(0, 150)}...
            </p>
          </Link>
        </article>
      ))}
    </div>
  );
}
