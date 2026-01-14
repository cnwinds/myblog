import { useState, useEffect, useRef } from 'react';
import { FiImage, FiZap } from 'react-icons/fi';
import MDEditor from '@uiw/react-md-editor';
import ImageUpload from './ImageUpload';
import ImageGenerator from './ImageGenerator';
import { uploadService } from '../../services/upload';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { ImagePlan } from '../../services/ai';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title?: string;
  imagePlans?: ImagePlan[];
  onSaveImagePlans?: (imagePlans: ImagePlan[]) => void;
}

export default function MarkdownEditor({
  value,
  onChange,
  title = '',
  imagePlans,
  onSaveImagePlans,
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

  // 查找合适的插入位置（段落边界或句子边界）
  const findInsertPosition = (content: string, targetIndex: number): number => {
    // 如果目标位置已经是开头或结尾，直接返回
    if (targetIndex === 0) return 0;
    if (targetIndex >= content.length) return content.length;

    // 先尝试向前查找段落边界（两个连续换行符之间的位置）
    // 查找最近的 \n\n 或 \r\n\r\n
    let bestIndex = targetIndex;
    let foundParagraphBoundary = false;

    // 向前查找段落边界
    for (let i = targetIndex; i >= 0; i--) {
      if (i === 0) {
        bestIndex = 0;
        foundParagraphBoundary = true;
        break;
      }
      // 检查当前位置之后是否有段落分隔符
      const remaining = content.substring(i);
      if (remaining.match(/^\s*\n\s*\n/) || remaining.match(/^\s*\r\n\s*\r\n/)) {
        // 找到段落边界，定位到空行之后
        const match = remaining.match(/^(\s*\n\s*\n|\s*\r\n\s*\r\n)/);
        if (match) {
          bestIndex = i + match[0].length;
          foundParagraphBoundary = true;
          break;
        }
      }
    }

    // 如果没找到段落边界，尝试查找句子边界（句号、问号、感叹号后）
    if (!foundParagraphBoundary) {
      for (let i = targetIndex; i >= 0; i--) {
        if (i === 0) {
          bestIndex = 0;
          break;
        }
        const char = content[i];
        // 检查是否是句子结束符（句号、问号、感叹号）
        if (char === '。' || char === '？' || char === '！' || char === '.' || char === '?' || char === '!') {
          // 找到句子边界，定位到标点符号之后
          bestIndex = i + 1;
          // 跳过可能的空格和换行
          while (bestIndex < content.length && 
                 (content[bestIndex] === ' ' || content[bestIndex] === '\t' || content[bestIndex] === '\n' || content[bestIndex] === '\r')) {
            bestIndex++;
          }
          break;
        }
      }
    }

    return bestIndex;
  };

  // 处理插入多张图片到指定位置
  const handleInsertImages = (
    images: Array<{ markdown: string; position: string }>
  ) => {
    if (images.length === 0) {
      console.warn('没有图片需要插入');
      return;
    }

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
        // 尝试解析位置，如"第X段后"、"第X句后"等
        const match = position.match(/第(\d+)/);
        if (match) {
          const sectionNum = parseInt(match[1]);
          
          if (position.includes('段')) {
            // 按段落分割，在指定段落后插入
            // 使用更简单的方法：直接查找段落分隔符位置
            try {
              // 按段落分隔符分割（两个或更多换行符）
              const parts = newValue.split(/\n\s*\n/);
              
              // 验证分割结果
              if (parts.length === 0 || !Array.isArray(parts)) {
                console.warn('段落分割失败，使用结尾位置');
                insertIndex = -1;
              } else if (sectionNum > 0 && sectionNum <= parts.length) {
                // 计算目标段落结束位置
                let currentIndex = 0;
                for (let i = 0; i < sectionNum; i++) {
                  if (i < parts.length) {
                    currentIndex += parts[i].length;
                    // 如果不是最后一个段落，需要加上分隔符的长度
                    if (i < sectionNum - 1 && i < parts.length - 1) {
                      // 查找下一个段落分隔符
                      const remaining = newValue.substring(currentIndex);
                      const separatorMatch = remaining.match(/^\s*\n\s*\n/);
                      if (separatorMatch) {
                        currentIndex += separatorMatch[0].length;
                      }
                    }
                  }
                }
                
                // 验证索引有效性
                if (currentIndex >= 0 && currentIndex <= newValue.length) {
                  insertIndex = findInsertPosition(newValue, currentIndex);
                } else {
                  console.warn('计算出的插入位置无效:', currentIndex);
                  insertIndex = -1;
                }
              } else {
                console.warn(`段落编号 ${sectionNum} 超出范围，段落总数: ${parts.length}`);
                insertIndex = -1;
              }
            } catch (error) {
              console.error('段落分割出错:', error);
              insertIndex = -1; // 出错时使用结尾
            }
          } else if (position.includes('句')) {
            // 按句子分割，在指定句子后插入
            const sentences = newValue.split(/([。！？.!?])/);
            let sentenceCount = 0;
            let currentIndex = 0;
            
            for (let i = 0; i < sentences.length; i += 2) {
              if (sentences[i]) {
                sentenceCount++;
                if (sentenceCount === sectionNum) {
                  // 找到目标句子，定位到句子结束符之后
                  currentIndex += sentences[i].length;
                  if (i + 1 < sentences.length) {
                    currentIndex += sentences[i + 1].length; // 加上标点符号
                  }
                  // 跳过可能的空格
                  while (currentIndex < newValue.length && (newValue[currentIndex] === ' ' || newValue[currentIndex] === '\t')) {
                    currentIndex++;
                  }
                  insertIndex = findInsertPosition(newValue, currentIndex);
                  break;
                }
                currentIndex += sentences[i].length;
                if (i + 1 < sentences.length) {
                  currentIndex += sentences[i + 1].length;
                }
              }
            }
          }
        }
      }

      // 如果 insertIndex 仍然是 -1 且不是"结尾"，说明位置解析失败，使用结尾作为默认
      if (insertIndex === -1 && !position.includes('结尾') && !position.includes('结束') && !position.includes('总结')) {
        console.warn(`无法解析位置 "${position}"，使用结尾作为默认位置`);
        insertIndex = -1; // 使用结尾
      }
      
      insertions.push({ index: insertIndex, markdown });
    });

    // 检查是否有有效的插入位置
    if (insertions.length === 0) {
      console.warn('没有找到有效的插入位置');
      return;
    }

    // 按位置从后往前插入，避免索引变化
    insertions.sort((a, b) => {
      if (a.index === -1) return 1; // 结尾的放在最后处理
      if (b.index === -1) return -1;
      return b.index - a.index; // 从后往前
    });

    try {
      insertions.forEach(({ index, markdown }) => {
        if (index === -1) {
          // 插入到结尾
          newValue = newValue + '\n\n' + markdown;
        } else if (index === 0) {
          // 插入到开头
          newValue = markdown + '\n\n' + newValue;
        } else if (index > 0 && index < newValue.length) {
          // 插入到指定位置，确保在段落或句子边界
          const before = newValue.substring(0, index);
          const after = newValue.substring(index);
          // 确保插入位置前后有适当的换行
          const prefix = before && !before.endsWith('\n') ? '\n\n' : '\n';
          const suffix = after && !after.startsWith('\n') ? '\n' : '';
          newValue = before + prefix + markdown + suffix + after;
        } else {
          // 索引无效，插入到结尾
          console.warn(`插入位置索引 ${index} 无效，插入到结尾`);
          newValue = newValue + '\n\n' + markdown;
        }
      });

      onChange(newValue);
    } catch (error) {
      console.error('插入图片时发生错误:', error);
      throw error;
    }
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
          preview="live"
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
          initialImagePlans={imagePlans}
          onInsertImages={handleInsertImages}
          onSaveImagePlans={onSaveImagePlans}
          onClose={() => setShowImageGenerator(false)}
        />
      )}
    </div>
  );
}
