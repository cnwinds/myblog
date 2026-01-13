import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { login, changePassword } from '../controllers/authController';

const router = Router();

router.post('/login', login);

// 注册功能已禁用
router.post('/register', (req: Request, res: Response) => {
  res.status(403).json({ error: '注册功能已禁用' });
});

// 修改密码（需要认证）
router.post('/change-password', authenticateToken, changePassword);

export default router;
