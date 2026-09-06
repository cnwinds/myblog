import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { articleMatchesFilter, collectFilterTags, LAB_FILTER_CATEGORIES } from './labFilters';

describe('collectFilterTags', () => {
  it('only emits whitelist categories that appear on loaded articles, in whitelist order', () => {
    const tags = collectFilterTags([
      { tags: ['阅读', '知识库', '自托管'] },
      { tags: ['Canvas', 'Kimi', '游戏'] },
      { tags: ['工具', '零依赖', '前端'] },
      { tags: ['Three.js', 'Vibe Coding'] },
    ]);

    assert.deepEqual(tags, ['游戏', '工具', '阅读']);
    assert.ok(!tags.includes('AI'));
    assert.deepEqual(
      tags.filter((tag) => !(LAB_FILTER_CATEGORIES as readonly string[]).includes(tag)),
      [],
    );
  });

  it('does not invent chips from unique article tags', () => {
    const tags = collectFilterTags([
      { tags: ['游戏', 'AI', 'Canvas', 'Kimi', '本地优先', '工具', '零依赖', '前端', '阅读'] },
    ]);

    assert.deepEqual(tags, ['游戏', 'AI', '工具', '阅读']);
  });

  it('returns no category chips when no whitelist tags are present', () => {
    assert.deepEqual(collectFilterTags([{ tags: ['Cursor', 'Three.js'] }, { tags: [] }, {}]), []);
  });
});

describe('articleMatchesFilter', () => {
  it('matches when the article tags include the selected category', () => {
    assert.equal(articleMatchesFilter({ tags: ['游戏', 'Canvas'] }, '游戏'), true);
    assert.equal(articleMatchesFilter({ tags: ['游戏', 'Canvas'] }, '工具'), false);
    assert.equal(articleMatchesFilter({ tags: ['游戏', 'Canvas'] }, ''), true);
  });
});
