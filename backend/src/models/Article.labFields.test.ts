import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ArticleModel as ArticleModelType } from './Article';
import type { serializeArticle as SerializeArticle } from '../utils/articleFields';
import type Database from 'better-sqlite3';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'article-lab-fields-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db');

let db: Database.Database;
let ArticleModel: typeof ArticleModelType;
let serializeArticle: typeof SerializeArticle;

describe('ArticleModel lab fields persistence', () => {
  before(async () => {
    const dbMod = await import('../utils/db');
    const articleMod = await import('./Article');
    const fieldsMod = await import('../utils/articleFields');

    db = dbMod.default;
    ArticleModel = articleMod.ArticleModel;
    serializeArticle = fieldsMod.serializeArticle;

    dbMod.initDatabase();
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('tester', 'hashed');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('defaults missing lab fields to null for existing-style creates', () => {
    const article = ArticleModel.create({
      title: '旧实验室文章',
      content: '![封面](https://example.com/cover.png)\n一段说明',
      authorId: 1,
      category: 'lab',
    });

    assert.equal(article.demoUrl, null);
    assert.equal(article.repoUrl, null);
    assert.equal(article.tags, null);

    const serialized = serializeArticle(article);
    assert.deepEqual(serialized.tags, []);
  });

  it('persists demoUrl, repoUrl and JSON tags through create and update', () => {
    const created = ArticleModel.create({
      title: '可玩项目',
      content: '![封面](https://example.com/play.png)\n能玩的优先',
      authorId: 1,
      category: 'lab',
      excerpt: '一句话介绍',
      demoUrl: 'https://play.example',
      repoUrl: 'https://github.com/example/play',
      tags: JSON.stringify(['游戏', 'AI']),
    });

    assert.equal(created.demoUrl, 'https://play.example');
    assert.equal(created.repoUrl, 'https://github.com/example/play');
    assert.equal(created.tags, '["游戏","AI"]');

    const listed = ArticleModel.findAll('lab');
    const found = listed.find((item) => item.id === created.id);
    assert.ok(found);
    assert.equal(found?.demoUrl, 'https://play.example');
    assert.deepEqual(serializeArticle(found!).tags, ['游戏', 'AI']);

    const updated = ArticleModel.update(
      created.id,
      {
        demoUrl: 'https://play.example/v2',
        tags: JSON.stringify(['推理']),
      },
      1
    );

    assert.ok(updated);
    assert.equal(updated?.demoUrl, 'https://play.example/v2');
    assert.equal(updated?.repoUrl, 'https://github.com/example/play');
    assert.equal(updated?.tags, '["推理"]');
  });

  it('lists lab articles by createdAt descending and ignores sortOrder', () => {
    const older = ArticleModel.create({
      title: '较早的实验室',
      content: '旧项目',
      authorId: 1,
      category: 'lab',
      sortOrder: 0,
    });
    const newer = ArticleModel.create({
      title: '较新的实验室',
      content: '新项目',
      authorId: 1,
      category: 'lab',
      sortOrder: 99,
    });

    db.prepare('UPDATE articles SET createdAt = ? WHERE id = ?').run('2024-01-01 00:00:00', older.id);
    db.prepare('UPDATE articles SET createdAt = ? WHERE id = ?').run('2025-06-01 12:00:00', newer.id);

    const listed = ArticleModel.findAll('lab');
    const olderIndex = listed.findIndex((item) => item.id === older.id);
    const newerIndex = listed.findIndex((item) => item.id === newer.id);

    assert.ok(newerIndex >= 0);
    assert.ok(olderIndex >= 0);
    assert.ok(newerIndex < olderIndex);
  });

  it('does not break blog posts when lab fields are omitted', () => {
    const blog = ArticleModel.create({
      title: '博客文章',
      content: '普通正文',
      authorId: 1,
      category: 'blog',
    });

    assert.equal(blog.category, 'blog');
    assert.equal(blog.demoUrl, null);
    assert.equal(blog.repoUrl, null);
    assert.equal(blog.tags, null);
  });
});
