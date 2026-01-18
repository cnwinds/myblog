import { Request, Response } from 'express';
import db from '../utils/db';
import { getChinaDateTimeString } from '../utils/dateUtils';

// 记录访问量（公开接口，不需要登录）
export function recordVisit(req: Request, res: Response) {
  try {
    const articleId = req.body.articleId ? parseInt(req.body.articleId) : null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
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
  } catch (error: any) {
    console.error('Error recording visit:', error);
    // 记录访问失败不应该影响用户体验，所以返回成功
    res.json({ success: true });
  }
}
