import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  // 确保使用正确的secret（从环境变量读取）
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET not set in environment, using default');
  }
  
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      // JWT过期或无效时返回401未授权，而不是403禁止访问
      // 401表示需要重新认证，403表示已认证但无权限
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = (decoded as { userId: number }).userId;
    next();
  });
}
