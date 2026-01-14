import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SettingModel } from '../models/Setting';
import { ProviderModel } from '../models/Provider';
import { getChinaDateTimeString } from '../utils/dateUtils';

export function getSettings(req: AuthRequest, res: Response) {
  try {
    const llmProvider = SettingModel.get('llm_provider');
    const embeddingProvider = SettingModel.get('embedding_provider');
    const imageProvider = SettingModel.get('image_provider');

    res.json({
      llmProvider: llmProvider ? JSON.parse(llmProvider) : null,
      embeddingProvider: embeddingProvider ? JSON.parse(embeddingProvider) : null,
      imageProvider: imageProvider ? JSON.parse(imageProvider) : null,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function saveSettings(req: AuthRequest, res: Response) {
  try {
    const { llmProvider, embeddingProvider, imageProvider } = req.body;

    // 验证提供商是否存在
    if (llmProvider) {
      const provider = ProviderModel.findById(llmProvider.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'LLM provider not found' });
      }
      const models = JSON.parse(provider.models);
      if (!models.includes(llmProvider.model)) {
        return res.status(400).json({ error: 'LLM model not found in provider' });
      }
      SettingModel.set('llm_provider', JSON.stringify(llmProvider));
    }

    if (embeddingProvider) {
      const provider = ProviderModel.findById(embeddingProvider.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'Embedding provider not found' });
      }
      const models = JSON.parse(provider.models);
      if (!models.includes(embeddingProvider.model)) {
        return res.status(400).json({ error: 'Embedding model not found in provider' });
      }
      SettingModel.set('embedding_provider', JSON.stringify(embeddingProvider));
    }

    if (imageProvider) {
      const provider = ProviderModel.findById(imageProvider.providerId);
      if (!provider) {
        return res.status(400).json({ error: 'Image provider not found' });
      }
      const models = JSON.parse(provider.models);
      if (!models.includes(imageProvider.model)) {
        return res.status(400).json({ error: 'Image model not found in provider' });
      }
      SettingModel.set('image_provider', JSON.stringify(imageProvider));
    }

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 获取默认图片生成提示词模板
function getDefaultImagePromptTemplate(): string {
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

// 获取图片生成提示词模板
export function getImagePromptTemplate(req: AuthRequest, res: Response) {
  try {
    let template = SettingModel.get('image_prompt_template');
    
    // 如果数据库中没有模板，使用默认模板并保存到数据库
    if (!template) {
      template = getDefaultImagePromptTemplate();
      SettingModel.set('image_prompt_template', template);
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Get image prompt template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// 保存图片生成提示词模板
export function saveImagePromptTemplate(req: AuthRequest, res: Response) {
  try {
    const { template } = req.body;

    if (typeof template !== 'string') {
      return res.status(400).json({ error: 'Template must be a string' });
    }

    SettingModel.set('image_prompt_template', template);
    res.json({ message: 'Image prompt template saved successfully' });
  } catch (error) {
    console.error('Save image prompt template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
