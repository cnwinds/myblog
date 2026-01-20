import { Request, Response } from 'express';
import db from '../utils/db';
import { getChinaDateTimeString } from '../utils/dateUtils';
import { handleError } from '../utils/errorHandler';

// 记录访问量（公开接口，不需要登录）
export async function recordVisit(req: Request, res: Response): Promise<void> {
  try {
    const articleId = req.body.articleId ? parseInt(String(req.body.articleId), 10) : null;
    const ipAddress = req.ip || 
      (Array.isArray(req.headers['x-forwarded-for']) 
        ? req.headers['x-forwarded-for'][0] 
        : req.headers['x-forwarded-for']) ||
      (req.socket?.remoteAddress) || 
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 记录访问日志
    db.prepare(`
      INSERT INTO visit_logs (articleId, ipAddress, userAgent, visitedAt)
      VALUES (?, ?, ?, ?)
    `).run(
      articleId,
      ipAddress,
      userAgent,
      getChinaDateTimeString()
    );

    res.json({ success: true });
  } catch (error) {
    // 记录访问失败不应该影响用户体验，所以返回成功
    console.error('Error recording visit:', error);
    res.json({ success: true });
  }
}
