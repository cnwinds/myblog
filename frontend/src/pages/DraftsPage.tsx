import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEdit3, FiPlus, FiTrash2 } from 'react-icons/fi';
import SiteLayout from '../components/Layout/SiteLayout';
import { articleService, Article } from '../services/article';
import { formatChinaDotDateTime } from '../utils/dateUtils';
import { formatIndex, getArticleExcerpt, readingMinutes } from '../utils/articleText';
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

  return (
    <SiteLayout section={null}>
      <div className="container drafts-page">
        <header className="drafts-hero">
          <div>
            <span className="eyebrow">Drafts · 还没吹出去的风</span>
            <h1>
              草稿箱 <span className="latin">Drafts.</span>
            </h1>
          </div>
          <div className="drafts-hero-side">
            {!loading && (
              <span className="mono drafts-count">
                {String(articles.length).padStart(2, '0')} <small>DRAFTS</small>
              </span>
            )}
            <button onClick={() => navigate('/editor')} className="btn btn-wind">
              <FiPlus />
              <span>新建文章</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : articles.length === 0 ? (
          <div className="empty-state drafts-empty">
            <p className="art">草稿箱空空的，风很安静。</p>
            <button onClick={() => navigate('/editor')} className="btn btn-primary">
              <FiEdit3 />
              <span>写点什么</span>
            </button>
          </div>
        ) : (
          <ol className="draft-list">
            {articles.map((article, index) => (
              <li key={article.id} className="draft-item" style={{ animationDelay: `${index * 60}ms` }}>
                <span className="draft-idx">{formatIndex(index + 1)}</span>
                <Link to={`/edit/${article.id}`} className="draft-main">
                  <div className="draft-meta mono">
                    <span className={`chip ${article.category === 'lab' ? 'chip-violet' : 'chip-coral'}`}>
                      {article.category === 'lab' ? '实验室' : '博客'}
                    </span>
                    <span>更新于 {formatChinaDotDateTime(article.updatedAt)}</span>
                    <span>约 {readingMinutes(article.content)} 分钟</span>
                  </div>
                  <h2>{article.title || '无标题草稿'}</h2>
                  <p>{getArticleExcerpt(article) || '暂无预览内容'}</p>
                </Link>
                <div className="draft-actions">
                  <button onClick={() => navigate(`/edit/${article.id}`)} className="btn btn-sm btn-secondary">
                    <FiEdit3 />
                    <span>编辑</span>
                  </button>
                  <button
                    onClick={() => handleDelete(article.id, article.title)}
                    className="icon-btn draft-delete"
                    aria-label={`删除草稿《${article.title}》`}
                    title="删除"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </SiteLayout>
  );
}
