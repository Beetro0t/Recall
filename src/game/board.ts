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
    if (currentOrder[i] === targetOrder[i]) {
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
