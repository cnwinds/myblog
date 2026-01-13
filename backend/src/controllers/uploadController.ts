import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import { getYearAndWeek } from '../utils/dateUtils';

export function uploadImage(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 获取年/周信息
    const { year, weekStr } = getYearAndWeek();
    
    // 返回图片URL，包含年/周路径
    // req.file.path 是完整路径，需要转换为相对于uploads的路径
    const relativePath = path.relative(
      path.resolve(process.env.UPLOAD_DIR || './uploads'),
      req.file.path
    );
    
    // 转换为URL路径（使用正斜杠）
    const imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
