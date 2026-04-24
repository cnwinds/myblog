import { useState, useEffect, useRef } from 'react';
import { processText, getTextProcessPrompt, saveTextProcessPrompt } from '../../services/ai';
import { getErrorMessage } from '../../utils/errorHandler';
import './TextPolishDialog.css';

interface TextProcessDialogProps {
  selectedText: string;
  fullArticleContent: string;
  onReplace: (text: string) => void;
  onClose: () => void;
  mode: 'polish' | 'rewrite'; // 模式：润色或重写
  defaultPrompt: string; // 默认提示词
}

const MODE_CONFIG = {
  polish: {
    title: '润色内容',
    actionLabel: '润色',
    placeholder: '例如：请将这段文字润色得更正式一些，使用专业术语...',
    defaultPrompt: '', // 将从 MarkdownEditor 传入
  },
  rewrite: {
    title: '重写内容',
    actionLabel: '重写',
    placeholder: '例如：请将这段文字重写得更加正式，使用专业术语...',
    defaultPrompt: '', // 将从 MarkdownEditor 传入
  },
};

export default function TextProcessDialog({
  selectedText,
  fullArticleContent,
  onReplace,
  onClose,
  mode,
  defaultPrompt,
}: TextProcessDialogProps) {
  const [processedText, setProcessedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editableText, setEditableText] = useState('');
  const [basePrompt, setBasePrompt] = useState(defaultPrompt || '');
  const [customPrompt, setCustomPrompt] = useState(defaultPrompt || ''); // 初始值设为默认提示词
  const [lastSavedPrompt, setLastSavedPrompt] = useState(defaultPrompt || '');
  const promptEditedRef = useRef(false);

  const config = MODE_CONFIG[mode];

  const persistPromptIfNeeded = async (promptOverride?: string) => {
    const trimmedPrompt = (promptOverride ?? customPrompt).trim();
    if (!trimmedPrompt || trimmedPrompt === lastSavedPrompt) {
      return;
    }
    try {
      await saveTextProcessPrompt(trimmedPrompt, mode);
      setLastSavedPrompt(trimmedPrompt);
      setBasePrompt(trimmedPrompt);
    } catch (err) {
      console.warn('保存提示词失败:', err);
    }
  };

  const handleProcess = async (promptOverride?: string, shouldSavePrompt = true) => {
    if (!selectedText.trim()) {
      setError('没有选中的文字');
      return;
    }

    setLoading(true);
    setError('');
    setProcessedText('');
    setEditableText('');

    try {
      if (shouldSavePrompt) {
        await persistPromptIfNeeded(promptOverride);
      }
      // 如果用户输入了自定义提示词，使用自定义的；否则使用默认的
      const prompt = (promptOverride ?? customPrompt).trim() || basePrompt;
      const result = await processText(selectedText, prompt, fullArticleContent);
      setProcessedText(result);
      setEditableText(result);
    } catch (err) {
      setError(getErrorMessage(err, `${config.actionLabel}失败，请重试`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    promptEditedRef.current = false;

    const loadPrompt = async () => {
      let resolvedPrompt = defaultPrompt || '';
      try {
        const savedPrompt = await getTextProcessPrompt(mode);
        if (savedPrompt.trim()) {
          resolvedPrompt = savedPrompt;
        }
      } catch (err) {
        console.warn('获取提示词失败:', err);
      }

      if (!isActive) {
        return;
      }

      setBasePrompt(resolvedPrompt);
      setLastSavedPrompt(resolvedPrompt);
      if (!promptEditedRef.current) {
        setCustomPrompt(resolvedPrompt);
      }

      await handleProcess(resolvedPrompt, false);
    };

    loadPrompt();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, defaultPrompt]);

  const handleConfirm = () => {
    if (!editableText.trim()) {
      setError(`${config.actionLabel}后的内容不能为空`);
      return;
    }
    void persistPromptIfNeeded();
    onReplace(editableText);
    onClose();
  };

  const handleCancel = () => {
    void persistPromptIfNeeded();
    onClose();
  };

  return (
    <div className="text-polish-overlay" onClick={onClose}>
      <div className="text-polish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="text-polish-header">
          <h3>{config.title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="text-polish-content">
          <div className="text-section">
            <h4>自定义提示词</h4>
            <textarea
              className="requirement-input"
              value={customPrompt}
              onChange={(e) => {
                promptEditedRef.current = true;
                setCustomPrompt(e.target.value);
              }}
              placeholder={config.placeholder}
              rows={4}
            />
          </div>

          <div className="text-comparison-container">
            <div className="text-section comparison-section">
              <h4>原文</h4>
              <div className="text-display original-text">
                {selectedText}
              </div>
            </div>

            <div className="text-section comparison-section">
              <div className="section-header">
                <h4>{config.actionLabel}后</h4>
                {!loading && (
                  <button
                    onClick={() => {
                      void handleProcess();
                    }}
                    className="btn btn-secondary refresh-btn"
                    title={`重新${config.actionLabel}`}
                    disabled={loading}
                  >
                    {processedText ? `重新${config.actionLabel}` : `开始${config.actionLabel}`}
                  </button>
                )}
              </div>
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <span>AI正在{config.actionLabel}中...</span>
                </div>
              ) : (
                <textarea
                  className="text-editor"
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  placeholder={`${config.actionLabel}后的内容将显示在这里，您可以进行修改`}
                  rows={8}
                />
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="text-polish-actions">
            <button
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="btn btn-primary"
              disabled={loading || !editableText.trim()}
            >
              确认替换
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
