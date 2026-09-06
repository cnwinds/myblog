import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeOptionalUrl,
  parseTags,
  serializeArticle,
  stringifyTags,
} from './articleFields';

describe('parseTags', () => {
  it('returns empty array for nullish or empty values', () => {
    assert.deepEqual(parseTags(null), []);
    assert.deepEqual(parseTags(undefined), []);
    assert.deepEqual(parseTags(''), []);
    assert.deepEqual(parseTags('   '), []);
  });

  it('accepts string arrays and trims / de-duplicates', () => {
    assert.deepEqual(parseTags(['游戏', ' AI ', '游戏', '']), ['游戏', 'AI']);
  });

  it('parses JSON text stored in SQLite', () => {
    assert.deepEqual(parseTags('["游戏","AI"]'), ['游戏', 'AI']);
  });

  it('splits comma-separated editor input, including Chinese commas', () => {
    assert.deepEqual(parseTags('游戏, AI，推理'), ['游戏', 'AI', '推理']);
  });
});

describe('stringifyTags', () => {
  it('stores empty tags as null', () => {
    assert.equal(stringifyTags([]), null);
    assert.equal(stringifyTags(''), null);
    assert.equal(stringifyTags(null), null);
  });

  it('stores tags as JSON text', () => {
    assert.equal(stringifyTags(['游戏', 'AI']), '["游戏","AI"]');
    assert.equal(stringifyTags('游戏,AI'), '["游戏","AI"]');
  });
});

describe('normalizeOptionalUrl', () => {
  it('keeps undefined so callers can skip updates', () => {
    assert.equal(normalizeOptionalUrl(undefined), undefined);
  });

  it('turns empty values into null', () => {
    assert.equal(normalizeOptionalUrl(null), null);
    assert.equal(normalizeOptionalUrl(''), null);
    assert.equal(normalizeOptionalUrl('  '), null);
  });

  it('trims non-empty URLs', () => {
    assert.equal(normalizeOptionalUrl(' https://demo.example/ '), 'https://demo.example/');
  });
});

describe('serializeArticle', () => {
  it('exposes tags as an array and missing lab fields as null', () => {
    const serialized = serializeArticle({
      id: 1,
      title: '旧实验室文章',
      tags: null,
    });

    assert.equal(serialized.demoUrl, null);
    assert.equal(serialized.repoUrl, null);
    assert.deepEqual(serialized.tags, []);
  });

  it('parses stored JSON tags for API responses', () => {
    const serialized = serializeArticle({
      id: 2,
      demoUrl: 'https://play.example',
      repoUrl: 'https://github.com/example/repo',
      tags: '["游戏","AI"]',
    });

    assert.equal(serialized.demoUrl, 'https://play.example');
    assert.deepEqual(serialized.tags, ['游戏', 'AI']);
  });
});
