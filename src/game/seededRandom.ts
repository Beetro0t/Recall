/**
 * Deterministic string hashing (cyrb128) and PRNG (sfc32 / mulberry32).
 * Uses strictly 32-bit integer arithmetic (Math.imul and unsigned shifts)
 * so results are bit-for-bit identical across all JavaScript engines and platforms.
 */

export interface SeededRandom {
  /** Returns a float in [0, 1) */
  nextFloat(): number;
  /** Returns an integer in [minInclusive, maxInclusive] */
  nextInt(minInclusive: number, maxInclusive: number): number;
  /** Returns a new deterministically Fisher-Yates shuffled copy of the input array */
  shuffle<T>(items: readonly T[]): T[];
}

export function hashStringTo128Bits(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export function createSeededRandom(seed: string): SeededRandom {
  let [a, b, c, d] = hashStringTo128Bits(seed);

  const nextUint32 = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return t >>> 0;
  };

  // Warm up initial state
  for (let i = 0; i < 12; i++) {
    nextUint32();
  }

  const nextFloat = (): number => {
    return nextUint32() / 4294967296;
  };

  const nextInt = (minInclusive: number, maxInclusive: number): number => {
    if (
      !Number.isInteger(minInclusive) ||
      !Number.isInteger(maxInclusive) ||
      maxInclusive < minInclusive
    ) {
      throw new Error(`Invalid integer range: [${minInclusive}, ${maxInclusive}]`);
    }
    const span = maxInclusive - minInclusive + 1;
    return minInclusive + Math.floor(nextFloat() * span);
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = nextInt(0, i);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  };

  return {
    nextFloat,
    nextInt,
    shuffle,
  };
}
