import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadImage } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { getYearWeekDir } from '../utils/dateUtils';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 获取年/周目录
    const yearWeekDir = getYearWeekDir(UPLOAD_DIR);
    
    // 确保目录存在
    if (!fs.existsSync(yearWeekDir)) {
      fs.mkdirSync(yearWeekDir, { recursive: true });
    }
    
    cb(null, yearWeekDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  },
});

// 文件过滤器：只允许图片
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
});

// 登录用户可以上传图片
router.post('/image', authenticateToken, upload.single('image'), uploadImage);

export default router;
