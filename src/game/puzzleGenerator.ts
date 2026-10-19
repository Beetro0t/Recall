import {
  BOARD_PATTERNS_BY_ROUND,
  PRODUCT_ID,
  PUZZLE_VERSION,
  ROUND_CONFIGS,
  SCORING_VERSION,
  TILE_PALETTE,
} from './config';
import { getChallengeNumber, isValidChallengeId } from './dailyChallenge';
import {
  constructPermutationWithExactSwaps,
  validatePuzzlePermutation,
} from './permutation';
import { createSeededRandom } from './seededRandom';
import type {
  BoardPattern,
  DailyChallenge,
  RoundConfig,
  RoundPuzzle,
  Tile,
} from './types';

/**
 * Builds the canonical seed string for a specific round of a daily challenge.
 * Format: `recall|2026-10-19|puzzle-v2|round-2`
 */
export function buildRoundSeed(
  challengeId: string,
  roundId: number,
  puzzleVersion: string = PUZZLE_VERSION,
): string {
  return `${PRODUCT_ID}|${challengeId}|${puzzleVersion}|round-${roundId}`;
}

/**
 * Generates a single deterministic RoundPuzzle from a round configuration and seed,
 * selecting both a curated subset of the 16-colour palette and a spatial board pattern
 * (e.g. Diamond, Serpentine Snake, Hollow Box, Bridge Arch, Staircase, or Grid).
 */
export function generateRoundPuzzle(
  challengeId: string,
  config: RoundConfig,
  puzzleVersion: string = PUZZLE_VERSION,
): RoundPuzzle {
  const seed = buildRoundSeed(challengeId, config.roundId, puzzleVersion);
  const rng = createSeededRandom(seed);

  if (config.tileCount > TILE_PALETTE.length) {
    throw new Error(
      `Round ${config.roundId} requests ${config.tileCount} tiles, exceeding palette size (${TILE_PALETTE.length}).`,
    );
  }

  // Deterministically select and order palette items for this round's target arrangement
  const shuffledPalette = rng.shuffle(TILE_PALETTE);
  const selectedPalette = shuffledPalette.slice(0, config.tileCount);

  const tiles: Record<string, Tile> = {};
  const targetOrder: string[] = [];

  for (let i = 0; i < selectedPalette.length; i++) {
    const item = selectedPalette[i];
    const id = `r${config.roundId}-t${i + 1}-${item.colorId}`;
    tiles[id] = {
      id,
      colorId: item.colorId,
      colorName: item.colorName,
      hex: item.hex,
      symbolId: item.symbolId,
    };
    targetOrder.push(id);
  }

  // Deterministically choose required swap count within [minRequiredSwaps, maxRequiredSwaps]
  const requiredSwaps = rng.nextInt(config.minRequiredSwaps, config.maxRequiredSwaps);

  // Construct shuffled arrangement with exact required minimum swaps
  const shuffledOrder = constructPermutationWithExactSwaps(
    targetOrder,
    requiredSwaps,
    rng,
  );

  // Deterministically select spatial board pattern for this round
  const candidatePatterns = BOARD_PATTERNS_BY_ROUND[config.roundId] ?? [];
  const defaultPattern: BoardPattern = {
    patternId: `r${config.roundId}-grid`,
    patternName: `${config.columns}×${config.rows} Grid`,
    columns: config.columns,
    rows: config.rows,
    cells: Array.from({ length: config.tileCount }, (_, idx) => ({
      row: Math.floor(idx / config.columns) + 1,
      col: (idx % config.columns) + 1,
    })),
  };

  const chosenPattern =
    candidatePatterns.length > 0
      ? candidatePatterns[rng.nextInt(0, candidatePatterns.length - 1)]
      : defaultPattern;

  // Explicit validation step
  const validation = validatePuzzlePermutation(
    shuffledOrder,
    targetOrder,
    config.minRequiredSwaps,
    config.maxRequiredSwaps,
  );

  if (!validation.valid) {
    throw new Error(
      `Puzzle validation failed for seed "${seed}": ${validation.reason}`,
    );
  }

  return {
    roundId: config.roundId,
    seed,
    pattern: chosenPattern,
    tiles,
    targetOrder,
    shuffledOrder,
    optimalSwaps: validation.optimalSwaps,
  };
}

/**
 * Generates the complete three-round DailyChallenge for a given UTC date string.
 */
export function generateDailyChallenge(
  challengeId: string,
  puzzleVersion: string = PUZZLE_VERSION,
): DailyChallenge {
  if (!isValidChallengeId(challengeId)) {
    throw new Error(`Invalid UTC challenge date: "${challengeId}"`);
  }

  const rounds = ROUND_CONFIGS.map((config) =>
    generateRoundPuzzle(challengeId, config, puzzleVersion),
  );

  return {
    challengeId,
    challengeNumber: getChallengeNumber(challengeId),
    puzzleVersion,
    scoringVersion: SCORING_VERSION,
    rounds,
  };
}

/**
 * Generates a standalone untimed practice puzzle that never collides with official daily seeds.
 */
export function generatePracticePuzzle(): RoundPuzzle {
  const practiceConfig: RoundConfig = {
    roundId: 1,
    difficultyLabel: 'Easy',
    tileCount: 4,
    columns: 2,
    rows: 2,
    memoriseMs: 5_000,
    solveMs: 30_000,
    minRequiredSwaps: 2,
    maxRequiredSwaps: 2,
    basePoints: 100,
  };
  return generateRoundPuzzle('practice-tutorial', practiceConfig, PUZZLE_VERSION);
}
