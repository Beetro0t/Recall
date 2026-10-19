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
        <span className="text-xs font-medium uppercase tracking-wider text-[#9297A3]">
          {phaseLabel}
        </span>
        <span
          data-testid="countdown-value"
          className={`
            tabular-nums font-semibold tracking-tight leading-none
            text-4xl sm:text-5xl transition-colors duration-200
            ${isUrgent ? 'text-[#F18D83]' : 'text-[#F5F5F7]'}
          `}
        >
          {formattedTime}
        </span>
      </div>

      {/* Subtle progress bar */}
      <div
        className="w-full h-1.5 rounded-full bg-[#24262D] overflow-hidden"
        role="progressbar"
        aria-label={phaseLabel}
        aria-valuemin={0}
        aria-valuemax={Math.round(totalDurationMs / 1000)}
        aria-valuenow={Math.ceil(remainingMs / 1000)}
      >
        <div
          className={`h-full rounded-full transition-colors duration-200 ${
            isUrgent ? 'bg-[#F18D83]' : 'bg-[#91ADFF]'
          }`}
          style={{
            width: `${Math.max(0, Math.min(100, progress * 100)).toFixed(2)}%`,
          }}
        />
      </div>
    </div>
  );
}
