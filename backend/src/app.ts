import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './utils/db';
import db from './utils/db';
import { UserModel } from './models/User';
import authRoutes from './routes/auth';
import articleRoutes from './routes/articles';
import uploadRoutes from './routes/upload';
import settingsRoutes from './routes/settings';
import aiRoutes from './routes/ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化数据库
initDatabase();

// 检查并创建默认用户（如果没有用户）
(async () => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count === 0) {
      console.log('未找到用户，正在创建默认用户...');
      await UserModel.create({
        username: 'admin',
        password: 'admin123',
      });
      console.log('✅ 默认用户创建成功！');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      console.log('   ⚠️  请在生产环境中及时修改默认密码！');
    }
  } catch (error) {
    console.error('创建默认用户失败:', error);
  }
})();

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory: ${uploadDir}`);
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于提供上传的图片）
app.use('/uploads', express.static(path.resolve(uploadDir)));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
