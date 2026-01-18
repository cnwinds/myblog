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
    // 总访问量（所有访问日志）
    const totalVisitsResult = db.prepare('SELECT COUNT(*) as count FROM visit_logs').get() as { count: number };
    const totalVisits = totalVisitsResult.count;

    // 今日访问量
    const today = new Date().toISOString().split('T')[0];
    const todayVisitsResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM visit_logs 
      WHERE DATE(visitedAt) = ?
    `).get(today) as { count: number };
    const todayVisits = todayVisitsResult.count;

    // 总用户数
    const totalUsersResult = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalUsers = totalUsersResult.count;

    // 总文章数（包括草稿）
    const totalArticlesResult = db.prepare('SELECT COUNT(*) as count FROM articles').get() as { count: number };
    const totalArticles = totalArticlesResult.count;

    // 已发布文章数
    const publishedArticlesResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM articles 
      WHERE published IS NULL OR published = 1
    `).get() as { count: number };
    const publishedArticles = publishedArticlesResult.count;

    // 最近30天的访问量统计（按日期分组）
    const visitsByDate = db.prepare(`
      SELECT 
        DATE(visitedAt) as date,
        COUNT(*) as count
      FROM visit_logs
      WHERE visitedAt >= datetime('now', '-30 days')
      GROUP BY DATE(visitedAt)
      ORDER BY date DESC
    `).all() as Array<{ date: string; count: number }>;

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
