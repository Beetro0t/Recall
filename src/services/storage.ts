import { isValidBoardSlotOrder } from '../game/board';
import {
  PUZZLE_VERSION,
  ROUND_CONFIGS,
  SCORING_VERSION,
  STORAGE_SCHEMA_VERSION,
} from '../game/config';
import {
  calculateUpdatedStreak,
  getChallengeNumber,
  isValidChallengeId,
} from '../game/dailyChallenge';
import { calculateDailyTotalScore } from '../game/scoring';
import {
  createInitialSession,
  getRoundPuzzle,
  reconcileSessionWithClock,
} from '../game/stateMachine';
import type {
  DailyChallenge,
  DailyHistoryEntry,
  GamePhase,
  GameSession,
  PlayerPreferences,
  PlayerStats,
  RoundResult,
} from '../game/types';

export const STORAGE_KEYS = {
  SESSION: 'recall_session_v3',
  STATS: 'recall_stats_v3',
  PREFERENCES: 'recall_preferences_v3',
} as const;

const VALID_PHASES: readonly GamePhase[] = [
  'home',
  'ready',
  'memorising',
  'concealing',
  'recreating',
  'round-success',
  'round-failure',
  'intermission',
  'results',
];

const memoryFallback = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Restricted storage environment
  }
  return memoryFallback.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  memoryFallback.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Restricted or full storage environment
  }
}

function safeRemoveItem(key: string): void {
  memoryFallback.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage removal errors
  }
}

/**
 * Sound & tactile feedback is ON by default; players can toggle it off in Settings.
 */
export const DEFAULT_PREFERENCES: PlayerPreferences = {
  soundEnabled: true,
  symbolsEnabled: false,
  reducedMotionOverride: null,
  hasCompletedOnboarding: false,
};

export const DEFAULT_STATS: PlayerStats = {
  currentStreak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  history: {},
};

function isValidRoundResult(
  raw: unknown,
  challenge?: DailyChallenge,
): raw is RoundResult {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const r = raw as Record<string, unknown>;
  if (
    typeof r.roundId !== 'number' ||
    !ROUND_CONFIGS.some((c) => c.roundId === r.roundId)
  ) {
    return false;
  }
  if (r.status !== 'success' && r.status !== 'failure') {
    return false;
  }
  if (typeof r.swaps !== 'number' || !Number.isInteger(r.swaps) || r.swaps < 0) {
    return false;
  }
  if (
    typeof r.optimalSwaps !== 'number' ||
    !Number.isInteger(r.optimalSwaps) ||
    r.optimalSwaps <= 0
  ) {
    return false;
  }
  if (typeof r.solveTimeMs !== 'number' || r.solveTimeMs < 0) {
    return false;
  }
  if (typeof r.remainingMs !== 'number' || r.remainingMs < 0) {
    return false;
  }
  if (typeof r.score !== 'number' || !Number.isInteger(r.score) || r.score < 0) {
    return false;
  }
  if (!Array.isArray(r.finalTileOrder)) {
    return false;
  }
  if (challenge) {
    const puzzle = challenge.rounds.find((p) => p.roundId === r.roundId);
    if (
      puzzle &&
      !isValidBoardSlotOrder(r.finalTileOrder as string[], puzzle.targetOrder)
    ) {
      return false;
    }
  }
  return true;
}

export function validateStoredSession(
  raw: unknown,
  challenge: DailyChallenge,
): GameSession | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const s = raw as Record<string, unknown>;

  if (s.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    return null;
  }
  if (s.challengeId !== challenge.challengeId) {
    return null;
  }
  if (typeof s.phase !== 'string' || !VALID_PHASES.includes(s.phase as GamePhase)) {
    return null;
  }
  if (
    typeof s.currentRoundId !== 'number' ||
    !ROUND_CONFIGS.some((c) => c.roundId === s.currentRoundId)
  ) {
    return null;
  }
  if (
    typeof s.swapCount !== 'number' ||
    !Number.isInteger(s.swapCount) ||
    s.swapCount < 0
  ) {
    return null;
  }

  const currentPuzzle = getRoundPuzzle(challenge, s.currentRoundId);
  if (
    !Array.isArray(s.currentTileOrder) ||
    !isValidBoardSlotOrder(s.currentTileOrder as string[], currentPuzzle.targetOrder)
  ) {
    return null;
  }

  if (
    s.phaseStartEpochMs !== null &&
    (typeof s.phaseStartEpochMs !== 'number' || !Number.isFinite(s.phaseStartEpochMs))
  ) {
    return null;
  }

  if (
    s.phaseDeadlineEpochMs !== null &&
    (typeof s.phaseDeadlineEpochMs !== 'number' ||
      !Number.isFinite(s.phaseDeadlineEpochMs))
  ) {
    return null;
  }

  const isTimedPhase =
    s.phase === 'memorising' || s.phase === 'concealing' || s.phase === 'recreating';
  if (isTimedPhase && s.phaseDeadlineEpochMs === null) {
    return null;
  }

  if (!Array.isArray(s.results)) {
    return null;
  }

  const seenRoundIds = new Set<number>();
  const validatedResults: RoundResult[] = [];
  for (const item of s.results) {
    if (!isValidRoundResult(item, challenge)) {
      return null;
    }
    if (seenRoundIds.has(item.roundId)) {
      return null;
    }
    seenRoundIds.add(item.roundId);
    validatedResults.push(item);
  }

  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    challengeId: challenge.challengeId,
    puzzleVersion:
      typeof s.puzzleVersion === 'string' ? s.puzzleVersion : PUZZLE_VERSION,
    scoringVersion:
      typeof s.scoringVersion === 'string' ? s.scoringVersion : SCORING_VERSION,
    phase: s.phase as GamePhase,
    currentRoundId: s.currentRoundId,
    currentTileOrder: [...(s.currentTileOrder as string[])],
    swapCount: s.swapCount,
    phaseStartEpochMs: s.phaseStartEpochMs as number | null,
    phaseDeadlineEpochMs: s.phaseDeadlineEpochMs as number | null,
    results: validatedResults,
  };
}

export function loadPreferences(): PlayerPreferences {
  const raw = safeGetItem(STORAGE_KEYS.PREFERENCES);
  if (!raw) {
    return { ...DEFAULT_PREFERENCES };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_PREFERENCES.soundEnabled,
      symbolsEnabled:
        typeof parsed.symbolsEnabled === 'boolean'
          ? parsed.symbolsEnabled
          : DEFAULT_PREFERENCES.symbolsEnabled,
      reducedMotionOverride:
        typeof parsed.reducedMotionOverride === 'boolean'
          ? parsed.reducedMotionOverride
          : null,
      hasCompletedOnboarding:
        typeof parsed.hasCompletedOnboarding === 'boolean'
          ? parsed.hasCompletedOnboarding
          : DEFAULT_PREFERENCES.hasCompletedOnboarding,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: PlayerPreferences): void {
  safeSetItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
}

export function loadPlayerStats(): PlayerStats {
  const raw = safeGetItem(STORAGE_KEYS.STATS);
  if (!raw) {
    return { ...DEFAULT_STATS, history: {} };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const currentStreak =
      typeof parsed.currentStreak === 'number' &&
      Number.isInteger(parsed.currentStreak) &&
      parsed.currentStreak >= 0
        ? parsed.currentStreak
        : 0;
    const bestStreak =
      typeof parsed.bestStreak === 'number' &&
      Number.isInteger(parsed.bestStreak) &&
      parsed.bestStreak >= 0
        ? Math.max(currentStreak, parsed.bestStreak)
        : currentStreak;
    const lastCompletedDate = isValidChallengeId(parsed.lastCompletedDate)
      ? parsed.lastCompletedDate
      : null;

    const history: Record<string, DailyHistoryEntry> = {};
    if (parsed.history && typeof parsed.history === 'object') {
      for (const [dateKey, entryVal] of Object.entries(
        parsed.history as Record<string, unknown>,
      )) {
        if (!isValidChallengeId(dateKey) || !entryVal || typeof entryVal !== 'object') {
          continue;
        }
        const entry = entryVal as Record<string, unknown>;
        if (
          entry.challengeId === dateKey &&
          Array.isArray(entry.results) &&
          entry.results.length === ROUND_CONFIGS.length &&
          entry.results.every((r) => isValidRoundResult(r))
        ) {
          const validResults = entry.results as RoundResult[];
          history[dateKey] = {
            challengeId: dateKey,
            challengeNumber:
              typeof entry.challengeNumber === 'number'
                ? entry.challengeNumber
                : getChallengeNumber(dateKey),
            completedAtEpochMs:
              typeof entry.completedAtEpochMs === 'number'
                ? entry.completedAtEpochMs
                : 0,
            totalScore: calculateDailyTotalScore(validResults),
            totalSwaps: validResults.reduce((acc, r) => acc + r.swaps, 0),
            successfulRounds: validResults.filter((r) => r.status === 'success').length,
            results: validResults,
            puzzleVersion:
              typeof entry.puzzleVersion === 'string'
                ? entry.puzzleVersion
                : PUZZLE_VERSION,
            scoringVersion:
              typeof entry.scoringVersion === 'string'
                ? entry.scoringVersion
                : SCORING_VERSION,
          };
        }
      }
    }

    return {
      currentStreak,
      bestStreak,
      lastCompletedDate,
      history,
    };
  } catch {
    return { ...DEFAULT_STATS, history: {} };
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  safeSetItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

/**
 * Records a completed daily challenge into PlayerStats (idempotent per challengeId).
 */
export function recordDailyChallengeCompletion(
  challenge: DailyChallenge,
  results: readonly RoundResult[],
  nowEpochMs: number = Date.now(),
): PlayerStats {
  const stats = loadPlayerStats();

  if (stats.history[challenge.challengeId]) {
    return stats;
  }

  if (results.length !== ROUND_CONFIGS.length) {
    return stats;
  }

  const streakUpdate = calculateUpdatedStreak(
    stats.currentStreak,
    stats.bestStreak,
    stats.lastCompletedDate,
    challenge.challengeId,
  );

  const entry: DailyHistoryEntry = {
    challengeId: challenge.challengeId,
    challengeNumber: challenge.challengeNumber,
    completedAtEpochMs: nowEpochMs,
    totalScore: calculateDailyTotalScore(results),
    totalSwaps: results.reduce((sum, r) => sum + r.swaps, 0),
    successfulRounds: results.filter((r) => r.status === 'success').length,
    results: [...results],
    puzzleVersion: challenge.puzzleVersion,
    scoringVersion: challenge.scoringVersion,
  };

  const nextStats: PlayerStats = {
    currentStreak: streakUpdate.currentStreak,
    bestStreak: streakUpdate.bestStreak,
    lastCompletedDate: streakUpdate.lastCompletedDate,
    history: {
      ...stats.history,
      [challenge.challengeId]: entry,
    },
  };

  savePlayerStats(nextStats);
  return nextStats;
}

/**
 * Clears any saved completion lock and resets the session for `challenge`,
 * allowing unlimited replay in Dev Mode.
 */
export function clearChallengeCompletionAndSession(challenge: DailyChallenge): {
  session: GameSession;
  stats: PlayerStats;
} {
  const stats = loadPlayerStats();
  const nextHistory = { ...stats.history };
  delete nextHistory[challenge.challengeId];

  const remainingDates = Object.keys(nextHistory).sort();
  const lastCompletedDate =
    remainingDates.length > 0 ? remainingDates[remainingDates.length - 1] : null;

  const nextStats: PlayerStats = {
    ...stats,
    currentStreak: remainingDates.length > 0 ? stats.currentStreak : 0,
    lastCompletedDate,
    history: nextHistory,
  };

  savePlayerStats(nextStats);
  const freshSession = createInitialSession(challenge);
  saveGameSession(freshSession);

  return {
    session: freshSession,
    stats: nextStats,
  };
}

export function saveGameSession(session: GameSession): void {
  safeSetItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

/**
 * Loads or initializes the GameSession for `challenge`, reconciling any elapsed time
 * and enforcing daily locking if `challenge.challengeId` was already completed.
 */
export function loadOrInitializeSession(
  challenge: DailyChallenge,
  nowEpochMs: number = Date.now(),
): GameSession {
  const stats = loadPlayerStats();
  const completedHistory = stats.history[challenge.challengeId];

  if (completedHistory && completedHistory.results.length === ROUND_CONFIGS.length) {
    const lastRound = getRoundPuzzle(challenge, ROUND_CONFIGS.length);
    const lockedSession: GameSession = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      challengeId: challenge.challengeId,
      puzzleVersion: challenge.puzzleVersion,
      scoringVersion: challenge.scoringVersion,
      phase: 'results',
      currentRoundId: ROUND_CONFIGS.length,
      currentTileOrder: completedHistory.results[completedHistory.results.length - 1]
        ?.finalTileOrder ?? [...lastRound.targetOrder],
      swapCount:
        completedHistory.results[completedHistory.results.length - 1]?.swaps ?? 0,
      phaseStartEpochMs: null,
      phaseDeadlineEpochMs: null,
      results: [...completedHistory.results],
    };
    saveGameSession(lockedSession);
    return lockedSession;
  }

  const rawSessionStr = safeGetItem(STORAGE_KEYS.SESSION);
  if (rawSessionStr) {
    try {
      const parsed = JSON.parse(rawSessionStr);
      const validSession = validateStoredSession(parsed, challenge);
      if (validSession) {
        const reconciled = reconcileSessionWithClock(
          validSession,
          challenge,
          nowEpochMs,
        );
        saveGameSession(reconciled);
        if (
          reconciled.phase === 'results' &&
          reconciled.results.length === ROUND_CONFIGS.length
        ) {
          recordDailyChallengeCompletion(challenge, reconciled.results, nowEpochMs);
        }
        return reconciled;
      }
    } catch {
      // Corrupt JSON in localStorage; fall back safely to fresh session
    }
  }

  const fresh = createInitialSession(challenge);
  saveGameSession(fresh);
  return fresh;
}

export function clearAllStorageForTesting(): void {
  safeRemoveItem(STORAGE_KEYS.SESSION);
  safeRemoveItem(STORAGE_KEYS.STATS);
  safeRemoveItem(STORAGE_KEYS.PREFERENCES);
}
