import { describe, expect, it } from 'vitest';
import {
  countMatchedTiles,
  countPlacedTiles,
  createEmptyBoardOrder,
  getAvailableSliderTiles,
  isBoardSolved,
  placeTileInBoardSlot,
  removeTileFromBoardSlot,
  swapTilesById,
  swapTilesByIndex,
} from '../../game/board';
import { ROUND_CONFIGS, TILE_PALETTE } from '../../game/config';
import {
  calculateUpdatedStreak,
  getEffectiveCurrentStreak,
  getUtcChallengeId,
  isValidChallengeId,
} from '../../game/dailyChallenge';
import {
  calculateMinimumSwaps,
  validatePuzzlePermutation,
} from '../../game/permutation';
import { buildRoundSeed, generateDailyChallenge } from '../../game/puzzleGenerator';
import { calculateDailyTotalScore, calculateRoundScore } from '../../game/scoring';
import {
  advanceAfterRoundResult,
  createInitialSession,
  lockInRoundSolution,
  performClearBoardToSlider,
  performTilePlacement,
  performTileRemoveFromBoard,
  performTileSwap,
  reconcileSessionWithClock,
  startConcealingPhase,
  startRecreatingPhase,
  startRoundMemorisation,
} from '../../game/stateMachine';
import { formatShareableResults } from '../../services/sharing';
import {
  loadOrInitializeSession,
  recordDailyChallengeCompletion,
  STORAGE_KEYS,
  validateStoredSession,
} from '../../services/storage';

describe('Puzzle Generation, Spatial Patterns & Permutation Math', () => {
  it('reproduces identical daily challenges for the same UTC date and puzzle version', () => {
    const c1 = generateDailyChallenge('2026-10-19', 'puzzle-v2');
    const c2 = generateDailyChallenge('2026-10-19', 'puzzle-v2');

    expect(c1).toEqual(c2);
    expect(c1.rounds).toHaveLength(3);
    expect(TILE_PALETTE.length).toBeGreaterThanOrEqual(16);
    expect(buildRoundSeed('2026-10-19', 2, 'puzzle-v2')).toBe(
      'recall|2026-10-19|puzzle-v2|round-2',
    );
  });

  it('produces distinct puzzles and spatial patterns across different dates', () => {
    const dayA = generateDailyChallenge('2026-10-19', 'puzzle-v2');
    const dayB = generateDailyChallenge('2026-10-20', 'puzzle-v2');

    expect(dayA.rounds[2].targetOrder).not.toEqual(dayB.rounds[2].targetOrder);
  });

  it('satisfies tile count, spatial pattern geometry, derangement, and swap difficulty across 30 consecutive days', () => {
    const seenPatterns = new Set<string>();

    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-10-${String(day).padStart(2, '0')}`;
      const challenge = generateDailyChallenge(dateStr);

      for (const config of ROUND_CONFIGS) {
        const round = challenge.rounds.find((r) => r.roundId === config.roundId)!;
        expect(round.targetOrder).toHaveLength(config.tileCount);
        expect(round.shuffledOrder).toHaveLength(config.tileCount);
        expect(round.pattern.cells).toHaveLength(config.tileCount);
        seenPatterns.add(round.pattern.patternId);

        const validation = validatePuzzlePermutation(
          round.shuffledOrder,
          round.targetOrder,
          config.minRequiredSwaps,
          config.maxRequiredSwaps,
        );
        expect(validation.valid).toBe(true);

        // Verify complete derangement: no tile starts in its solved position
        const anyFixedPoint = round.shuffledOrder.some(
          (id, idx) => id === round.targetOrder[idx],
        );
        expect(anyFixedPoint).toBe(false);
      }
    }

    // Multiple spatial patterns (Diamond, Snake, Hollow Box, Line, Arch, etc.) are used across days
    expect(seenPatterns.size).toBeGreaterThan(6);
  });

  it('calculates minimum swaps accurately using cycle decomposition', () => {
    const target = ['a', 'b', 'c', 'd'];
    expect(calculateMinimumSwaps(['a', 'b', 'c', 'd'], target)).toBe(0);
    expect(calculateMinimumSwaps(['b', 'a', 'c', 'd'], target)).toBe(1);
    expect(calculateMinimumSwaps(['b', 'a', 'd', 'c'], target)).toBe(2);
    expect(calculateMinimumSwaps(['b', 'c', 'd', 'a'], target)).toBe(3);
  });
});

describe('Board & Slider Operations', () => {
  it('creates empty boards, places tiles from the slider bar, and removes tiles back to the slider', () => {
    const sliderIds = ['t1', 't2', 't3', 't4'];
    const empty = createEmptyBoardOrder(4);
    expect(empty).toEqual(['', '', '', '']);
    expect(countPlacedTiles(empty)).toBe(0);
    expect(getAvailableSliderTiles(sliderIds, empty)).toEqual(sliderIds);

    const step1 = placeTileInBoardSlot(empty, 't2', 1);
    expect(step1.swapped).toBe(true);
    expect(step1.nextOrder).toEqual(['', 't2', '', '']);
    expect(countPlacedTiles(step1.nextOrder)).toBe(1);
    expect(getAvailableSliderTiles(sliderIds, step1.nextOrder)).toEqual([
      't1',
      't3',
      't4',
    ]);

    // Moving an already placed tile to another empty slot
    const step2 = placeTileInBoardSlot(step1.nextOrder, 't2', 3);
    expect(step2.swapped).toBe(true);
    expect(step2.nextOrder).toEqual(['', '', '', 't2']);

    // Removing a placed tile back to the slider bar
    const step3 = removeTileFromBoardSlot(step2.nextOrder, 3);
    expect(step3.swapped).toBe(true);
    expect(step3.nextOrder).toEqual(['', '', '', '']);
  });

  it('swaps two distinct valid tiles and rejects self-swaps or invalid indices', () => {
    const board = ['t1', 't2', 't3', 't4'];

    const validSwap = swapTilesByIndex(board, 0, 2);
    expect(validSwap.swapped).toBe(true);
    expect(validSwap.nextOrder).toEqual(['t3', 't2', 't1', 't4']);

    const sameSwap = swapTilesById(board, 't2', 't2');
    expect(sameSwap.swapped).toBe(false);
    expect(sameSwap.nextOrder).toEqual(board);

    const outOfBounds = swapTilesByIndex(board, -1, 2);
    expect(outOfBounds.swapped).toBe(false);

    const unknownId = swapTilesById(board, 't1', 'nonexistent');
    expect(unknownId.swapped).toBe(false);
  });

  it('detects solved boards and counts matched tiles while ignoring empty slots', () => {
    expect(isBoardSolved(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'])).toBe(true);
    expect(isBoardSolved(['a', 'b', 'd', 'c'], ['a', 'b', 'c', 'd'])).toBe(false);
    expect(countMatchedTiles(['a', 'b', 'd', 'c'], ['a', 'b', 'c', 'd'])).toBe(2);
    expect(countMatchedTiles(['a', '', '', 'd'], ['a', 'b', 'c', 'd'])).toBe(2);
  });
});

describe('Accuracy-Based Scoring System', () => {
  it('awards points strictly by how many tiles were placed in the correct position (25 pts/tile)', () => {
    // Round 2: 4 out of 6 tiles right -> 100 pts regardless of swap count
    const scoreR2Partial = calculateRoundScore({
      roundId: 2,
      matchedTiles: 4,
      actualSwaps: 12,
      optimalSwaps: 4,
    });
    expect(scoreR2Partial).toBe(100);

    // Round 3: 8 out of 8 tiles right -> 200 pts
    const scoreR3Full = calculateRoundScore({
      roundId: 3,
      matchedTiles: 8,
      actualSwaps: 9,
      optimalSwaps: 5,
    });
    expect(scoreR3Full).toBe(200);
  });

  it('computes the maximum daily score of 450 points (18 tiles × 25 pts)', () => {
    const r1 = calculateRoundScore({ roundId: 1, matchedTiles: 4 });
    const r2 = calculateRoundScore({ roundId: 2, matchedTiles: 6 });
    const r3 = calculateRoundScore({ roundId: 3, matchedTiles: 8 });
    expect(r1 + r2 + r3).toBe(450);
  });

  it('awards 0 when 0 tiles match and rejects invalid matchedTiles or negative swap counts', () => {
    expect(calculateRoundScore({ roundId: 1, matchedTiles: 0 })).toBe(0);

    expect(() =>
      calculateRoundScore({
        roundId: 1,
        matchedTiles: 5, // exceeds Round 1 tileCount of 4
      }),
    ).toThrow();

    expect(() =>
      calculateRoundScore({
        roundId: 1,
        matchedTiles: 2,
        actualSwaps: -1,
      }),
    ).toThrow();
  });
});

describe('UTC Dates, Streaks & Share Formatting', () => {
  it('identifies UTC challenge dates consistently regardless of local offset', () => {
    const epoch = Date.UTC(2026, 9, 19, 23, 59, 59);
    expect(getUtcChallengeId(epoch)).toBe('2026-10-19');
    expect(getUtcChallengeId(epoch + 2000)).toBe('2026-10-20');
    expect(isValidChallengeId('2026-02-30')).toBe(false);
  });

  it('increments streak on consecutive UTC days and resets after a missed day', () => {
    const day1 = calculateUpdatedStreak(0, 0, null, '2026-10-18');
    expect(day1.currentStreak).toBe(1);
    expect(day1.bestStreak).toBe(1);

    const day2 = calculateUpdatedStreak(
      day1.currentStreak,
      day1.bestStreak,
      day1.lastCompletedDate,
      '2026-10-19',
    );
    expect(day2.currentStreak).toBe(2);
    expect(day2.bestStreak).toBe(2);

    const day4 = calculateUpdatedStreak(
      day2.currentStreak,
      day2.bestStreak,
      day2.lastCompletedDate,
      '2026-10-21',
    );
    expect(day4.currentStreak).toBe(1);
    expect(day4.bestStreak).toBe(2);

    expect(getEffectiveCurrentStreak(2, '2026-10-19', '2026-10-22')).toBe(0);
  });

  it('formats spoiler-free share output accurately', () => {
    const share = formatShareableResults({
      challengeId: '2026-10-19',
      challengeNumber: 292,
      streak: 3,
      results: [
        {
          roundId: 1,
          status: 'success',
          swaps: 2,
          optimalSwaps: 2,
          solveTimeMs: 4000,
          remainingMs: 16000,
          score: 100,
          matchedTiles: 4,
          totalTiles: 4,
          finalTileOrder: [],
          scoringVersion: 'score-v2',
        },
        {
          roundId: 2,
          status: 'success',
          swaps: 4,
          optimalSwaps: 4,
          solveTimeMs: 10000,
          remainingMs: 20000,
          score: 150,
          matchedTiles: 6,
          totalTiles: 6,
          finalTileOrder: [],
          scoringVersion: 'score-v2',
        },
        {
          roundId: 3,
          status: 'failure',
          swaps: 5,
          optimalSwaps: 5,
          solveTimeMs: 45000,
          remainingMs: 0,
          score: 100,
          matchedTiles: 4,
          totalTiles: 8,
          finalTileOrder: [],
          scoringVersion: 'score-v2',
        },
      ],
    });

    expect(share).toContain('Recall #292 (2026-10-19)');
    expect(share).toContain('🟩 Round 1 — 4 tiles');
    expect(share).toContain('🟩 Round 2 — 6 tiles');
    expect(share).toContain('🟨 Round 3 — 8 tiles');
    expect(share).toContain('Score: 350');
    expect(share).toContain('Swaps: 11');
    expect(share).toContain('Streak: 3');
  });
});

describe('State Machine, Empty Board + Slider Placement, Explicit Lock In & Storage Recovery', () => {
  it('starts recreation with empty board squares and places tiles from the slider bar before explicit lock-in', () => {
    const challenge = generateDailyChallenge('2026-10-19');
    const round1 = challenge.rounds[0];

    let session = createInitialSession(challenge);
    session = startRoundMemorisation(session, challenge, 1_000);
    session = startRecreatingPhase(session, challenge, 9_250);

    // Board starts completely empty after memorisation
    expect(session.currentTileOrder).toEqual(['', '', '', '']);

    // Place each tile from the slider bar into its target square
    round1.targetOrder.forEach((tileId, idx) => {
      session = performTilePlacement(
        session,
        challenge,
        tileId,
        idx,
        10_000 + idx * 100,
      );
    });

    expect(session.currentTileOrder).toEqual(round1.targetOrder);
    expect(session.phase).toBe('recreating');

    // Test removing and re-placing a tile
    session = performTileRemoveFromBoard(session, challenge, 0, 11_000);
    expect(session.currentTileOrder[0]).toBe('');
    session = performTilePlacement(
      session,
      challenge,
      round1.targetOrder[0],
      0,
      11_200,
    );

    session = lockInRoundSolution(session, challenge, 11_500);
    expect(session.phase).toBe('round-success');
    expect(session.results[0].score).toBe(100);
    expect(session.results[0].matchedTiles).toBe(4);

    // Advancing after Round 1 goes directly into Round 2 memorising
    session = advanceAfterRoundResult(session, challenge, 14_000);
    expect(session.phase).toBe('memorising');
    expect(session.currentRoundId).toBe(2);
  });

  it('clears all placed tiles back to the slider bar when requested', () => {
    const challenge = generateDailyChallenge('2026-10-19');
    const round1 = challenge.rounds[0];
    let session = createInitialSession(challenge);
    session = startRoundMemorisation(session, challenge, 1_000);
    session = startRecreatingPhase(session, challenge, 9_250);

    session = performTilePlacement(
      session,
      challenge,
      round1.targetOrder[0],
      0,
      10_000,
    );
    expect(countPlacedTiles(session.currentTileOrder)).toBe(1);

    session = performClearBoardToSlider(session, challenge, 10_500);
    expect(session.currentTileOrder).toEqual(['', '', '', '']);
  });

  it('records partial match points and player arrangement when locking in a partially correct board', () => {
    const challenge = generateDailyChallenge('2026-10-19');
    const round1 = challenge.rounds[0];
    let session = createInitialSession(challenge);
    session = startRoundMemorisation(session, challenge, 1_000);
    session = startRecreatingPhase(session, challenge, 9_250);

    // Place 2 of 4 tiles in their exact target position
    session = performTilePlacement(
      session,
      challenge,
      round1.targetOrder[0],
      0,
      10_000,
    );
    session = performTilePlacement(
      session,
      challenge,
      round1.targetOrder[1],
      1,
      10_200,
    );

    const locked = lockInRoundSolution(session, challenge, 12_000);
    expect(locked.phase).toBe('round-failure');
    expect(locked.results[0].status).toBe('failure');
    expect(locked.results[0].failureReason).toBe('mismatch');
    expect(locked.results[0].matchedTiles).toBe(2);
    expect(locked.results[0].score).toBe(50);
  });

  it('rejects placements or swaps occurring at or after the recreation deadline', () => {
    const challenge = generateDailyChallenge('2026-10-19');
    const round1 = challenge.rounds[0];
    let session = createInitialSession(challenge);
    session = startRoundMemorisation(session, challenge, 1_000);
    session = startConcealingPhase(session, 9_000);
    session = startRecreatingPhase(session, challenge, 9_250);

    expect(session.phaseDeadlineEpochMs).toBe(29_250);

    const expiredSession = performTilePlacement(
      session,
      challenge,
      round1.targetOrder[0],
      0,
      29_250,
    );
    expect(expiredSession.phase).toBe('round-failure');
    expect(expiredSession.results[0].failureReason).toBe('timeout');
  });

  it('reconciles backgrounded or refreshed sessions without granting extra time', () => {
    const challenge = generateDailyChallenge('2026-10-19');
    let session = createInitialSession(challenge);
    session = startRoundMemorisation(session, challenge, 10_000);
    const reconciled = reconcileSessionWithClock(session, challenge, 20_000);
    expect(reconciled.phase).toBe('recreating');
    expect(reconciled.phaseDeadlineEpochMs).toBe(38_250);
    expect(reconciled.currentTileOrder).toEqual(['', '', '', '']);

    const timedOut = reconcileSessionWithClock(reconciled, challenge, 40_000);
    expect(timedOut.phase).toBe('round-failure');
    expect(timedOut.results).toHaveLength(1);
    expect(timedOut.results[0].status).toBe('failure');
  });

  it('safely handles corrupt localStorage data and locks completed daily challenges', () => {
    const challenge = generateDailyChallenge('2026-10-19');
    window.localStorage.setItem(STORAGE_KEYS.SESSION, '{not-valid-json');

    const recovered = loadOrInitializeSession(challenge, 50_000);
    expect(recovered.phase).toBe('home');

    expect(
      validateStoredSession(
        {
          ...recovered,
          currentTileOrder: ['fake-1', 'fake-2', 'fake-3', 'fake-4'],
        },
        challenge,
      ),
    ).toBeNull();

    let s = createInitialSession(challenge);
    for (const round of challenge.rounds) {
      s = startRoundMemorisation(s, challenge, 1_000);
      s = startRecreatingPhase(s, challenge, 9_250);
      round.targetOrder.forEach((tileId, idx) => {
        s = performTilePlacement(s, challenge, tileId, idx, 10_000 + idx * 100);
      });
      // Swap two placed tiles and swap them back to test performTileSwap on placed tiles
      s = performTileSwap(
        s,
        challenge,
        round.targetOrder[0],
        round.targetOrder[1],
        12_000,
      );
      s = performTileSwap(
        s,
        challenge,
        round.targetOrder[0],
        round.targetOrder[1],
        12_200,
      );
      s = lockInRoundSolution(s, challenge, 12_500);
      expect(s.phase).toBe('round-success');
      s = advanceAfterRoundResult(s, challenge, 15_000);
    }

    expect(s.phase).toBe('results');
    expect(calculateDailyTotalScore(s.results)).toBe(450);

    recordDailyChallengeCompletion(challenge, s.results, 20_000);
    const reloaded = loadOrInitializeSession(challenge, 25_000);
    expect(reloaded.phase).toBe('results');
    expect(reloaded.results).toHaveLength(3);
  });
});
