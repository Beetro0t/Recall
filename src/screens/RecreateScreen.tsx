import { Lock } from 'lucide-react';
import type { RoundConfig, RoundPuzzle } from '../game/types';
import { Countdown } from '../components/Countdown';
import { GameBoard } from '../components/GameBoard';
import { PrimaryButton } from '../components/PrimaryButton';

export interface RecreateScreenProps {
  config: RoundConfig;
  puzzle: RoundPuzzle;
  currentTileOrder: readonly string[];
  swapCount: number;
  selectedTileId: string | null;
  deadlineEpochMs: number | null;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onTileActivate: (tileId: string) => void;
  onDirectSwap: (tileIdA: string, tileIdB: string) => void;
  onLockInSolution: () => void;
  onRecreateExpire: () => void;
}

export function RecreateScreen({
  config,
  puzzle,
  currentTileOrder,
  swapCount,
  selectedTileId,
  deadlineEpochMs,
  showSymbols,
  shouldReduceMotion,
  onTileActivate,
  onDirectSwap,
  onLockInSolution,
  onRecreateExpire,
}: RecreateScreenProps) {
  return (
    <section
      className="flex-1 flex flex-col justify-between py-2 gap-3"
      data-testid="recreate-screen"
    >
      {/* Top countdown & pattern telemetry bar */}
      <div className="space-y-2.5">
        <Countdown
          deadlineEpochMs={deadlineEpochMs}
          totalDurationMs={config.solveMs}
          mode="recreate"
          active={true}
          onExpire={onRecreateExpire}
        />

        <div className="flex items-center justify-between text-xs h-7 px-3 rounded-[10px] bg-[#16181E] border border-[#2D313B]">
          <span className="text-[#9297A3]">
            Pattern:{' '}
            <strong className="text-[#F5F5F7] font-medium">
              {puzzle.pattern.patternName}
            </strong>
          </span>
          <span
            className="font-semibold text-[#F5F5F7] tabular-nums"
            data-testid="swap-counter"
          >
            Swaps: {swapCount}
          </span>
        </div>
      </div>

      {/* Central interactive shuffled board (supports both Drag-and-Drop and Press-and-Swap) */}
      <div className="my-auto flex flex-col items-center justify-center gap-2.5">
        <GameBoard
          tileOrder={currentTileOrder}
          tiles={puzzle.tiles}
          columns={config.columns}
          pattern={puzzle.pattern}
          interactive={true}
          selectedTileId={selectedTileId}
          showSymbols={showSymbols}
          shouldReduceMotion={shouldReduceMotion}
          ariaLabel={`Round ${config.roundId} recreation board`}
          onTileActivate={onTileActivate}
          onDirectSwap={onDirectSwap}
        />

        <p
          className="text-xs font-medium text-[#9297A3] text-center"
          data-testid="phase-instruction"
        >
          {selectedTileId
            ? 'Tap destination tile to swap, or tap selected tile to cancel.'
            : 'Drag & drop or tap two tiles to swap.'}
        </p>
      </div>

      {/* Explicit Lock In Solution action */}
      <div className="pt-1">
        <PrimaryButton
          onClick={onLockInSolution}
          data-testid="lock-in-button"
          className="shadow-[0_8px_24px_rgba(145,173,255,0.2)]"
        >
          <Lock className="w-4 h-4" aria-hidden="true" />
          <span>Lock In Solution</span>
        </PrimaryButton>
      </div>
    </section>
  );
}
