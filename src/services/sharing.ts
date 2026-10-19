import { ROUND_CONFIGS } from '../game/config';
import { formatChallengeNumber } from '../game/dailyChallenge';
import { calculateDailyTotalScore } from '../game/scoring';
import type { RoundResult } from '../game/types';

export interface SharePayloadInput {
  challengeId: string;
  challengeNumber: number;
  results: readonly RoundResult[];
  streak: number;
}

/**
 * Generates a spoiler-free share summary from authoritative round results (Section 15.2).
 * Uses:
 * 🟩 for a solved round
 * 🟨 for a timed-out round
 */
export function formatShareableResults(input: SharePayloadInput): string {
  const formattedNumber = formatChallengeNumber(input.challengeNumber);

  const roundLines = ROUND_CONFIGS.map((config) => {
    const result = input.results.find((r) => r.roundId === config.roundId);
    const badge = result?.status === 'success' ? '🟩' : '🟨';
    return `${badge} Round ${config.roundId} — ${config.tileCount} tiles`;
  });

  const totalScore = calculateDailyTotalScore(input.results);
  const totalSwaps = input.results.reduce((sum, r) => sum + r.swaps, 0);
  const safeStreak = Math.max(0, Math.floor(input.streak));

  return [
    `Recall ${formattedNumber} (${input.challengeId})`,
    '',
    ...roundLines,
    '',
    `Score: ${totalScore}`,
    `Swaps: ${totalSwaps}`,
    `Streak: ${safeStreak}`,
  ].join('\n');
}

export type ShareOutcome =
  { ok: true; method: 'web-share' | 'clipboard' } | { ok: false; error: string };

/**
 * Attempts to share results via Web Share API (if requested and available on mobile)
 * or copies results to the clipboard with a fallback textarea copy.
 */
export async function shareOrCopyResults(
  text: string,
  preferNativeShare = false,
): Promise<ShareOutcome> {
  if (
    preferNativeShare &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({
        title: 'Recall Daily Result',
        text,
      });
      return { ok: true, method: 'web-share' };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { ok: false, error: 'Share cancelled' };
      }
      // Fall through to clipboard copy if navigator.share failed
    }
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard' };
    } catch {
      // Fall through to execCommand fallback
    }
  }

  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (copied) {
        return { ok: true, method: 'clipboard' };
      }
    }
  } catch {
    // Ignore DOM fallback errors
  }

  return {
    ok: false,
    error: 'Unable to access clipboard in this browser environment.',
  };
}
