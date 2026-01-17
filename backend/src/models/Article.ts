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
}

export interface UpdateArticleData {
  title?: string;
  content?: string;
  imagePlans?: string;
  category?: string;
  published?: number; // 0 = 未发布（草稿）, 1 = 已发布
  sortOrder?: number; // 排序顺序（主要用于实验室文章）
}

export class ArticleModel {
  static findAll(category?: string, includeUnpublished: boolean = false): Article[] {
    let query = 'SELECT * FROM articles';
    const conditions: string[] = [];
    const params: any[] = [];

    // 如果不包含未发布文章，只查询已发布的
    if (!includeUnpublished) {
      conditions.push('(published IS NULL OR published = 1)');
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // 对于实验室文章，按 sortOrder 排序（NULL 值排在最后），然后按 createdAt DESC
    // 对于博客文章，按 createdAt DESC 排序
    if (category === 'lab') {
      query += ' ORDER BY CASE WHEN sortOrder IS NULL THEN 1 ELSE 0 END, sortOrder ASC, createdAt DESC';
    } else {
      query += ' ORDER BY createdAt DESC';
    }

    return db.prepare(query).all(...params) as Article[];
  }

  // 获取所有未发布的文章（仅作者可见）
  static findUnpublished(authorId?: number): Article[] {
    let query = 'SELECT * FROM articles WHERE (published IS NULL OR published = 0)';
    const params: any[] = [];

    if (authorId) {
      query += ' AND authorId = ?';
      params.push(authorId);
    }

    query += ' ORDER BY updatedAt DESC';
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
      .prepare('INSERT INTO articles (title, content, authorId, imagePlans, category, published, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(data.title, data.content, data.authorId, data.imagePlans || null, data.category || 'blog', published, data.sortOrder || null, chinaTime, chinaTime);
    
    return this.findById(result.lastInsertRowid as number)!;
  }

  static update(id: number, data: UpdateArticleData, authorId: number): Article | null {
    // 更新时允许查找未发布的文章
    const article = this.findById(id, true);
    if (!article || article.authorId !== authorId) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.imagePlans !== undefined) {
      updates.push('imagePlans = ?');
      values.push(data.imagePlans || null);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.published !== undefined) {
      updates.push('published = ?');
      values.push(data.published);
      console.log(`[ArticleModel.update] Adding published update: ${data.published} for article ${id}`);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sortOrder = ?');
      values.push(data.sortOrder);
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
    console.log(`[ArticleModel.update] Executing: ${updateQuery}`, values);
    const result = db.prepare(updateQuery).run(...values);
    console.log(`[ArticleModel.update] Update result:`, result);
    
    // 更新后返回文章时，允许查找未发布的文章（因为可能刚刚从草稿发布）
    const updated = this.findById(id, true);
    console.log(`[ArticleModel.update] Retrieved article after update, published:`, updated?.published);
    return updated!;
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
