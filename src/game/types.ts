export type GamePhase =
  | 'home'
  | 'ready'
  | 'memorising'
  | 'concealing'
  | 'recreating'
  | 'round-success'
  | 'round-failure'
  | 'intermission'
  | 'results';

export type TileSymbolId =
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'square'
  | 'cross'
  | 'star'
  | 'hexagon'
  | 'ring'
  | 'chevron'
  | 'pentagon'
  | 'octagon'
  | 'spark'
  | 'hourglass'
  | 'shield'
  | 'bolt'
  | 'target';

export interface TilePaletteItem {
  colorId: string;
  colorName: string;
  hex: string;
  symbolId: TileSymbolId;
}

export interface Tile {
  id: string;
  colorId: string;
  colorName: string;
  hex: string;
  symbolId: TileSymbolId;
}

export interface BoardCellCoord {
  /** 1-indexed CSS grid row */
  row: number;
  /** 1-indexed CSS grid column */
  col: number;
}

export interface BoardPattern {
  patternId: string;
  patternName: string;
  columns: number;
  rows: number;
  cells: readonly BoardCellCoord[];
  /** Whether to draw a subtle path track connecting consecutive cells (e.g. Snake / Line / Ring) */
  connectPath?: boolean;
  /** Whether the path closes back to the first cell (e.g. Box / Ring) */
  closePath?: boolean;
}

export interface RoundConfig {
  roundId: number;
  difficultyLabel: 'Easy' | 'Medium' | 'Hard';
  tileCount: number;
  columns: number;
  rows: number;
  memoriseMs: number;
  solveMs: number;
  minRequiredSwaps: number;
  maxRequiredSwaps: number;
  basePoints: number;
}

export interface RoundPuzzle {
  roundId: number;
  seed: string;
  pattern: BoardPattern;
  tiles: Record<string, Tile>;
  targetOrder: string[];
  shuffledOrder: string[];
  optimalSwaps: number;
}

export interface DailyChallenge {
  challengeId: string;
  challengeNumber: number;
  puzzleVersion: string;
  scoringVersion: string;
  rounds: RoundPuzzle[];
}

export type RoundFailureReason = 'timeout' | 'mismatch';

export interface RoundResult {
  roundId: number;
  status: 'success' | 'failure';
  failureReason?: RoundFailureReason;
  swaps: number;
  optimalSwaps: number;
  solveTimeMs: number;
  remainingMs: number;
  score: number;
  finalTileOrder: string[];
  matchedTiles: number;
  totalTiles: number;
  scoringVersion: string;
}

export interface GameSession {
  schemaVersion: number;
  challengeId: string;
  puzzleVersion: string;
  scoringVersion: string;
  phase: GamePhase;
  currentRoundId: number;
  currentTileOrder: string[];
  swapCount: number;
  phaseStartEpochMs: number | null;
  phaseDeadlineEpochMs: number | null;
  results: RoundResult[];
}

export interface DailyHistoryEntry {
  challengeId: string;
  challengeNumber: number;
  completedAtEpochMs: number;
  totalScore: number;
  totalSwaps: number;
  successfulRounds: number;
  results: RoundResult[];
  puzzleVersion: string;
  scoringVersion: string;
}

export interface PlayerStats {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  history: Record<string, DailyHistoryEntry>;
}

export interface PlayerPreferences {
  soundEnabled: boolean;
  symbolsEnabled: boolean;
  reducedMotionOverride: boolean | null;
  hasCompletedOnboarding: boolean;
  devModeEnabled: boolean;
}
