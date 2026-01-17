import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { articleService, Article } from '../services/article';
import { formatChinaDate } from '../utils/dateUtils';
import './DraftsPage.css';

export default function DraftsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const data = await articleService.getUnpublishedArticles();
      setArticles(data);
    } catch (error) {
      console.error('Failed to load drafts:', error);
      alert('加载草稿失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`确定要删除草稿《${title}》吗？此操作不可撤销。`)) {
      return;
    }

    try {
      await articleService.deleteArticle(id);
      setArticles(articles.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete draft:', error);
      alert('删除失败');
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  const formatDate = (dateString: string) => {
    return formatChinaDate(dateString, 'zh-CN');
  };

  // 提取摘要
  const extractExcerpt = (content: string) => {
    let textWithoutImages = content
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
    
    if (firstNonEmptyLine.length > 150) {
      return firstNonEmptyLine.substring(0, 150) + '...';
    }
    
    return firstNonEmptyLine || '暂无预览内容';
  };

  return (
    <div className="drafts-page">
      <div className="drafts-header">
        <h1>草稿箱</h1>
        <div className="drafts-actions">
          <button
            onClick={() => navigate('/editor')}
            className="btn btn-primary"
          >
            新建文章
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            返回首页
          </button>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="empty-state">
          <p>暂无草稿</p>
          <button
            onClick={() => navigate('/editor')}
            className="btn btn-primary"
          >
            创建新文章
          </button>
        </div>
      ) : (
        <div className="drafts-list">
          {articles.map((article) => (
            <div key={article.id} className="draft-item">
              <div className="draft-content">
                <Link to={`/edit/${article.id}`}>
                  <h2 className="draft-title">{article.title}</h2>
                  <p className="draft-excerpt">
                    {extractExcerpt(article.content)}
                  </p>
                  <div className="draft-meta">
                    <span className="draft-date">
                      最后更新：{formatDate(article.updatedAt)}
                    </span>
                    {article.category && (
                      <span className="draft-category">
                        {article.category === 'lab' ? '实验室' : '博客'}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
              <div className="draft-actions">
                <button
                  onClick={() => navigate(`/edit/${article.id}`)}
                  className="btn btn-sm btn-primary"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(article.id, article.title)}
                  className="btn btn-sm btn-danger"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
