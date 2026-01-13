import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { getYearAndWeek } from '../utils/dateUtils';

// 图片处理配置
const MAX_WIDTH = 800; // 最大宽度（适合博客文章显示，优化文件大小）
const MAX_HEIGHT = 800; // 最大高度（适合博客文章显示，优化文件大小）
const JPEG_QUALITY = 70; // JPG 质量 (1-100)，进一步优化文件大小

export async function uploadImage(req: AuthRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const originalPath = req.file.path;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // 获取年/周目录
    const { year, weekStr } = getYearAndWeek();
    const yearWeekDir = path.join(uploadDir, `${year}${weekStr}`);
    
    // 确保输出目录存在
    if (!fs.existsSync(yearWeekDir)) {
      fs.mkdirSync(yearWeekDir, { recursive: true });
    }
    
    // 生成新的文件名（JPG格式）
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const newFileName = `image-${uniqueSuffix}.jpg`;
    const outputPath = path.join(yearWeekDir, newFileName);

    // 使用 sharp 处理图片：缩放、转换为 JPG、压缩
    await sharp(originalPath)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside', // 保持宽高比，确保图片不超出最大尺寸
        withoutEnlargement: true, // 不放大小于最大尺寸的图片
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true, // 使用 mozjpeg 编码器以获得更好的压缩
      })
      .toFile(outputPath);

    // 删除原始文件
    try {
      fs.unlinkSync(originalPath);
    } catch (err) {
      console.warn('Failed to delete original file:', err);
    }

    // 返回图片URL
    const relativePath = path.relative(
      path.resolve(uploadDir),
      outputPath
    );
    
    const imageUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
    
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    
    // 清理可能创建的文件
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        // 忽略删除错误
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}
