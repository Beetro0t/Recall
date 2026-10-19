import { getRoundConfig, SCORING_CONFIG } from './config';
import type { RoundResult } from './types';

export interface ScoreCalculationInput {
  roundId: number;
  matchedTiles: number;
  totalTiles?: number;
  status?: 'success' | 'failure';
  remainingMs?: number;
  actualSwaps?: number;
  optimalSwaps?: number;
}

export interface ScoreBreakdown {
  matchedTiles: number;
  totalTiles: number;
  pointsPerTile: number;
  totalScore: number;
}

/**
 * Pure accuracy-based scoring function:
 * Points correspond directly to how many tiles the player placed in the correct position
 * (25 points per correct tile; swap counts and optimal swaps are displayed as details at the end
 * without penalizing the score).
 */
export function calculateRoundScoreBreakdown(
  input: ScoreCalculationInput,
): ScoreBreakdown {
  const config = getRoundConfig(input.roundId);
  const totalTiles = input.totalTiles ?? config.tileCount;

  if (
    !Number.isFinite(input.matchedTiles) ||
    !Number.isInteger(input.matchedTiles) ||
    input.matchedTiles < 0 ||
    input.matchedTiles > totalTiles
  ) {
    throw new Error(
      `Invalid matchedTiles=${input.matchedTiles} for round ${input.roundId} (totalTiles=${totalTiles})`,
    );
  }

  if (
    input.actualSwaps !== undefined &&
    (!Number.isFinite(input.actualSwaps) ||
      input.actualSwaps < 0 ||
      !Number.isInteger(input.actualSwaps))
  ) {
    throw new Error(`Invalid actualSwaps: ${input.actualSwaps}`);
  }

  const pointsPerTile = SCORING_CONFIG.pointsPerCorrectTile;
  const totalScore = input.matchedTiles * pointsPerTile;

  return {
    matchedTiles: input.matchedTiles,
    totalTiles,
    pointsPerTile,
    totalScore,
  };
}

export function calculateRoundScore(input: ScoreCalculationInput): number {
  return calculateRoundScoreBreakdown(input).totalScore;
}

export function calculateDailyTotalScore(results: readonly RoundResult[]): number {
  return results.reduce((sum, r) => sum + Math.max(0, Math.floor(r.score)), 0);
}

export function calculateDailyMatchedTiles(results: readonly RoundResult[]): {
  matched: number;
  total: number;
} {
  return results.reduce(
    (acc, r) => ({
      matched: acc.matched + (r.matchedTiles ?? 0),
      total: acc.total + (r.totalTiles ?? getRoundConfig(r.roundId).tileCount),
    }),
    { matched: 0, total: 0 },
  );
}
