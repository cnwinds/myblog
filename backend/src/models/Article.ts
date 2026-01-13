import db from '../utils/db';

export interface Article {
  id: number;
  title: string;
  content: string;
  authorId: number;
  imagePlans?: string; // JSON字符串，存储图片规划数据
  createdAt: string;
  updatedAt: string;
}

export interface CreateArticleData {
  title: string;
  content: string;
  authorId: number;
  imagePlans?: string;
}

export interface UpdateArticleData {
  title?: string;
  content?: string;
  imagePlans?: string;
}

export class ArticleModel {
  static findAll(): Article[] {
    return db.prepare('SELECT * FROM articles ORDER BY createdAt DESC').all() as Article[];
  }

  static findById(id: number): Article | undefined {
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | undefined;
  }

  static create(data: CreateArticleData): Article {
    const result = db
      .prepare('INSERT INTO articles (title, content, authorId, imagePlans) VALUES (?, ?, ?, ?)')
      .run(data.title, data.content, data.authorId, data.imagePlans || null);
    
    return this.findById(result.lastInsertRowid as number)!;
  }

  static update(id: number, data: UpdateArticleData, authorId: number): Article | null {
    const article = this.findById(id);
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

    if (updates.length === 0) {
      return article;
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id)!;
  }

  static delete(id: number, authorId: number): boolean {
    const article = this.findById(id);
    if (!article || article.authorId !== authorId) {
      return false;
    }

    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    return true;
  }
}
