import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assignCellSizes, totalArea } from './labLayout';

describe('assignCellSizes', () => {
  it('starts with the featured block', () => {
    assert.deepEqual(assignCellSizes(3), ['big', 'tall', 'tall']);
    assert.deepEqual(assignCellSizes(10), ['big', 'tall', 'tall', 'wide', 'small', 'small', 'tall', 'tall', 'wide', 'wide']);
  });

  it('fills the tail without holes', () => {
    assert.deepEqual(assignCellSizes(1), ['full']);
    assert.deepEqual(assignCellSizes(2), ['wide', 'wide']);
    assert.deepEqual(assignCellSizes(4), ['big', 'tall', 'tall', 'full']);
    assert.deepEqual(assignCellSizes(9).slice(6), ['wide', 'small', 'small']);
  });

  it('always fills complete rows of a 4-column grid', () => {
    assert.deepEqual(assignCellSizes(0), []);
    for (let count = 1; count <= 40; count += 1) {
      const sizes = assignCellSizes(count);
      assert.equal(sizes.length, count);
      assert.equal(totalArea(sizes) % 4, 0, `count ${count}`);
    }
  });
});
