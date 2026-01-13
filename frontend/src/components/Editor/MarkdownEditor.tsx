import { useState, useEffect, useRef } from 'react';
import { FiImage, FiZap } from 'react-icons/fi';
import MDEditor from '@uiw/react-md-editor';
import ImageUpload from './ImageUpload';
import ImageGenerator from './ImageGenerator';
import { uploadService } from '../../services/upload';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string; // 文章标题，用于图片生成
}

export default function MarkdownEditor({
  value,
  onChange,
  title = '',
}: MarkdownEditorProps) {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  const handleInsertImage = (markdown: string) => {
    const newValue = value + '\n' + markdown;
    onChange(newValue);
  };

  // 处理插入多张图片到指定位置
  const handleInsertImages = (
    images: Array<{ markdown: string; position: string }>
  ) => {
    if (images.length === 0) return;

    let newValue = value;
    const insertions: Array<{ index: number; markdown: string }> = [];

    // 先收集所有需要插入的图片及其位置
    images.forEach((image) => {
      const { markdown, position } = image;
      let insertIndex = -1;

      if (position.includes('开头') || position.includes('开始') || position.includes('封面')) {
        // 插入到文章开头
        insertIndex = 0;
      } else if (position.includes('结尾') || position.includes('结束') || position.includes('总结')) {
        // 插入到文章结尾
        insertIndex = -1; // -1 表示结尾
      } else {
        // 尝试解析位置，如"第X段后"、"第X部分后"等
        const match = position.match(/第(\d+)/);
        if (match) {
          const sectionNum = parseInt(match[1]);
          // 按段落分割，在指定段落后插入
          const paragraphs = newValue.split(/\n\s*\n/);
          if (sectionNum > 0 && sectionNum <= paragraphs.length) {
            // 计算插入位置（在指定段落之后）
            let currentIndex = 0;
            for (let i = 0; i < sectionNum; i++) {
              currentIndex += paragraphs[i].length;
              if (i < sectionNum - 1) {
                currentIndex += 2; // 加上两个换行符
              }
            }
            insertIndex = currentIndex;
          }
        }
      }

      insertions.push({ index: insertIndex, markdown });
    });

    // 按位置从后往前插入，避免索引变化
    insertions.sort((a, b) => {
      if (a.index === -1) return 1; // 结尾的放在最后处理
      if (b.index === -1) return -1;
      return b.index - a.index; // 从后往前
    });

    insertions.forEach(({ index, markdown }) => {
      if (index === -1) {
        // 插入到结尾
        newValue = newValue + '\n\n' + markdown;
      } else if (index === 0) {
        // 插入到开头
        newValue = markdown + '\n\n' + newValue;
      } else {
        // 插入到指定位置
        const before = newValue.substring(0, index);
        const after = newValue.substring(index);
        const prefix = before && !before.endsWith('\n') ? '\n\n' : '\n';
        newValue = before + prefix + markdown + '\n' + after;
      }
    });

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
        <button
          type="button"
          onClick={() => setShowImageGenerator(true)}
          className="btn btn-secondary toolbar-btn"
          title="AI图片生成助手"
        >
          <FiZap />
          <span>AI图片生成</span>
        </button>
        {uploading && (
          <span className="uploading-indicator">📤 上传中...</span>
        )}
      </div>
      <div className="editor-content" data-color-mode={theme}>
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
      {showImageGenerator && (
        <ImageGenerator
          title={title}
          content={value}
          onInsertImages={handleInsertImages}
          onClose={() => setShowImageGenerator(false)}
        />
      )}
    </div>
  );
}
