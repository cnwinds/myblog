import { useState, useEffect, useRef } from 'react';
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
  const [category, setCategory] = useState<'blog' | 'lab'>('blog');
  const [imagePlans, setImagePlans] = useState<ImagePlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<number | null>(isEdit && id ? parseInt(id, 10) : null);
  const [autoSaving, setAutoSaving] = useState(false);

  // 使用 ref 来跟踪自动保存
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{ title: string; content: string; category: string }>({ title: '', content: '', category: '' });
  const currentValuesRef = useRef<{ title: string; content: string; category: string; imagePlans: ImagePlan[] | null; articleId: number | null }>({
    title: '',
    content: '',
    category: 'blog',
    imagePlans: null,
    articleId: null,
  });
  const isPublishingRef = useRef<boolean>(false); // 标记是否正在发布

  useEffect(() => {
    if (isEdit && id) {
      const articleId = parseInt(id, 10);
      if (!isNaN(articleId)) {
        setCurrentArticleId(articleId);
        loadArticle(articleId);
      }
    }
  }, [isEdit, id]);

  // 更新当前值引用
  useEffect(() => {
    currentValuesRef.current = {
      title,
      content,
      category,
      imagePlans,
      articleId: currentArticleId,
    };
  }, [title, content, category, imagePlans, currentArticleId]);

  // 每分钟自动保存草稿到数据库
  useEffect(() => {
    // 如果标题和内容都为空，不保存
    if (!title.trim() && !content.trim()) {
      return;
    }

    // 如果正在发布，不自动保存
    if (isPublishingRef.current) {
      return;
    }

    // 设置定时器，每分钟自动保存一次
    const intervalId = setInterval(async () => {
      // 再次检查是否正在发布
      if (isPublishingRef.current) {
        return;
      }
      // 检查是否有内容
      if (!title.trim() && !content.trim()) {
        return;
      }
      await autoSaveDraft();
    }, 60000); // 60秒 = 1分钟

    // 清理函数
    return () => {
      clearInterval(intervalId);
    };
  }, [title, content, category, imagePlans, currentArticleId]);

  // 页面卸载时保存草稿
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 如果正在发布，不保存草稿
      if (isPublishingRef.current) {
        return;
      }
      const values = currentValuesRef.current;
      if (values.title.trim() || values.content.trim()) {
        // 页面卸载时立即保存草稿
        autoSaveDraft().catch(() => {
          // 忽略错误
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 组件卸载时也尝试保存，但如果正在发布则不保存
      if (isPublishingRef.current) {
        return;
      }
      const values = currentValuesRef.current;
      if (values.title.trim() || values.content.trim()) {
        autoSaveDraft().catch(() => {
          // 忽略错误
        });
      }
    };
  }, []);

  const loadArticle = async (articleId: number) => {
    setLoading(true);
    try {
      let article;
      try {
        // 先尝试获取已发布的文章
        article = await articleService.getArticle(articleId);
      } catch (err) {
        // 如果获取失败，可能是未发布的文章，尝试从未发布列表中查找
        const unpublishedArticles = await articleService.getUnpublishedArticles();
        article = unpublishedArticles.find(a => a.id === articleId);
        if (!article) {
          throw new Error('文章不存在或无权访问');
        }
      }
      
      setTitle(article.title);
      setContent(article.content);
      setCategory((article.category as 'blog' | 'lab') || 'blog');
      
      // 更新最后保存的内容
      lastSavedRef.current = {
        title: article.title,
        content: article.content,
        category: (article.category as 'blog' | 'lab') || 'blog',
      };
      
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

  // 自动保存草稿到数据库（每分钟执行一次）
  const autoSaveDraft = async () => {
    // 如果正在发布，不执行自动保存
    if (isPublishingRef.current) {
      return;
    }

    // 如果标题和内容都为空，不保存
    if (!title.trim() && !content.trim()) {
      return;
    }

    // 防止重复保存
    if (autoSaving) {
      return;
    }

    setAutoSaving(true);
    try {
      const articleData = {
        title: title.trim() || '未命名文章',
        content,
        category,
        imagePlans: imagePlans || undefined,
        published: false, // 自动保存始终为草稿
      };

      if (currentArticleId) {
        // 检查文章当前状态
        try {
          // 先尝试获取已发布的文章
          const publishedArticle = await articleService.getArticle(currentArticleId);
          // 如果文章已经发布，不自动保存（避免覆盖已发布的内容）
          if (publishedArticle && publishedArticle.published === 1) {
            return;
          }
        } catch (err) {
          // 如果获取失败，说明是草稿，继续保存
        }

        // 更新草稿（只更新内容，published 保持为 false）
        await articleService.updateArticle(currentArticleId, articleData);
      } else {
        // 创建新草稿
        const newArticle = await articleService.createArticle(articleData);
        setCurrentArticleId(newArticle.id);
        currentValuesRef.current.articleId = newArticle.id;
        // 更新URL但不刷新页面
        window.history.replaceState(null, '', `/edit/${newArticle.id}`);
      }

      console.log('草稿已自动保存');
    } catch (err) {
      console.error('自动保存草稿失败:', err);
      // 自动保存失败不显示错误提示，避免打扰用户
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSaveImagePlans = async (plans: ImagePlan[]) => {
    if (!currentArticleId) return;

    try {
      await articleService.updateArticle(currentArticleId, {
        imagePlans: plans
      });
      setImagePlans(plans);
    } catch (error) {
      console.error('Failed to save image plans:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!title.trim() && !content.trim()) {
      alert('请填写标题或内容');
      return;
    }

    setSaving(true);
    try {
      const articleData = {
        title: title.trim() || '未命名文章',
        content,
        category,
        imagePlans: imagePlans || undefined,
        published: false, // 保存为草稿
      };

      let savedArticleId = currentArticleId;
      if (currentArticleId) {
        // 更新现有文章
        await articleService.updateArticle(currentArticleId, articleData);
      } else {
        // 创建新草稿
        const newArticle = await articleService.createArticle(articleData);
        savedArticleId = newArticle.id;
        setCurrentArticleId(newArticle.id);
        currentValuesRef.current.articleId = newArticle.id;
        // 更新URL但不刷新页面
        window.history.replaceState(null, '', `/edit/${newArticle.id}`);
      }

      // 更新最后保存的内容
      lastSavedRef.current = {
        title,
        content,
        category,
      };

      alert('草稿已保存');
    } catch (err) {
      let errorMessage = '保存草稿失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        const errorObj = err as { response?: { data?: { error?: string } } };
        errorMessage = errorObj?.response?.data?.error || '保存草稿失败';
      }
      alert(errorMessage);
      console.error('Failed to save draft:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    // 设置发布标志，阻止自动保存
    isPublishingRef.current = true;

    setSaving(true);
    try {
      const articleData = {
        title,
        content,
        category,
        imagePlans: imagePlans || undefined,
        published: true, // 发布，转为正式文章
      };

      let publishedArticleId = currentArticleId;
      if (currentArticleId) {
        // 更新现有文章，将 published 设置为 true
        await articleService.updateArticle(currentArticleId, articleData);
      } else {
        // 创建新文章并直接发布
        const newArticle = await articleService.createArticle(articleData);
        publishedArticleId = newArticle.id;
      }

      // 更新当前值引用
      if (publishedArticleId) {
        currentValuesRef.current.articleId = publishedArticleId;
      }

      // 根据文章分类导航到对应页面
      const targetPath = category === 'lab' ? '/lab' : '/';
      navigate(targetPath);
    } catch (err) {
      // 发布失败，重置发布标志
      isPublishingRef.current = false;
      let errorMessage = '发布失败';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        const errorObj = err as { response?: { data?: { error?: string } } };
        errorMessage = errorObj?.response?.data?.error || '发布失败';
      }
      alert(errorMessage);
      console.error('Failed to publish article:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="editor-page">
      {autoSaving && (
        <div className="auto-save-indicator">
          <span>自动保存中...</span>
        </div>
      )}
      <div className="editor-container">
        <form onSubmit={handlePublish}>
          <div className="editor-header">
            <div className="editor-title-section">
              <input
                type="text"
                placeholder="文章标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="title-input"
                required
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'blog' | 'lab')}
                className="category-select"
              >
                <option value="blog">博客</option>
                <option value="lab">实验室</option>
              </select>
            </div>
            <div className="editor-actions">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary"
              >
                <span>取消</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="btn btn-secondary"
              >
                <span>{saving ? '保存中...' : '保存草稿'}</span>
              </button>
              <button
                type="submit"
                onClick={handlePublish}
                disabled={saving}
                className="btn btn-primary"
              >
                <span>{saving ? '发布中...' : currentArticleId ? '更新并发布' : '发布'}</span>
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
