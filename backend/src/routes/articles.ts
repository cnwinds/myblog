import { Router } from 'express';
import {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  getUnpublishedArticles,
} from '../controllers/articleController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 未登录用户可以访问（只读）
router.get('/', getArticles); // 获取文章列表（只返回已发布的）
router.get('/unpublished', authenticateToken, getUnpublishedArticles); // 获取未发布文章列表（需要登录）
router.get('/:id', getArticle); // 获取文章详情（只返回已发布的）

// 登录用户可以访问（增删改）
router.post('/', authenticateToken, createArticle); // 创建文章
router.put('/:id', authenticateToken, updateArticle); // 更新文章
router.delete('/:id', authenticateToken, deleteArticle); // 删除文章

export default router;
