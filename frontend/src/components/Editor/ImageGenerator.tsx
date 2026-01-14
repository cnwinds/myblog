import { useState, useEffect } from 'react';
import { FiImage, FiX, FiCheck, FiLoader, FiRefreshCw, FiEdit2, FiEye } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { analyzeArticleForImages, analyzeArticleForImagesStream, generateImage, findImagePositions, ImagePlan } from '../../services/ai';
import { uploadService } from '../../services/upload';
import './ImageGenerator.css';

interface ImageGeneratorProps {
  title: string;
  content: string;
  initialImagePlans?: ImagePlan[]; // 初始图片规划数据
  onInsertImages: (images: Array<{ markdown: string; position: string }>) => void;
  onSaveImagePlans?: (imagePlans: ImagePlan[]) => void; // 保存图片规划的回调
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
  initialImagePlans,
  onInsertImages,
  onSaveImagePlans,
  onClose,
}: ImageGeneratorProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePlans, setImagePlans] = useState<ImagePlan[]>(initialImagePlans || []);
  const [generationTasks, setGenerationTasks] = useState<ImageGenerationTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [inserting, setInserting] = useState(false);
  // 跟踪每个提示词的编辑状态：key 是 index，value 是是否在编辑模式
  const [promptEditStates, setPromptEditStates] = useState<Record<number, boolean>>({});

  // 初始化：如果有初始图片规划，自动加载
  useEffect(() => {
    if (initialImagePlans && initialImagePlans.length > 0) {
      setImagePlans(initialImagePlans);
      setGenerationTasks(
        initialImagePlans.map((plan) => ({
          plan,
          status: plan.imageUrl ? ('completed' as const) : ('pending' as const),
          imageUrl: plan.imageUrl,
        }))
      );
    }
  }, [initialImagePlans]);

  // 分析文章（流式版本）
  const handleAnalyze = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请先填写文章标题和内容');
      return;
    }

    setAnalyzing(true);
    // 清空之前的规划
    setImagePlans([]);
    setGenerationTasks([]);

    try {
      await analyzeArticleForImagesStream(
        title,
        content,
        // 每解析出一个完整的项时的回调
        (newItems: ImagePlan[]) => {
          setImagePlans((prev) => {
            // 合并新项，避免重复（基于index）
            const existingIndexes = new Set(prev.map(p => p.index));
            const uniqueNewItems = newItems.filter(item => !existingIndexes.has(item.index));
            const merged = [...prev, ...uniqueNewItems].sort((a, b) => a.index - b.index);
            
            // 更新生成任务
            setGenerationTasks(
              merged.map((plan) => ({
                plan,
                status: 'pending' as const,
              }))
            );
            
            return merged;
          });
        },
        // 所有项解析完成时的回调
        (finalItems: ImagePlan[]) => {
          setImagePlans(finalItems);
          // 初始化生成任务
          setGenerationTasks(
            finalItems.map((plan) => ({
              plan,
              status: 'pending' as const,
            }))
          );
          // 保存图片规划到文章
          if (onSaveImagePlans) {
            onSaveImagePlans(finalItems);
          }
          setAnalyzing(false);
        },
        // 错误回调
        (error: string) => {
          console.error('分析文章失败:', error);
          alert(error || '分析文章失败，请重试');
          setAnalyzing(false);
        }
      );
    } catch (error: any) {
      console.error('分析文章失败:', error);
      alert(error.message || '分析文章失败，请重试');
      setAnalyzing(false);
    }
  };

  // 重新生成图片规划
  const handleRegenerate = async () => {
    // 清除当前的图片规划和生成任务
    setImagePlans([]);
    setGenerationTasks([]);
    // 重新分析文章
    await handleAnalyze();
  };

  // 生成单张图片
  const handleGenerateImage = async (index: number) => {
    const task = generationTasks[index];
    if (!task || task.status === 'generating') return;

    setGenerationTasks((prev) => {
      const newTasks = [...prev];
      newTasks[index] = { 
        ...newTasks[index], 
        status: 'generating',
        imageUrl: undefined, // 清除旧的图片URL，重新生成
        error: undefined, // 清除旧的错误信息
      };
      return newTasks;
    });

    try {
      // 使用 plan 中的 aspectRatio，如果没有则默认使用 16:9
      const aspectRatio = task.plan.aspectRatio || '16:9';
      const response = await generateImage(task.plan.prompt, {
        aspectRatio,
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
        // 保存更新后的图片规划（包含已生成的图片URL）
        if (onSaveImagePlans) {
          const updatedPlans = newTasks.map((task) => ({
            ...task.plan,
            imageUrl: task.imageUrl, // 添加已生成的图片URL
          }));
          onSaveImagePlans(updatedPlans);
        }
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
      // 生成完成后，保存所有图片规划
      if (onSaveImagePlans) {
        setGenerationTasks((currentTasks) => {
          const updatedPlans = currentTasks.map((task) => ({
            ...task.plan,
            imageUrl: task.imageUrl,
          }));
          onSaveImagePlans(updatedPlans);
          return currentTasks;
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // 检查图片是否已经插入到文章中
  const isImageAlreadyInserted = (imageUrl: string): boolean => {
    // 检查文章内容中是否包含该图片URL
    return content.includes(imageUrl);
  };

  // 插入所有已生成的图片（智能插入）
  const handleInsertAll = async () => {
    const completedTasks = generationTasks.filter(
      (task) => task.status === 'completed' && task.imageUrl
    );

    if (completedTasks.length === 0) {
      alert('没有可插入的图片，请先生成图片');
      return;
    }

    // 过滤掉已经插入的图片
    const tasksToInsert = completedTasks.filter(
      (task) => !isImageAlreadyInserted(task.imageUrl!)
    );

    if (tasksToInsert.length === 0) {
      alert('所有图片已经插入到文章中了');
      onClose();
      return;
    }

    setInserting(true);

    try {
      // 一次性调用大模型判断所有图片的插入位置
      const imageCoreMessages = tasksToInsert.map((task) => task.plan.coreMessage);
      console.log('正在批量判断图片位置，共', imageCoreMessages.length, '张图片');
      
      let positionsResults: Array<{ position: string; reason: string }> = [];
      
      try {
        const response = await findImagePositions(content, imageCoreMessages);
        positionsResults = response.positions;
        console.log('批量位置判断结果:', positionsResults);
      } catch (error: any) {
        console.error('批量判断图片位置失败:', error);
        console.error('错误详情:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        // 如果批量判断失败，为每张图片使用备用位置
        positionsResults = tasksToInsert.map((task) => ({
          position: task.plan.position || '结尾',
          reason: '批量判断失败，使用原位置',
        }));
      }

      // 构建图片插入数据
      const imagesToInsert = tasksToInsert.map((task, index) => ({
        markdown: `![${task.plan.coreMessage}](${task.imageUrl})`,
        position: positionsResults[index]?.position || task.plan.position || '结尾',
      }));

      // 检查是否有有效的图片需要插入
      if (imagesToInsert.length === 0) {
        alert('没有可插入的图片');
        return;
      }

      console.log('准备插入图片:', imagesToInsert);

      // 调用插入函数（这是同步函数，不需要try-catch，但需要确保它不会抛出错误）
      onInsertImages(imagesToInsert);
      onClose();
    } catch (error: any) {
      console.error('插入图片失败:', error);
      console.error('错误详情:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
      });
      alert(error.response?.data?.error || error.message || '插入图片失败，请重试');
    } finally {
      setInserting(false);
    }
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
                  onClick={handleRegenerate}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <>
                      <FiLoader className="spinning" />
                      <span>重新生成中...</span>
                    </>
                  ) : (
                    <>
                      <FiRefreshCw />
                      <span>重新生成</span>
                    </>
                  )}
                </button>
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
                  disabled={!generationTasks.some((t) => t.status === 'completed') || inserting}
                >
                  {inserting ? (
                    <>
                      <FiLoader className="spinning" />
                      <span>智能插入中...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      <span>智能插入图片</span>
                    </>
                  )}
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
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleGenerateImage(index)}
                              style={{ marginLeft: '8px' }}
                            >
                              <FiRefreshCw />
                              <span>重新生成</span>
                            </button>
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
                        {task.plan.description && (
                          <p>
                            <strong>说明：</strong>
                            {task.plan.description}
                          </p>
                        )}
                        {task.plan.prompt && (
                          <div className="image-plan-prompt">
                            <div className="prompt-header">
                              <strong>生成提示词：</strong>
                              <button
                                className="btn btn-sm btn-link"
                                onClick={() => {
                                  setPromptEditStates((prev) => ({
                                    ...prev,
                                    [task.plan.index]: !prev[task.plan.index],
                                  }));
                                }}
                                type="button"
                              >
                                {promptEditStates[task.plan.index] ? (
                                  <>
                                    <FiEye />
                                    <span>预览</span>
                                  </>
                                ) : (
                                  <>
                                    <FiEdit2 />
                                    <span>编辑</span>
                                  </>
                                )}
                              </button>
                            </div>
                            {promptEditStates[task.plan.index] ? (
                              <textarea
                                className="prompt-content prompt-editable"
                                value={task.plan.prompt}
                                onChange={(e) => {
                                  const newPrompt = e.target.value;
                                  // 更新对应的plan
                                  setGenerationTasks((prev) => {
                                    const newTasks = [...prev];
                                    newTasks[index] = {
                                      ...newTasks[index],
                                      plan: {
                                        ...newTasks[index].plan,
                                        prompt: newPrompt,
                                      },
                                    };
                                    // 保存更新后的图片规划
                                    if (onSaveImagePlans) {
                                      const updatedPlans = newTasks.map((t) => ({
                                        ...t.plan,
                                        imageUrl: t.imageUrl,
                                      }));
                                      onSaveImagePlans(updatedPlans);
                                    }
                                    return newTasks;
                                  });
                                }}
                                rows={6}
                                placeholder="请输入图片生成提示词..."
                              />
                            ) : (
                              <div className="prompt-content prompt-markdown">
                                <ReactMarkdown>{task.plan.prompt}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {task.status === 'completed' && task.imageUrl && (
                        <div className="image-plan-preview">
                          <img src={task.imageUrl} alt={task.plan.coreMessage} />
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
