import type { BoardPattern, RoundConfig, TilePaletteItem } from './types';

export const PRODUCT_ID = 'recall';
export const PUZZLE_VERSION = 'puzzle-v2';
export const SCORING_VERSION = 'score-v2';
export const STORAGE_SCHEMA_VERSION = 2;

/**
 * Epoch date used to compute deterministic Daily Challenge numbers (#001, #002, ...).
 */
export const EPOCH_START_UTC_DATE = '2026-01-01';

/**
 * Duration of the brief conceal transition between memorising and recreating.
 */
export const CONCEAL_TRANSITION_MS = 250;

/**
 * Auto-advance delay (ms) after completing a round before automatically starting the next round.
 */
export const ROUND_AUTO_ADVANCE_MS = 2_600;

/**
 * Scoring parameters:
 * Points are awarded strictly by how many tiles the player placed in the correct position.
 * 25 points per correct tile:
 * - Round 1 (4 tiles): up to 100 pts
 * - Round 2 (6 tiles): up to 150 pts
 * - Round 3 (8 tiles): up to 200 pts
 * - Daily Maximum (18 tiles): 450 pts
 */
export const SCORING_CONFIG = {
  pointsPerCorrectTile: 25,
} as const;

/**
 * Centralised configuration for the three daily rounds
 */
export const ROUND_CONFIGS: readonly RoundConfig[] = [
  {
    roundId: 1,
    difficultyLabel: 'Easy',
    tileCount: 4,
    columns: 2,
    rows: 2,
    memoriseMs: 8_000,
    solveMs: 20_000,
    minRequiredSwaps: 2,
    maxRequiredSwaps: 2,
    basePoints: 100,
  },
  {
    roundId: 2,
    difficultyLabel: 'Medium',
    tileCount: 6,
    columns: 3,
    rows: 2,
    memoriseMs: 10_000,
    solveMs: 30_000,
    minRequiredSwaps: 3,
    maxRequiredSwaps: 4,
    basePoints: 150,
  },
  {
    roundId: 3,
    difficultyLabel: 'Hard',
    tileCount: 8,
    columns: 4,
    rows: 2,
    memoriseMs: 15_000,
    solveMs: 45_000,
    minRequiredSwaps: 5,
    maxRequiredSwaps: 6,
    basePoints: 200,
  },
] as const;

/**
 * Expanded 16-colour curated matte palette so daily puzzles feature rich, varied colour combinations.
 */
export const TILE_PALETTE: readonly TilePaletteItem[] = [
  {
    colorId: 'cobalt-blue',
    colorName: 'Cobalt Blue',
    hex: '#4F7DF3',
    symbolId: 'circle',
  },
  {
    colorId: 'amber-gold',
    colorName: 'Amber Gold',
    hex: '#E59842',
    symbolId: 'triangle',
  },
  {
    colorId: 'royal-violet',
    colorName: 'Royal Violet',
    hex: '#9368E0',
    symbolId: 'diamond',
  },
  {
    colorId: 'jade-emerald',
    colorName: 'Jade Emerald',
    hex: '#3EB890',
    symbolId: 'square',
  },
  {
    colorId: 'crimson-coral',
    colorName: 'Crimson Coral',
    hex: '#E85D56',
    symbolId: 'cross',
  },
  {
    colorId: 'arctic-cyan',
    colorName: 'Arctic Cyan',
    hex: '#3FB5D8',
    symbolId: 'star',
  },
  {
    colorId: 'sunburst-yellow',
    colorName: 'Sunburst Yellow',
    hex: '#E2C547',
    symbolId: 'hexagon',
  },
  {
    colorId: 'velvet-rose',
    colorName: 'Velvet Rose',
    hex: '#D85B90',
    symbolId: 'ring',
  },
  {
    colorId: 'tangerine-flame',
    colorName: 'Tangerine Flame',
    hex: '#F0743E',
    symbolId: 'chevron',
  },
  {
    colorId: 'electric-indigo',
    colorName: 'Electric Indigo',
    hex: '#6362E6',
    symbolId: 'pentagon',
  },
  {
    colorId: 'mint-pistachio',
    colorName: 'Mint Pistachio',
    hex: '#7ACC66',
    symbolId: 'octagon',
  },
  {
    colorId: 'magenta-orchid',
    colorName: 'Magenta Orchid',
    hex: '#C75CD6',
    symbolId: 'spark',
  },
  {
    colorId: 'teal-lagoon',
    colorName: 'Teal Lagoon',
    hex: '#269499',
    symbolId: 'hourglass',
  },
  {
    colorId: 'terracotta-clay',
    colorName: 'Terracotta Clay',
    hex: '#C26D53',
    symbolId: 'shield',
  },
  {
    colorId: 'periwinkle-sky',
    colorName: 'Periwinkle Sky',
    hex: '#7E9EF7',
    symbolId: 'bolt',
  },
  {
    colorId: 'berry-wine',
    colorName: 'Berry Wine',
    hex: '#A8446B',
    symbolId: 'target',
  },
] as const;

/**
 * Spatial board patterns for each round (Line, Snake, Box/Ring, Diamond, Arch, Staircase, Grid).
 * Deterministically chosen per daily seed so different days feature distinct spatial geometries.
 */
export const BOARD_PATTERNS_BY_ROUND: Record<number, readonly BoardPattern[]> = {
  1: [
    {
      patternId: 'r1-diamond',
      patternName: 'Diamond',
      columns: 3,
      rows: 3,
      cells: [
        { row: 1, col: 2 },
        { row: 2, col: 3 },
        { row: 3, col: 2 },
        { row: 2, col: 1 },
      ],
      connectPath: true,
      closePath: true,
    },
    {
      patternId: 'r1-snake',
      patternName: 'Z-Snake',
      columns: 3,
      rows: 2,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
      ],
      connectPath: true,
    },
    {
      patternId: 'r1-line',
      patternName: 'Linear Bar',
      columns: 4,
      rows: 1,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 1, col: 4 },
      ],
      connectPath: true,
    },
    {
      patternId: 'r1-corners',
      patternName: 'Corner Frame',
      columns: 3,
      rows: 3,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 3 },
        { row: 3, col: 3 },
        { row: 3, col: 1 },
      ],
      connectPath: true,
      closePath: true,
    },
    {
      patternId: 'r1-square',
      patternName: '2×2 Box',
      columns: 2,
      rows: 2,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ],
    },
  ],
  2: [
    {
      patternId: 'r2-snake',
      patternName: 'Serpentine Snake',
      columns: 4,
      rows: 2,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 1, col: 4 },
      ],
      connectPath: true,
    },
    {
      patternId: 'r2-arch',
      patternName: 'Bridge Arch',
      columns: 4,
      rows: 2,
      cells: [
        { row: 2, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 1, col: 4 },
        { row: 2, col: 4 },
      ],
      connectPath: true,
    },
    {
      patternId: 'r2-staircase',
      patternName: 'Staircase',
      columns: 4,
      rows: 3,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
      ],
      connectPath: true,
    },
    {
      patternId: 'r2-hexagon-ring',
      patternName: 'Hex Loop',
      columns: 4,
      rows: 3,
      cells: [
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 4 },
        { row: 3, col: 3 },
        { row: 3, col: 2 },
        { row: 2, col: 1 },
      ],
      connectPath: true,
      closePath: true,
    },
    {
      patternId: 'r2-grid',
      patternName: '3×2 Grid',
      columns: 3,
      rows: 2,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
      ],
    },
  ],
  3: [
    {
      patternId: 'r3-hollow-box',
      patternName: 'Hollow Box',
      columns: 3,
      rows: 3,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 3 },
        { row: 3, col: 3 },
        { row: 3, col: 2 },
        { row: 3, col: 1 },
        { row: 2, col: 1 },
      ],
      connectPath: true,
      closePath: true,
    },
    {
      patternId: 'r3-coiled-snake',
      patternName: 'Coiled Snake',
      columns: 4,
      rows: 3,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 3 },
        { row: 2, col: 2 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
      ],
      connectPath: true,
    },
    {
      patternId: 'r3-octagon-ring',
      patternName: 'Diamond Ring',
      columns: 4,
      rows: 4,
      cells: [
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 2, col: 4 },
        { row: 3, col: 4 },
        { row: 4, col: 3 },
        { row: 4, col: 2 },
        { row: 3, col: 1 },
        { row: 2, col: 1 },
      ],
      connectPath: true,
      closePath: true,
    },
    {
      patternId: 'r3-twin-waves',
      patternName: 'Wave Crest',
      columns: 4,
      rows: 3,
      cells: [
        { row: 2, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
        { row: 3, col: 3 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 1, col: 4 },
      ],
      connectPath: true,
    },
    {
      patternId: 'r3-grid',
      patternName: '4×2 Grid',
      columns: 4,
      rows: 2,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 1, col: 4 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
      ],
    },
  ],
};

export function getRoundConfig(roundId: number): RoundConfig {
  const config = ROUND_CONFIGS.find((r) => r.roundId === roundId);
  if (!config) {
    throw new Error(`Invalid roundId: ${roundId}`);
  }
  return config;
}
