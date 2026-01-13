import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
} from '../controllers/providerController';
import { getSettings, saveSettings } from '../controllers/settingsController';

const router = Router();

// 提供商管理
router.get('/providers', authenticateToken, getProviders);
router.get('/providers/:id', authenticateToken, getProvider);
router.post('/providers', authenticateToken, createProvider);
router.put('/providers/:id', authenticateToken, updateProvider);
router.delete('/providers/:id', authenticateToken, deleteProvider);

// 设置管理
router.get('/selection', authenticateToken, getSettings);
router.post('/selection', authenticateToken, saveSettings);

export default router;
