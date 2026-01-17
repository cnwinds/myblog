import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { articleService, Article } from '../../services/article';
import { useAuth } from '../../hooks/useAuth';
import './LabList.css';

export default function LabList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const data = await articleService.getArticles('lab');
      setArticles(data);
    } catch (error) {
      console.error('Failed to load lab articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (articles.length === 0) {
    return <div className="empty-state">暂无实验室内容</div>;
  }

  // 从内容中提取第一张图片URL
  const extractFirstImage = (content: string): string | null => {
    // 先尝试从imagePlans中获取图片
    // 然后从markdown内容中提取图片
    const imageRegex = /!\[([^\]]*)\]\(([^\)]+)\)/;
    const match = content.match(imageRegex);
    if (match && match[2]) {
      return match[2];
    }
    return null;
  };

  // 提取摘要（跳过图片后的第一行内容）
  const extractExcerpt = (content: string) => {
    // 先移除所有 Markdown 图片标记
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
    
    // 如果第一行太长，适当截断（保留200字符左右）
    if (firstNonEmptyLine.length > 200) {
      return firstNonEmptyLine.substring(0, 200) + '...';
    }
    
    return firstNonEmptyLine || '暂无预览内容';
  };

  // 尝试从imagePlans中获取封面图片
  const getCoverImage = (article: Article): string | null => {
    // 先尝试从imagePlans中获取第一张图片
    if (article.imagePlans) {
      try {
        const imagePlans = JSON.parse(article.imagePlans);
        if (Array.isArray(imagePlans) && imagePlans.length > 0) {
          const firstPlan = imagePlans[0];
          if (firstPlan.imageUrl) {
            return firstPlan.imageUrl;
          }
        }
      } catch (e) {
        // 解析失败，继续尝试从内容中提取
      }
    }
    // 从markdown内容中提取
    return extractFirstImage(article.content);
  };

  // 检查是否是文章作者
  const isAuthor = (article: Article) => {
    return isAuthenticated && user && user.id === article.authorId;
  };

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isAuthor(articles[index])) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    // 阻止链接的默认行为
    e.stopPropagation();
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // 拖拽进入
  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // 拖拽离开
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // 放置
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newArticles = [...articles];
    const draggedArticle = newArticles[draggedIndex];
    
    // 移除被拖拽的元素
    newArticles.splice(draggedIndex, 1);
    
    // 插入到新位置
    newArticles.splice(dropIndex, 0, draggedArticle);

    // 更新 sortOrder（使用索引作为 sortOrder）
    const updatedArticles = newArticles.map((article, index) => ({
      ...article,
      sortOrder: index,
    }));

    setArticles(updatedArticles);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // 保存排序
    setSaving(true);
    try {
      // 只更新被移动的文章和受影响范围内的文章
      const startIndex = Math.min(draggedIndex, dropIndex);
      const endIndex = Math.max(draggedIndex, dropIndex);
      const articlesToUpdate = updatedArticles.slice(startIndex, endIndex + 1);
      
      for (const article of articlesToUpdate) {
        await articleService.updateArticle(article.id, {
          sortOrder: article.sortOrder,
        });
      }
    } catch (error) {
      console.error('Failed to save sort order:', error);
      alert('保存排序失败');
      // 重新加载以恢复原始顺序
      loadArticles();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lab-list">
      {saving && (
        <div className="saving-indicator">保存排序中...</div>
      )}
      {articles.map((article, index) => {
        const coverImage = getCoverImage(article);
        const canDrag = isAuthor(article);
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;
        
        return (
          <article
            key={article.id}
            className={`lab-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${canDrag ? 'draggable' : ''}`}
            draggable={canDrag || undefined}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          >
            <Link 
              to={`/article/${article.id}`} 
              className="lab-link"
              onClick={(e) => {
                // 如果正在拖拽，阻止链接导航
                if (draggedIndex !== null) {
                  e.preventDefault();
                }
              }}
            >
              <div 
                className="lab-card"
                style={coverImage ? {
                  backgroundImage: `url(${coverImage})`,
                } : undefined}
              >
                <div className="lab-card-overlay"></div>
                <div className="lab-card-content">
                  <h2 className="lab-title">{article.title}</h2>
                  <p className="lab-excerpt">
                    {extractExcerpt(article.content)}
                  </p>
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
