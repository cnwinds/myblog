/**
 * 实验室拼贴网格（4 列）的卡片尺寸。
 * big = 2×2，tall = 1×2，wide = 2×1，small = 1×1，full = 4×1。
 * 按「整行块」排布，保证任意数量都不会留空洞：
 *   A: big + tall + tall      （2 行）
 *   B: wide + small + small   （1 行）
 *   C: tall + tall + wide + wide（2 行）
 * 顺序为 A, B, C, B, C, …；最后不足一个块时用 full / wide 补齐。
 */
export type CellSize = 'big' | 'tall' | 'wide' | 'small' | 'full';

const BLOCK_A: CellSize[] = ['big', 'tall', 'tall'];
const BLOCK_B: CellSize[] = ['wide', 'small', 'small'];
const BLOCK_C: CellSize[] = ['tall', 'tall', 'wide', 'wide'];

function tail(remaining: number): CellSize[] {
  if (remaining === 1) return ['full'];
  if (remaining === 2) return ['wide', 'wide'];
  return BLOCK_B;
}

export function assignCellSizes(count: number): CellSize[] {
  const sizes: CellSize[] = [];
  let blockIndex = 0;

  while (sizes.length < count) {
    const block = blockIndex === 0 ? BLOCK_A : blockIndex % 2 === 1 ? BLOCK_B : BLOCK_C;
    const remaining = count - sizes.length;
    sizes.push(...(remaining >= block.length ? block : tail(remaining)));
    blockIndex += 1;
  }

  return sizes;
}

const AREA: Record<CellSize, number> = { big: 4, tall: 2, wide: 2, small: 1, full: 4 };

/** 总面积，测试用来确认能整除 4 列。 */
export function totalArea(sizes: CellSize[]): number {
  return sizes.reduce((sum, size) => sum + AREA[size], 0);
}
