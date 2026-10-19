export interface SwapResult {
  nextOrder: string[];
  swapped: boolean;
}

/**
 * Pure function to swap two tiles by array index.
 * Rejects out-of-bounds indices, non-integer indices, or swapping an index with itself.
 */
export function swapTilesByIndex(
  currentOrder: readonly string[],
  indexA: number,
  indexB: number,
): SwapResult {
  if (
    !Number.isInteger(indexA) ||
    !Number.isInteger(indexB) ||
    indexA < 0 ||
    indexB < 0 ||
    indexA >= currentOrder.length ||
    indexB >= currentOrder.length ||
    indexA === indexB
  ) {
    return {
      nextOrder: [...currentOrder],
      swapped: false,
    };
  }

  const nextOrder = [...currentOrder];
  const temp = nextOrder[indexA];
  nextOrder[indexA] = nextOrder[indexB];
  nextOrder[indexB] = temp;

  return {
    nextOrder,
    swapped: true,
  };
}

/**
 * Pure function to swap two tiles by their stable tile IDs.
 * Rejects unknown tile IDs or swapping a tile with itself.
 */
export function swapTilesById(
  currentOrder: readonly string[],
  tileIdA: string,
  tileIdB: string,
): SwapResult {
  if (!tileIdA || !tileIdB || tileIdA === tileIdB) {
    return {
      nextOrder: [...currentOrder],
      swapped: false,
    };
  }

  const indexA = currentOrder.indexOf(tileIdA);
  const indexB = currentOrder.indexOf(tileIdB);

  if (indexA === -1 || indexB === -1) {
    return {
      nextOrder: [...currentOrder],
      swapped: false,
    };
  }

  return swapTilesByIndex(currentOrder, indexA, indexB);
}

/**
 * Counts how many positions in `currentOrder` match `targetOrder`.
 */
export function countMatchedTiles(
  currentOrder: readonly string[],
  targetOrder: readonly string[],
): number {
  const len = Math.min(currentOrder.length, targetOrder.length);
  let matches = 0;
  for (let i = 0; i < len; i++) {
    if (currentOrder[i] && currentOrder[i] === targetOrder[i]) {
      matches++;
    }
  }
  return matches;
}

/**
 * Checks whether `currentOrder` exactly matches `targetOrder` in every position.
 */
export function isBoardSolved(
  currentOrder: readonly string[],
  targetOrder: readonly string[],
): boolean {
  if (currentOrder.length === 0 || currentOrder.length !== targetOrder.length) {
    return false;
  }

  return countMatchedTiles(currentOrder, targetOrder) === targetOrder.length;
}

/**
 * Creates an empty board of length `tileCount` where every square is empty ('').
 */
export function createEmptyBoardOrder(tileCount: number): string[] {
  return new Array(Math.max(0, tileCount)).fill('');
}

/**
 * Counts how many squares on the board currently have a tile placed in them.
 */
export function countPlacedTiles(currentOrder: readonly string[]): number {
  let count = 0;
  for (const id of currentOrder) {
    if (id !== '') count++;
  }
  return count;
}

/**
 * Returns the tiles from `shuffledOrder` that are still on the bottom slider bar
 * (i.e. not yet placed on the board).
 */
export function getAvailableSliderTiles(
  shuffledOrder: readonly string[],
  currentBoardOrder: readonly string[],
): string[] {
  const placed = new Set(currentBoardOrder.filter((id) => id !== ''));
  return shuffledOrder.filter((id) => !placed.has(id));
}

/**
 * Validates that `order` has the exact board length and only contains valid, non-duplicate
 * tile IDs from `targetOrder` (or '' for empty board squares).
 */
export function isValidBoardSlotOrder(
  order: readonly string[],
  targetOrder: readonly string[],
): boolean {
  if (!Array.isArray(order) || order.length !== targetOrder.length) {
    return false;
  }
  const allowed = new Set(targetOrder);
  const seen = new Set<string>();
  for (const item of order) {
    if (typeof item !== 'string') return false;
    if (item === '') continue;
    if (!allowed.has(item) || seen.has(item)) {
      return false;
    }
    seen.add(item);
  }
  return true;
}

/**
 * Places `tileId` (from the bottom slider bar or from another board slot) into `targetSlotIndex`.
 * - If `tileId` was already on the board at `existingIndex`, swaps the two board slots.
 * - If `tileId` was on the slider bar, places it into `targetSlotIndex` (and any tile previously
 *   in `targetSlotIndex` returns to the slider bar).
 */
export function placeTileInBoardSlot(
  currentOrder: readonly string[],
  tileId: string,
  targetSlotIndex: number,
  validTileIds?: readonly string[],
): SwapResult {
  if (
    !tileId ||
    !Number.isInteger(targetSlotIndex) ||
    targetSlotIndex < 0 ||
    targetSlotIndex >= currentOrder.length
  ) {
    return { nextOrder: [...currentOrder], swapped: false };
  }

  if (validTileIds && !validTileIds.includes(tileId)) {
    return { nextOrder: [...currentOrder], swapped: false };
  }

  const existingIndex = currentOrder.indexOf(tileId);
  if (existingIndex === targetSlotIndex) {
    return { nextOrder: [...currentOrder], swapped: false };
  }

  const nextOrder = [...currentOrder];
  if (existingIndex !== -1) {
    // Tile was already on the board: move/swap between existingIndex and targetSlotIndex
    const displaced = nextOrder[targetSlotIndex];
    nextOrder[targetSlotIndex] = tileId;
    nextOrder[existingIndex] = displaced;
  } else {
    // Tile comes from the slider bar: place it in targetSlotIndex (any displaced tile returns to slider bar)
    nextOrder[targetSlotIndex] = tileId;
  }

  return { nextOrder, swapped: true };
}

/**
 * Removes a placed tile from `slotIndex` on the board so it returns to the bottom slider bar.
 */
export function removeTileFromBoardSlot(
  currentOrder: readonly string[],
  slotIndex: number,
): SwapResult {
  if (
    !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= currentOrder.length ||
    currentOrder[slotIndex] === ''
  ) {
    return { nextOrder: [...currentOrder], swapped: false };
  }

  const nextOrder = [...currentOrder];
  nextOrder[slotIndex] = '';
  return { nextOrder, swapped: true };
}
