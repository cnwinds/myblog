import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { getYearAndWeek } from '../utils/dateUtils';

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 70;

function ensureYearWeekDir(): { dir: string; uploadDir: string } {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const { year, weekStr } = getYearAndWeek();
  const dir = path.join(uploadDir, `${year}${weekStr}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return { dir, uploadDir };
}

function toPublicUrl(uploadDir: string, outputPath: string): string {
  const relativePath = path.relative(path.resolve(uploadDir), outputPath);
  return `/uploads/${relativePath.replace(/\\/g, '/')}`;
}

/**
 * 将图片（文件路径或 Buffer）按与 multer 上传相同的规则处理并写入年/周目录。
 * 返回对外路径，如 /uploads/202609/image-....jpg
 */
export async function saveProcessedImage(input: Buffer | string): Promise<string> {
  const { dir, uploadDir } = ensureYearWeekDir();
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const outputPath = path.join(dir, `image-${uniqueSuffix}.jpg`);

  await sharp(input)
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: JPEG_QUALITY,
      mozjpeg: true,
    })
    .toFile(outputPath);

  return toPublicUrl(uploadDir, outputPath);
}
