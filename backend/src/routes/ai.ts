import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { callLLM, callEmbedding, callImageGeneration, callLLMStream } from '../services/aiService';
import { IncrementalJSONParser } from '../utils/jsonStreamParser';
import { SettingModel } from '../models/Setting';

const router = Router();

// 获取图片生成提示词模板（从数据库读取，如果没有则使用默认值）
function getImagePromptTemplate(): string {
  const template = SettingModel.get('image_prompt_template');
  if (template) {
    return template;
  }
  
  // 默认提示词模板
  return `# 角色定义
你是一位专业的博客视觉内容策划师，擅长将复杂内容拆解为吸引眼球的卡通风格系列信息图。

# 任务
请仔细分析以下输入内容，根据内容的复杂度、信息量、主题数量等因素，**智能评估并确定需要生成的图片数量**（1-10张），然后将其拆解为相应数量的博客风格系列信息图，并为每张图片输出独立的生成提示词。

**重要：图片数量必须根据内容实际情况评估，不要固定生成10张。如果内容简单，应该生成较少的图片；如果内容复杂，才生成更多图片。**

# 拆解原则
1. **封面图（第1张）**：必须有强烈视觉冲击力，包含核心标题和吸引点
2. **内容图（中间）**：每张聚焦1个核心观点，信息密度适中
3. **结尾图（最后1张）**：总结/行动号召/金句收尾

# 图片数量评估标准（请严格遵循）
请根据以下标准，仔细评估内容后确定图片数量：

- **极简内容**（1-2个要点，少于200字）：**1-2 张**
  - 只有封面图，或封面图+结尾图
  
- **简单观点/单一主题**（2-3个要点，200-500字）：**2-3 张**
  - 封面图 + 1-2张内容图（或+结尾图）
  
- **中等复杂度/教程类**（4-6个要点，500-1000字）：**4-6 张**
  - 封面图 + 2-4张内容图 + 结尾图
  
- **深度干货/多维度分析**（7个以上要点，1000字以上，多个主题）：**7-10 张**
  - 封面图 + 5-8张内容图 + 结尾图

**评估原则**：
- 优先考虑内容的实际信息量和复杂度，而不是盲目生成最多数量
- 如果内容简单，生成1-3张即可，不要为了凑数而生成多余图片
- 每张图片应该承载有意义的独立信息点，避免信息重复
- 只有在内容确实需要多张图片才能完整表达时，才生成7-10张

# 视觉风格规范（重要）
## 基础设定
- **图片类型**：信息图（Infographic）
- **方向比例**：横版，16:9 或 4:3
- **整体风格**：卡通风格、手绘风格

## 背景与配色
- 背景色：莫兰迪色系 / 奶油色 / 米白色 / 浅粉 / 薄荷绿等温柔色调
- 配色柔和统一，符合博客审美

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
- **以图为主，文字为辅**：图片应占据主要视觉空间，文字仅作为辅助说明，不要出现大段的文字
- 信息精简，突出关键词与核心概念
- 多留白，易于一眼抓住重点
- 要点分条呈现，层次清晰

# 输出格式
对于每张图片，请按以下JSON格式输出，返回一个数组：

\`\`\`json
[
  {
    "index": 1,
    "coreMessage": "这张图要传达的1句话核心",
    "position": "[封面图 / 内容图 / 结尾图]",
    "title": "主标题",
    "subtitle": "副标题/要点",
    "description": "补充说明（如有）",
    "prompt": "完整的图片生成提示词，包含所有视觉风格要求",
    "aspectRatio": "16:9"
  }
]
\`\`\`

**prompt 字段格式要求**：
prompt 字段必须包含完整的图片生成提示词，格式如下：

博客风格信息图，横版（16:9），卡通风格，手绘风格文字，[具体背景色]背景。

[具体内容布局描述]

加入简洁的卡通元素和图标增强趣味性和视觉记忆：[具体元素描述]

整体风格：手绘、可爱、清新，信息精简，多留白，重点突出。以图为主，文字为辅，不要出现大段的文字。所有图像和文字均为手绘风格，无写实元素。

    参考示例：
    博客风格信息图，横版（16:9），卡通风格，手绘风格文字，米白色（Cream）背景。

    画面中心是一个戴眼镜、穿着衬衫的卡通中年男子形象（代表吴恩达），表情睿智亲切，手托下巴思考。
    他的头顶上方有两个大大的问号气泡，一边写着"图灵测试？"，另一边写着"跑分刷榜？"。
    主标题"AGI 到底来了没？"使用加粗的手绘艺术字，颜色醒目（如焦糖色）。
    背景中有零星的星星和思考的光辉装饰。

    整体风格：手绘、可爱、清新，信息精简，多留白，重点突出。以图为主，文字为辅，不要出现大段的文字。所有图像和文字均为手绘风格，无写实元素。

**注意**：
- aspectRatio 字段必须填写，表示图片的宽高比
- 支持的格式：横版使用 "16:9" 或 "4:3"，竖版使用 "3:4" 或 "9:16"，方图使用 "1:1"
- 默认使用 "16:9"（横版）
- prompt 中的比例描述必须与 aspectRatio 字段一致

# 语言规则
- 除非特别要求，输出语言与输入内容语言保持一致
- 中文内容使用全角标点符号（""，。！）

---

请分析以下文章：

**标题**：{{TITLE}}

**内容**：
{{CONTENT}}

请按照上述要求，输出JSON格式的图片规划数组。只返回JSON数组，不要包含其他文字说明。`;
}

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
    const { prompt, width, height, aspectRatio, n } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 如果提供了 aspectRatio，转换为 width 和 height
    let finalWidth = width;
    let finalHeight = height;
    
    if (aspectRatio && !width && !height) {
      const dimensions = convertAspectRatioToDimensions(aspectRatio);
      finalWidth = dimensions.width;
      finalHeight = dimensions.height;
    }

    const response = await callImageGeneration(prompt, { width: finalWidth, height: finalHeight, n });
    res.json(response);
  } catch (error: any) {
    console.error('Image generation call error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

/**
 * 将宽高比转换为具体的宽高尺寸
 * 百炼API推荐尺寸：
 * - 3:4 (竖版) -> 768*1024
 * - 9:16 (竖版) -> 720*1280
 * - 16:9 (横版) -> 1280*720
 * - 4:3 (横版) -> 1024*768
 * - 1:1 (方图) -> 1024*1024
 */
function convertAspectRatioToDimensions(aspectRatio: string): { width: number; height: number } {
  const ratio = aspectRatio.trim().toLowerCase();
  
  switch (ratio) {
    case '3:4':
      return { width: 768, height: 1024 };
    case '9:16':
      return { width: 720, height: 1280 };
    case '16:9':
      return { width: 1280, height: 720 };
    case '4:3':
      return { width: 1024, height: 768 };
    case '1:1':
      return { width: 1024, height: 1024 };
    default:
      // 尝试解析自定义比例，如 "2:3" -> 768*1152
      const match = ratio.match(/^(\d+):(\d+)$/);
      if (match) {
        const w = parseInt(match[1], 10);
        const h = parseInt(match[2], 10);
        // 按比例计算，保持总像素在合理范围内（约 786432 像素，接近 1024*768）
        const baseSize = 768;
        const scale = baseSize / w;
        return {
          width: Math.round(w * scale),
          height: Math.round(h * scale),
        };
      }
      // 默认使用 3:4
      return { width: 768, height: 1024 };
  }
}

// 分析文章并生成图片提示词和位置信息
router.post('/analyze-article-for-images', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // 获取提示词模板（从数据库读取，如果没有则使用默认值）
    const template = getImagePromptTemplate();
    // 替换模板中的占位符
    const prompt = template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{CONTENT\}\}/g, content);
 
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

// 流式分析文章并生成图片提示词和位置信息
router.post('/analyze-article-for-images-stream', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用nginx缓冲

    // 获取提示词模板（从数据库读取，如果没有则使用默认值）
    const template = getImagePromptTemplate();
    // 替换模板中的占位符
    const prompt = template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{CONTENT\}\}/g, content);

    const parser = new IncrementalJSONParser();
    let fullContent = '';

    try {
      // 流式调用LLM
      for await (const chunk of callLLMStream(prompt, { temperature: 0.7, maxTokens: 4000 })) {
        fullContent += chunk;
        
        // 尝试解析已完成的项
        const newItems = parser.addChunk(chunk);
        
        // 如果有新完成的项，发送给前端
        if (newItems.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'item', items: newItems })}\n\n`);
        }
      }

      // 流式输出完成，尝试解析最终结果
      const finalItems = parser.tryParseFinal();
      if (finalItems && finalItems.length > 0) {
        // 发送最终结果
        res.write(`data: ${JSON.stringify({ type: 'final', items: finalItems })}\n\n`);
      } else {
        // 如果最终解析失败，尝试从完整内容中提取
        try {
          const content = fullContent.trim();
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const imagePlans = JSON.parse(jsonMatch[0]);
            res.write(`data: ${JSON.stringify({ type: 'final', items: imagePlans })}\n\n`);
          }
        } catch (e) {
          // 如果还是失败，发送已解析的项
          const completed = parser.getCompletedItems();
          if (completed.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'final', items: completed })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ type: 'error', error: '无法解析AI返回的图片规划' })}\n\n`);
          }
        }
      }

      // 发送完成信号
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error('Stream analyze article error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || '分析文章失败' })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('Analyze article stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || '分析文章失败' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || '分析文章失败' })}\n\n`);
      res.end();
    }
  }
});

// 智能判断图片插入位置（单张图片）
router.post('/find-image-position', authenticateToken, async (req, res) => {
  try {
    const { content, imageCoreMessage } = req.body;

    if (!content || !imageCoreMessage) {
      return res.status(400).json({ error: 'Content and imageCoreMessage are required' });
    }

    // 构建提示词，让大模型判断图片应该插入到文章的哪个位置
    const prompt = `你是一位专业的内容编辑助手。请分析以下文章内容，判断一张图片应该插入到文章的哪个位置。

文章内容：
${content}

图片说明（coreMessage）：${imageCoreMessage}

**重要规则**：
- 图片只能插入在段落之间（段落结束后的空行处）
- 或者插入在句子之间（句号、问号、感叹号之后）
- **绝对不能插入在一句话的中间**

请根据图片说明与文章内容的匹配度，判断图片应该插入的位置。返回格式为JSON：
{
  "position": "开头" | "结尾" | "第X段后" | "第X句后",
  "reason": "插入原因说明"
}

其中：
- "开头"：插入到文章开头（第一个段落之前）
- "结尾"：插入到文章结尾（最后一个段落之后）
- "第X段后"：插入到第X个段落后（X为数字，从1开始，段落之间用空行分隔）
- "第X句后"：插入到第X个句子后（X为数字，从1开始，句子以句号、问号、感叹号结尾）

请只返回JSON，不要返回其他内容。`;

    const response = await callLLM(prompt, { temperature: 0.3 });
    
    // 尝试解析JSON响应
    let positionData;
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        positionData = JSON.parse(jsonMatch[0]);
      } else {
        positionData = JSON.parse(response.content);
      }
    } catch (parseError) {
      // 如果解析失败，返回默认位置（结尾）
      console.warn('Failed to parse position response:', parseError);
      positionData = { position: '结尾', reason: '无法解析AI响应，默认插入到结尾' };
    }

    res.json({
      position: positionData.position || '结尾',
      reason: positionData.reason || 'AI判断的插入位置',
    });
  } catch (error: any) {
    console.error('Find image position error:', error);
    res.status(500).json({ error: error.message || 'Failed to find image position' });
  }
});

// 批量智能判断多张图片插入位置（一次调用判断所有图片）
router.post('/find-image-positions', authenticateToken, async (req, res) => {
  try {
    const { content, imageCoreMessages } = req.body;

    if (!content || !Array.isArray(imageCoreMessages) || imageCoreMessages.length === 0) {
      return res.status(400).json({ error: 'Content and imageCoreMessages array are required' });
    }

    // 构建提示词，让大模型一次性判断所有图片的插入位置
    const messagesList = imageCoreMessages.map((msg: string, idx: number) => `图片${idx + 1}：${msg}`).join('\n');
    
    const prompt = `你是一位专业的内容编辑助手。请分析以下文章内容，判断多张图片应该插入到文章的哪个位置。

文章内容：
${content}

图片说明列表：
${messagesList}

**重要规则**：
- 图片只能插入在段落之间（段落结束后的空行处）
- 或者插入在句子之间（句号、问号、感叹号之后）
- **绝对不能插入在一句话的中间**
- 每张图片的插入位置应该不同，避免重复

请根据每张图片的说明与文章内容的匹配度，判断每张图片应该插入的位置。返回格式为JSON数组：
[
  {
    "index": 1,
    "position": "开头" | "结尾" | "第X段后" | "第X句后",
    "reason": "插入原因说明"
  },
  {
    "index": 2,
    "position": "开头" | "结尾" | "第X段后" | "第X句后",
    "reason": "插入原因说明"
  }
]

其中：
- "开头"：插入到文章开头（第一个段落之前）
- "结尾"：插入到文章结尾（最后一个段落之后）
- "第X段后"：插入到第X个段落后（X为数字，从1开始，段落之间用空行分隔）
- "第X句后"：插入到第X个句子后（X为数字，从1开始，句子以句号、问号、感叹号结尾）

请只返回JSON数组，不要返回其他内容。`;

    const response = await callLLM(prompt, { temperature: 0.3 });
    
    // 尝试解析JSON响应
    let positionsData;
    try {
      // 尝试从响应中提取JSON数组
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        positionsData = JSON.parse(jsonMatch[0]);
      } else {
        positionsData = JSON.parse(response.content);
      }
      
      // 确保返回的是数组
      if (!Array.isArray(positionsData)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      // 如果解析失败，为每张图片返回默认位置（结尾）
      console.warn('Failed to parse positions response:', parseError);
      positionsData = imageCoreMessages.map((_: string, idx: number) => ({
        index: idx + 1,
        position: '结尾',
        reason: '无法解析AI响应，默认插入到结尾',
      }));
    }

    // 确保返回的数组长度与输入的图片数量一致
    const results = imageCoreMessages.map((_: string, idx: number) => {
      const result = positionsData[idx] || positionsData.find((p: any) => p.index === idx + 1);
      return {
        position: result?.position || '结尾',
        reason: result?.reason || 'AI判断的插入位置',
      };
    });

    res.json({ positions: results });
  } catch (error: any) {
    console.error('Find image positions error:', error);
    res.status(500).json({ error: error.message || 'Failed to find image positions' });
  }
});

export default router;
