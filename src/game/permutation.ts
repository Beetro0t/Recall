import type { SeededRandom } from './seededRandom';

/**
 * Validates that two tile order arrays have identical unique elements.
 */
export function hasIdenticalUniqueElements(
  orderA: readonly string[],
  orderB: readonly string[],
): boolean {
  if (orderA.length !== orderB.length || orderA.length === 0) {
    return false;
  }
  const setA = new Set(orderA);
  const setB = new Set(orderB);
  if (setA.size !== orderA.length || setB.size !== orderB.length) {
    return false;
  }
  for (const id of setA) {
    if (!setB.has(id)) {
      return false;
    }
  }
  return true;
}

/**
 * Computes the minimum number of arbitrary two-tile swaps required
 * to transform `currentOrder` into `targetOrder`.
 *
 * By Cayley's theorem on permutation cycle decomposition:
 * Minimum swaps = N - C, where N is the number of elements and
 * C is the number of disjoint cycles (including fixed points of length 1).
 */
export function calculateMinimumSwaps(
  currentOrder: readonly string[],
  targetOrder: readonly string[],
): number {
  if (!hasIdenticalUniqueElements(currentOrder, targetOrder)) {
    throw new Error(
      'Cannot calculate minimum swaps: orders must contain identical unique tile IDs.',
    );
  }

  const n = targetOrder.length;
  const targetIndexById = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    targetIndexById.set(targetOrder[i], i);
  }

  const visited = new Array<boolean>(n).fill(false);
  let cycleCount = 0;

  for (let i = 0; i < n; i++) {
    if (visited[i]) {
      continue;
    }
    cycleCount++;
    let cursor = i;
    while (!visited[cursor]) {
      visited[cursor] = true;
      const tileId = currentOrder[cursor];
      const nextIndex = targetIndexById.get(tileId);
      if (nextIndex === undefined) {
        throw new Error(`Tile ID "${tileId}" missing from target order.`);
      }
      cursor = nextIndex;
    }
  }

  return n - cycleCount;
}

/**
 * Enumerates integer partitions of `total` into `parts` positive integers in non-increasing order,
 * where every part is >= `minPartSize`.
 */
function generatePartitions(
  total: number,
  parts: number,
  minPartSize: number,
  maxPartSize = total,
): number[][] {
  if (parts === 1) {
    if (total >= minPartSize && total <= maxPartSize) {
      return [[total]];
    }
    return [];
  }

  const results: number[][] = [];
  const upper = Math.min(maxPartSize, total - (parts - 1) * minPartSize);

  for (let first = upper; first >= minPartSize; first--) {
    const subPartitions = generatePartitions(
      total - first,
      parts - 1,
      minPartSize,
      first,
    );
    for (const sub of subPartitions) {
      results.push([first, ...sub]);
    }
  }

  return results;
}

/**
 * Deterministically constructs a permutation of `targetOrder` that requires
 * EXACTLY `requiredSwaps` minimum swaps to restore to `targetOrder`, without retry loops.
 *
 * Whenever `requiredSwaps >= ceil(N / 2)` (which holds for all official Recall rounds:
 * Round 1: N=4, swaps=2; Round 2: N=6, swaps=3..4; Round 3: N=8, swaps=5..6),
 * this constructs a complete derangement (every cycle has length >= 2), so no tile
 * starts in its already-correct target slot.
 */
export function constructPermutationWithExactSwaps(
  targetOrder: readonly string[],
  requiredSwaps: number,
  rng: SeededRandom,
): string[] {
  const n = targetOrder.length;
  if (requiredSwaps < 1 || requiredSwaps >= n) {
    throw new Error(`Invalid requiredSwaps=${requiredSwaps} for board of size ${n}`);
  }

  const cycleCount = n - requiredSwaps;

  // Prefer derangement partitions (all cycle lengths >= 2) whenever mathematically possible
  let partitions = generatePartitions(n, cycleCount, 2);
  if (partitions.length === 0) {
    partitions = generatePartitions(n, cycleCount, 1);
  }

  const chosenCycleSizes = partitions[rng.nextInt(0, partitions.length - 1)];

  // Shuffle position indices [0, 1, ..., n - 1]
  const indices = Array.from({ length: n }, (_, idx) => idx);
  const shuffledIndices = rng.shuffle(indices);

  // Build permutation by cycling elements within each partition group
  const result = [...targetOrder];
  let offset = 0;

  for (const cycleSize of chosenCycleSizes) {
    const group = shuffledIndices.slice(offset, offset + cycleSize);
    offset += cycleSize;

    if (cycleSize > 1) {
      for (let i = 0; i < cycleSize; i++) {
        const fromIdx = group[i];
        const toIdx = group[(i + 1) % cycleSize];
        result[toIdx] = targetOrder[fromIdx];
      }
    } else {
      const idx = group[0];
      result[idx] = targetOrder[idx];
    }
  }

  return result;
}

export interface PermutationValidationResult {
  valid: boolean;
  optimalSwaps: number;
  reason?: string;
}

/**
 * Explicitly validates that a shuffled board meets all round permutation invariants.
 */
export function validatePuzzlePermutation(
  shuffledOrder: readonly string[],
  targetOrder: readonly string[],
  minRequiredSwaps: number,
  maxRequiredSwaps: number,
): PermutationValidationResult {
  if (!hasIdenticalUniqueElements(shuffledOrder, targetOrder)) {
    return {
      valid: false,
      optimalSwaps: 0,
      reason: 'Shuffled order does not contain identical unique tile IDs.',
    };
  }

  const isIdentical = shuffledOrder.every((id, idx) => id === targetOrder[idx]);
  if (isIdentical) {
    return {
      valid: false,
      optimalSwaps: 0,
      reason: 'Shuffled order is identical to target order.',
    };
  }

  const optimalSwaps = calculateMinimumSwaps(shuffledOrder, targetOrder);
  if (optimalSwaps < minRequiredSwaps || optimalSwaps > maxRequiredSwaps) {
    return {
      valid: false,
      optimalSwaps,
      reason: `Optimal swaps (${optimalSwaps}) outside allowed range [${minRequiredSwaps}, ${maxRequiredSwaps}].`,
    };
  }

  return {
    valid: true,
    optimalSwaps,
  };
}
