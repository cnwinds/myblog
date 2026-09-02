import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { saveProcessedImage } from '../services/imageStorage';
import { persistRemoteImageUrl } from '../services/imageRehost';
import { isAlreadyLocalUpload, isHttpUrl } from '../utils/imageUrlUtils';
import { createApiError, handleError } from '../utils/errorHandler';
import fs from 'fs';

export async function uploadImage(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      throw createApiError('No file uploaded', 400);
    }

    const originalPath = req.file.path;
    const imageUrl = await saveProcessedImage(originalPath);

    try {
      fs.unlinkSync(originalPath);
    } catch (err) {
      console.warn('Failed to delete original file:', err);
    }

    res.json({ url: imageUrl });
  } catch (error) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // 忽略删除错误
      }
    }

    handleError(res, error, '图片上传失败');
  }
}

export async function uploadImageFromUrl(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      throw createApiError('url is required', 400);
    }

    if (!isHttpUrl(url)) {
      throw createApiError('Only http(s) URLs are allowed', 400);
    }

    if (isAlreadyLocalUpload(url)) {
      try {
        const parsed = new URL(url);
        const path = parsed.pathname.startsWith('/uploads') ? parsed.pathname : url;
        res.json({ url: path });
        return;
      } catch {
        res.json({ url });
        return;
      }
    }

    const localUrl = await persistRemoteImageUrl(url);
    res.json({ url: localUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : '从 URL 保存图片失败';
    handleError(res, createApiError(message, 400), '从 URL 保存图片失败');
  }
}
