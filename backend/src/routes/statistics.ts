import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getStatistics } from '../controllers/statisticsController';

const router = Router();

// 获取统计数据（需要登录）
router.get('/', authenticateToken, getStatistics);

export default router;
