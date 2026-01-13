import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { callLLM, callEmbedding, callImageGeneration } from '../services/aiService';

const router = Router();

// 登录用户可以访问AI功能
// 调用大模型生成内容（使用OpenAI兼容模式）
router.post('/llm', authenticateToken, async (req, res) => {
  try {
    const { prompt, temperature, maxTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await callLLM(prompt, { temperature, maxTokens });
    res.json(response);
  } catch (error: any) {
    console.error('LLM call error:', error);
    res.status(500).json({ error: error.message || 'Failed to call LLM' });
  }
});

// 登录用户可以访问AI功能
// 调用向量模型生成嵌入（使用OpenAI兼容模式）
router.post('/embedding', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await callEmbedding(text);
    res.json(response);
  } catch (error: any) {
    console.error('Embedding call error:', error);
    res.status(500).json({ error: error.message || 'Failed to call embedding' });
  }
});

// 登录用户可以访问AI功能
// 调用文生图模型生成图片（使用百炼接口）
router.post('/image', authenticateToken, async (req, res) => {
  try {
    const { prompt, width, height, n } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await callImageGeneration(prompt, { width, height, n });
    res.json(response);
  } catch (error: any) {
    console.error('Image generation call error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

// 分析文章并生成图片提示词和位置信息
router.post('/analyze-article-for-images', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const prompt = `# 角色定义
你是一位专业的小红书视觉内容策划师，擅长将复杂内容拆解为吸引眼球的卡通风格系列信息图。

# 任务
请分析以下输入内容，将其拆解为 1-10 张小红书风格的系列信息图，并为每张图片输出独立的生成提示词。

# 拆解原则
1. **封面图（第1张）**：必须有强烈视觉冲击力，包含核心标题和吸引点
2. **内容图（中间）**：每张聚焦1个核心观点，信息密度适中
3. **结尾图（最后1张）**：总结/行动号召/金句收尾

# 图片数量判断标准
- 简单观点/单一主题：2-3 张
- 中等复杂度/教程类：4-6 张
- 深度干货/多维度分析：7-10 张

# 视觉风格规范（重要）
## 基础设定
- **图片类型**：信息图（Infographic）
- **方向比例**：竖版，3:4 或 9:16
- **整体风格**：卡通风格、手绘风格

## 背景与配色
- 背景色：莫兰迪色系 / 奶油色 / 米白色 / 浅粉 / 薄荷绿等温柔色调
- 配色柔和统一，符合小红书审美

## 文字风格
- **必须使用手绘风格文字**
- 大标题突出醒目，重点文字加粗放大
- 可使用荧光笔划线效果强调关键词
- 禁止使用写实风格字体

## 装饰元素
- 加入少量简洁的**卡通元素、图标或名人画像**，增强趣味性和视觉记忆
- 可使用：emoji 风格图标、手绘贴纸、便签纸质感、对话气泡等
- 如涉及敏感人物或版权内容，画一个风格相似的卡通替代形象，不要拒绝生成
- **所有图像元素必须是手绘/卡通风格，禁止写实风格图画**

## 排版原则
- 信息精简，突出关键词与核心概念
- 多留白，易于一眼抓住重点
- 要点分条呈现，层次清晰

# 输出格式
对于每张图片，请按以下JSON格式输出，返回一个数组：

\`\`\`json
[
  {
    "index": 1,
    "type": "封面图",
    "coreMessage": "这张图要传达的1句话核心",
    "position": "文章开头",
    "title": "主标题",
    "subtitle": "副标题/要点",
    "description": "补充说明（如有）",
    "prompt": "完整的图片生成提示词，包含所有视觉风格要求"
  }
]
\`\`\`

# 语言规则
- 除非特别要求，输出语言与输入内容语言保持一致
- 中文内容使用全角标点符号（""，。！）

---

请分析以下文章：

**标题**：${title}

**内容**：
${content}

请按照上述要求，输出JSON格式的图片规划数组。只返回JSON数组，不要包含其他文字说明。`;

    const response = await callLLM(prompt, { temperature: 0.7, maxTokens: 4000 });
    
    // 尝试解析JSON响应
    let imagePlans;
    try {
      // 尝试从响应中提取JSON（可能包含markdown代码块）
      const content = response.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        imagePlans = JSON.parse(jsonMatch[0]);
      } else {
        imagePlans = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', response.content);
      throw new Error('无法解析AI返回的图片规划，请重试');
    }

    res.json({ imagePlans });
  } catch (error: any) {
    console.error('Analyze article error:', error);
    res.status(500).json({ error: error.message || '分析文章失败' });
  }
});

export default router;
