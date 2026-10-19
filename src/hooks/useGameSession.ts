import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoundConfig, PUZZLE_VERSION, ROUND_CONFIGS } from '../game/config';
import {
  challengeIdToUtcEpochMs,
  getEffectiveCurrentStreak,
  getUtcChallengeId,
  isValidChallengeId,
} from '../game/dailyChallenge';
import { generateDailyChallenge } from '../game/puzzleGenerator';
import {
  advanceAfterRoundResult,
  createInitialSession,
  expireRecreationPhase,
  getRoundPuzzle,
  lockInRoundSolution,
  performClearBoardToSlider,
  performTilePlacement,
  performTileRemoveFromBoard,
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
  recordDailyPlayerChoices,
  recordRoundPlayerChoices,
} from '../services/communityStats';
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
  customSeed: string | null;
  session: GameSession;
  stats: PlayerStats;
  effectiveStreak: number;
  currentRoundConfig: RoundConfig;
  currentRoundPuzzle: RoundPuzzle;
  latestRoundResult: RoundResult | null;
  selectedTileId: string | null;
  selectedSlotIndex: number | null;
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
  handleSelectSliderTile: (tileId: string) => void;
  handleBoardSlotActivate: (slotIndex: number, tileId: string | null) => void;
  handlePlaceTileInSlot: (tileId: string, slotIndex: number) => void;
  handleRemoveTileFromBoard: (slotIndex: number) => void;
  handleClearBoard: () => void;
  handleLockInSolution: () => void;
  handleContinueFromRoundEnd: () => void;
  handleBeginNextRound: () => void;
  /* Authenticated Admin-Only Controls */
  adminResetAndReplay: () => void;
  adminStepDailyDate: (deltaDays: number) => void;
  adminSetChallengeDate: (dateStr: string) => boolean;
  adminSetCustomSeed: (seedStr: string | null) => void;
  adminJumpToRound: (roundId: number) => void;
  adminSkipMemoriseTimer: () => void;
  adminAutoFillCurrentBoard: () => void;
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
  const [customSeed, setCustomSeed] = useState<string | null>(null);

  const effectivePuzzleVersion = customSeed
    ? `${PUZZLE_VERSION}|custom:${customSeed}`
    : PUZZLE_VERSION;

  const challenge = useMemo(
    () => generateDailyChallenge(challengeId, effectivePuzzleVersion),
    [challengeId, effectivePuzzleVersion],
  );

  const [session, setSession] = useState<GameSession>(() =>
    loadOrInitializeSession(challenge, Date.now()),
  );

  const [stats, setStats] = useState<PlayerStats>(() => loadPlayerStats());
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isHomeOverlayOpen, setIsHomeOverlayOpen] = useState<boolean>(false);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');

  const persistAndUpdateSession = useCallback(
    (updater: (prev: GameSession) => GameSession) => {
      setSession((prev) => {
        const next = updater(prev);
        saveGameSession(next);

        if (next.results.length > prev.results.length) {
          const newestResult = next.results[next.results.length - 1];
          if (newestResult) {
            recordRoundPlayerChoices(challenge.challengeId, newestResult, Date.now());
          }
        }

        if (next.phase === 'results' && next.results.length === ROUND_CONFIGS.length) {
          recordDailyPlayerChoices(challenge.challengeId, next.results);
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
          setSelectedSlotIndex(null);
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
    setSelectedSlotIndex(null);
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
    setSelectedSlotIndex(null);
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
    setSelectedSlotIndex(null);
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
    setSelectedSlotIndex(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase !== 'memorising') return prev;
      return startConcealingPhase(prev, Date.now());
    });
  }, [persistAndUpdateSession]);

  const handleConcealComplete = useCallback(() => {
    setSelectedTileId(null);
    setSelectedSlotIndex(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase !== 'concealing' && prev.phase !== 'memorising') {
        return prev;
      }
      const next = startRecreatingPhase(prev, challenge, Date.now());
      setAnnouncement(
        `Colours moved to the slider bar. Place all colours into the empty squares and lock in your solution.`,
      );
      return next;
    });
  }, [challenge, persistAndUpdateSession]);

  const handleRecreationExpire = useCallback(() => {
    setSelectedTileId(null);
    setSelectedSlotIndex(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase !== 'recreating') return prev;
      playFeedback('failure', soundEnabled);
      setAnnouncement(`Time is up for Round ${prev.currentRoundId}.`);
      return expireRecreationPhase(prev, challenge);
    });
  }, [challenge, persistAndUpdateSession, soundEnabled]);

  const handlePlaceTileInSlot = useCallback(
    (tileId: string, slotIndex: number) => {
      if (session.phase !== 'recreating' || !tileId) {
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
      setSelectedSlotIndex(null);

      persistAndUpdateSession((prev) => {
        const next = performTilePlacement(prev, challenge, tileId, slotIndex, now);
        if (next.phase === 'round-failure') {
          playFeedback('failure', soundEnabled);
          setAnnouncement(`Time is up for Round ${prev.currentRoundId}.`);
        } else if (next.swapCount > prev.swapCount) {
          playFeedback('swap', soundEnabled);
          const tile = currentRoundPuzzle.tiles[tileId];
          if (tile) {
            setAnnouncement(`Placed ${tile.colorName} in square ${slotIndex + 1}.`);
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

  const handleRemoveTileFromBoard = useCallback(
    (slotIndex: number) => {
      if (session.phase !== 'recreating') {
        return;
      }

      const now = Date.now();
      setSelectedTileId(null);
      setSelectedSlotIndex(null);

      persistAndUpdateSession((prev) => {
        const removedTileId = prev.currentTileOrder[slotIndex];
        const next = performTileRemoveFromBoard(prev, challenge, slotIndex, now);
        if (next !== prev) {
          playFeedback('select', soundEnabled);
          const tile = removedTileId ? currentRoundPuzzle.tiles[removedTileId] : null;
          if (tile) {
            setAnnouncement(`Returned ${tile.colorName} to the colour slider bar.`);
          }
        }
        return next;
      });
    },
    [
      challenge,
      currentRoundPuzzle.tiles,
      persistAndUpdateSession,
      session.phase,
      soundEnabled,
    ],
  );

  const handleClearBoard = useCallback(() => {
    if (session.phase !== 'recreating') return;
    setSelectedTileId(null);
    setSelectedSlotIndex(null);
    playFeedback('select', soundEnabled);
    persistAndUpdateSession((prev) =>
      performClearBoardToSlider(prev, challenge, Date.now()),
    );
    setAnnouncement('Returned all colours to the slider bar.');
  }, [challenge, persistAndUpdateSession, session.phase, soundEnabled]);

  const handleSelectSliderTile = useCallback(
    (tileId: string) => {
      if (session.phase !== 'recreating' || !tileId) return;

      const now = Date.now();
      if (
        session.phaseDeadlineEpochMs !== null &&
        now >= session.phaseDeadlineEpochMs
      ) {
        handleRecreationExpire();
        return;
      }

      if (selectedSlotIndex !== null) {
        handlePlaceTileInSlot(tileId, selectedSlotIndex);
        return;
      }

      if (selectedTileId === tileId) {
        setSelectedTileId(null);
        playFeedback('select', soundEnabled);
        return;
      }

      setSelectedTileId(tileId);
      playFeedback('select', soundEnabled);
      const tile = currentRoundPuzzle.tiles[tileId];
      if (tile) {
        setAnnouncement(
          `Selected ${tile.colorName} from slider bar. Tap a board square to place it.`,
        );
      }
    },
    [
      currentRoundPuzzle.tiles,
      handlePlaceTileInSlot,
      handleRecreationExpire,
      selectedSlotIndex,
      selectedTileId,
      session.phase,
      session.phaseDeadlineEpochMs,
      soundEnabled,
    ],
  );

  const handleBoardSlotActivate = useCallback(
    (slotIndex: number, occupantTileId: string | null) => {
      if (session.phase !== 'recreating') return;

      const now = Date.now();
      if (
        session.phaseDeadlineEpochMs !== null &&
        now >= session.phaseDeadlineEpochMs
      ) {
        handleRecreationExpire();
        return;
      }

      if (selectedTileId !== null) {
        if (occupantTileId === selectedTileId) {
          setSelectedTileId(null);
          playFeedback('select', soundEnabled);
          return;
        }
        handlePlaceTileInSlot(selectedTileId, slotIndex);
        return;
      }

      if (occupantTileId) {
        setSelectedSlotIndex(null);
        setSelectedTileId(occupantTileId);
        playFeedback('select', soundEnabled);
        const tile = currentRoundPuzzle.tiles[occupantTileId];
        if (tile) {
          setAnnouncement(`Selected ${tile.colorName} at square ${slotIndex + 1}.`);
        }
      } else {
        if (selectedSlotIndex === slotIndex) {
          setSelectedSlotIndex(null);
          playFeedback('select', soundEnabled);
        } else {
          setSelectedSlotIndex(slotIndex);
          playFeedback('select', soundEnabled);
          setAnnouncement(
            `Targeted empty square ${slotIndex + 1}. Tap a colour on the slider bar to place it here.`,
          );
        }
      }
    },
    [
      currentRoundPuzzle.tiles,
      handlePlaceTileInSlot,
      handleRecreationExpire,
      selectedSlotIndex,
      selectedTileId,
      session.phase,
      session.phaseDeadlineEpochMs,
      soundEnabled,
    ],
  );

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
      setSelectedSlotIndex(null);

      persistAndUpdateSession((prev) => {
        const next = performTileSwap(prev, challenge, tileIdA, tileIdB, now);
        if (next.phase === 'round-failure') {
          playFeedback('failure', soundEnabled);
          setAnnouncement(`Time is up for Round ${prev.currentRoundId}.`);
        } else if (next.swapCount > prev.swapCount) {
          playFeedback('swap', soundEnabled);
        }
        return next;
      });
    },
    [
      challenge,
      handleRecreationExpire,
      persistAndUpdateSession,
      session.phase,
      session.phaseDeadlineEpochMs,
      soundEnabled,
    ],
  );

  const handleTileActivate = useCallback(
    (tileId: string) => {
      const slotIdx = session.currentTileOrder.indexOf(tileId);
      if (slotIdx !== -1) {
        handleBoardSlotActivate(slotIdx, tileId);
      } else {
        handleSelectSliderTile(tileId);
      }
    },
    [handleBoardSlotActivate, handleSelectSliderTile, session.currentTileOrder],
  );

  const handleLockInSolution = useCallback(() => {
    if (session.phase !== 'recreating') {
      return;
    }

    const now = Date.now();
    setSelectedTileId(null);
    setSelectedSlotIndex(null);

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
    setSelectedSlotIndex(null);
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
    setSelectedSlotIndex(null);
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
   * Authenticated Admin-Only Controls (hidden behind #admin login gate)
   * ============================================================================ */

  const adminResetAndReplay = useCallback(() => {
    setSelectedTileId(null);
    setSelectedSlotIndex(null);
    setIsReviewOpen(false);
    setIsTutorialOpen(false);
    setIsHomeOverlayOpen(false);
    const { session: freshSession, stats: updatedStats } =
      clearChallengeCompletionAndSession(challenge);
    setStats(updatedStats);
    const started = startRoundMemorisation(freshSession, challenge, Date.now());
    saveGameSession(started);
    setSession(started);
  }, [challenge]);

  const adminStepDailyDate = useCallback(
    (deltaDays: number) => {
      setSelectedTileId(null);
      setSelectedSlotIndex(null);
      setIsReviewOpen(false);
      setIsTutorialOpen(false);
      setIsHomeOverlayOpen(false);

      const targetEpochMs =
        challengeIdToUtcEpochMs(challengeId) + deltaDays * 86_400_000;
      const nextDateStr = getUtcChallengeId(targetEpochMs);
      const nextChallenge = generateDailyChallenge(nextDateStr, effectivePuzzleVersion);
      const { session: freshSession, stats: updatedStats } =
        clearChallengeCompletionAndSession(nextChallenge);

      setChallengeId(nextDateStr);
      setStats(updatedStats);
      const started = startRoundMemorisation(freshSession, nextChallenge, Date.now());
      saveGameSession(started);
      setSession(started);
    },
    [challengeId, effectivePuzzleVersion],
  );

  const adminSetChallengeDate = useCallback(
    (dateStr: string): boolean => {
      const trimmed = dateStr.trim();
      if (!isValidChallengeId(trimmed)) {
        return false;
      }
      setSelectedTileId(null);
      setSelectedSlotIndex(null);
      setIsReviewOpen(false);
      setIsTutorialOpen(false);
      setIsHomeOverlayOpen(false);

      const nextChallenge = generateDailyChallenge(trimmed, effectivePuzzleVersion);
      const { session: freshSession, stats: updatedStats } =
        clearChallengeCompletionAndSession(nextChallenge);

      setChallengeId(trimmed);
      setStats(updatedStats);
      const started = startRoundMemorisation(freshSession, nextChallenge, Date.now());
      saveGameSession(started);
      setSession(started);
      return true;
    },
    [effectivePuzzleVersion],
  );

  const adminSetCustomSeed = useCallback(
    (seedStr: string | null) => {
      const normalized = seedStr && seedStr.trim().length > 0 ? seedStr.trim() : null;
      setSelectedTileId(null);
      setSelectedSlotIndex(null);
      setIsReviewOpen(false);
      setIsTutorialOpen(false);
      setIsHomeOverlayOpen(false);

      const nextPuzzleVer = normalized
        ? `${PUZZLE_VERSION}|custom:${normalized}`
        : PUZZLE_VERSION;
      const nextChallenge = generateDailyChallenge(challengeId, nextPuzzleVer);
      const { session: freshSession, stats: updatedStats } =
        clearChallengeCompletionAndSession(nextChallenge);

      setCustomSeed(normalized);
      setStats(updatedStats);
      const started = startRoundMemorisation(freshSession, nextChallenge, Date.now());
      saveGameSession(started);
      setSession(started);
    },
    [challengeId],
  );

  const adminJumpToRound = useCallback(
    (roundId: number) => {
      if (!ROUND_CONFIGS.some((r) => r.roundId === roundId)) return;
      setSelectedTileId(null);
      setSelectedSlotIndex(null);
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
    },
    [challenge, session.results],
  );

  const adminSkipMemoriseTimer = useCallback(() => {
    setSelectedTileId(null);
    setSelectedSlotIndex(null);
    persistAndUpdateSession((prev) => {
      if (prev.phase === 'memorising' || prev.phase === 'concealing') {
        return startRecreatingPhase(prev, challenge, Date.now());
      }
      return prev;
    });
  }, [challenge, persistAndUpdateSession]);

  const adminAutoFillCurrentBoard = useCallback(() => {
    setSelectedTileId(null);
    setSelectedSlotIndex(null);
    persistAndUpdateSession((prev) => {
      const roundPuzzle = getRoundPuzzle(challenge, prev.currentRoundId);
      const ready =
        prev.phase === 'memorising' || prev.phase === 'concealing'
          ? startRecreatingPhase(prev, challenge, Date.now())
          : prev;
      if (ready.phase !== 'recreating') return ready;
      return {
        ...ready,
        currentTileOrder: [...roundPuzzle.targetOrder],
        swapCount: roundPuzzle.optimalSwaps,
      };
    });
  }, [challenge, persistAndUpdateSession]);

  return {
    challenge,
    customSeed,
    session,
    stats,
    effectiveStreak,
    currentRoundConfig,
    currentRoundPuzzle,
    latestRoundResult,
    selectedTileId,
    selectedSlotIndex,
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
    handleSelectSliderTile,
    handleBoardSlotActivate,
    handlePlaceTileInSlot,
    handleRemoveTileFromBoard,
    handleClearBoard,
    handleLockInSolution,
    handleContinueFromRoundEnd,
    handleBeginNextRound,
    adminResetAndReplay,
    adminStepDailyDate,
    adminSetChallengeDate,
    adminSetCustomSeed,
    adminJumpToRound,
    adminSkipMemoriseTimer,
    adminAutoFillCurrentBoard,
  };
}
