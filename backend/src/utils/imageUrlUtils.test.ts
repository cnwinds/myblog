import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectRemoteImageUrls,
  extractMarkdownImageUrls,
  isAlreadyLocalUpload,
  isHttpUrl,
  parseImagePlans,
  rewriteImagePlanUrls,
  rewriteMarkdownUrls,
} from './imageUrlUtils';

describe('isAlreadyLocalUpload', () => {
  it('skips relative /uploads paths', () => {
    assert.equal(isAlreadyLocalUpload('/uploads/202609/image-1.jpg'), true);
  });

  it('skips this site’s /uploads URLs', () => {
    assert.equal(
      isAlreadyLocalUpload('https://blog.news-tracker.work/uploads/202609/image-1.jpg'),
      true
    );
    assert.equal(
      isAlreadyLocalUpload('http://blog.news-tracker.work/uploads/202609/image-1.jpg'),
      true
    );
  });

  it('does not skip third-party image URLs', () => {
    assert.equal(
      isAlreadyLocalUpload(
        'https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/foo.png?Expires=1&Signature=abc'
      ),
      false
    );
  });
});

describe('extractMarkdownImageUrls', () => {
  it('extracts markdown and html images', () => {
    const md = [
      '![cover](https://cdn.example.com/a.png?Expires=1)',
      '![local](/uploads/202609/x.jpg)',
      '<img src="https://cdn.example.com/b.webp" alt="b">',
      '![titled](https://cdn.example.com/c.jpg "title")',
    ].join('\n');

    const urls = extractMarkdownImageUrls(md);
    assert.deepEqual(urls.sort(), [
      '/uploads/202609/x.jpg',
      'https://cdn.example.com/a.png?Expires=1',
      'https://cdn.example.com/b.webp',
      'https://cdn.example.com/c.jpg',
    ].sort());
  });
});

describe('collectRemoteImageUrls', () => {
  it('collects remote markdown and imagePlans URLs and skips local uploads', () => {
    const content = '![a](https://oss.example.com/a.jpg) ![b](/uploads/202601/b.jpg)';
    const imagePlans = [
      {
        imageUrl: 'https://oss.example.com/a.jpg',
        imageUrls: [{ url: 'https://oss.example.com/c.jpg' }],
      },
    ];

    const urls = collectRemoteImageUrls(content, imagePlans);
    assert.deepEqual(urls.sort(), [
      'https://oss.example.com/a.jpg',
      'https://oss.example.com/c.jpg',
    ].sort());
  });
});

describe('rewrite', () => {
  it('rewrites markdown and imagePlans URLs', () => {
    const from = 'https://oss.example.com/a.jpg?Expires=9';
    const to = '/uploads/202609/image-1.jpg';
    const map = new Map([[from, to]]);

    const md = `![a](${from})\nAlso ${from}`;
    assert.equal(rewriteMarkdownUrls(md, map), `![a](${to})\nAlso ${to}`);

    const plans = parseImagePlans({
      imageUrl: from,
      imageUrls: [{ url: from, model: 'x' }],
    });
    assert.deepEqual(rewriteImagePlanUrls(plans, map), {
      imageUrl: to,
      imageUrls: [{ url: to, model: 'x' }],
    });
  });
});

describe('isHttpUrl', () => {
  it('accepts http(s) only', () => {
    assert.equal(isHttpUrl('https://example.com/a.png'), true);
    assert.equal(isHttpUrl('http://example.com/a.png'), true);
    assert.equal(isHttpUrl('/uploads/a.jpg'), false);
    assert.equal(isHttpUrl('javascript:alert(1)'), false);
  });
});
