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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (authorId) REFERENCES users(id)
    )
  `);

  // 为现有表添加 imagePlans 字段（如果不存在）
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN imagePlans TEXT`);
  } catch (error: any) {
    // 字段已存在，忽略错误
    if (!error.message.includes('duplicate column name')) {
      console.warn('Failed to add imagePlans column:', error.message);
    }
  }

  // 为现有表添加 category 字段（如果不存在），默认为 'blog'
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN category TEXT DEFAULT 'blog'`);
    // 更新现有文章，将category设置为'blog'
    db.exec(`UPDATE articles SET category = 'blog' WHERE category IS NULL`);
  } catch (error: any) {
    // 字段已存在，忽略错误
    if (!error.message.includes('duplicate column name')) {
      console.warn('Failed to add category column:', error.message);
    }
  }

  // 为现有表添加 published 字段（如果不存在），默认为 1（已发布）
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN published INTEGER DEFAULT 1`);
    // 更新现有文章，将published设置为1（已发布）
    db.exec(`UPDATE articles SET published = 1 WHERE published IS NULL`);
  } catch (error: any) {
    // 字段已存在，忽略错误
    if (!error.message.includes('duplicate column name')) {
      console.warn('Failed to add published column:', error.message);
    }
  }

  // 为现有表添加 sortOrder 字段（如果不存在），用于实验室文章的排序
  try {
    db.exec(`ALTER TABLE articles ADD COLUMN sortOrder INTEGER`);
  } catch (error: any) {
    // 字段已存在，忽略错误
    if (!error.message.includes('duplicate column name')) {
      console.warn('Failed to add sortOrder column:', error.message);
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

  console.log('Database initialized successfully');
}

export default db;
