import { ROUND_CONFIGS, SCORING_CONFIG } from '../game/config';
import { calculateDailyMatchedTiles } from '../game/scoring';
import { createSeededRandom } from '../game/seededRandom';
import type { DailyChallenge, RoundPuzzle, RoundResult } from '../game/types';

const COMMUNITY_STORAGE_KEY = 'recall_community_choices_v1';

interface StoredRoundChoiceLog {
  roundId: number;
  finalTileOrder: string[];
  matchedTiles: number;
  recordedAtEpochMs: number;
}

interface StoredDailyCommunityData {
  challengeId: string;
  roundSubmissions: Record<number, StoredRoundChoiceLog[]>;
  dailyMatchedSubmissions: number[];
}

export interface SlotChoiceComparison {
  slotIndex: number;
  playerTileId: string;
  targetTileId: string;
  isPlayerCorrect: boolean;
  /** % of players who placed the correct target colour in this square */
  correctRatePct: number;
  /** % of players who picked the exact same colour (or left empty) as this player */
  sameChoicePct: number;
  /** Most common wrong colour placed in this square by other players */
  mostCommonMistakeTileId: string | null;
  mostCommonMistakePct: number;
}

export interface RoundCommunityComparison {
  roundId: number;
  totalPlayers: number;
  roundClearRatePct: number;
  avgMatchedTiles: number;
  betterThanPct: number;
  slotBreakdown: SlotChoiceComparison[];
}

export interface DistributionBucket {
  id: string;
  label: string;
  minMatched: number;
  maxMatched: number;
  percentage: number;
  isPlayerBucket: boolean;
}

export interface DailyCommunityComparison {
  challengeId: string;
  totalPlayers: number;
  playerMatchedTiles: number;
  totalPossibleTiles: number;
  avgMatchedTiles: number;
  avgScore: number;
  betterThanPct: number;
  topPercentile: number;
  distributionBuckets: DistributionBucket[];
  roundComparisons: RoundCommunityComparison[];
}

const memoryCommunityStore = new Map<string, string>();

function loadAllStoredCommunityData(): Record<string, StoredDailyCommunityData> {
  let raw: string | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(COMMUNITY_STORAGE_KEY);
    }
  } catch {
    // Fallback to memory store
  }
  if (!raw) {
    raw = memoryCommunityStore.get(COMMUNITY_STORAGE_KEY) ?? null;
  }
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, StoredDailyCommunityData>;
    }
  } catch {
    // Ignore corrupt JSON
  }
  return {};
}

function saveAllStoredCommunityData(
  data: Record<string, StoredDailyCommunityData>,
): void {
  const serialized = JSON.stringify(data);
  memoryCommunityStore.set(COMMUNITY_STORAGE_KEY, serialized);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(COMMUNITY_STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function getOrInitDailyData(challengeId: string): StoredDailyCommunityData {
  const all = loadAllStoredCommunityData();
  if (all[challengeId]) {
    return all[challengeId];
  }
  const fresh: StoredDailyCommunityData = {
    challengeId,
    roundSubmissions: { 1: [], 2: [], 3: [] },
    dailyMatchedSubmissions: [],
  };
  all[challengeId] = fresh;
  saveAllStoredCommunityData(all);
  return fresh;
}

/**
 * Records a player's exact tile choices (`finalTileOrder`) for a round so
 * choice telemetry updates in real time.
 */
export function recordRoundPlayerChoices(
  challengeId: string,
  result: RoundResult,
  nowEpochMs: number = Date.now(),
): void {
  const all = loadAllStoredCommunityData();
  const daily = all[challengeId] ?? {
    challengeId,
    roundSubmissions: { 1: [], 2: [], 3: [] },
    dailyMatchedSubmissions: [],
  };

  const list = daily.roundSubmissions[result.roundId] ?? [];
  // Keep at most 100 local submissions per round to bound storage size
  const updatedList = [
    ...list.slice(-99),
    {
      roundId: result.roundId,
      finalTileOrder: [...result.finalTileOrder],
      matchedTiles: result.matchedTiles,
      recordedAtEpochMs: nowEpochMs,
    },
  ];

  daily.roundSubmissions[result.roundId] = updatedList;
  all[challengeId] = daily;
  saveAllStoredCommunityData(all);
}

/**
 * Records a player's completed 3-round daily total so the daily distribution
 * reflects their run.
 */
export function recordDailyPlayerChoices(
  challengeId: string,
  results: readonly RoundResult[],
): void {
  if (results.length !== ROUND_CONFIGS.length) return;
  const all = loadAllStoredCommunityData();
  const daily = all[challengeId] ?? {
    challengeId,
    roundSubmissions: { 1: [], 2: [], 3: [] },
    dailyMatchedSubmissions: [],
  };

  const { matched } = calculateDailyMatchedTiles(results);
  daily.dailyMatchedSubmissions = [
    ...daily.dailyMatchedSubmissions.slice(-199),
    matched,
  ];
  all[challengeId] = daily;
  saveAllStoredCommunityData(all);
}

/**
 * Computes how a player's tile choices on a specific round compare against
 * the community cohort for that daily puzzle seed.
 */
export function getRoundCommunityComparison(
  challengeId: string,
  puzzle: RoundPuzzle,
  result: RoundResult,
): RoundCommunityComparison {
  const rng = createSeededRandom(
    `community-round|${challengeId}|r${puzzle.roundId}|${puzzle.seed}`,
  );
  const stored = getOrInitDailyData(challengeId);
  const localRoundLogs = stored.roundSubmissions[puzzle.roundId] ?? [];

  const tileCount = puzzle.targetOrder.length;
  const basePlayerCount =
    puzzle.roundId === 1
      ? rng.nextInt(410, 680)
      : puzzle.roundId === 2
        ? rng.nextInt(395, 650)
        : rng.nextInt(380, 620);

  // Baseline difficulty by round (Round 1: Easy 4 tiles, Round 2: Medium 6 tiles, Round 3: Hard 8 tiles)
  const baseRoundClearPct =
    puzzle.roundId === 1
      ? rng.nextInt(74, 86)
      : puzzle.roundId === 2
        ? rng.nextInt(52, 68)
        : rng.nextInt(31, 47);

  // Build per-slot choice frequency maps combining deterministic crowd cohort + recorded player choices
  const slotBreakdown: SlotChoiceComparison[] = puzzle.targetOrder.map(
    (targetTileId, slotIdx) => {
      const isAnchorSlot = slotIdx === 0 || slotIdx === tileCount - 1;
      const baseCorrectWeight =
        puzzle.roundId === 1
          ? rng.nextInt(78, 91) + (isAnchorSlot ? 4 : 0)
          : puzzle.roundId === 2
            ? rng.nextInt(64, 81) + (isAnchorSlot ? 5 : 0)
            : rng.nextInt(51, 73) + (isAnchorSlot ? 6 : 0);

      const clampedBaseCorrect = Math.min(96, Math.max(38, baseCorrectWeight));
      const remainingWeight = 100 - clampedBaseCorrect;

      // Distribute remaining wrong choices across the other tiles in the round
      const otherTileIds = puzzle.targetOrder.filter((id) => id !== targetTileId);
      const choiceCounts = new Map<string, number>();

      const simulatedTotal = basePlayerCount;
      const correctCount = Math.round((clampedBaseCorrect / 100) * simulatedTotal);
      choiceCounts.set(targetTileId, correctCount);

      // Adjacent tiles in the pattern are the most common memory swap mistakes
      const adjacentCandidates = [
        puzzle.targetOrder[(slotIdx + 1) % tileCount],
        puzzle.targetOrder[(slotIdx - 1 + tileCount) % tileCount],
      ].filter((id) => id !== targetTileId);

      const primaryConfusedTileId =
        adjacentCandidates[0] ?? otherTileIds[0] ?? targetTileId;
      const secondaryConfusedTileId =
        adjacentCandidates[1] ?? otherTileIds[1] ?? primaryConfusedTileId;

      const primaryMistakeShare = rng.nextInt(48, 66) / 100;
      const primaryMistakeCount = Math.round(
        ((remainingWeight * primaryMistakeShare) / 100) * simulatedTotal,
      );
      choiceCounts.set(
        primaryConfusedTileId,
        (choiceCounts.get(primaryConfusedTileId) ?? 0) + primaryMistakeCount,
      );

      let distributedSoFar = correctCount + primaryMistakeCount;
      for (const otherId of otherTileIds) {
        if (otherId === primaryConfusedTileId) continue;
        const share =
          otherId === secondaryConfusedTileId
            ? rng.nextInt(20, 32) / 100
            : rng.nextInt(5, 14) / 100;
        const c = Math.max(
          1,
          Math.round(((remainingWeight * share) / 100) * simulatedTotal),
        );
        choiceCounts.set(otherId, (choiceCounts.get(otherId) ?? 0) + c);
        distributedSoFar += c;
      }

      if (distributedSoFar < simulatedTotal) {
        choiceCounts.set('', simulatedTotal - distributedSoFar);
      }

      // Fold in real recorded player choices for this round
      for (const log of localRoundLogs) {
        const chosen = log.finalTileOrder[slotIdx] ?? '';
        choiceCounts.set(chosen, (choiceCounts.get(chosen) ?? 0) + 1);
      }

      // Also ensure the current result's choice is counted
      const playerTileId = result.finalTileOrder[slotIdx] ?? '';
      if (localRoundLogs.length === 0) {
        choiceCounts.set(playerTileId, (choiceCounts.get(playerTileId) ?? 0) + 1);
      }

      const grandTotal = Array.from(choiceCounts.values()).reduce((a, b) => a + b, 0);
      const finalCorrectCount = choiceCounts.get(targetTileId) ?? 0;
      const playerChoiceCount = choiceCounts.get(playerTileId) ?? 1;

      // Identify most common mistake colour
      let mostCommonMistakeTileId: string | null = null;
      let mostCommonMistakeCount = 0;
      for (const [candidateId, cnt] of choiceCounts.entries()) {
        if (
          candidateId &&
          candidateId !== targetTileId &&
          cnt > mostCommonMistakeCount
        ) {
          mostCommonMistakeCount = cnt;
          mostCommonMistakeTileId = candidateId;
        }
      }

      const correctRatePct = Math.min(
        99,
        Math.max(1, Math.round((finalCorrectCount / Math.max(1, grandTotal)) * 100)),
      );
      const sameChoicePct = Math.min(
        99,
        Math.max(1, Math.round((playerChoiceCount / Math.max(1, grandTotal)) * 100)),
      );
      const mostCommonMistakePct = Math.min(
        95,
        Math.max(
          1,
          Math.round((mostCommonMistakeCount / Math.max(1, grandTotal)) * 100),
        ),
      );

      return {
        slotIndex: slotIdx,
        playerTileId,
        targetTileId,
        isPlayerCorrect: playerTileId !== '' && playerTileId === targetTileId,
        correctRatePct,
        sameChoicePct,
        mostCommonMistakeTileId,
        mostCommonMistakePct,
      };
    },
  );

  const avgCorrectRate =
    slotBreakdown.reduce((sum, s) => sum + s.correctRatePct, 0) /
    Math.max(1, slotBreakdown.length);
  const avgMatchedTiles = Number(((avgCorrectRate / 100) * tileCount).toFixed(1));

  // Compute round percentile based on matchedTiles and swaps
  const matchedRatio = result.matchedTiles / Math.max(1, tileCount);
  let betterThanPct: number;
  if (result.status === 'success') {
    const swapBonus = result.swaps <= result.optimalSwaps ? 8 : 0;
    betterThanPct = Math.min(
      99,
      Math.round(100 - baseRoundClearPct * 0.45 + swapBonus),
    );
  } else if (result.matchedTiles === 0) {
    betterThanPct = rng.nextInt(4, 11);
  } else {
    betterThanPct = Math.min(
      89,
      Math.max(12, Math.round(matchedRatio * (100 - baseRoundClearPct * 0.55))),
    );
  }

  return {
    roundId: puzzle.roundId,
    totalPlayers: basePlayerCount + Math.max(1, localRoundLogs.length),
    roundClearRatePct: baseRoundClearPct,
    avgMatchedTiles,
    betterThanPct,
    slotBreakdown,
  };
}

/**
 * Computes full daily challenge community performance, percentile rank,
 * and 7-bucket accuracy histogram for the Results Dashboard.
 */
export function getDailyCommunityComparison(
  challenge: DailyChallenge,
  results: readonly RoundResult[],
): DailyCommunityComparison {
  const rng = createSeededRandom(`community-daily|${challenge.challengeId}`);
  const stored = getOrInitDailyData(challenge.challengeId);

  const roundComparisons = results.map((res) => {
    const puzzle =
      challenge.rounds.find((r) => r.roundId === res.roundId) ?? challenge.rounds[0];
    return getRoundCommunityComparison(challenge.challengeId, puzzle, res);
  });

  const { matched: playerMatchedTiles, total: totalPossibleTiles } =
    calculateDailyMatchedTiles(results);

  const baseDailyPlayers = rng.nextInt(380, 610);
  const localSubmissions = stored.dailyMatchedSubmissions;
  const totalPlayers = baseDailyPlayers + Math.max(1, localSubmissions.length);

  // 7 clean buckets spanning 0..18 matched tiles
  const rawBucketDefs = [
    { id: 'b0', label: '0–3', minMatched: 0, maxMatched: 3, weight: rng.nextInt(3, 6) },
    {
      id: 'b1',
      label: '4–6',
      minMatched: 4,
      maxMatched: 6,
      weight: rng.nextInt(6, 10),
    },
    {
      id: 'b2',
      label: '7–9',
      minMatched: 7,
      maxMatched: 9,
      weight: rng.nextInt(12, 17),
    },
    {
      id: 'b3',
      label: '10–12',
      minMatched: 10,
      maxMatched: 12,
      weight: rng.nextInt(22, 28),
    },
    {
      id: 'b4',
      label: '13–15',
      minMatched: 13,
      maxMatched: 15,
      weight: rng.nextInt(24, 30),
    },
    {
      id: 'b5',
      label: '16–17',
      minMatched: 16,
      maxMatched: 17,
      weight: rng.nextInt(13, 18),
    },
    {
      id: 'b6',
      label: '18★',
      minMatched: 18,
      maxMatched: 18,
      weight: rng.nextInt(8, 14),
    },
  ];

  // Add recorded local submissions into the bucket weights
  for (const matchedVal of localSubmissions) {
    const bucket = rawBucketDefs.find(
      (b) => matchedVal >= b.minMatched && matchedVal <= b.maxMatched,
    );
    if (bucket) {
      bucket.weight += 1;
    }
  }

  // Ensure the current player's run is represented in its bucket
  const playerBucketDef =
    rawBucketDefs.find(
      (b) => playerMatchedTiles >= b.minMatched && playerMatchedTiles <= b.maxMatched,
    ) ?? rawBucketDefs[0];
  if (localSubmissions.length === 0) {
    playerBucketDef.weight += 1;
  }

  const totalWeight = rawBucketDefs.reduce((sum, b) => sum + b.weight, 0);

  const distributionBuckets: DistributionBucket[] = rawBucketDefs.map((b) => ({
    id: b.id,
    label: b.label,
    minMatched: b.minMatched,
    maxMatched: b.maxMatched,
    percentage: Math.max(1, Math.round((b.weight / Math.max(1, totalWeight)) * 100)),
    isPlayerBucket:
      playerMatchedTiles >= b.minMatched && playerMatchedTiles <= b.maxMatched,
  }));

  // Calculate percentile ("Better than X% of players today")
  let cumulativeLowerWeight = 0;
  let playerBucketWeight = 0;
  for (const b of rawBucketDefs) {
    if (b.maxMatched < playerMatchedTiles) {
      cumulativeLowerWeight += b.weight;
    } else if (
      playerMatchedTiles >= b.minMatched &&
      playerMatchedTiles <= b.maxMatched
    ) {
      playerBucketWeight = b.weight;
      const span = Math.max(1, b.maxMatched - b.minMatched + 1);
      const posWithin = (playerMatchedTiles - b.minMatched + 0.5) / span;
      cumulativeLowerWeight += b.weight * posWithin;
    }
  }

  const rawBetterThan = Math.round(
    (cumulativeLowerWeight / Math.max(1, totalWeight)) * 100,
  );
  const betterThanPct =
    playerMatchedTiles === totalPossibleTiles
      ? Math.min(99, Math.max(88, rawBetterThan))
      : playerMatchedTiles === 0
        ? Math.max(2, Math.min(8, rawBetterThan))
        : Math.min(96, Math.max(5, rawBetterThan));

  const topPercentile = Math.max(1, 100 - betterThanPct);

  // Calculate weighted average matched tiles across all buckets
  const weightedTileSum = rawBucketDefs.reduce((sum, b) => {
    const midpoint = (b.minMatched + b.maxMatched) / 2;
    return sum + midpoint * b.weight;
  }, 0);
  const avgMatchedTiles = Number(
    (weightedTileSum / Math.max(1, totalWeight)).toFixed(1),
  );
  const avgScore = Math.round(avgMatchedTiles * SCORING_CONFIG.pointsPerCorrectTile);
  void playerBucketWeight;

  return {
    challengeId: challenge.challengeId,
    totalPlayers,
    playerMatchedTiles,
    totalPossibleTiles,
    avgMatchedTiles,
    avgScore,
    betterThanPct,
    topPercentile,
    distributionBuckets,
    roundComparisons,
  };
}
