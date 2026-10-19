import { useCountdown } from '../hooks/useCountdown';

export interface CountdownProps {
  deadlineEpochMs: number | null;
  totalDurationMs: number;
  mode: 'memorise' | 'recreate';
  active: boolean;
  onExpire: () => void;
}

/**
 * Isolated countdown display component (Section 5.6 & 17.3).
 * High-frequency animation-frame updates stay inside this component so the
 * puzzle board does not re-render on timer ticks.
 */
export function Countdown({
  deadlineEpochMs,
  totalDurationMs,
  mode,
  active,
  onExpire,
}: CountdownProps) {
  const { remainingMs, progress, isUrgent } = useCountdown({
    deadlineEpochMs,
    totalDurationMs,
    active,
    onExpire,
  });

  const formattedTime =
    mode === 'memorise'
      ? `${Math.ceil(remainingMs / 1000)}s`
      : (remainingMs / 1000).toFixed(1);

  const phaseLabel = mode === 'memorise' ? 'Memorise' : 'Time remaining';

  return (
    <div
      className="w-full flex flex-col items-center gap-2"
      data-testid="countdown-container"
    >
      <div className="flex items-baseline justify-between w-full px-0.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isUrgent
                ? 'bg-[#FF6B6B] shadow-[0_0_10px_#FF6B6B]'
                : mode === 'memorise'
                  ? 'bg-[#55EFC4] shadow-[0_0_10px_rgba(85,239,196,0.7)]'
                  : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.65)]'
            }`}
            aria-hidden="true"
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {phaseLabel}
          </span>
        </div>
        <span
          data-testid="countdown-value"
          className={`
            tabular-nums font-semibold tracking-[-0.05em] leading-none
            text-4xl sm:text-[42px] transition-colors duration-200
            ${isUrgent ? 'text-[#FF6B6B]' : 'text-white'}
          `}
        >
          {formattedTime}
        </span>
      </div>

      {/* Sleek studio progress track */}
      <div
        className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden"
        role="progressbar"
        aria-label={phaseLabel}
        aria-valuemin={0}
        aria-valuemax={Math.round(totalDurationMs / 1000)}
        aria-valuenow={Math.ceil(remainingMs / 1000)}
      >
        <div
          className={`h-full rounded-full transition-colors duration-200 ${
            isUrgent
              ? 'bg-[#FF6B6B]'
              : mode === 'memorise'
                ? 'bg-gradient-to-r from-[#55EFC4] via-[#00CEC9] to-[#74B9FF]'
                : 'bg-white'
          }`}
          style={{
            width: `${Math.max(0, Math.min(100, progress * 100)).toFixed(2)}%`,
          }}
        />
      </div>
    </div>
  );
}
