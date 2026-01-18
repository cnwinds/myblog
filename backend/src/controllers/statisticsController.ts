import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../utils/db';

export interface StatisticsData {
  totalVisits: number;
  todayVisits: number;
  totalUsers: number;
  totalArticles: number;
  publishedArticles: number;
  visitsByDate: Array<{ date: string; count: number }>;
}

export function getStatistics(req: AuthRequest, res: Response) {
  try {
    // 使用范围查询代替 DATE() 函数，可以利用索引
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 准备所有查询语句（并行执行）
    const totalVisitsStmt = db.prepare('SELECT COUNT(*) as count FROM visit_logs');
    const todayVisitsStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM visit_logs 
      WHERE visitedAt >= ? AND visitedAt <= ?
    `);
    const totalUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const totalArticlesStmt = db.prepare('SELECT COUNT(*) as count FROM articles');
    const publishedArticlesStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM articles 
      WHERE published IS NULL OR published = 1
    `);
    const visitsByDateStmt = db.prepare(`
      SELECT 
        DATE(visitedAt) as date,
        COUNT(*) as count
      FROM visit_logs
      WHERE visitedAt >= ?
      GROUP BY DATE(visitedAt)
      ORDER BY date DESC
    `);

    // 执行所有查询
    const totalVisits = (totalVisitsStmt.get() as { count: number }).count;
    const todayVisits = (todayVisitsStmt.get(todayStart, todayEnd) as { count: number }).count;
    const totalUsers = (totalUsersStmt.get() as { count: number }).count;
    const totalArticles = (totalArticlesStmt.get() as { count: number }).count;
    const publishedArticles = (publishedArticlesStmt.get() as { count: number }).count;
    const visitsByDate = visitsByDateStmt.all(thirtyDaysAgo) as Array<{ date: string; count: number }>;

    const statistics: StatisticsData = {
      totalVisits,
      todayVisits,
      totalUsers,
      totalArticles,
      publishedArticles,
      visitsByDate: visitsByDate.map(item => ({
        date: item.date,
        count: item.count,
      })),
    };

    res.json(statistics);
  } catch (error: any) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
}
