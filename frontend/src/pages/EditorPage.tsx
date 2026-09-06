import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { articleService } from '../services/article';
import { type ImagePlan } from '../services/ai';
import MarkdownEditor from '../components/Editor/MarkdownEditor';
import { getErrorMessage } from '../utils/errorHandler';
import './EditorPage.css';

type Category = 'blog' | 'lab';

interface ArticleFormData {
  title: string;
  content: string;
  category: Category;
  excerpt: string;
  imagePlans: ImagePlan[] | null;
  demoUrl: string;
  repoUrl: string;
  tags: string[];
}

function createArticleSnapshot(data: ArticleFormData): string {
  return JSON.stringify({
    title: data.title.trim(),
    content: data.content,
    category: data.category,
    excerpt: data.excerpt.trim(),
    imagePlans: data.imagePlans || null,
    demoUrl: data.demoUrl.trim(),
    repoUrl: data.repoUrl.trim(),
    tags: data.tags,
  });
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState<Category>('blog');
  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [imagePlans, setImagePlans] = useState<ImagePlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<number | null>(isEdit && id ? parseInt(id, 10) : null);
  const [autoSaving, setAutoSaving] = useState(false);

  // 使用 ref 来跟踪自动保存
  const lastSavedSnapshotRef = useRef<string>('');
  const currentValuesRef = useRef<ArticleFormData & { articleId: number | null }>({
    title: '',
    content: '',
    category: 'blog',
    excerpt: '',
    imagePlans: null,
    demoUrl: '',
    repoUrl: '',
    tags: [],
    articleId: null,
  });
  const isPublishingRef = useRef<boolean>(false); // 标记是否正在发布
  const isCurrentArticlePublishedRef = useRef<boolean>(false);
  const autoSavingRef = useRef<boolean>(false);

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
      excerpt,
      imagePlans,
      demoUrl,
      repoUrl,
      tags,
      articleId: currentArticleId,
    };
  }, [title, content, category, excerpt, imagePlans, demoUrl, repoUrl, tags, currentArticleId]);

  const autoSaveDraft = useCallback(async () => {
    if (isPublishingRef.current || isCurrentArticlePublishedRef.current || autoSavingRef.current) {
      return;
    }

    const values = currentValuesRef.current;
    if (!values.title.trim() && !values.content.trim()) {
      return;
    }

    const currentSnapshot = createArticleSnapshot(values);
    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    autoSavingRef.current = true;
    setAutoSaving(true);

    try {
      const articleData = {
        title: values.title.trim() || '未命名文章',
        content: values.content,
        category: values.category,
        excerpt: values.excerpt || undefined,
        imagePlans: values.imagePlans || undefined,
        demoUrl: values.demoUrl || null,
        repoUrl: values.repoUrl || null,
        tags: values.tags,
        published: false as const,
      };

      const articleId = values.articleId;

      if (articleId) {
        await articleService.updateArticle(articleId, articleData);
      } else {
        const newArticle = await articleService.createArticle(articleData);
        const newArticleId = newArticle.id;

        setCurrentArticleId(newArticleId);
        currentValuesRef.current.articleId = newArticleId;
        window.history.replaceState(null, '', `/edit/${newArticleId}`);
      }

      lastSavedSnapshotRef.current = currentSnapshot;
      isCurrentArticlePublishedRef.current = false;
    } catch (err) {
      console.error('自动保存草稿失败:', err);
    } finally {
      autoSavingRef.current = false;
      setAutoSaving(false);
    }
  }, []);

  // 每分钟自动保存草稿到数据库
  useEffect(() => {
    // 设置定时器，每分钟自动保存一次
    const intervalId = setInterval(async () => {
      // 如果正在发布，不自动保存
      if (isPublishingRef.current) {
        return;
      }
      
      // 从 ref 获取最新值
      const values = currentValuesRef.current;
      
      // 检查是否有内容
      if (!values.title.trim() && !values.content.trim()) {
        return;
      }
      
      await autoSaveDraft();
    }, 60000); // 60秒 = 1分钟

    // 清理函数
    return () => {
      clearInterval(intervalId);
    };
  }, [autoSaveDraft]);

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
  }, [autoSaveDraft]);

  const loadArticle = async (articleId: number) => {
    setLoading(true);
    try {
      let article;
      let isPublishedArticle = false;
      try {
        // 先尝试获取已发布的文章
        article = await articleService.getArticle(articleId);
        isPublishedArticle = article.published === 1;
      } catch (err) {
        // 如果获取失败，可能是未发布的文章，尝试从未发布列表中查找
        const unpublishedArticles = await articleService.getUnpublishedArticles();
        article = unpublishedArticles.find(a => a.id === articleId);
        if (!article) {
          throw new Error('文章不存在或无权访问');
        }
      }

      let parsedImagePlans: ImagePlan[] | null = null;
      if (article.imagePlans) {
        try {
          const parsed = JSON.parse(article.imagePlans);
          parsedImagePlans = Array.isArray(parsed) ? parsed : null;
        } catch (err) {
          console.warn('Failed to parse imagePlans:', err);
        }
      }
      
      const loadedTags = Array.isArray(article.tags) ? article.tags : [];

      setTitle(article.title);
      setContent(article.content);
      setExcerpt(article.excerpt || '');
      setCategory((article.category as Category) || 'blog');
      setDemoUrl(article.demoUrl || '');
      setRepoUrl(article.repoUrl || '');
      setTags(loadedTags);
      setTagDraft('');
      setImagePlans(parsedImagePlans);
      
      const loadedFormData: ArticleFormData = {
        title: article.title,
        content: article.content,
        category: (article.category as Category) || 'blog',
        excerpt: article.excerpt || '',
        imagePlans: parsedImagePlans,
        demoUrl: article.demoUrl || '',
        repoUrl: article.repoUrl || '',
        tags: loadedTags,
      };

      lastSavedSnapshotRef.current = createArticleSnapshot(loadedFormData);
      isCurrentArticlePublishedRef.current = isPublishedArticle;
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
    setImagePlans(plans);

    const nextValues = {
      ...currentValuesRef.current,
      imagePlans: plans,
    };
    currentValuesRef.current = nextValues;

    if (!currentArticleId) {
      return;
    }

    try {
      await articleService.updateArticle(currentArticleId, {
        imagePlans: plans
      });
      lastSavedSnapshotRef.current = createArticleSnapshot(nextValues);
    } catch (error) {
      console.error('Failed to save image plans:', error);
    }
  };

  // 处理从URL获取的文章内容
  const handleFetchArticle = useCallback((fetchedTitle: string, fetchedContent: string) => {
    setTitle(fetchedTitle);
    setContent(fetchedContent);
  }, []);

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
        excerpt: excerpt || undefined,
        imagePlans: imagePlans || undefined,
        demoUrl: demoUrl || null,
        repoUrl: repoUrl || null,
        tags,
        published: false, // 保存为草稿
      };

      if (currentArticleId) {
        // 更新现有文章
        await articleService.updateArticle(currentArticleId, articleData);
      } else {
        // 创建新草稿
        const newArticle = await articleService.createArticle(articleData);
        setCurrentArticleId(newArticle.id);
        currentValuesRef.current.articleId = newArticle.id;
        // 更新URL但不刷新页面
        window.history.replaceState(null, '', `/edit/${newArticle.id}`);
      }

      lastSavedSnapshotRef.current = createArticleSnapshot({
        title,
        content,
        category,
        excerpt,
        imagePlans,
        demoUrl,
        repoUrl,
        tags,
      });
      isCurrentArticlePublishedRef.current = false;

      alert('草稿已保存');
    } catch (err) {
      const errorMessage = getErrorMessage(err, '保存草稿失败');
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
        excerpt: excerpt || undefined,
        imagePlans: imagePlans || undefined,
        demoUrl: demoUrl || null,
        repoUrl: repoUrl || null,
        tags,
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
      lastSavedSnapshotRef.current = createArticleSnapshot({
        title,
        content,
        category,
        excerpt,
        imagePlans,
        demoUrl,
        repoUrl,
        tags,
      });
      isCurrentArticlePublishedRef.current = true;

      // 根据文章分类导航到对应页面
      const targetPath = category === 'lab' ? '/lab' : '/';
      navigate(targetPath);
    } catch (err) {
      // 发布失败，重置发布标志
      isPublishingRef.current = false;
      const errorMessage = getErrorMessage(err, '发布失败');
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
            <div className="editor-header-top">
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
                  onChange={(e) => setCategory(e.target.value as Category)}
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
                disabled={saving}
                className="btn btn-primary"
              >
                <span>{saving ? '发布中...' : currentArticleId ? '更新并发布' : '发布'}</span>
              </button>
              </div>
            </div>
            <div className="editor-excerpt-section">
              <textarea
                placeholder="文章摘要（可选，如果不填写则自动从文章开头提取）"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="excerpt-input"
                rows={2}
              />
            </div>
            {category === 'lab' && (
              <div className="lab-meta-section">
                <input
                  type="text"
                  placeholder="体验地址（demoUrl，可选）"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  className="lab-meta-input"
                />
                <input
                  type="text"
                  placeholder="GitHub 地址（repoUrl，可选）"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="lab-meta-input"
                />
                <div className="lab-tags-field">
                  <div className="lab-tag-chips">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="lab-tag-chip"
                        onClick={() => setTags(tags.filter((item) => item !== tag))}
                        title="移除标签"
                      >
                        {tag}
                        <span aria-hidden="true">×</span>
                      </button>
                    ))}
                    <input
                      type="text"
                      placeholder={tags.length === 0 ? '标签，逗号或回车添加，如 游戏,AI' : '继续添加标签'}
                      value={tagDraft}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/[,，]/.test(value)) {
                          const parts = value.split(/[,，]/);
                          const next = parts.slice(0, -1).map((item) => item.trim()).filter(Boolean);
                          if (next.length > 0) {
                            setTags(Array.from(new Set([...tags, ...next])));
                          }
                          setTagDraft(parts[parts.length - 1]);
                          return;
                        }
                        setTagDraft(value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const next = tagDraft.trim();
                          if (next) {
                            setTags(Array.from(new Set([...tags, next])));
                            setTagDraft('');
                          }
                        } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
                          setTags(tags.slice(0, -1));
                        }
                      }}
                      onBlur={() => {
                        const next = tagDraft.trim();
                        if (next) {
                          setTags(Array.from(new Set([...tags, next])));
                          setTagDraft('');
                        }
                      }}
                      className="lab-tag-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="editor-body">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="开始编写你的文章..."
              title={title}
              imagePlans={imagePlans || undefined}
              onSaveImagePlans={handleSaveImagePlans}
              onFetchArticle={handleFetchArticle}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
