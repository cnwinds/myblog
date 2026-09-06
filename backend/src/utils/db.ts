import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || './blog.db';
const db = new Database(dbPath);

// 初始化数据库表
export function initDatabase() {
  // 创建用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建文章表
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      authorId INTEGER NOT NULL,
      imagePlans TEXT,
      category TEXT DEFAULT 'blog',
      published INTEGER DEFAULT 1,
      sortOrder INTEGER,
      excerpt TEXT,
      demoUrl TEXT,
      repoUrl TEXT,
      tags TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (authorId) REFERENCES users(id)
    )
  `);

  // 为现有表添加字段（如果不存在）
  const alterTableColumns = [
    { column: 'imagePlans', sql: 'ALTER TABLE articles ADD COLUMN imagePlans TEXT' },
    { 
      column: 'category', 
      sql: `ALTER TABLE articles ADD COLUMN category TEXT DEFAULT 'blog'`,
      updateSql: `UPDATE articles SET category = 'blog' WHERE category IS NULL`
    },
    { 
      column: 'published', 
      sql: 'ALTER TABLE articles ADD COLUMN published INTEGER DEFAULT 1',
      updateSql: 'UPDATE articles SET published = 1 WHERE published IS NULL'
    },
    { column: 'sortOrder', sql: 'ALTER TABLE articles ADD COLUMN sortOrder INTEGER' },
    { column: 'excerpt', sql: 'ALTER TABLE articles ADD COLUMN excerpt TEXT' },
    { column: 'demoUrl', sql: 'ALTER TABLE articles ADD COLUMN demoUrl TEXT' },
    { column: 'repoUrl', sql: 'ALTER TABLE articles ADD COLUMN repoUrl TEXT' },
    { column: 'tags', sql: 'ALTER TABLE articles ADD COLUMN tags TEXT' },
  ];

  for (const { column, sql, updateSql } of alterTableColumns) {
    try {
      db.exec(sql);
      if (updateSql) {
        db.exec(updateSql);
      }
    } catch (error: unknown) {
      // 字段已存在，忽略错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('duplicate column name')) {
        console.warn(`Failed to add ${column} column:`, errorMessage);
      }
    }
  }

  // 创建AI提供商表
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      apiKey TEXT,
      apiBase TEXT,
      models TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建系统设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建访问日志表（用于统计访问量）
  db.exec(`
    CREATE TABLE IF NOT EXISTS visit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleId INTEGER,
      ipAddress TEXT,
      userAgent TEXT,
      visitedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (articleId) REFERENCES articles(id)
    )
  `);

  // 创建索引以提高查询性能
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_visit_logs_articleId ON visit_logs(articleId)',
    'CREATE INDEX IF NOT EXISTS idx_visit_logs_visitedAt ON visit_logs(visitedAt)',
  ];

  for (const indexSql of indexes) {
    try {
      db.exec(indexSql);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Failed to create index:', errorMessage);
    }
  }

  console.log('Database initialized successfully');
}

export default db;
