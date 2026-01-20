import db from '../utils/db';
import { getChinaDateTimeString } from '../utils/dateUtils';

export interface Article {
  id: number;
  title: string;
  content: string;
  authorId: number;
  imagePlans?: string; // JSON字符串，存储图片规划数据
  category?: string; // 'blog' 或 'lab'
  published?: number; // 0 = 未发布（草稿）, 1 = 已发布
  sortOrder?: number; // 排序顺序（主要用于实验室文章）
  excerpt?: string; // 文章摘要
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleData {
  title: string;
  content: string;
  authorId: number;
  imagePlans?: string;
  category?: string;
  published?: number; // 0 = 未发布（草稿）, 1 = 已发布
  sortOrder?: number; // 排序顺序（主要用于实验室文章）
  excerpt?: string; // 文章摘要
}

export interface UpdateArticleData {
  title?: string;
  content?: string;
  imagePlans?: string | null;
  category?: string;
  published?: number; // 0 = 未发布（草稿）, 1 = 已发布
  sortOrder?: number; // 排序顺序（主要用于实验室文章）
  excerpt?: string | null; // 文章摘要
}

export class ArticleModel {
  static findAll(category?: string, includeUnpublished: boolean = false): Article[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    // 如果不包含未发布文章，只查询已发布的
    if (!includeUnpublished) {
      conditions.push('(published IS NULL OR published = 1)');
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    
    // 对于实验室文章，按 sortOrder 排序（NULL 值排在最后），然后按 createdAt DESC
    // 对于博客文章，按 createdAt DESC 排序
    const orderClause = category === 'lab'
      ? ' ORDER BY CASE WHEN sortOrder IS NULL THEN 1 ELSE 0 END, sortOrder ASC, createdAt DESC'
      : ' ORDER BY createdAt DESC';

    const query = `SELECT * FROM articles${whereClause}${orderClause}`;
    return db.prepare(query).all(...params) as Article[];
  }

  // 获取所有未发布的文章（仅作者可见）
  static findUnpublished(authorId?: number): Article[] {
    const conditions = ['(published IS NULL OR published = 0)'];
    const params: unknown[] = [];

    if (authorId) {
      conditions.push('authorId = ?');
      params.push(authorId);
    }

    const query = `SELECT * FROM articles WHERE ${conditions.join(' AND ')} ORDER BY updatedAt DESC`;
    return db.prepare(query).all(...params) as Article[];
  }

  static findById(id: number, includeUnpublished: boolean = false): Article | undefined {
    let query = 'SELECT * FROM articles WHERE id = ?';
    const params: any[] = [id];

    // 如果不包含未发布文章，只查询已发布的
    if (!includeUnpublished) {
      query += ' AND (published IS NULL OR published = 1)';
    }

    return db.prepare(query).get(...params) as Article | undefined;
  }

  static create(data: CreateArticleData): Article {
    // 使用中国时区的时间
    const chinaTime = getChinaDateTimeString();
    const published = data.published !== undefined ? data.published : 1; // 默认为已发布
    const result = db
      .prepare('INSERT INTO articles (title, content, authorId, imagePlans, category, published, sortOrder, excerpt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(data.title, data.content, data.authorId, data.imagePlans || null, data.category || 'blog', published, data.sortOrder || null, data.excerpt || null, chinaTime, chinaTime);
    
    return this.findById(result.lastInsertRowid as number)!;
  }

  static update(id: number, data: UpdateArticleData, authorId: number): Article | null {
    // 更新时允许查找未发布的文章
    const article = this.findById(id, true);
    if (!article || article.authorId !== authorId) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    // 构建更新字段和值
    const updateFields: Array<keyof UpdateArticleData> = [
      'title',
      'content',
      'imagePlans',
      'category',
      'published',
      'sortOrder',
      'excerpt',
    ];

    for (const field of updateFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        // 对于可选字段，将 undefined 转为 null
        values.push(data[field] ?? null);
      }
    }

    if (updates.length === 0) {
      return article;
    }

    // 使用中国时区的时间
    const chinaTime = getChinaDateTimeString();
    updates.push('updatedAt = ?');
    values.push(chinaTime);
    values.push(id);

    const updateQuery = `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...values);
    
    // 更新后返回文章时，允许查找未发布的文章（因为可能刚刚从草稿发布）
    const updated = this.findById(id, true);
    return updated ?? null;
  }

  static delete(id: number, authorId: number): boolean {
    // 删除时允许查找未发布的文章
    const article = this.findById(id, true);
    if (!article || article.authorId !== authorId) {
      return false;
    }

    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    return true;
  }
}
