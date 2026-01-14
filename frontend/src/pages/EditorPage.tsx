import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articleService } from '../services/article';
import { ImagePlan } from '../services/ai';
import MarkdownEditor from '../components/Editor/MarkdownEditor';
import './EditorPage.css';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imagePlans, setImagePlans] = useState<ImagePlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const articleId = parseInt(id, 10);
      if (!isNaN(articleId)) {
        loadArticle(articleId);
      }
    }
  }, [isEdit, id]);

  const loadArticle = async (articleId: number) => {
    setLoading(true);
    try {
      const article = await articleService.getArticle(articleId);
      setTitle(article.title);
      setContent(article.content);
      
      if (article.imagePlans) {
        try {
          const plans = JSON.parse(article.imagePlans) as ImagePlan[];
          setImagePlans(Array.isArray(plans) ? plans : null);
        } catch (err) {
          console.warn('Failed to parse imagePlans:', err);
          setImagePlans(null);
        }
      } else {
        setImagePlans(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载文章失败';
      alert(errorMessage);
      console.error('Failed to load article:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImagePlans = async (plans: ImagePlan[]) => {
    if (!isEdit || !id) return;
    
    try {
      await articleService.updateArticle(parseInt(id, 10), { 
        imagePlans: plans 
      });
      setImagePlans(plans);
    } catch (error) {
      console.error('Failed to save image plans:', error);
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
      const articleData = {
        title,
        content,
        imagePlans: imagePlans || undefined,
      };

      if (isEdit && id) {
        const articleId = parseInt(id, 10);
        if (isNaN(articleId)) {
          throw new Error('无效的文章ID');
        }
        await articleService.updateArticle(articleId, articleData);
      } else {
        await articleService.createArticle(articleData);
      }
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || '保存失败';
      alert(errorMessage);
      console.error('Failed to save article:', err);
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
              title={title}
              imagePlans={imagePlans || undefined}
              onSaveImagePlans={handleSaveImagePlans}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
