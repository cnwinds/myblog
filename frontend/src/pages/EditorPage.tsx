import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { articleService } from '../services/article';
import MarkdownEditor from '../components/Editor/MarkdownEditor';
import './EditorPage.css';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 如果是编辑模式，加载文章
    if (isEdit && id) {
      loadArticle(parseInt(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  const loadArticle = async (articleId: number) => {
    setLoading(true);
    try {
      const article = await articleService.getArticle(articleId);
      setTitle(article.title);
      setContent(article.content);
    } catch (error) {
      console.error('Failed to load article:', error);
      alert('加载文章失败');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && id) {
        await articleService.updateArticle(parseInt(id), { title, content });
      } else {
        await articleService.createArticle({ title, content });
      }
      navigate('/');
    } catch (error: any) {
      console.error('Failed to save article:', error);
      alert(error.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="editor-page">
      <div className="editor-container">
        <form onSubmit={handleSubmit}>
          <div className="editor-header">
            <input
              type="text"
              placeholder="文章标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-input"
              required
            />
            <div className="editor-actions">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary"
              >
                <span>取消</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
              >
                <span>{saving ? '保存中...' : isEdit ? '更新' : '发布'}</span>
              </button>
            </div>
          </div>
          <div className="editor-body">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="开始编写你的文章..."
            />
          </div>
        </form>
      </div>
    </div>
  );
}
