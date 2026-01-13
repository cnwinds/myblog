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

export default router;
