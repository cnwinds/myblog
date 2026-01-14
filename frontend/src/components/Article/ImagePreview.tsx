import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import './ImagePreview.css';

interface ImagePreviewProps {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreview({ imageUrl, onClose }: ImagePreviewProps) {
  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // 阻止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="image-preview-overlay" onClick={onClose}>
      <div className="image-preview-container" onClick={(e) => e.stopPropagation()}>
        <button className="image-preview-close" onClick={onClose} title="关闭 (ESC)">
          <FiX />
        </button>
        <img src={imageUrl} alt="预览" className="image-preview-image" />
      </div>
    </div>
  );
}
