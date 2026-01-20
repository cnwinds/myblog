import { useState } from 'react';
import { articleService } from '../../services/article';
import './ArticleFetcher.css';

interface ArticleFetcherProps {
  onFetch: (title: string, content: string) => void;
  onClose: () => void;
}

export default function ArticleFetcher({ onFetch, onClose }: ArticleFetcherProps) {
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    if (!url.trim()) {
      setError('请输入文章URL');
      return;
    }

    // 简单的URL验证
    try {
      new URL(url);
    } catch {
      setError('请输入有效的URL');
      return;
    }

    setFetching(true);
    setError('');

    try {
      const result = await articleService.fetchArticleFromUrl(url);
      onFetch(result.title, result.content);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || '获取文章内容失败，请重试');
    } finally {
      setFetching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !fetching) {
      handleFetch();
    }
  };

  return (
    <div className="article-fetcher-overlay" onClick={onClose}>
      <div className="article-fetcher-modal" onClick={(e) => e.stopPropagation()}>
        <div className="article-fetcher-header">
          <h3>获取文章内容</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="article-fetcher-content">
          <div className="url-section">
            <h4>输入文章URL</h4>
            <input
              type="text"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              className="url-input"
              disabled={fetching}
              autoFocus
            />
            <button
              onClick={handleFetch}
              className="btn btn-primary fetch-btn"
              disabled={!url.trim() || fetching}
            >
              <span>{fetching ? '获取中...' : '获取内容'}</span>
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="help-text">
            <p>提示：</p>
            <ul>
              <li>支持大多数常见的文章网站</li>
              <li>会自动提取文章标题和内容</li>
              <li>图片链接会自动转换为Markdown格式</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
