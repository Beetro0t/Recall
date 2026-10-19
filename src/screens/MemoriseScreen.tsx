import { useEffect, useRef } from 'react';
import { CONCEAL_TRANSITION_MS } from '../game/config';
import type { RoundConfig, RoundPuzzle } from '../game/types';
import { Countdown } from '../components/Countdown';
import { GameBoard } from '../components/GameBoard';

export interface MemoriseScreenProps {
  config: RoundConfig;
  puzzle: RoundPuzzle;
  phase: 'memorising' | 'concealing';
  deadlineEpochMs: number | null;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onMemoriseExpire: () => void;
  onConcealComplete: () => void;
}

export function MemoriseScreen({
  config,
  puzzle,
  phase,
  deadlineEpochMs,
  showSymbols,
  shouldReduceMotion,
  onMemoriseExpire,
  onConcealComplete,
}: MemoriseScreenProps) {
  const concealCallbackRef = useRef(onConcealComplete);
  concealCallbackRef.current = onConcealComplete;

  useEffect(() => {
    if (phase !== 'concealing') {
      return;
    }
    const remainingConcealMs =
      deadlineEpochMs !== null
        ? Math.max(0, deadlineEpochMs - Date.now())
        : CONCEAL_TRANSITION_MS;

    const timer = setTimeout(() => {
      concealCallbackRef.current();
    }, remainingConcealMs);

    return () => clearTimeout(timer);
  }, [phase, deadlineEpochMs]);

  const isConcealing = phase === 'concealing';

  return (
    <section
      className="flex-1 flex flex-col justify-between py-2 gap-4"
      data-testid="memorise-screen"
    >
      {/* Top countdown bar */}
      <div className="space-y-2">
        <Countdown
          deadlineEpochMs={isConcealing ? null : deadlineEpochMs}
          totalDurationMs={config.memoriseMs}
          mode="memorise"
          active={!isConcealing}
          onExpire={onMemoriseExpire}
        />

        {/* Telemetry bar matching RecreateScreen */}
        <div className="flex items-center justify-between text-xs h-7 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/55">
          <span>
            Pattern:{' '}
            <strong className="text-white font-medium">
              {puzzle.pattern.patternName}
            </strong>
          </span>
          <span className="tabular-nums">{config.tileCount} tiles · 25 pts each</span>
        </div>
      </div>

      {/* Central stationary target board */}
      <div className="my-auto flex flex-col items-center justify-center gap-3">
        <GameBoard
          tileOrder={puzzle.targetOrder}
          tiles={puzzle.tiles}
          columns={config.columns}
          pattern={puzzle.pattern}
          interactive={false}
          selectedTileId={null}
          isConcealed={isConcealing}
          showSymbols={showSymbols}
          shouldReduceMotion={shouldReduceMotion}
          ariaLabel={`Round ${config.roundId} target arrangement`}
        />
      </div>

      {/* Footer instruction */}
      <div className="text-center py-2 min-h-[52px] flex items-center justify-center">
        <p
          className="text-sm font-medium text-white/60 tracking-[-0.01em]"
          data-testid="phase-instruction"
        >
          {isConcealing
            ? 'Dropping colours to slider bar…'
            : 'Remember this arrangement before the squares clear.'}
        </p>
      </div>
    </section>
  );
}
