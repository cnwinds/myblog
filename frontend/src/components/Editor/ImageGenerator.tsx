import { useState, useEffect, useRef, useMemo } from 'react';
import { FiImage, FiX, FiCheck, FiLoader, FiRefreshCw, FiEdit2, FiEye, FiSettings, FiSave, FiTrash2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { analyzeArticleForImagesStream, generateImage, findImagePositions, ImagePlan, getImagePromptTemplate, saveImagePromptTemplate } from '../../services/ai';
import { uploadService } from '../../services/upload';
import './ImageGenerator.css';

interface ImageGeneratorProps {
  title: string;
  content: string;
  initialImagePlans?: ImagePlan[]; // 初始图片规划数据
  newImagePlan?: ImagePlan | null; // 新添加的图片规划（从外部传入）
  isGeneratingPrompt?: boolean; // 是否正在生成提示词
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
  newImagePlan,
  isGeneratingPrompt = false,
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
  // 右侧提示词编辑器状态
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  // 使用 ref 跟踪已处理过的 newImagePlan 的标识（使用 prompt 作为唯一标识）
  const processedImagePlanIdRef = useRef<string | null>(null);
  // 用于滚动到底部的ref（指向内容容器）
  const contentRef = useRef<HTMLDivElement>(null);

  // 初始化：如果有初始图片规划，自动加载
  useEffect(() => {
    if (initialImagePlans && initialImagePlans.length > 0) {
      // 使用函数式更新来获取最新的 generationTasks
      setGenerationTasks((prevTasks) => {
        // 检查是否需要重新初始化（只在任务数量为0或数量不匹配时）
        if (prevTasks.length === 0 || prevTasks.length !== initialImagePlans.length) {
          setImagePlans(initialImagePlans);
          return initialImagePlans.map((plan) => ({
            plan,
            status: plan.imageUrl ? ('completed' as const) : ('pending' as const),
            imageUrl: plan.imageUrl,
          }));
        } else {
          // 数量匹配，只更新 imagePlans，保留 generationTasks 的状态
          setImagePlans(initialImagePlans);
          return prevTasks;
        }
      });
    }
  }, [initialImagePlans]);

  // 处理新添加的图片规划：当接收到newImagePlan时，添加到列表最后
  useEffect(() => {
    // 检查是否是新的 newImagePlan（通过比较 prompt 内容，避免重复处理）
    if (newImagePlan && newImagePlan.prompt) {
      const planId = newImagePlan.prompt.trim();
      
      // 如果已经处理过这个提示词，则跳过
      if (processedImagePlanIdRef.current === planId) {
        return;
      }
      
      // 标记为已处理
      processedImagePlanIdRef.current = planId;
      
      // 使用函数式更新，确保基于最新的imagePlans状态
      setImagePlans((prevPlans) => {
        // 计算新的index（当前最大index + 1，如果没有则从1开始）
        const maxIndex = prevPlans.length > 0 
          ? Math.max(...prevPlans.map(p => p.index))
          : 0;
        const newPlan: ImagePlan = {
          ...newImagePlan,
          index: maxIndex + 1,
          position: newImagePlan.position || '内容图',
          type: newImagePlan.type || '内容图',
        };

        const updatedPlans = [...prevPlans, newPlan];
        
        // 添加对应的生成任务
        setGenerationTasks((prevTasks) => [
          ...prevTasks,
          {
            plan: newPlan,
            status: 'pending' as const,
          },
        ]);

        // 保存更新后的图片规划
        if (onSaveImagePlans) {
          onSaveImagePlans(updatedPlans);
        }

        return updatedPlans;
      });

      // 滚动到底部，显示新添加的图片规划
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTo({
            top: contentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 150);
    }
    // 当 newImagePlan 变为 null 时，重置 ref
    if (!newImagePlan) {
      processedImagePlanIdRef.current = null;
    }
  }, [newImagePlan]); // 移除 onSaveImagePlans 依赖，避免无限循环

  // 加载提示词模板
  useEffect(() => {
    if (showPromptEditor) {
      loadPromptTemplate();
    }
  }, [showPromptEditor]);

  // 当正在生成提示词时，滚动到底部
  useEffect(() => {
    if (isGeneratingPrompt) {
      // 延迟滚动，确保DOM已更新
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTo({
            top: contentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [isGeneratingPrompt]);

  // 计算正在生成的图片数量
  const generatingCount = useMemo(() => {
    const count = generationTasks.filter(task => task.status === 'generating').length;
    console.log('[DEBUG] generatingCount 更新:', count, '总任务数:', generationTasks.length);
    return count;
  }, [generationTasks]);

  // 当有图片正在生成时，不自动滚动
  useEffect(() => {
    // 移除自动滚动逻辑，让用户保持在当前位置
  }, [generatingCount]);

  const loadPromptTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const template = await getImagePromptTemplate();
      setPromptTemplate(template);
    } catch (error) {
      console.error('加载提示词模板失败:', error);
      alert('加载提示词模板失败');
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      await saveImagePromptTemplate(promptTemplate);
      alert('提示词模板保存成功！');
    } catch (error: any) {
      console.error('保存提示词模板失败:', error);
      alert(error.response?.data?.error || '保存提示词模板失败');
    } finally {
      setSavingTemplate(false);
    }
  };

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

            // 更新生成任务，保留现有任务的状态
            setGenerationTasks((prevTasks) => {
              // 创建现有任务的映射
              const existingTaskMap = new Map(
                prevTasks.map(task => [task.plan.index, task])
              );

              // 为每个图片创建或更新任务，保留已存在任务的状态
              return merged.map((plan) => {
                const existingTask = existingTaskMap.get(plan.index);
                if (existingTask) {
                  // 保留现有任务的状态和结果
                  return existingTask;
                } else {
                  // 新任务，初始状态为 pending
                  return {
                    plan,
                    status: 'pending' as const,
                  };
                }
              });
            });

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
    console.log('[DEBUG] handleRegenerate: 开始重新生成');
    // 清除当前的图片规划和生成任务
    setImagePlans([]);
    setGenerationTasks([]);
    // 重新分析文章
    await handleAnalyze();
    console.log('[DEBUG] handleRegenerate: 重新生成完成');
  };

  // 生成单张图片
  const handleGenerateImage = async (index: number) => {
    const task = generationTasks[index];
    if (!task || task.status === 'generating') return;

    console.log(`[DEBUG] handleGenerateImage(${index}): 开始生成，当前状态:`, task.status);
    setGenerationTasks((prev) => {
      const newTasks = [...prev];
      newTasks[index] = {
        ...prev[index],
        status: 'generating',
        imageUrl: undefined, // 清除旧的图片URL，重新生成
        error: undefined, // 清除旧的错误信息
      };
      console.log(`[DEBUG] handleGenerateImage(${index}): 状态已设置为 generating`);
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
          ...prev[index],
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
          ...prev[index],
          status: 'error',
          error: error.response?.data?.error || '生成图片失败',
        };
        return newTasks;
      });
    }
  };

  // 删除单个图片规划
  const handleDeleteImage = (index: number) => {
    if (window.confirm('确定要删除这张图片规划吗？')) {
      setGenerationTasks((prev) => {
        const newTasks = prev.filter((_, i) => i !== index);
        // 更新图片规划索引
        const reorderedTasks = newTasks.map((task, i) => ({
          ...task,
          plan: {
            ...task.plan,
            index: i + 1,
          },
        }));
        // 保存更新后的图片规划
        if (onSaveImagePlans) {
          const updatedPlans = reorderedTasks.map((task) => ({
            ...task.plan,
            imageUrl: task.imageUrl,
          }));
          onSaveImagePlans(updatedPlans);
        }
        return reorderedTasks;
      });
    }
  };

  // 生成所有图片
  const handleGenerateAll = async () => {
    console.log('[DEBUG] handleGenerateAll: 开始批量生成');
    console.log('[DEBUG] handleGenerateAll: 当前任务列表:', generationTasks.map(t => ({ index: t.plan.index, status: t.status })));

    const pendingTasks = generationTasks.filter(t => t.status === 'pending');
    console.log('[DEBUG] handleGenerateAll: 待生成任务数:', pendingTasks.length);

    if (pendingTasks.length === 0) {
      console.log('[DEBUG] handleGenerateAll: 没有待生成的任务，直接返回');
      return;
    }

    setGenerating(true);
    console.log('[DEBUG] handleGenerateAll: generating 状态已设置为 true');
    try {
      // 依次生成所有待生成的图片
      for (let i = 0; i < generationTasks.length; i++) {
        if (generationTasks[i].status === 'pending') {
          console.log(`[DEBUG] handleGenerateAll: 开始生成第 ${i} 张图片`);
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
      console.log('[DEBUG] handleGenerateAll: 批量生成完成，设置 generating 为 false');
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
      <div className={`image-generator-modal ${showPromptEditor ? 'with-editor' : ''}`}>
        <div className="image-generator-content-wrapper">
          <div className="image-generator-header">
            <h2>AI图片生成助手</h2>
            <div className="header-actions">
              <button 
                type="button"
                className="settings-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPromptEditor(!showPromptEditor);
                }}
                title="提示词模板设置"
              >
                <FiSettings />
              </button>
              <button 
                type="button"
                className="close-btn" 
                onClick={onClose}
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="image-generator-content" ref={contentRef}>
          {imagePlans.length === 0 ? (
            <div className="image-generator-empty">
              <p>点击下方按钮，AI将分析您的文章并生成图片规划</p>
              <button
                type="button"
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
                  type="button"
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
                  type="button"
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
                  type="button"
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
                          第 {task.plan.index} 张 - {task.plan.coreMessage}
                        </h3>
                        <p className="image-plan-position">位置：{task.plan.position}</p>
                      </div>
                      <div className="image-plan-status">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleDeleteImage(index)}
                          title="删除此图片规划"
                        >
                          <FiTrash2 />
                          <span>删除</span>
                        </button>
                        {task.status === 'pending' && (
                          <button
                            type="button"
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
                              type="button"
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
                              type="button"
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

                      {task.status === 'generating' && (
                        <div className="image-plan-loading">
                          <FiLoader className="spinning" />
                          <span>正在生成图片...</span>
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
                {/* 在列表底部显示生成提示词规划的等待动画 */}
                {(isGeneratingPrompt || analyzing) && (
                  <div className="prompt-generating-indicator">
                    <FiLoader className="spinning" />
                    <span>
                      {isGeneratingPrompt
                        ? '正在根据选定文本生成图片提示词...'
                        : '正在分析文章并生成图片规划...'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>
        
        {/* 右侧提示词编辑器 */}
        {showPromptEditor && (
          <div className="prompt-template-editor">
            <div className="editor-header">
              <h3>提示词模板设置</h3>
              <button 
                type="button"
                className="close-editor-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPromptEditor(false);
                }}
              >
                <FiX />
              </button>
            </div>
            <div className="editor-content">
              {loadingTemplate ? (
                <div className="loading-template">
                  <FiLoader className="spinning" />
                  <span>加载中...</span>
                </div>
              ) : (
                <>
                  <div className="editor-info">
                    <p>提示词模板用于生成图片规划。使用 <code>{'{{TITLE}}'}</code> 和 <code>{'{{CONTENT}}'}</code> 作为占位符，它们会被实际的文章标题和内容替换。</p>
                  </div>
                  <textarea
                    className="template-textarea"
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    placeholder="请输入提示词模板..."
                    rows={30}
                  />
                  <div className="editor-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate}
                    >
                      {savingTemplate ? (
                        <>
                          <FiLoader className="spinning" />
                          <span>保存中...</span>
                        </>
                      ) : (
                        <>
                          <FiSave />
                          <span>保存模板</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={loadPromptTemplate}
                      disabled={loadingTemplate}
                    >
                      <FiRefreshCw />
                      <span>重置</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
