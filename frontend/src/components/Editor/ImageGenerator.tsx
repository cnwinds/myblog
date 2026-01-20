import { useState, useEffect, useRef, useMemo } from 'react';
import { FiImage, FiX, FiCheck, FiLoader, FiRefreshCw, FiEdit2, FiEye, FiSettings, FiSave, FiTrash2, FiCopy } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { analyzeArticleForImagesStream, generateImage, findImagePositions, ImagePlan, getImagePromptTemplate, saveImagePromptTemplate } from '../../services/ai';
import { uploadService } from '../../services/upload';
import { settingsService } from '../../services/settings';
import { getErrorMessage, getErrorDetails } from '../../utils/errorHandler';
import ImagePreview from '../Article/ImagePreview';
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
  imageUrls?: Array<{ url: string; model?: string; modelName?: string; generatedAt?: string }>; // 已生成的多张图片
  selectedImageIndex?: number; // 当前选中的图片索引（默认是最新生成的图片）
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
  // 图片模型选项列表
  const [imageModelOptions, setImageModelOptions] = useState<Array<{ value: string; label: string; providerId: number; model: string }>>([]);
  // 当前预览的图片URL
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [copiedImageIndex, setCopiedImageIndex] = useState<{ taskIndex: number; imgIndex: number } | null>(null);

  // 加载图片生成提供商和模型列表
  useEffect(() => {
    const loadImageProviders = async () => {
      try {
        const providers = await settingsService.getProviders();
        const imageProvidersList = providers.filter(p => p.enabled && p.type === 'image');
        
        // 生成模型选项列表
        const options: Array<{ value: string; label: string; providerId: number; model: string }> = [];
        imageProvidersList.forEach((provider) => {
          provider.models.forEach((model) => {
            options.push({
              value: `${provider.id}:${model}`,
              label: `${provider.name}(${model})`,
              providerId: provider.id,
              model: model,
            });
          });
        });
        setImageModelOptions(options);
      } catch (error) {
        console.error('加载图片生成提供商失败:', error);
      }
    };
    loadImageProviders();
  }, []);

  // 初始化：如果有初始图片规划，自动加载
  useEffect(() => {
    if (initialImagePlans && initialImagePlans.length > 0) {
      // 使用函数式更新来获取最新的 generationTasks
      setGenerationTasks((prevTasks) => {
        // 检查是否需要重新初始化（只在任务数量为0或数量不匹配时）
        if (prevTasks.length === 0 || prevTasks.length !== initialImagePlans.length) {
          setImagePlans(initialImagePlans);
          return initialImagePlans.map((plan) => {
            // 兼容旧数据：如果有 imageUrl，转换为 imageUrls 数组
            let imageUrls: Array<{ url: string; model?: string; modelName?: string; generatedAt?: string }> = [];
            if (plan.imageUrls && plan.imageUrls.length > 0) {
              imageUrls = plan.imageUrls.map(img => ({
                url: typeof img === 'string' ? img : img.url,
                model: typeof img === 'string' ? undefined : img.model,
                modelName: typeof img === 'string' ? undefined : img.modelName,
                generatedAt: typeof img === 'string' ? undefined : img.generatedAt,
              }));
            } else if (plan.imageUrl) {
              // 向后兼容：将单个 imageUrl 转换为数组
              imageUrls = [{
                url: plan.imageUrl,
                model: plan.model,
                modelName: plan.modelName,
              }];
            }
            
            // 获取选中的图片索引，如果没有指定则使用最后一个（最新生成的）
            const selectedIndex = plan.selectedImageIndex !== undefined 
              ? plan.selectedImageIndex 
              : (imageUrls.length > 0 ? imageUrls.length - 1 : undefined);
            
            return {
              plan,
              status: imageUrls.length > 0 ? ('completed' as const) : ('pending' as const),
              imageUrls,
              selectedImageIndex: selectedIndex,
            };
          });
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
            imageUrls: [],
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
    } catch (error) {
      console.error('保存提示词模板失败:', error);
      alert(getErrorMessage(error, '保存提示词模板失败'));
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
                  // 兼容旧数据
                  let imageUrls: Array<{ url: string; model?: string; modelName?: string; generatedAt?: string }> = [];
                  if (plan.imageUrls && plan.imageUrls.length > 0) {
                    imageUrls = plan.imageUrls.map(img => ({
                      url: typeof img === 'string' ? img : img.url,
                      model: typeof img === 'string' ? undefined : img.model,
                      modelName: typeof img === 'string' ? undefined : img.modelName,
                      generatedAt: typeof img === 'string' ? undefined : img.generatedAt,
                    }));
                  } else if (plan.imageUrl) {
                    imageUrls = [{
                      url: plan.imageUrl,
                      model: plan.model,
                      modelName: plan.modelName,
                    }];
                  }
                  
                  // 获取选中的图片索引，如果没有指定则使用最后一个（最新生成的）
                  const selectedIndex = plan.selectedImageIndex !== undefined 
                    ? plan.selectedImageIndex 
                    : (imageUrls.length > 0 ? imageUrls.length - 1 : undefined);
                  
                  return {
                    plan,
                    status: imageUrls.length > 0 ? ('completed' as const) : ('pending' as const),
                    imageUrls,
                    selectedImageIndex: selectedIndex,
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
            finalItems.map((plan) => {
              // 兼容旧数据
              let imageUrls: Array<{ url: string; model?: string; modelName?: string; generatedAt?: string }> = [];
              if (plan.imageUrls && plan.imageUrls.length > 0) {
                imageUrls = plan.imageUrls.map(img => ({
                  url: typeof img === 'string' ? img : img.url,
                  model: typeof img === 'string' ? undefined : img.model,
                  modelName: typeof img === 'string' ? undefined : img.modelName,
                  generatedAt: typeof img === 'string' ? undefined : img.generatedAt,
                }));
              } else if (plan.imageUrl) {
                imageUrls = [{
                  url: plan.imageUrl,
                  model: plan.model,
                  modelName: plan.modelName,
                }];
              }
              
              // 获取选中的图片索引，如果没有指定则使用最后一个（最新生成的）
              const selectedIndex = plan.selectedImageIndex !== undefined 
                ? plan.selectedImageIndex 
                : (imageUrls.length > 0 ? imageUrls.length - 1 : undefined);
              
              return {
                plan,
                status: imageUrls.length > 0 ? ('completed' as const) : ('pending' as const),
                imageUrls,
                selectedImageIndex: selectedIndex,
              };
            })
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
    } catch (error) {
      console.error('分析文章失败:', error);
      const errorMessage = error instanceof Error ? error.message : '分析文章失败，请重试';
      alert(errorMessage);
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
        error: undefined, // 清除旧的错误信息
        // 保留已有的图片，不删除
      };
      console.log(`[DEBUG] handleGenerateImage(${index}): 状态已设置为 generating`);
      return newTasks;
    });

    try {
      // 使用 plan 中的 aspectRatio，如果没有则默认使用 16:9
      const aspectRatio = task.plan.aspectRatio || '16:9';
      // 使用 plan 中的 model，如果存在则传递
      const model = task.plan.model;
      const response = await generateImage(task.plan.prompt, {
        aspectRatio,
        model,
      });
      
      // 获取模型显示名称
      let modelName: string | undefined = undefined;
      if (model) {
        const option = imageModelOptions.find(opt => opt.value === model);
        modelName = option ? option.label : model;
      }

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

      // 将新生成的图片追加到数组中
      const newImage = {
        url: imageUrl,
        model: model,
        modelName: modelName,
        generatedAt: new Date().toISOString(),
      };

      setGenerationTasks((prev) => {
        const newTasks = [...prev];
        const existingImages = prev[index].imageUrls || [];
        const newImageUrls = [...existingImages, newImage]; // 追加新图片，保留所有旧图片
        newTasks[index] = {
          ...prev[index],
          status: 'completed',
          imageUrls: newImageUrls,
          selectedImageIndex: newImageUrls.length - 1, // 默认选中最新生成的图片
        };
        // 保存更新后的图片规划（包含所有已生成的图片URL和模型信息）
        if (onSaveImagePlans) {
          const updatedPlans = newTasks.map((task) => ({
            ...task.plan,
            imageUrls: task.imageUrls || [], // 保存所有图片URL
            selectedImageIndex: task.selectedImageIndex, // 保存选中的图片索引
            model: task.plan.model, // 保存当前选择的模型信息
            modelName: task.plan.modelName, // 保存当前选择的模型显示名称
            // 向后兼容：保留最后一个图片URL
            imageUrl: task.imageUrls && task.imageUrls.length > 0 
              ? task.imageUrls[task.imageUrls.length - 1].url 
              : undefined,
          }));
          onSaveImagePlans(updatedPlans);
        }
        return newTasks;
      });
    } catch (error) {
      console.error('生成图片失败:', error);
      setGenerationTasks((prev) => {
        const newTasks = [...prev];
        newTasks[index] = {
          ...prev[index],
          status: 'error',
          error: getErrorMessage(error, '生成图片失败'),
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
            imageUrls: task.imageUrls || [],
            selectedImageIndex: task.selectedImageIndex,
            model: task.plan.model,
            modelName: task.plan.modelName,
            // 向后兼容
            imageUrl: task.imageUrls && task.imageUrls.length > 0 
              ? task.imageUrls[task.imageUrls.length - 1].url 
              : undefined,
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
            imageUrls: task.imageUrls || [],
            selectedImageIndex: task.selectedImageIndex,
            model: task.plan.model,
            modelName: task.plan.modelName,
            // 向后兼容
            imageUrl: task.imageUrls && task.imageUrls.length > 0 
              ? task.imageUrls[task.imageUrls.length - 1].url 
              : undefined,
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

  // 复制图片的 Markdown 内容到剪贴板
  const handleCopyImageMarkdown = async (taskIndex: number, imgIndex: number) => {
    const task = generationTasks[taskIndex];
    if (!task || !task.imageUrls || imgIndex >= task.imageUrls.length) {
      return;
    }

    const image = task.imageUrls[imgIndex];
    const altText = task.plan.coreMessage || '图片';
    const markdown = `![${altText}](${image.url})`;

    try {
      await navigator.clipboard.writeText(markdown);
      // 显示复制成功的反馈
      setCopiedImageIndex({ taskIndex, imgIndex });
      setTimeout(() => {
        setCopiedImageIndex(null);
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = markdown;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedImageIndex({ taskIndex, imgIndex });
        setTimeout(() => {
          setCopiedImageIndex(null);
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      }
      document.body.removeChild(textArea);
    }
  };

  // 插入所有已生成的图片（智能插入）- 只插入选中的图片
  const handleInsertAll = async () => {
    // 收集所有已选中且未插入的图片
    const allImages: Array<{ taskIndex: number; imageIndex: number; url: string; coreMessage: string; position: string }> = [];
    
    generationTasks.forEach((task, taskIndex) => {
      if (task.imageUrls && task.imageUrls.length > 0) {
        // 获取选中的图片索引，如果没有指定则使用最后一个（最新生成的）
        const selectedIndex = task.selectedImageIndex !== undefined 
          ? task.selectedImageIndex 
          : task.imageUrls.length - 1;
        
        // 只处理选中的图片
        if (selectedIndex >= 0 && selectedIndex < task.imageUrls.length) {
          const selectedImage = task.imageUrls[selectedIndex];
          if (!isImageAlreadyInserted(selectedImage.url)) {
            allImages.push({
              taskIndex,
              imageIndex: selectedIndex,
              url: selectedImage.url,
              coreMessage: task.plan.coreMessage,
              position: task.plan.position || '结尾',
            });
          }
        }
      }
    });

    if (allImages.length === 0) {
      alert('没有可插入的图片，请先生成图片或所有图片已经插入到文章中了');
      return;
    }

    setInserting(true);

    try {
      // 一次性调用大模型判断所有图片的插入位置
      const imageCoreMessages = allImages.map((img) => img.coreMessage);
      console.log('正在批量判断图片位置，共', imageCoreMessages.length, '张图片');
      
      let positionsResults: Array<{ position: string; reason: string }> = [];
      
      try {
        const response = await findImagePositions(content, imageCoreMessages);
        positionsResults = response.positions;
        console.log('批量位置判断结果:', positionsResults);
      } catch (error) {
        console.error('批量判断图片位置失败:', error);
        console.error('错误详情:', getErrorDetails(error));
        // 如果批量判断失败，为每张图片使用备用位置
        positionsResults = allImages.map((img) => ({
          position: img.position,
          reason: '批量判断失败，使用原位置',
        }));
      }

      // 构建图片插入数据
      const imagesToInsert = allImages.map((img, index) => ({
        markdown: `![${img.coreMessage}](${img.url})`,
        position: positionsResults[index]?.position || img.position,
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
    } catch (error) {
      console.error('插入图片失败:', error);
      console.error('错误详情:', getErrorDetails(error));
      alert(getErrorMessage(error, '插入图片失败，请重试'));
    } finally {
      setInserting(false);
    }
  };

  return (
    <>
      {previewImageUrl && (
        <ImagePreview 
          imageUrl={previewImageUrl} 
          onClose={() => setPreviewImageUrl(null)} 
        />
      )}
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
                  disabled={!generationTasks.some((t) => t.imageUrls && t.imageUrls.length > 0) || inserting}
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
                          <div className="generate-control-group">
                            <select
                              value={task.plan.model || ''}
                              onChange={(e) => {
                                const selectedModel = e.target.value;
                                const option = imageModelOptions.find(opt => opt.value === selectedModel);
                                const modelName = option ? option.label : '';
                                
                                setGenerationTasks((prev) => {
                                  const newTasks = [...prev];
                                  newTasks[index] = {
                                    ...newTasks[index],
                                    plan: {
                                      ...newTasks[index].plan,
                                      model: selectedModel || undefined,
                                      modelName: modelName || undefined,
                                    },
                                  };
                                  // 保存更新后的图片规划
                                  if (onSaveImagePlans) {
                                    const updatedPlans = newTasks.map((t) => ({
                                      ...t.plan,
                                      imageUrls: t.imageUrls || [],
                                      model: t.plan.model,
                                      modelName: t.plan.modelName,
                                      imageUrl: t.imageUrls && t.imageUrls.length > 0 
                                        ? t.imageUrls[t.imageUrls.length - 1].url 
                                        : undefined,
                                    }));
                                    onSaveImagePlans(updatedPlans);
                                  }
                                  return newTasks;
                                });
                              }}
                              disabled={false}
                              className="model-select-inline"
                            >
                              <option value="">使用默认模型</option>
                              {imageModelOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleGenerateImage(index)}
                            >
                              <FiImage />
                              <span>生成</span>
                            </button>
                          </div>
                        )}
                        {task.status === 'generating' && (
                          <span className="status-generating">
                            <FiLoader className="spinning" />
                            <span>生成中...</span>
                          </span>
                        )}
                        {(task.status === 'completed' || (task.imageUrls && task.imageUrls.length > 0)) && (
                          <div className="generate-control-group">
                            <select
                              value={task.plan.model || ''}
                              onChange={(e) => {
                                const selectedModel = e.target.value;
                                const option = imageModelOptions.find(opt => opt.value === selectedModel);
                                const modelName = option ? option.label : '';
                                
                                setGenerationTasks((prev) => {
                                  const newTasks = [...prev];
                                  newTasks[index] = {
                                    ...newTasks[index],
                                    plan: {
                                      ...newTasks[index].plan,
                                      model: selectedModel || undefined,
                                      modelName: modelName || undefined,
                                    },
                                  };
                                  // 保存更新后的图片规划
                                  if (onSaveImagePlans) {
                                    const updatedPlans = newTasks.map((t) => ({
                                      ...t.plan,
                                      imageUrls: t.imageUrls || [],
                                      model: t.plan.model,
                                      modelName: t.plan.modelName,
                                      imageUrl: t.imageUrls && t.imageUrls.length > 0 
                                        ? t.imageUrls[t.imageUrls.length - 1].url 
                                        : undefined,
                                    }));
                                    onSaveImagePlans(updatedPlans);
                                  }
                                  return newTasks;
                                });
                              }}
                              disabled={generationTasks[index]?.status === 'generating'}
                              className="model-select-inline"
                            >
                              <option value="">使用默认模型</option>
                              {imageModelOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleGenerateImage(index)}
                            >
                              <FiRefreshCw />
                              <span>继续生成</span>
                            </button>
                          </div>
                        )}
                        {task.status === 'error' && (
                          <div className="generate-control-group">
                            <span className="status-error-text">❌ 失败</span>
                            <select
                              value={task.plan.model || ''}
                              onChange={(e) => {
                                const selectedModel = e.target.value;
                                const option = imageModelOptions.find(opt => opt.value === selectedModel);
                                const modelName = option ? option.label : '';
                                
                                setGenerationTasks((prev) => {
                                  const newTasks = [...prev];
                                  newTasks[index] = {
                                    ...newTasks[index],
                                    plan: {
                                      ...newTasks[index].plan,
                                      model: selectedModel || undefined,
                                      modelName: modelName || undefined,
                                    },
                                  };
                                  // 保存更新后的图片规划
                                  if (onSaveImagePlans) {
                                    const updatedPlans = newTasks.map((t) => ({
                                      ...t.plan,
                                      imageUrls: t.imageUrls || [],
                                      model: t.plan.model,
                                      modelName: t.plan.modelName,
                                      imageUrl: t.imageUrls && t.imageUrls.length > 0 
                                        ? t.imageUrls[t.imageUrls.length - 1].url 
                                        : undefined,
                                    }));
                                    onSaveImagePlans(updatedPlans);
                                  }
                                  return newTasks;
                                });
                              }}
                              disabled={false}
                              className="model-select-inline"
                            >
                              <option value="">使用默认模型</option>
                              {imageModelOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleGenerateImage(index)}
                            >
                              重试
                            </button>
                          </div>
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
                                      imageUrls: t.imageUrls || [],
                                      selectedImageIndex: t.selectedImageIndex,
                                      imageUrl: t.imageUrls && t.imageUrls.length > 0 
                                        ? t.imageUrls[t.imageUrls.length - 1].url 
                                        : undefined,
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

                      {/* 显示所有已生成的图片 */}
                      {task.imageUrls && task.imageUrls.length > 0 && (
                        <div className="image-plan-preview-list">
                          {task.imageUrls.map((img, imgIndex) => {
                            // 获取选中的图片索引，如果没有指定则使用最后一个（最新生成的）
                            const selectedIndex = task.selectedImageIndex !== undefined 
                              ? task.selectedImageIndex 
                              : task.imageUrls!.length - 1;
                            const isSelected = imgIndex === selectedIndex;
                            
                            return (
                              <div key={imgIndex} className="image-plan-preview-item">
                                <div 
                                  className={`image-plan-preview ${isSelected ? 'selected' : ''}`}
                                  onClick={() => {
                                    // 点击图片切换选中状态
                                    setGenerationTasks((prev) => {
                                      const newTasks = [...prev];
                                      newTasks[index] = {
                                        ...prev[index],
                                        selectedImageIndex: imgIndex,
                                      };
                                      // 保存更新后的图片规划
                                      if (onSaveImagePlans) {
                                        const updatedPlans = newTasks.map((t) => ({
                                          ...t.plan,
                                          imageUrls: t.imageUrls || [],
                                          selectedImageIndex: t.selectedImageIndex,
                                          model: t.plan.model,
                                          modelName: t.plan.modelName,
                                          imageUrl: t.imageUrls && t.imageUrls.length > 0 
                                            ? t.imageUrls[t.imageUrls.length - 1].url 
                                            : undefined,
                                        }));
                                        onSaveImagePlans(updatedPlans);
                                      }
                                      return newTasks;
                                    });
                                  }}
                                >
                                  <img 
                                    src={img.url} 
                                    alt={`${task.plan.coreMessage} - 第${imgIndex + 1}张`}
                                    onClick={(e) => {
                                      e.stopPropagation(); // 阻止触发父元素的点击事件（切换选中状态）
                                      setPreviewImageUrl(img.url);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  {/* 选中按钮 - 左上角圆形按钮 */}
                                  <button
                                    type="button"
                                    className={`image-select-btn ${isSelected ? 'selected' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation(); // 阻止触发父元素的点击事件
                                      // 切换选中状态
                                      setGenerationTasks((prev) => {
                                        const newTasks = [...prev];
                                        newTasks[index] = {
                                          ...prev[index],
                                          selectedImageIndex: isSelected ? undefined : imgIndex,
                                        };
                                        // 保存更新后的图片规划
                                        if (onSaveImagePlans) {
                                          const updatedPlans = newTasks.map((t) => ({
                                            ...t.plan,
                                            imageUrls: t.imageUrls || [],
                                            selectedImageIndex: t.selectedImageIndex,
                                            model: t.plan.model,
                                            modelName: t.plan.modelName,
                                            imageUrl: t.imageUrls && t.imageUrls.length > 0 
                                              ? t.imageUrls[t.imageUrls.length - 1].url 
                                              : undefined,
                                          }));
                                          onSaveImagePlans(updatedPlans);
                                        }
                                        return newTasks;
                                      });
                                    }}
                                    title={isSelected ? '取消选中' : '设为默认选中'}
                                  >
                                    {isSelected ? <FiCheck /> : null}
                                  </button>
                                  {img.modelName && (
                                    <div className="image-model-badge">
                                      {img.modelName}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="image-delete-btn"
                                    onClick={(e) => {
                                      e.stopPropagation(); // 阻止触发图片点击事件和切换选中状态
                                      if (window.confirm('确定要删除这张图片吗？')) {
                                        setGenerationTasks((prev) => {
                                          const newTasks = [...prev];
                                          const updatedImages = [...(newTasks[index].imageUrls || [])];
                                          updatedImages.splice(imgIndex, 1);
                                          
                                          // 更新选中索引：如果删除的是选中的图片，选中最后一个；如果删除的不是选中的，调整索引
                                          let newSelectedIndex = newTasks[index].selectedImageIndex;
                                          if (newSelectedIndex === undefined) {
                                            newSelectedIndex = updatedImages.length - 1;
                                          } else if (imgIndex === newSelectedIndex) {
                                            // 删除的是选中的图片，选中最后一个
                                            newSelectedIndex = updatedImages.length > 0 ? updatedImages.length - 1 : undefined;
                                          } else if (imgIndex < newSelectedIndex) {
                                            // 删除的图片在选中图片之前，需要减1
                                            newSelectedIndex = newSelectedIndex - 1;
                                          }
                                          
                                          newTasks[index] = {
                                            ...newTasks[index],
                                            imageUrls: updatedImages,
                                            selectedImageIndex: newSelectedIndex,
                                            status: updatedImages.length > 0 ? 'completed' : 'pending',
                                          };
                                          // 保存更新后的图片规划
                                          if (onSaveImagePlans) {
                                            const updatedPlans = newTasks.map((t) => ({
                                              ...t.plan,
                                              imageUrls: t.imageUrls || [],
                                              selectedImageIndex: t.selectedImageIndex,
                                              model: t.plan.model,
                                              modelName: t.plan.modelName,
                                              imageUrl: t.imageUrls && t.imageUrls.length > 0 
                                                ? t.imageUrls[t.imageUrls.length - 1].url 
                                                : undefined,
                                            }));
                                            onSaveImagePlans(updatedPlans);
                                          }
                                          return newTasks;
                                        });
                                      }
                                    }}
                                    title="删除这张图片"
                                  >
                                    <FiTrash2 />
                                  </button>
                                  <button
                                    type="button"
                                    className={`image-copy-btn ${copiedImageIndex?.taskIndex === index && copiedImageIndex?.imgIndex === imgIndex ? 'copied' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation(); // 阻止触发图片点击事件和切换选中状态
                                      handleCopyImageMarkdown(index, imgIndex);
                                    }}
                                    title="复制 Markdown 内容"
                                  >
                                    {copiedImageIndex?.taskIndex === index && copiedImageIndex?.imgIndex === imgIndex ? (
                                      <FiCheck />
                                    ) : (
                                      <FiCopy />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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
    </>
  );
}
