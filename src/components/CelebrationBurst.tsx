import { motion } from 'motion/react';
import { TILE_PALETTE } from '../game/config';

export interface CelebrationBurstProps {
  shouldReduceMotion: boolean;
  /** Optional custom colors (e.g. the round's actual tile hex colors) */
  colors?: readonly string[];
}

interface ParticleSpec {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
  delay: number;
  color: string;
  isSquare: boolean;
}

const DEFAULT_COLORS = TILE_PALETTE.slice(0, 8).map((c) => c.hex);

const PARTICLE_VECTORS: ReadonlyArray<{
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
  delay: number;
}> = [
  { dx: -115, dy: -85, rotate: -48, scale: 1.05, delay: 0.01 },
  { dx: -75, dy: -120, rotate: 35, scale: 0.9, delay: 0.04 },
  { dx: -25, dy: -135, rotate: -22, scale: 1.1, delay: 0.02 },
  { dx: 30, dy: -130, rotate: 42, scale: 0.95, delay: 0.05 },
  { dx: 82, dy: -115, rotate: -38, scale: 1.0, delay: 0.03 },
  { dx: 120, dy: -80, rotate: 55, scale: 0.85, delay: 0.06 },
  { dx: -135, dy: -20, rotate: -65, scale: 0.9, delay: 0.05 },
  { dx: 138, dy: -15, rotate: 68, scale: 0.95, delay: 0.02 },
  { dx: -110, dy: 55, rotate: 30, scale: 0.85, delay: 0.07 },
  { dx: 112, dy: 60, rotate: -40, scale: 0.9, delay: 0.04 },
  { dx: -55, dy: -68, rotate: 20, scale: 0.75, delay: 0.08 },
  { dx: 58, dy: -65, rotate: -25, scale: 0.8, delay: 0.08 },
];

export function CelebrationBurst({
  shouldReduceMotion,
  colors = DEFAULT_COLORS,
}: CelebrationBurstProps) {
  if (shouldReduceMotion) {
    return null;
  }

  const palette = colors.length > 0 ? colors : DEFAULT_COLORS;

  const particles: ParticleSpec[] = PARTICLE_VECTORS.map((vec, i) => ({
    id: i,
    ...vec,
    color: palette[i % palette.length],
    isSquare: i % 2 === 0,
  }));

  return (
    <div
      aria-hidden="true"
      data-testid="celebration-burst"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible z-30"
    >
      {/* Radial emerald celebration shockwave ring */}
      <motion.div
        initial={{ scale: 0.55, opacity: 0.75 }}
        animate={{ scale: 1.55, opacity: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-44 h-44 rounded-[28px] border-2 border-[#73C8AC]/60 shadow-[0_0_40px_rgba(115,200,172,0.35)]"
      />

      {/* Secondary periwinkle shimmer ring */}
      <motion.div
        initial={{ scale: 0.65, opacity: 0.6 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 1.05, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-44 h-44 rounded-full border border-[#91ADFF]/45"
      />

      {/* Coloured mini-tile confetti particles */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: [0, p.dx * 0.88, p.dx],
            y: [0, p.dy, p.dy + 28],
            scale: [0, p.scale, p.scale * 0.4],
            rotate: [0, p.rotate, p.rotate * 1.6],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 0.95,
            delay: p.delay,
            ease: [0.2, 0.9, 0.3, 1],
          }}
          className={`absolute ${
            p.isSquare ? 'w-3 h-3 rounded-[4px]' : 'w-2.5 h-2.5 rounded-full'
          } border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.35)]`}
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}
