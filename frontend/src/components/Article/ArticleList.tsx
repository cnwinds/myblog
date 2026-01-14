import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { articleService, Article } from '../../services/article';
import { formatChinaDate } from '../../utils/dateUtils';
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
  // 使用 formatChinaDate 确保使用中国时区
  const formatDate = (dateString: string) => {
    return formatChinaDate(dateString, 'en-US');
  };

  // 提取摘要（跳过图片后的第一行内容）
  const extractExcerpt = (content: string) => {
    // 先移除所有 Markdown 图片标记（包括 ![alt](url) 和 ![](url)）
    let textWithoutImages = content
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // 移除图片标记
      .replace(/^#+\s+/gm, '') // 移除标题标记
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体
      .replace(/\*(.*?)\*/g, '$1') // 移除斜体
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接，保留文本
      .replace(/`([^`]+)`/g, '$1') // 移除代码标记
      .trim();
    
    // 按行分割，找到第一个非空行（跳过图片后的第一行内容）
    const lines = textWithoutImages.split(/\r?\n/);
    let firstNonEmptyLine = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // 跳过空行和只包含空白字符的行
      if (trimmedLine.length > 0) {
        firstNonEmptyLine = trimmedLine;
        break;
      }
    }
    
    // 如果第一行太长，适当截断（保留150字符左右）
    if (firstNonEmptyLine.length > 150) {
      return firstNonEmptyLine.substring(0, 150) + '...';
    }
    
    return firstNonEmptyLine || '暂无预览内容';
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
