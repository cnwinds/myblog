import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countWords,
  extractExcerpt,
  extractHeadings,
  getArticleExcerpt,
  getCoverImage,
  readingMinutes,
  slugifyHeading,
  splitLeadingCover,
  weeklyActivity,
} from './articleText';

describe('extractExcerpt', () => {
  it('skips the leading image and markdown markers', () => {
    const content = '![封面](/uploads/a.jpg)\n\n## 标题\n\n**加粗** 的 [链接](https://x.y) 和 `code`';
    assert.equal(extractExcerpt(content), '标题');
  });

  it('truncates long lines', () => {
    assert.equal(extractExcerpt('一二三四五六', 3), '一二三…');
  });

  it('prefers the manual excerpt', () => {
    assert.equal(getArticleExcerpt({ excerpt: '  手写摘要 ', content: '正文' }), '手写摘要');
    assert.equal(getArticleExcerpt({ excerpt: '   ', content: '正文' }), '正文');
  });
});

describe('cover helpers', () => {
  it('uses the first content image, then imagePlans', () => {
    assert.equal(getCoverImage({ content: '文字 ![a](/uploads/1.jpg) ![b](/uploads/2.jpg)' }), '/uploads/1.jpg');
    assert.equal(
      getCoverImage({ content: '无图', imagePlans: JSON.stringify([{ imageUrl: '/uploads/p.jpg' }]) }),
      '/uploads/p.jpg',
    );
    assert.equal(getCoverImage({ content: '无图', imagePlans: 'not json' }), null);
  });

  it('splits a leading cover image from the body', () => {
    const result = splitLeadingCover('\n![封面](/uploads/c.jpg)\n\n正文第一段');
    assert.deepEqual(result, { cover: '/uploads/c.jpg', alt: '封面', body: '正文第一段' });
  });

  it('keeps the body intact when the image is not first', () => {
    const content = '开头\n\n![图](/uploads/c.jpg)';
    assert.deepEqual(splitLeadingCover(content), { cover: null, alt: '', body: content });
  });
});

describe('reading stats', () => {
  it('counts CJK characters and latin words', () => {
    assert.equal(countWords('写代码 Opus 5.5 断层领先'), 7 + 2);
  });

  it('never reports less than one minute', () => {
    assert.equal(readingMinutes('短'), 1);
    assert.equal(readingMinutes('字'.repeat(1200)), 3);
  });
});

describe('extractHeadings', () => {
  it('collects h2/h3 outside of code fences', () => {
    const content = '# 大标题\n## 写代码：**Opus**\n```\n## 不是标题\n```\n### 细节 ##\n#### 太深';
    assert.deepEqual(extractHeadings(content), [
      { level: 2, text: '写代码：Opus', id: slugifyHeading('写代码：Opus') },
      { level: 3, text: '细节', id: slugifyHeading('细节') },
    ]);
  });

  it('builds stable ids', () => {
    assert.equal(slugifyHeading('Grok 4.7：美国豆包'), 'h-grok-47美国豆包');
    assert.equal(slugifyHeading('！！'), 'h-section');
  });
});

describe('weeklyActivity', () => {
  it('buckets dates into weeks, oldest first', () => {
    const now = new Date('2026-10-16T00:00:00Z');
    const day = 24 * 60 * 60 * 1000;
    const dates = [new Date(now.getTime() - day), new Date(now.getTime() - 2 * day), new Date(now.getTime() - 8 * day), new Date(now.getTime() - 100 * day)];
    assert.deepEqual(weeklyActivity(dates, 3, now), [0, 1, 2]);
  });
});
