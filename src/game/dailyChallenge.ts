import { EPOCH_START_UTC_DATE } from './config';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

/**
 * Formats a timestamp or Date object into its authoritative UTC date string (YYYY-MM-DD).
 */
export function getUtcChallengeId(now: Date | number = Date.now()): string {
  const date = typeof now === 'number' ? new Date(now) : now;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates that a string is a legitimate YYYY-MM-DD calendar date.
 */
export function isValidChallengeId(challengeId: unknown): challengeId is string {
  if (typeof challengeId !== 'string' || !ISO_DATE_REGEX.test(challengeId)) {
    return false;
  }
  const [y, m, d] = challengeId.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

/**
 * Converts a YYYY-MM-DD UTC date string into UTC midnight epoch milliseconds.
 */
export function challengeIdToUtcEpochMs(challengeId: string): number {
  if (!isValidChallengeId(challengeId)) {
    throw new Error(`Invalid challengeId: "${challengeId}"`);
  }
  const [y, m, d] = challengeId.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Computes a 1-indexed sequential challenge number relative to EPOCH_START_UTC_DATE.
 */
export function getChallengeNumber(
  challengeId: string,
  epochStartDate: string = EPOCH_START_UTC_DATE,
): number {
  const targetMs = challengeIdToUtcEpochMs(challengeId);
  const startMs = challengeIdToUtcEpochMs(epochStartDate);
  const diffDays = Math.round((targetMs - startMs) / MS_PER_DAY);
  return Math.max(1, diffDays + 1);
}

/**
 * Formats a sequential challenge number as e.g. "#001" or "#292".
 */
export function formatChallengeNumber(challengeNumber: number): string {
  return `#${String(Math.max(1, Math.floor(challengeNumber))).padStart(3, '0')}`;
}

/**
 * Computes the number of calendar days between two YYYY-MM-DD UTC dates (b - a).
 */
export function diffUtcDays(challengeIdA: string, challengeIdB: string): number {
  const msA = challengeIdToUtcEpochMs(challengeIdA);
  const msB = challengeIdToUtcEpochMs(challengeIdB);
  return Math.round((msB - msA) / MS_PER_DAY);
}

/**
 * Computes updated streak counts when a player completes `completedChallengeId`.
 */
export function calculateUpdatedStreak(
  previousStreak: number,
  previousBestStreak: number,
  lastCompletedDate: string | null,
  completedChallengeId: string,
): {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string;
} {
  if (!isValidChallengeId(completedChallengeId)) {
    throw new Error(`Invalid completedChallengeId: ${completedChallengeId}`);
  }

  if (lastCompletedDate && isValidChallengeId(lastCompletedDate)) {
    const dayDiff = diffUtcDays(lastCompletedDate, completedChallengeId);
    if (dayDiff === 0) {
      // Already recorded for today
      const currentStreak = Math.max(1, previousStreak);
      return {
        currentStreak,
        bestStreak: Math.max(previousBestStreak, currentStreak),
        lastCompletedDate,
      };
    }
    if (dayDiff === 1) {
      const currentStreak = Math.max(0, previousStreak) + 1;
      return {
        currentStreak,
        bestStreak: Math.max(previousBestStreak, currentStreak),
        lastCompletedDate: completedChallengeId,
      };
    }
    if (dayDiff < 0) {
      // Out-of-order historical date should not overwrite newer completion date
      return {
        currentStreak: previousStreak,
        bestStreak: previousBestStreak,
        lastCompletedDate,
      };
    }
  }

  // First completion or broken streak (dayDiff > 1)
  const currentStreak = 1;
  return {
    currentStreak,
    bestStreak: Math.max(previousBestStreak, currentStreak),
    lastCompletedDate: completedChallengeId,
  };
}

/**
 * Returns the active display streak for `todayChallengeId` without mutating state.
 * If the player missed yesterday and hasn't completed today yet, their active streak is 0.
 */
export function getEffectiveCurrentStreak(
  storedStreak: number,
  lastCompletedDate: string | null,
  todayChallengeId: string,
): number {
  if (!lastCompletedDate || !isValidChallengeId(lastCompletedDate)) {
    return 0;
  }
  const dayDiff = diffUtcDays(lastCompletedDate, todayChallengeId);
  if (dayDiff === 0 || dayDiff === 1) {
    return Math.max(0, storedStreak);
  }
  return 0;
}

/**
 * Computes milliseconds remaining until the next 00:00:00 UTC daily rollover.
 */
export function getMsUntilNextUtcRollover(nowEpochMs: number = Date.now()): number {
  const now = new Date(nowEpochMs);
  const nextMidnightUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, nextMidnightUtc - nowEpochMs);
}
