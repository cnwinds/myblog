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

  // 格式化日期为 "Month Day, Year" 格式（如 "January 11, 2026"）
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  // 提取摘要（只显示第一行内容）
  const extractExcerpt = (content: string) => {
    // 先移除 Markdown 格式标记
    let plainText = content
      .replace(/^#+\s+/gm, '') // 移除标题标记
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
      .replace(/\*(.*?)\*/g, '$1') // 移除斜体
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接，保留文本
      .replace(/`([^`]+)`/g, '$1') // 移除代码标记
      .trim();
    
    // 获取第一行（遇到换行符就停止）
    const firstLine = plainText.split(/\r?\n/)[0].trim();
    
    // 如果第一行太长，适当截断（保留150字符左右）
    if (firstLine.length > 150) {
      return firstLine.substring(0, 150) + '...';
    }
    
    return firstLine || '暂无预览内容';
  };

  return (
    <div className="article-list">
      {articles.map((article) => (
        <article key={article.id} className="article-item">
          <Link to={`/article/${article.id}`}>
            <h2 className="article-title">{article.title}</h2>
            <p className="article-excerpt">
              {extractExcerpt(article.content)}
            </p>
            <div className="article-date">
              {formatDate(article.createdAt)}
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
