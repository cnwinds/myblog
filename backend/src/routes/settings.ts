import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
} from '../controllers/providerController';
import { getSettings, saveSettings, getImagePromptTemplate, saveImagePromptTemplate } from '../controllers/settingsController';

const router = Router();

// 登录用户可以访问系统设置功能
// 提供商管理
router.get('/providers', authenticateToken, getProviders);
router.get('/providers/:id', authenticateToken, getProvider);
router.post('/providers', authenticateToken, createProvider);
router.put('/providers/:id', authenticateToken, updateProvider);
router.delete('/providers/:id', authenticateToken, deleteProvider);

// 设置管理
router.get('/selection', authenticateToken, getSettings);
router.post('/selection', authenticateToken, saveSettings);

// 图片生成提示词模板管理
router.get('/image-prompt-template', authenticateToken, getImagePromptTemplate);
router.post('/image-prompt-template', authenticateToken, saveImagePromptTemplate);

export default router;
