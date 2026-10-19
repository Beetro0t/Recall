import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoundConfig, ROUND_CONFIGS } from '../game/config';
import { getEffectiveCurrentStreak, getUtcChallengeId } from '../game/dailyChallenge';
import { generateDailyChallenge } from '../game/puzzleGenerator';
import {
  advanceAfterRoundResult,
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
}

export function useGameSession({
  soundEnabled,
  hasCompletedOnboarding,
  onCompleteOnboarding,
  overrideChallengeId,
}: UseGameSessionOptions): UseGameSessionReturn {
  const challengeId = useMemo(
    () => overrideChallengeId ?? getUtcChallengeId(),
    [overrideChallengeId],
  );

  const challenge = useMemo(() => generateDailyChallenge(challengeId), [challengeId]);

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

        // If a new round result was just recorded, log the player's choices
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

      // If an empty board square was already targeted first, place this slider colour straight into it!
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

      // If a tile (from the slider bar or another board square) is currently selected:
      if (selectedTileId !== null) {
        // Clicking the same placed board tile again deselects it
        if (occupantTileId === selectedTileId) {
          setSelectedTileId(null);
          playFeedback('select', soundEnabled);
          return;
        }
        // Place/swap the selected tile into this board square!
        handlePlaceTileInSlot(selectedTileId, slotIndex);
        return;
      }

      // No tile is currently selected:
      if (occupantTileId) {
        // Select the placed tile on the board so the player can move or swap it
        setSelectedSlotIndex(null);
        setSelectedTileId(occupantTileId);
        playFeedback('select', soundEnabled);
        const tile = currentRoundPuzzle.tiles[occupantTileId];
        if (tile) {
          setAnnouncement(`Selected ${tile.colorName} at square ${slotIndex + 1}.`);
        }
      } else {
        // Empty square tapped when no tile is selected: highlight this square as target!
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

  return {
    challenge,
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
  };
}
