import { countMatchedTiles, isBoardSolved, swapTilesById } from './board';
import {
  CONCEAL_TRANSITION_MS,
  getRoundConfig,
  PUZZLE_VERSION,
  ROUND_CONFIGS,
  SCORING_VERSION,
  STORAGE_SCHEMA_VERSION,
} from './config';
import { calculateRoundScore } from './scoring';
import type {
  DailyChallenge,
  GamePhase,
  GameSession,
  RoundPuzzle,
  RoundResult,
} from './types';

const ALLOWED_TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  home: ['ready', 'memorising', 'results'],
  ready: ['memorising'],
  memorising: ['concealing', 'recreating', 'round-failure'],
  concealing: ['recreating', 'round-failure'],
  recreating: ['round-success', 'round-failure'],
  'round-success': ['memorising', 'intermission', 'results'],
  'round-failure': ['memorising', 'intermission', 'results'],
  intermission: ['memorising'],
  results: [],
};

export function canTransitionPhase(from: GamePhase, to: GamePhase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getRoundPuzzle(
  challenge: DailyChallenge,
  roundId: number,
): RoundPuzzle {
  const puzzle = challenge.rounds.find((r) => r.roundId === roundId);
  if (!puzzle) {
    throw new Error(`Round ${roundId} not found in challenge ${challenge.challengeId}`);
  }
  return puzzle;
}

/**
 * Creates a fresh GameSession for a daily challenge.
 */
export function createInitialSession(challenge: DailyChallenge): GameSession {
  const round1 = getRoundPuzzle(challenge, 1);
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    challengeId: challenge.challengeId,
    puzzleVersion: challenge.puzzleVersion || PUZZLE_VERSION,
    scoringVersion: challenge.scoringVersion || SCORING_VERSION,
    phase: 'home',
    currentRoundId: 1,
    currentTileOrder: [...round1.targetOrder],
    swapCount: 0,
    phaseStartEpochMs: null,
    phaseDeadlineEpochMs: null,
    results: [],
  };
}

/**
 * Transitions the session into the `memorising` phase for `roundId`.
 */
export function startRoundMemorisation(
  session: GameSession,
  challenge: DailyChallenge,
  nowEpochMs: number,
): GameSession {
  if (
    session.phase !== 'home' &&
    session.phase !== 'ready' &&
    session.phase !== 'intermission' &&
    session.phase !== 'round-success' &&
    session.phase !== 'round-failure'
  ) {
    return session;
  }

  const roundId = session.currentRoundId;
  const config = getRoundConfig(roundId);
  const puzzle = getRoundPuzzle(challenge, roundId);

  return {
    ...session,
    phase: 'memorising',
    currentTileOrder: [...puzzle.targetOrder],
    swapCount: 0,
    phaseStartEpochMs: nowEpochMs,
    phaseDeadlineEpochMs: nowEpochMs + config.memoriseMs,
  };
}

/**
 * Transitions from `memorising` to `concealing` when the memorisation deadline expires.
 */
export function startConcealingPhase(
  session: GameSession,
  nowEpochMs: number,
): GameSession {
  if (session.phase !== 'memorising') {
    return session;
  }

  const effectiveStartMs = session.phaseDeadlineEpochMs ?? nowEpochMs;

  return {
    ...session,
    phase: 'concealing',
    phaseStartEpochMs: effectiveStartMs,
    phaseDeadlineEpochMs: effectiveStartMs + CONCEAL_TRANSITION_MS,
  };
}

/**
 * Transitions from `concealing` (or directly from expired `memorising`) into `recreating`,
 * presenting the predetermined shuffled board and starting the recreation timer.
 */
export function startRecreatingPhase(
  session: GameSession,
  challenge: DailyChallenge,
  nowEpochMs: number,
): GameSession {
  if (session.phase !== 'concealing' && session.phase !== 'memorising') {
    return session;
  }

  const roundId = session.currentRoundId;
  const config = getRoundConfig(roundId);
  const puzzle = getRoundPuzzle(challenge, roundId);

  const effectiveStartMs = session.phaseDeadlineEpochMs ?? nowEpochMs;

  return {
    ...session,
    phase: 'recreating',
    currentTileOrder: [...puzzle.shuffledOrder],
    swapCount: 0,
    phaseStartEpochMs: effectiveStartMs,
    phaseDeadlineEpochMs: effectiveStartMs + config.solveMs,
  };
}

/**
 * Resolves the round when the recreation timer expires.
 * Even on timeout, awards points for any tiles that were placed in the correct position!
 */
export function expireRecreationPhase(
  session: GameSession,
  challenge: DailyChallenge,
): GameSession {
  if (session.phase !== 'recreating') {
    return session;
  }

  const roundId = session.currentRoundId;
  const alreadyRecorded = session.results.some((r) => r.roundId === roundId);
  if (alreadyRecorded) {
    return {
      ...session,
      phase: 'round-failure',
      phaseStartEpochMs: null,
      phaseDeadlineEpochMs: null,
    };
  }

  const config = getRoundConfig(roundId);
  const puzzle = getRoundPuzzle(challenge, roundId);
  const matchedTiles = countMatchedTiles(session.currentTileOrder, puzzle.targetOrder);
  const totalTiles = puzzle.targetOrder.length;
  const solved = matchedTiles === totalTiles;

  const score = calculateRoundScore({
    roundId,
    matchedTiles,
    totalTiles,
  });

  const result: RoundResult = {
    roundId,
    status: solved ? 'success' : 'failure',
    failureReason: solved ? undefined : 'timeout',
    swaps: session.swapCount,
    optimalSwaps: puzzle.optimalSwaps,
    solveTimeMs: config.solveMs,
    remainingMs: 0,
    score,
    finalTileOrder: [...session.currentTileOrder],
    matchedTiles,
    totalTiles,
    scoringVersion: session.scoringVersion,
  };

  return {
    ...session,
    phase: solved ? 'round-success' : 'round-failure',
    phaseStartEpochMs: null,
    phaseDeadlineEpochMs: null,
    results: [...session.results, result],
  };
}

/**
 * Executes a tile swap during the `recreating` phase.
 * Does NOT auto-complete the round; the player must explicitly lock in their solution.
 */
export function performTileSwap(
  session: GameSession,
  challenge: DailyChallenge,
  tileIdA: string,
  tileIdB: string,
  eventEpochMs: number,
): GameSession {
  if (session.phase !== 'recreating') {
    return session;
  }

  if (
    session.phaseDeadlineEpochMs !== null &&
    eventEpochMs >= session.phaseDeadlineEpochMs
  ) {
    return expireRecreationPhase(session, challenge);
  }

  const swapResult = swapTilesById(session.currentTileOrder, tileIdA, tileIdB);

  if (!swapResult.swapped) {
    return session;
  }

  return {
    ...session,
    currentTileOrder: swapResult.nextOrder,
    swapCount: session.swapCount + 1,
  };
}

/**
 * Explicitly locks in and evaluates the player's current board arrangement during `recreating`.
 * Awards points strictly proportional to `matchedTiles` (25 pts per correct tile).
 */
export function lockInRoundSolution(
  session: GameSession,
  challenge: DailyChallenge,
  eventEpochMs: number,
): GameSession {
  if (session.phase !== 'recreating') {
    return session;
  }

  if (
    session.phaseDeadlineEpochMs !== null &&
    eventEpochMs >= session.phaseDeadlineEpochMs
  ) {
    return expireRecreationPhase(session, challenge);
  }

  const roundId = session.currentRoundId;
  const config = getRoundConfig(roundId);
  const puzzle = getRoundPuzzle(challenge, roundId);

  const alreadyRecorded = session.results.some((r) => r.roundId === roundId);
  const solved = isBoardSolved(session.currentTileOrder, puzzle.targetOrder);
  const matchedTiles = countMatchedTiles(session.currentTileOrder, puzzle.targetOrder);
  const totalTiles = puzzle.targetOrder.length;

  const remainingMs =
    session.phaseDeadlineEpochMs !== null
      ? Math.max(
          0,
          Math.min(config.solveMs, session.phaseDeadlineEpochMs - eventEpochMs),
        )
      : 0;
  const solveTimeMs = Math.max(0, config.solveMs - remainingMs);

  if (alreadyRecorded) {
    return {
      ...session,
      phase: solved ? 'round-success' : 'round-failure',
      phaseStartEpochMs: null,
      phaseDeadlineEpochMs: null,
    };
  }

  const score = calculateRoundScore({
    roundId,
    matchedTiles,
    totalTiles,
  });

  const roundResult: RoundResult = {
    roundId,
    status: solved ? 'success' : 'failure',
    failureReason: solved ? undefined : 'mismatch',
    swaps: session.swapCount,
    optimalSwaps: puzzle.optimalSwaps,
    solveTimeMs,
    remainingMs,
    score,
    finalTileOrder: [...session.currentTileOrder],
    matchedTiles,
    totalTiles,
    scoringVersion: session.scoringVersion,
  };

  return {
    ...session,
    phase: solved ? 'round-success' : 'round-failure',
    phaseStartEpochMs: null,
    phaseDeadlineEpochMs: null,
    results: [...session.results, roundResult],
  };
}

/**
 * Transitions from `round-success` or `round-failure` directly into:
 * - The next round's `memorising` phase (for Rounds 1 and 2) without a second Intermission continue screen
 * - `results` after Round 3
 */
export function advanceAfterRoundResult(
  session: GameSession,
  challenge: DailyChallenge,
  nowEpochMs: number = Date.now(),
): GameSession {
  if (session.phase !== 'round-success' && session.phase !== 'round-failure') {
    return session;
  }

  const totalRounds = ROUND_CONFIGS.length;
  if (session.currentRoundId >= totalRounds) {
    return {
      ...session,
      phase: 'results',
      phaseStartEpochMs: null,
      phaseDeadlineEpochMs: null,
    };
  }

  const nextRoundId = session.currentRoundId + 1;
  const nextConfig = getRoundConfig(nextRoundId);
  const nextPuzzle = getRoundPuzzle(challenge, nextRoundId);

  return {
    ...session,
    phase: 'memorising',
    currentRoundId: nextRoundId,
    currentTileOrder: [...nextPuzzle.targetOrder],
    swapCount: 0,
    phaseStartEpochMs: nowEpochMs,
    phaseDeadlineEpochMs: nowEpochMs + nextConfig.memoriseMs,
  };
}

/**
 * Recovers and advances a session after a browser refresh or background tab interruption.
 */
export function reconcileSessionWithClock(
  session: GameSession,
  challenge: DailyChallenge,
  nowEpochMs: number,
): GameSession {
  let current = session;

  if (
    current.phase === 'memorising' &&
    current.phaseDeadlineEpochMs !== null &&
    nowEpochMs >= current.phaseDeadlineEpochMs
  ) {
    current = startConcealingPhase(current, current.phaseDeadlineEpochMs);
  }

  if (
    current.phase === 'concealing' &&
    current.phaseDeadlineEpochMs !== null &&
    nowEpochMs >= current.phaseDeadlineEpochMs
  ) {
    current = startRecreatingPhase(current, challenge, current.phaseDeadlineEpochMs);
  }

  if (
    current.phase === 'recreating' &&
    current.phaseDeadlineEpochMs !== null &&
    nowEpochMs >= current.phaseDeadlineEpochMs
  ) {
    current = expireRecreationPhase(current, challenge);
  }

  return current;
}
