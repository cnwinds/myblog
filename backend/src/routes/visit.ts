import { Router } from 'express';
import { recordVisit } from '../controllers/visitController';

const router = Router();

// 记录访问量（公开接口，不需要登录）
router.post('/', recordVisit);

export default router;
