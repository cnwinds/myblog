import { useState } from 'react';
import { FiImage, FiX, FiCheck, FiLoader } from 'react-icons/fi';
import { analyzeArticleForImages, generateImage, ImagePlan } from '../../services/ai';
import { uploadService } from '../../services/upload';
import './ImageGenerator.css';

interface ImageGeneratorProps {
  title: string;
  content: string;
  onInsertImages: (images: Array<{ markdown: string; position: string }>) => void;
  onClose: () => void;
}

interface ImageGenerationTask {
  plan: ImagePlan;
  status: 'pending' | 'generating' | 'completed' | 'error';
  imageUrl?: string;
  error?: string;
}

export default function ImageGenerator({
  title,
  content,
  onInsertImages,
  onClose,
}: ImageGeneratorProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePlans, setImagePlans] = useState<ImagePlan[]>([]);
  const [generationTasks, setGenerationTasks] = useState<ImageGenerationTask[]>([]);
  const [generating, setGenerating] = useState(false);

  // 分析文章
  const handleAnalyze = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请先填写文章标题和内容');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await analyzeArticleForImages(title, content);
      setImagePlans(response.imagePlans);
      // 初始化生成任务
      setGenerationTasks(
        response.imagePlans.map((plan) => ({
          plan,
          status: 'pending' as const,
        }))
      );
    } catch (error: any) {
      console.error('分析文章失败:', error);
      alert(error.response?.data?.error || '分析文章失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  // 生成单张图片
  const handleGenerateImage = async (index: number) => {
    const task = generationTasks[index];
    if (!task || task.status === 'generating') return;

    setGenerationTasks((prev) => {
      const newTasks = [...prev];
      newTasks[index] = { ...newTasks[index], status: 'generating' };
      return newTasks;
    });

    try {
      const response = await generateImage(task.plan.prompt, {
        width: 768,
        height: 1024, // 竖版 3:4
      });

      // 处理图片URL：如果是base64或data URL，需要先上传
      let imageUrl = response.imageUrl;
      
      // 检查是否是base64格式
      // 优先检查 response.imageBase64，其次检查 imageUrl 是否是 data URL
      const hasBase64 = !!response.imageBase64;
      const isDataUrl = imageUrl && imageUrl.startsWith('data:image/');
      
      if (hasBase64 || isDataUrl) {
        try {
          // 获取 base64 数据
          let base64Data: string | undefined;
          
          if (response.imageBase64) {
            // 如果直接提供了 base64 字段
            base64Data = response.imageBase64;
          } else if (isDataUrl && imageUrl) {
            // 从 data URL 中提取 base64 部分
            const commaIndex = imageUrl.indexOf(',');
            if (commaIndex !== -1) {
              base64Data = imageUrl.substring(commaIndex + 1);
            }
          }
          
          if (base64Data) {
            // 清理 base64 字符串（移除可能的空白字符和前缀）
            const base64String = base64Data
              .replace(/^data:image\/\w+;base64,/, '')
              .replace(/\s/g, ''); // 移除所有空白字符
            
            // 验证 base64 格式
            if (base64String && /^[A-Za-z0-9+/=]+$/.test(base64String)) {
              const byteCharacters = atob(base64String);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/png' });
              const file = new File([blob], `generated-image-${index}-${Date.now()}.png`, { 
                type: 'image/png' 
              });
              imageUrl = await uploadService.uploadImage(file);
            } else {
              console.warn('无效的 base64 格式，跳过转换，直接使用 imageUrl');
            }
          }
        } catch (error) {
          console.error('Base64 转换失败:', error);
          // 如果转换失败，尝试直接使用 imageUrl（可能是普通 URL）
          if (!imageUrl) {
            throw new Error('无法获取图片 URL');
          }
        }
      }
      
      // 确保最终有有效的 imageUrl
      if (!imageUrl) {
        throw new Error('未获取到有效的图片 URL');
      }

      setGenerationTasks((prev) => {
        const newTasks = [...prev];
        newTasks[index] = {
          ...newTasks[index],
          status: 'completed',
          imageUrl,
        };
        return newTasks;
      });
    } catch (error: any) {
      console.error('生成图片失败:', error);
      setGenerationTasks((prev) => {
        const newTasks = [...prev];
        newTasks[index] = {
          ...newTasks[index],
          status: 'error',
          error: error.response?.data?.error || '生成图片失败',
        };
        return newTasks;
      });
    }
  };

  // 生成所有图片
  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      // 依次生成所有待生成的图片
      for (let i = 0; i < generationTasks.length; i++) {
        if (generationTasks[i].status === 'pending') {
          await handleGenerateImage(i);
          // 添加短暂延迟，避免API限流
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } finally {
      setGenerating(false);
    }
  };

  // 插入所有已生成的图片
  const handleInsertAll = () => {
    const imagesToInsert = generationTasks
      .filter((task) => task.status === 'completed' && task.imageUrl)
      .map((task) => ({
        markdown: `![${task.plan.title}](${task.imageUrl})`,
        position: task.plan.position,
      }));

    if (imagesToInsert.length === 0) {
      alert('没有可插入的图片，请先生成图片');
      return;
    }

    onInsertImages(imagesToInsert);
    onClose();
  };

  return (
    <div className="image-generator-overlay">
      <div className="image-generator-modal">
        <div className="image-generator-header">
          <h2>AI图片生成助手</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="image-generator-content">
          {imagePlans.length === 0 ? (
            <div className="image-generator-empty">
              <p>点击下方按钮，AI将分析您的文章并生成图片规划</p>
              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <FiLoader className="spinning" />
                    <span>分析中...</span>
                  </>
                ) : (
                  <>
                    <FiImage />
                    <span>分析文章并生成图片规划</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="image-generator-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateAll}
                  disabled={generating || generationTasks.every((t) => t.status !== 'pending')}
                >
                  {generating ? (
                    <>
                      <FiLoader className="spinning" />
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <FiImage />
                      <span>生成所有图片</span>
                    </>
                  )}
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleInsertAll}
                  disabled={!generationTasks.some((t) => t.status === 'completed')}
                >
                  <FiCheck />
                  <span>插入所有已生成图片</span>
                </button>
              </div>

              <div className="image-plans-list">
                {generationTasks.map((task, index) => (
                  <div key={index} className="image-plan-item">
                    <div className="image-plan-header">
                      <div className="image-plan-info">
                        <h3>
                          第 {task.plan.index} 张 - {task.plan.type}
                        </h3>
                        <p className="image-plan-position">位置：{task.plan.position}</p>
                        <p className="image-plan-message">{task.plan.coreMessage}</p>
                      </div>
                      <div className="image-plan-status">
                        {task.status === 'pending' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleGenerateImage(index)}
                          >
                            <FiImage />
                            <span>生成</span>
                          </button>
                        )}
                        {task.status === 'generating' && (
                          <span className="status-generating">
                            <FiLoader className="spinning" />
                            <span>生成中...</span>
                          </span>
                        )}
                        {task.status === 'completed' && (
                          <span className="status-completed">
                            <FiCheck />
                            <span>已完成</span>
                          </span>
                        )}
                        {task.status === 'error' && (
                          <span className="status-error">
                            <span>❌ 失败</span>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleGenerateImage(index)}
                            >
                              重试
                            </button>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="image-plan-details">
                      <div className="image-plan-text">
                        <p>
                          <strong>标题：</strong>
                          {task.plan.title}
                        </p>
                        {task.plan.subtitle && (
                          <p>
                            <strong>副标题：</strong>
                            {task.plan.subtitle}
                          </p>
                        )}
                        {task.plan.description && (
                          <p>
                            <strong>说明：</strong>
                            {task.plan.description}
                          </p>
                        )}
                      </div>

                      {task.status === 'completed' && task.imageUrl && (
                        <div className="image-plan-preview">
                          <img src={task.imageUrl} alt={task.plan.title} />
                        </div>
                      )}

                      {task.status === 'error' && task.error && (
                        <div className="image-plan-error">
                          <p>错误：{task.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
