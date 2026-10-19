import { ROUND_CONFIGS, SCORING_CONFIG } from '../game/config';
import { calculateDailyMatchedTiles } from '../game/scoring';
import type { DailyChallenge, RoundPuzzle, RoundResult } from '../game/types';

const COMMUNITY_STORAGE_KEY = 'recall_community_real_v1';
const PLAYER_ID_STORAGE_KEY = 'recall_player_id_v1';

export interface StoredRoundChoiceLog {
  playerId: string;
  roundId: number;
  finalTileOrder: string[];
  matchedTiles: number;
  swaps: number;
  optimalSwaps: number;
  status: 'success' | 'failure';
  recordedAtEpochMs: number;
}

export interface StoredDailyRunLog {
  playerId: string;
  matchedTiles: number;
  recordedAtEpochMs: number;
}

interface StoredDailyCommunityData {
  challengeId: string;
  roundSubmissions: Record<number, StoredRoundChoiceLog[]>;
  dailySubmissions: StoredDailyRunLog[];
}

export interface SlotChoiceComparison {
  slotIndex: number;
  playerTileId: string;
  targetTileId: string;
  isPlayerCorrect: boolean;
  /** % of other players who placed the correct target colour in this square */
  correctRatePct: number;
  /** % of other players who picked the exact same colour (or left empty) as this player */
  sameChoicePct: number;
}

export interface RoundCommunityComparison {
  roundId: number;
  /** Number of OTHER players who have completed this round */
  otherPlayersCount: number;
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
  /** Number of OTHER players who have completed today's challenge */
  otherPlayersCount: number;
  playerMatchedTiles: number;
  totalPossibleTiles: number;
  avgMatchedTiles: number;
  avgScore: number;
  betterThanPct: number;
  topPercentile: number;
  distributionBuckets: DistributionBucket[];
  roundComparisons: Record<number, RoundCommunityComparison>;
}

const memoryCommunityStore = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Fallback to memory store
  }
  return memoryCommunityStore.get(key) ?? null;
}

function safeSet(key: string, value: string): void {
  memoryCommunityStore.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getOrCreateAnonymousPlayerId(): string {
  const existing = safeGet(PLAYER_ID_STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }
  const generated = `player_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  safeSet(PLAYER_ID_STORAGE_KEY, generated);
  return generated;
}

function loadAllStoredCommunityData(): Record<string, StoredDailyCommunityData> {
  const raw = safeGet(COMMUNITY_STORAGE_KEY);
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
  safeSet(COMMUNITY_STORAGE_KEY, JSON.stringify(data));
}

function getOrInitDailyData(challengeId: string): StoredDailyCommunityData {
  const all = loadAllStoredCommunityData();
  if (all[challengeId]) {
    return all[challengeId];
  }
  const fresh: StoredDailyCommunityData = {
    challengeId,
    roundSubmissions: { 1: [], 2: [], 3: [] },
    dailySubmissions: [],
  };
  all[challengeId] = fresh;
  saveAllStoredCommunityData(all);
  return fresh;
}

/**
 * Records a player's real tile choices (`finalTileOrder`) for a round.
 * Never fabricates or mocks any data.
 */
export function recordRoundPlayerChoices(
  challengeId: string,
  result: RoundResult,
  nowEpochMs: number = Date.now(),
  overridePlayerId?: string,
): void {
  const playerId = overridePlayerId ?? getOrCreateAnonymousPlayerId();
  const all = loadAllStoredCommunityData();
  const daily = all[challengeId] ?? {
    challengeId,
    roundSubmissions: { 1: [], 2: [], 3: [] },
    dailySubmissions: [],
  };

  const list = daily.roundSubmissions[result.roundId] ?? [];
  const filtered = list.filter((entry) => entry.playerId !== playerId);
  daily.roundSubmissions[result.roundId] = [
    ...filtered.slice(-499),
    {
      playerId,
      roundId: result.roundId,
      finalTileOrder: [...result.finalTileOrder],
      matchedTiles: result.matchedTiles,
      swaps: result.swaps,
      optimalSwaps: result.optimalSwaps,
      status: result.status,
      recordedAtEpochMs: nowEpochMs,
    },
  ];

  all[challengeId] = daily;
  saveAllStoredCommunityData(all);
}

/**
 * Records a player's completed 3-round daily total.
 * Never fabricates or mocks any data.
 */
export function recordDailyPlayerChoices(
  challengeId: string,
  results: readonly RoundResult[],
  nowEpochMs: number = Date.now(),
  overridePlayerId?: string,
): void {
  if (results.length !== ROUND_CONFIGS.length) return;
  const playerId = overridePlayerId ?? getOrCreateAnonymousPlayerId();
  const all = loadAllStoredCommunityData();
  const daily = all[challengeId] ?? {
    challengeId,
    roundSubmissions: { 1: [], 2: [], 3: [] },
    dailySubmissions: [],
  };

  const { matched } = calculateDailyMatchedTiles(results);
  const filtered = daily.dailySubmissions.filter(
    (entry) => entry.playerId !== playerId,
  );
  daily.dailySubmissions = [
    ...filtered.slice(-499),
    {
      playerId,
      matchedTiles: matched,
      recordedAtEpochMs: nowEpochMs,
    },
  ];

  all[challengeId] = daily;
  saveAllStoredCommunityData(all);
}

/**
 * Computes how a player's tile choices on a specific round compare against
 * real recorded submissions from OTHER players.
 * Returns `null` if no one else has played this round yet.
 */
export function getRoundCommunityComparison(
  challengeId: string,
  puzzle: RoundPuzzle,
  result: RoundResult,
  overridePlayerId?: string,
): RoundCommunityComparison | null {
  const currentPlayerId = overridePlayerId ?? getOrCreateAnonymousPlayerId();
  const stored = getOrInitDailyData(challengeId);
  const allLogs = stored.roundSubmissions[puzzle.roundId] ?? [];

  const otherLogs = allLogs.filter((entry) => entry.playerId !== currentPlayerId);
  if (otherLogs.length === 0) {
    return null;
  }

  const otherCount = otherLogs.length;
  const clearedCount = otherLogs.filter((entry) => entry.status === 'success').length;
  const roundClearRatePct = Math.round((clearedCount / otherCount) * 100);

  const totalMatchedSum = otherLogs.reduce((sum, entry) => sum + entry.matchedTiles, 0);
  const avgMatchedTiles = Number((totalMatchedSum / otherCount).toFixed(1));

  // Count how many other players this player scored strictly better than (or tied on tiles with fewer/equal swaps)
  const beatenOrTiedCount = otherLogs.filter(
    (entry) =>
      result.matchedTiles > entry.matchedTiles ||
      (result.matchedTiles === entry.matchedTiles && result.swaps <= entry.swaps),
  ).length;
  const betterThanPct = Math.round((beatenOrTiedCount / otherCount) * 100);

  const slotBreakdown: SlotChoiceComparison[] = puzzle.targetOrder.map(
    (targetTileId, slotIdx) => {
      const playerTileId = result.finalTileOrder[slotIdx] ?? '';
      let otherCorrectCount = 0;
      let otherSameChoiceCount = 0;

      for (const log of otherLogs) {
        const theirTileId = log.finalTileOrder[slotIdx] ?? '';
        if (theirTileId === targetTileId) {
          otherCorrectCount++;
        }
        if (theirTileId === playerTileId) {
          otherSameChoiceCount++;
        }
      }

      return {
        slotIndex: slotIdx,
        playerTileId,
        targetTileId,
        isPlayerCorrect: playerTileId !== '' && playerTileId === targetTileId,
        correctRatePct: Math.round((otherCorrectCount / otherCount) * 100),
        sameChoicePct: Math.round((otherSameChoiceCount / otherCount) * 100),
      };
    },
  );

  return {
    roundId: puzzle.roundId,
    otherPlayersCount: otherCount,
    roundClearRatePct,
    avgMatchedTiles,
    betterThanPct,
    slotBreakdown,
  };
}

/**
 * Computes full daily challenge community performance from real recorded
 * submissions of OTHER players.
 * Returns `null` if no one else has completed today's challenge yet.
 */
export function getDailyCommunityComparison(
  challenge: DailyChallenge,
  results: readonly RoundResult[],
  overridePlayerId?: string,
): DailyCommunityComparison | null {
  const currentPlayerId = overridePlayerId ?? getOrCreateAnonymousPlayerId();
  const stored = getOrInitDailyData(challenge.challengeId);

  const otherDailyLogs = stored.dailySubmissions.filter(
    (entry) => entry.playerId !== currentPlayerId,
  );
  if (otherDailyLogs.length === 0) {
    return null;
  }

  const otherCount = otherDailyLogs.length;
  const { matched: playerMatchedTiles, total: totalPossibleTiles } =
    calculateDailyMatchedTiles(results);

  const allRunsMatched = [
    ...otherDailyLogs.map((d) => d.matchedTiles),
    playerMatchedTiles,
  ];
  const totalRunsCount = allRunsMatched.length;

  const rawBucketDefs = [
    { id: 'b0', label: '0–3', minMatched: 0, maxMatched: 3 },
    { id: 'b1', label: '4–6', minMatched: 4, maxMatched: 6 },
    { id: 'b2', label: '7–9', minMatched: 7, maxMatched: 9 },
    { id: 'b3', label: '10–12', minMatched: 10, maxMatched: 12 },
    { id: 'b4', label: '13–15', minMatched: 13, maxMatched: 15 },
    { id: 'b5', label: '16–17', minMatched: 16, maxMatched: 17 },
    { id: 'b6', label: '18★', minMatched: 18, maxMatched: 18 },
  ];

  const distributionBuckets: DistributionBucket[] = rawBucketDefs.map((b) => {
    const countInBucket = allRunsMatched.filter(
      (m) => m >= b.minMatched && m <= b.maxMatched,
    ).length;
    return {
      id: b.id,
      label: b.label,
      minMatched: b.minMatched,
      maxMatched: b.maxMatched,
      percentage: Math.round((countInBucket / totalRunsCount) * 100),
      isPlayerBucket:
        playerMatchedTiles >= b.minMatched && playerMatchedTiles <= b.maxMatched,
    };
  });

  const beatenCount = otherDailyLogs.filter(
    (entry) => playerMatchedTiles >= entry.matchedTiles,
  ).length;
  const betterThanPct = Math.round((beatenCount / otherCount) * 100);
  const topPercentile = Math.max(1, 100 - betterThanPct);

  const avgMatchedTiles = Number(
    (
      otherDailyLogs.reduce((sum, entry) => sum + entry.matchedTiles, 0) / otherCount
    ).toFixed(1),
  );
  const avgScore = Math.round(avgMatchedTiles * SCORING_CONFIG.pointsPerCorrectTile);

  const roundComparisons: Record<number, RoundCommunityComparison> = {};
  for (const res of results) {
    const puzzle = challenge.rounds.find((r) => r.roundId === res.roundId);
    if (puzzle) {
      const rc = getRoundCommunityComparison(
        challenge.challengeId,
        puzzle,
        res,
        currentPlayerId,
      );
      if (rc) {
        roundComparisons[res.roundId] = rc;
      }
    }
  }

  return {
    challengeId: challenge.challengeId,
    otherPlayersCount: otherCount,
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

export function clearCommunityStorageForTesting(): void {
  memoryCommunityStore.clear();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(COMMUNITY_STORAGE_KEY);
      window.localStorage.removeItem(PLAYER_ID_STORAGE_KEY);
    }
  } catch {
    // Ignore storage removal errors
  }
}
