import { useState } from 'react';
import { uploadService } from '../../services/upload';
import './ImageUpload.css';

interface ImageUploadProps {
  onInsert: (markdown: string) => void;
  onClose: () => void;
}

export default function ImageUpload({ onInsert, onClose }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const url = await uploadService.uploadImage(file);
      const markdown = `![${file.name}](${url})`;
      onInsert(markdown);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlInsert = () => {
    if (!imageUrl.trim()) {
      setError('请输入图片URL');
      return;
    }

    const markdown = `![图片](${imageUrl})`;
    onInsert(markdown);
    onClose();
  };

  return (
    <div className="image-upload-overlay" onClick={onClose}>
      <div className="image-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="image-upload-header">
          <h3>插入图片</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="image-upload-content">
          <div className="upload-section">
            <h4>方式一：上传图片</h4>
            <label className="upload-btn">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading ? '上传中...' : '选择图片'}
            </label>
          </div>
          <div className="divider">或</div>
          <div className="url-section">
            <h4>方式二：输入URL</h4>
            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="url-input"
            />
            <button
              onClick={handleUrlInsert}
              className="btn btn-primary insert-btn"
              disabled={!imageUrl.trim()}
            >
              <span>插入</span>
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    </div>
  );
}
