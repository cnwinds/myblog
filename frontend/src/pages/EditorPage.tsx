import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articleService } from '../services/article';
import { ImagePlan } from '../services/ai';
import { draftStorage } from '../services/settings';
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
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // 使用 ref 来跟踪自动保存
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      const articleId = parseInt(id, 10);
      if (!isNaN(articleId)) {
        loadArticle(articleId);
      }
    } else {
      // 新建文章时，检查是否有草稿
      const draft = draftStorage.getDraft();
      if (draft && !restoredDraft) {
        setShowDraftRestore(true);
      }
    }
  }, [isEdit, id, restoredDraft]);

  // 自动保存草稿
  useEffect(() => {
    if (!isEdit && (title || content)) {
      // 清除之前的定时器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // 设置新的定时器，2秒后保存
      autoSaveTimerRef.current = setTimeout(() => {
        draftStorage.saveDraft(title, content, imagePlans);
      }, 2000);
    }

    // 清理函数
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, imagePlans, isEdit]);

  // 页面卸载时保存草稿
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isEdit && (title || content)) {
        draftStorage.saveDraft(title, content, imagePlans);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, content, imagePlans, isEdit]);

  const loadArticle = async (articleId: number) => {
    setLoading(true);
    try {
      const article = await articleService.getArticle(articleId);
      setTitle(article.title);
      setContent(article.content);
      
      if (article.imagePlans) {
        try {
          const parsed = JSON.parse(article.imagePlans);
          setImagePlans(Array.isArray(parsed) ? parsed : null);
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

  // 恢复草稿
  const handleRestoreDraft = () => {
    const draft = draftStorage.getDraft();
    if (draft) {
      setTitle(draft.title);
      setContent(draft.content);
      setImagePlans(draft.imagePlans);
      setRestoredDraft(true);
      setShowDraftRestore(false);
    }
  };

  // 清除草稿
  const handleClearDraft = () => {
    if (window.confirm('确定要清除草稿吗？此操作不可撤销。')) {
      draftStorage.clearDraft();
      setTitle('');
      setContent('');
      setImagePlans(null);
      setRestoredDraft(true);
      setShowDraftRestore(false);
    }
  };

  // 忽略草稿
  const handleIgnoreDraft = () => {
    setShowDraftRestore(false);
    setRestoredDraft(true);
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
        // 新建文章发布成功后，清除草稿
        draftStorage.clearDraft();
      }
      navigate('/');
    } catch (err) {
      let errorMessage = '保存失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        const errorObj = err as { response?: { data?: { error?: string } } };
        errorMessage = errorObj?.response?.data?.error || '保存失败';
      }
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
      {showDraftRestore && !isEdit && (
        <div className="draft-restore-banner">
          <div className="draft-restore-content">
            <span className="draft-restore-message">
              检测到未保存的草稿，是否恢复？
            </span>
            <div className="draft-restore-actions">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="btn btn-sm btn-primary"
              >
                恢复草稿
              </button>
              <button
                type="button"
                onClick={handleClearDraft}
                className="btn btn-sm btn-secondary"
              >
                清除草稿
              </button>
              <button
                type="button"
                onClick={handleIgnoreDraft}
                className="btn btn-sm btn-link"
              >
                忽略
              </button>
            </div>
          </div>
        </div>
      )}
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
              {!isEdit && (title || content) && (
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="btn btn-sm btn-secondary"
                  title="清除草稿"
                >
                  <span>重置</span>
                </button>
              )}
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
