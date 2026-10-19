import { useEffect, useRef, useState } from 'react';

export interface UseCountdownOptions {
  deadlineEpochMs: number | null;
  totalDurationMs: number;
  active: boolean;
  onExpire?: () => void;
}

export interface CountdownSnapshot {
  remainingMs: number;
  progress: number;
  isUrgent: boolean;
}

/**
 * High-precision deadline countdown hook (Section 5.1 - 5.6).
 * - Anchors an active session deadline to `performance.now()` so minor wall-clock
 *   adjustments do not jitter the countdown.
 * - Re-synchronizes against `deadlineEpochMs` (`Date.now()`) on tab visibility/focus changes
 *   so backgrounding the browser continues running the timer accurately.
 * - Uses `requestAnimationFrame` for smooth visual updates and a deadline `setTimeout`
 *   guard so expiry triggers deterministically even if RAF is throttled.
 */
export function useCountdown({
  deadlineEpochMs,
  totalDurationMs,
  active,
  onExpire,
}: UseCountdownOptions): CountdownSnapshot {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const expiredFiredRef = useRef(false);

  const computeInitialRemaining = (): number => {
    if (!active || deadlineEpochMs === null) {
      return 0;
    }
    return Math.max(0, Math.min(totalDurationMs, deadlineEpochMs - Date.now()));
  };

  const [remainingMs, setRemainingMs] = useState<number>(computeInitialRemaining);

  useEffect(() => {
    if (!active || deadlineEpochMs === null) {
      expiredFiredRef.current = false;
      setRemainingMs(0);
      return;
    }

    expiredFiredRef.current = false;

    // Anchor monotonic deadline to current wall-clock remaining duration
    let deadlineMono = performance.now() + Math.max(0, deadlineEpochMs - Date.now());

    const getAuthoritativeRemainingMs = (): number => {
      const monoRemaining = deadlineMono - performance.now();
      const wallRemaining = deadlineEpochMs - Date.now();
      // If wall clock advanced significantly faster than performance.now() (e.g. device sleep),
      // honour the stricter wall-clock deadline.
      const raw =
        Math.abs(wallRemaining - monoRemaining) > 250 ? wallRemaining : monoRemaining;
      return Math.max(0, Math.min(totalDurationMs, raw));
    };

    const triggerExpireIfNeeded = (rem: number) => {
      if (rem <= 0 && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        setRemainingMs(0);
        onExpireRef.current?.();
      }
    };

    const initialRem = getAuthoritativeRemainingMs();
    setRemainingMs(initialRem);
    if (initialRem <= 0) {
      triggerExpireIfNeeded(0);
      return;
    }

    let rafId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleBackupTimeout = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      const rem = getAuthoritativeRemainingMs();
      timeoutId = setTimeout(
        () => {
          const finalRem = getAuthoritativeRemainingMs();
          setRemainingMs(finalRem);
          triggerExpireIfNeeded(finalRem);
        },
        Math.max(0, Math.ceil(rem) + 5),
      );
    };

    const tick = () => {
      const rem = getAuthoritativeRemainingMs();
      setRemainingMs(rem);
      if (rem <= 0) {
        triggerExpireIfNeeded(0);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    const handleVisibilityOrFocus = () => {
      deadlineMono = performance.now() + Math.max(0, deadlineEpochMs - Date.now());
      const rem = getAuthoritativeRemainingMs();
      setRemainingMs(rem);
      if (rem <= 0) {
        triggerExpireIfNeeded(0);
      } else {
        scheduleBackupTimeout();
      }
    };

    rafId = requestAnimationFrame(tick);
    scheduleBackupTimeout();

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [active, deadlineEpochMs, totalDurationMs]);

  const safeTotal = Math.max(1, totalDurationMs);
  const progress = Math.max(0, Math.min(1, remainingMs / safeTotal));
  const isUrgent = active && remainingMs > 0 && remainingMs <= 5_000;

  return {
    remainingMs,
    progress,
    isUrgent,
  };
}
