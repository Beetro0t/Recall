import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoundConfig, ROUND_CONFIGS } from '../game/config';
import {
  challengeIdToUtcEpochMs,
  getEffectiveCurrentStreak,
  getUtcChallengeId,
} from '../game/dailyChallenge';
import { generateDailyChallenge } from '../game/puzzleGenerator';
import {
  advanceAfterRoundResult,
  createInitialSession,
  expireRecreationPhase,
  getRoundPuzzle,
  lockInRoundSolution,
  performTileSwap,
  reconcileSessionWithClock,
  startConcealingPhase,
  startRecreatingPhase,
  startRoundMemorisation,
} from '../game/stateMachine';
import type {
  DailyChallenge,
  GameSession,
  PlayerStats,
  RoundConfig,
  RoundPuzzle,
  RoundResult,
} from '../game/types';
import { playFeedback } from '../services/audio';
import {
  clearChallengeCompletionAndSession,
  loadOrInitializeSession,
  loadPlayerStats,
  recordDailyChallengeCompletion,
  saveGameSession,
} from '../services/storage';

export interface UseGameSessionOptions {
  soundEnabled: boolean;
  hasCompletedOnboarding: boolean;
  onCompleteOnboarding: () => void;
  overrideChallengeId?: string;
}

export interface UseGameSessionReturn {
  challenge: DailyChallenge;
  session: GameSession;
  stats: PlayerStats;
  effectiveStreak: number;
  currentRoundConfig: RoundConfig;
  currentRoundPuzzle: RoundPuzzle;
  latestRoundResult: RoundResult | null;
  selectedTileId: string | null;
  isTutorialOpen: boolean;
  isHomeOverlayOpen: boolean;
  isReviewOpen: boolean;
  announcement: string;
  startOrContinueChallenge: () => void;
  navigateHome: () => void;
  openReview: () => void;
  closeReview: () => void;
  openTutorial: () => void;
  closeTutorial: () => void;
  completeTutorialAndStart: () => void;
  handleMemorisationExpire: () => void;
  handleConcealComplete: () => void;
  handleRecreationExpire: () => void;
  handleTileActivate: (tileId: string) => void;
  handleDirectTileSwap: (tileIdA: string, tileIdB: string) => void;
  handleLockInSolution: () => void;
  handleContinueFromRoundEnd: () => void;
  handleBeginNextRound: () => void;
  /* Dev Mode helpers */
  devResetAndReplay: () => void;
  devNextDailyPuzzle: () => void;
  devJumpToRound: (roundId: number) => void;
  devSkipMemoriseTimer: () => void;
}

export function useGameSession({
  soundEnabled,
  hasCompletedOnboarding,
  onCompleteOnboarding,
  overrideChallengeId,
}: UseGameSessionOptions): UseGameSessionReturn {
  const [challengeId, setChallengeId] = useState<string>(
    () => overrideChallengeId ?? getUtcChallengeId(),
  );

  const challenge = useMemo(() => generateDailyChallenge(challengeId), [challengeId]);

  const [session, setSession] = useState<GameSession>(() =>
    loadOrInitializeSession(challenge, Date.now()),
  );

  const [stats, setStats] = useState<PlayerStats>(() => loadPlayerStats());
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isHomeOverlayOpen, setIsHomeOverlayOpen] = useState<boolean>(false);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  const persistAndUpdateSession = useCallback(
    (updater: (prev: GameSession) => GameSession) => {
      setSession((prev) => {
        const next = updater(prev);
        saveGameSession(next);
        if (next.phase === 'results' && next.results.length === ROUND_CONFIGS.length) {
          const updatedStats = recordDailyChallengeCompletion(
            challenge,
            next.results,
            Date.now(),
          );
          setStats(updatedStats);
        }
        return next;
      });
    },
    [challenge],
  );

  // Reconcile timers when browser tab returns from background
  useEffect(() => {
    const syncWithWallClock = () => {
      persistAndUpdateSession((prev) => {
        const next = reconcileSessionWithClock(prev, challenge, Date.now());
        if (next.phase !== prev.phase) {
          setSelectedTileId(null);
        }
        return next;
      });
    };

    document.addEventListener('visibilitychange', syncWithWallClock);
    window.addEventListener('focus', syncWithWallClock);
    return () => {
      document.removeEventListener('visibilitychange', syncWithWallClock);
      window.removeEventListener('focus', syncWithWallClock);
    };
  }, [challenge, persistAndUpdateSession]);

  const currentRoundConfig = useMemo(
    () => getRoundConfig(session.currentRoundId),
    [session.currentRoundId],
  );

  const currentRoundPuzzle = useMemo(
    () => getRoundPuzzle(challenge, session.currentRoundId),
    [challenge, session.currentRoundId],
  );

  const latestRoundResult = useMemo(
    () =>
      session.results.find((r) => r.roundId === session.currentRoundId) ??
      session.results[session.results.length - 1] ??
      null,
    [session.currentRoundId, session.results],
  );

  const effectiveStreak = useMemo(
    () =>
      getEffectiveCurrentStreak(
        stats.currentStreak,
        stats.lastCompletedDate,
        challenge.challengeId,
      ),
    [challenge.challengeId, stats.currentStreak, stats.lastCompletedDate],
  );

  const navigateHome = useCallback(() => {
    setSelectedTileId(null);
    setIsTutorialOpen(false);
    setIsReviewOpen(false);
    if (session.phase !== 'home' && session.phase !== 'ready') {
      setIsHomeOverlayOpen(true);
    }
  }, [session.phase]);

  const openReview = useCallback(() => {
    setIsHomeOverlayOpen(false);
    setIsTutorialOpen(false);
    setIsReviewOpen(true);
  }, []);

  const closeReview = useCallback(() => {
    setIsReviewOpen(false);
  }, []);

  const startOrContinueChallenge = useCallback(() => {
    setSelectedTileId(null);
    setIsHomeOverlayOpen(false);
    setIsReviewOpen(false);

    if (
      !hasCompletedOnboarding &&
      session.phase === 'home' &&
      session.results.length === 0
    ) {
      setIsTutorialOpen(true);
      return;
    }

    persistAndUpdateSession((prev) => {
      if (
        prev.phase === 'home' ||
        prev.phase === 'ready' ||
        prev.phase === 'intermission'
      ) {
        const next = startRoundMemorisation(prev, challenge, Date.now());
        setAnnouncement(
          `Round ${next.currentRoundId} started. Memorise ${getRoundConfig(next.currentRoundId).tileCount} tiles.`,
        );
        return next;
      }
      return reconcileSessionWithClock(prev, challenge, Date.now());
    });
  }, [
    challenge,
    hasCompletedOnboarding,
    persistAndUpdateSession,
    session.phase,
    session.results.length,
  ]);

  const openTutorial = useCallback(() => {
    setIsReviewOpen(false);
    setIsTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsTutorialOpen(false);
  }, []);

  const completeTutorialAndStart = useCallback(() => {
    onCompleteOnboarding();
    setIsTutorialOpen(false);
    setIsHomeOverlayOpen(false);
    setSelectedTileId(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase === 'home' || prev.phase === 'ready') {
        const next = startRoundMemorisation(prev, challenge, Date.now());
        setAnnouncement(
          `Round ${next.currentRoundId} started. Memorise ${getRoundConfig(next.currentRoundId).tileCount} tiles.`,
        );
        return next;
      }
      return prev;
    });
  }, [challenge, onCompleteOnboarding, persistAndUpdateSession]);

  const handleMemorisationExpire = useCallback(() => {
    setSelectedTileId(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase !== 'memorising') return prev;
      return startConcealingPhase(prev, Date.now());
    });
  }, [persistAndUpdateSession]);

  const handleConcealComplete = useCallback(() => {
    setSelectedTileId(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase !== 'concealing' && prev.phase !== 'memorising') {
        return prev;
      }
      const next = startRecreatingPhase(prev, challenge, Date.now());
      setAnnouncement(
        `Tiles shuffled. Recreate the arrangement and lock in your solution. ${getRoundConfig(next.currentRoundId).solveMs / 1000} seconds remaining.`,
      );
      return next;
    });
  }, [challenge, persistAndUpdateSession]);

  const handleRecreationExpire = useCallback(() => {
    setSelectedTileId(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase !== 'recreating') return prev;
      playFeedback('failure', soundEnabled);
      setAnnouncement(`Time is up for Round ${prev.currentRoundId}.`);
      return expireRecreationPhase(prev, challenge);
    });
  }, [challenge, persistAndUpdateSession, soundEnabled]);

  const handleDirectTileSwap = useCallback(
    (tileIdA: string, tileIdB: string) => {
      if (
        session.phase !== 'recreating' ||
        !tileIdA ||
        !tileIdB ||
        tileIdA === tileIdB
      ) {
        return;
      }

      const now = Date.now();
      if (
        session.phaseDeadlineEpochMs !== null &&
        now >= session.phaseDeadlineEpochMs
      ) {
        handleRecreationExpire();
        return;
      }

      setSelectedTileId(null);

      persistAndUpdateSession((prev) => {
        const next = performTileSwap(prev, challenge, tileIdA, tileIdB, now);
        if (next.phase === 'round-failure') {
          playFeedback('failure', soundEnabled);
          setAnnouncement(`Time is up for Round ${prev.currentRoundId}.`);
        } else if (next.swapCount > prev.swapCount) {
          playFeedback('swap', soundEnabled);
          const tileA = currentRoundPuzzle.tiles[tileIdA];
          const tileB = currentRoundPuzzle.tiles[tileIdB];
          if (tileA && tileB) {
            setAnnouncement(
              `Swapped ${tileA.colorName} with ${tileB.colorName}. ${next.swapCount} swaps used.`,
            );
          }
        }
        return next;
      });
    },
    [
      challenge,
      currentRoundPuzzle.tiles,
      handleRecreationExpire,
      persistAndUpdateSession,
      session.phase,
      session.phaseDeadlineEpochMs,
      soundEnabled,
    ],
  );

  const handleTileActivate = useCallback(
    (tileId: string) => {
      if (session.phase !== 'recreating') {
        return;
      }

      const now = Date.now();
      if (
        session.phaseDeadlineEpochMs !== null &&
        now >= session.phaseDeadlineEpochMs
      ) {
        handleRecreationExpire();
        return;
      }

      if (selectedTileId === null) {
        setSelectedTileId(tileId);
        playFeedback('select', soundEnabled);
        const tile = currentRoundPuzzle.tiles[tileId];
        const pos = session.currentTileOrder.indexOf(tileId) + 1;
        if (tile) {
          setAnnouncement(`Selected ${tile.colorName} tile at position ${pos}.`);
        }
        return;
      }

      if (selectedTileId === tileId) {
        setSelectedTileId(null);
        playFeedback('select', soundEnabled);
        const tile = currentRoundPuzzle.tiles[tileId];
        if (tile) {
          setAnnouncement(`Deselected ${tile.colorName} tile.`);
        }
        return;
      }

      handleDirectTileSwap(selectedTileId, tileId);
    },
    [
      currentRoundPuzzle.tiles,
      handleDirectTileSwap,
      handleRecreationExpire,
      selectedTileId,
      session.currentTileOrder,
      session.phase,
      session.phaseDeadlineEpochMs,
      soundEnabled,
    ],
  );

  const handleLockInSolution = useCallback(() => {
    if (session.phase !== 'recreating') {
      return;
    }

    const now = Date.now();
    setSelectedTileId(null);

    persistAndUpdateSession((prev) => {
      const next = lockInRoundSolution(prev, challenge, now);
      if (next.phase === 'round-success') {
        const isAllRoundsPerfect =
          next.results.length === ROUND_CONFIGS.length &&
          next.results.every((r) => r.status === 'success');
        playFeedback(isAllRoundsPerfect ? 'celebration' : 'success', soundEnabled);
        const roundRes = next.results.find((r) => r.roundId === prev.currentRoundId);
        setAnnouncement(
          `Pattern restored! Round ${prev.currentRoundId} complete with ${roundRes?.score ?? 0} points.`,
        );
      } else if (next.phase === 'round-failure') {
        playFeedback('failure', soundEnabled);
        const roundRes = next.results.find((r) => r.roundId === prev.currentRoundId);
        setAnnouncement(
          roundRes?.failureReason === 'mismatch'
            ? `Pattern mismatch on Round ${prev.currentRoundId}. ${roundRes.matchedTiles ?? 0} of ${roundRes.totalTiles ?? 0} tiles matched.`
            : `Time is up for Round ${prev.currentRoundId}.`,
        );
      }
      return next;
    });
  }, [challenge, persistAndUpdateSession, session.phase, soundEnabled]);

  const handleContinueFromRoundEnd = useCallback(() => {
    setSelectedTileId(null);
    persistAndUpdateSession((prev) => {
      const next = advanceAfterRoundResult(prev, challenge, Date.now());
      if (next.phase === 'results') {
        const isAllRoundsPerfect =
          next.results.length === ROUND_CONFIGS.length &&
          next.results.every((r) => r.status === 'success');
        if (isAllRoundsPerfect) {
          playFeedback('celebration', soundEnabled);
        }
        setAnnouncement('Daily challenge complete. Viewing final results.');
      } else if (next.phase === 'memorising') {
        setAnnouncement(
          `Round ${next.currentRoundId} started. Memorise ${getRoundConfig(next.currentRoundId).tileCount} tiles.`,
        );
      }
      return next;
    });
  }, [challenge, persistAndUpdateSession, soundEnabled]);

  const handleBeginNextRound = useCallback(() => {
    setSelectedTileId(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase !== 'intermission') return prev;
      const next = startRoundMemorisation(prev, challenge, Date.now());
      setAnnouncement(
        `Round ${next.currentRoundId} started. Memorise ${getRoundConfig(next.currentRoundId).tileCount} tiles.`,
      );
      return next;
    });
  }, [challenge, persistAndUpdateSession]);

  /* ============================================================================
   * Dev Mode Testing Controls
   * ============================================================================ */

  const devResetAndReplay = useCallback(() => {
    setSelectedTileId(null);
    setIsReviewOpen(false);
    setIsTutorialOpen(false);
    setIsHomeOverlayOpen(false);
    const { session: freshSession, stats: updatedStats } =
      clearChallengeCompletionAndSession(challenge);
    setStats(updatedStats);
    const started = startRoundMemorisation(freshSession, challenge, Date.now());
    saveGameSession(started);
    setSession(started);
    setAnnouncement('Dev Mode: Reset daily challenge and restarted Round 1.');
  }, [challenge]);

  const devNextDailyPuzzle = useCallback(() => {
    setSelectedTileId(null);
    setIsReviewOpen(false);
    setIsTutorialOpen(false);
    setIsHomeOverlayOpen(false);

    const nextDayEpochMs = challengeIdToUtcEpochMs(challengeId) + 86_400_000;
    const nextDateStr = getUtcChallengeId(nextDayEpochMs);
    const nextChallenge = generateDailyChallenge(nextDateStr);
    const { session: freshSession, stats: updatedStats } =
      clearChallengeCompletionAndSession(nextChallenge);

    setChallengeId(nextDateStr);
    setStats(updatedStats);
    const started = startRoundMemorisation(freshSession, nextChallenge, Date.now());
    saveGameSession(started);
    setSession(started);
    setAnnouncement(`Dev Mode: Loaded next daily puzzle (${nextDateStr}).`);
  }, [challengeId]);

  const devJumpToRound = useCallback(
    (roundId: number) => {
      if (!ROUND_CONFIGS.some((r) => r.roundId === roundId)) return;
      setSelectedTileId(null);
      setIsReviewOpen(false);
      setIsTutorialOpen(false);
      setIsHomeOverlayOpen(false);

      const { stats: updatedStats } = clearChallengeCompletionAndSession(challenge);
      setStats(updatedStats);

      const base = createInitialSession(challenge);
      const customSession: GameSession = {
        ...base,
        currentRoundId: roundId,
        results: session.results.filter((r) => r.roundId < roundId),
      };
      const started = startRoundMemorisation(customSession, challenge, Date.now());
      saveGameSession(started);
      setSession(started);
      setAnnouncement(`Dev Mode: Jumped to Round ${roundId}.`);
    },
    [challenge, session.results],
  );

  const devSkipMemoriseTimer = useCallback(() => {
    setSelectedTileId(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase === 'memorising' || prev.phase === 'concealing') {
        return startRecreatingPhase(prev, challenge, Date.now());
      }
      return prev;
    });
  }, [challenge, persistAndUpdateSession]);

  return {
    challenge,
    session,
    stats,
    effectiveStreak,
    currentRoundConfig,
    currentRoundPuzzle,
    latestRoundResult,
    selectedTileId,
    isTutorialOpen,
    isHomeOverlayOpen,
    isReviewOpen,
    announcement,
    startOrContinueChallenge,
    navigateHome,
    openReview,
    closeReview,
    openTutorial,
    closeTutorial,
    completeTutorialAndStart,
    handleMemorisationExpire,
    handleConcealComplete,
    handleRecreationExpire,
    handleTileActivate,
    handleDirectTileSwap,
    handleLockInSolution,
    handleContinueFromRoundEnd,
    handleBeginNextRound,
    devResetAndReplay,
    devNextDailyPuzzle,
    devJumpToRound,
    devSkipMemoriseTimer,
  };
}
