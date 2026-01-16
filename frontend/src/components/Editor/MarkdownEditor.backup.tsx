import { useState, useEffect, useRef } from 'react';
import { FiImage } from 'react-icons/fi';
import MDEditor from '@uiw/react-md-editor';
import ImageUpload from './ImageUpload';
import { uploadService } from '../../services/upload';
import { useAuth } from '../../hooks/useAuth';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
}: MarkdownEditorProps) {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();

  const handleInsertImage = (markdown: string) => {
    const newValue = value + '\n' + markdown;
    onChange(newValue);
  };

  // 处理粘贴图片
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // 检查是否在编辑器区域内
      const container = containerRef.current;
      if (!container) return;

      const target = e.target as Node;
      if (!container.contains(target)) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // 查找图片类型的item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 检查是否是图片类型
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault(); // 阻止默认粘贴行为
          e.stopPropagation();

          // 检查用户是否已登录
          if (!isAuthenticated) {
            alert('请先登录后再上传图片');
            return;
          }

          const file = item.getAsFile();
          if (!file) continue;

          // 验证文件类型
          if (!file.type.startsWith('image/')) {
            continue;
          }

          setUploading(true);
          try {
            // 上传图片
            const imageUrl = await uploadService.uploadImage(file);

            // 获取当前光标位置
            const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
            let insertPos = value.length;

            if (textarea && (document.activeElement === textarea || container.contains(document.activeElement))) {
              insertPos = textarea.selectionStart || value.length;
            }

            // 在光标位置插入Markdown图片语法
            const before = value.substring(0, insertPos);
            const after = value.substring(insertPos);
            const prefix = before && !before.endsWith('\n') && before.length > 0 ? '\n' : '';
            const suffix = after && !after.startsWith('\n') ? '\n' : '';
            const markdown = `![图片](${imageUrl})`;
            const newValue = before + prefix + markdown + suffix + after;

            onChange(newValue);

            // 恢复光标位置（在插入内容之后）
            setTimeout(() => {
              if (textarea) {
                const newPos = insertPos + prefix.length + markdown.length + suffix.length;
                textarea.setSelectionRange(newPos, newPos);
                textarea.focus();
              }
            }, 0);
          } catch (error: any) {
            console.error('图片上传失败:', error);
            alert(error.response?.data?.error || '图片上传失败，请重试');
          } finally {
            setUploading(false);
          }
          break;
        }
      }
    };

    // 在document上添加粘贴事件监听（捕获阶段，确保能拦截到）
    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [value, onChange, isAuthenticated]);

  return (
    <div className="markdown-editor-container" ref={containerRef}>
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => setShowImageUpload(true)}
          className="btn btn-secondary toolbar-btn"
          title="插入图片"
        >
          <FiImage />
          <span>插入图片</span>
        </button>
        {uploading && (
          <span className="uploading-indicator">📤 上传中...</span>
        )}
      </div>
      <div className="editor-content" data-color-mode="light">
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          preview="edit"
          hideToolbar={false}
          visibleDragbar={false}
        />
      </div>
      {showImageUpload && (
        <ImageUpload
          onInsert={handleInsertImage}
          onClose={() => setShowImageUpload(false)}
        />
      )}
    </div>
  );
}
