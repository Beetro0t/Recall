import { useState } from 'react';
import { Lock } from 'lucide-react';
import { countPlacedTiles } from '../game/board';
import type { RoundConfig, RoundPuzzle } from '../game/types';
import { ColorSliderBar } from '../components/ColorSliderBar';
import { Countdown } from '../components/Countdown';
import { GameBoard } from '../components/GameBoard';
import { PrimaryButton } from '../components/PrimaryButton';

export interface RecreateScreenProps {
  config: RoundConfig;
  puzzle: RoundPuzzle;
  currentTileOrder: readonly string[];
  swapCount: number;
  selectedTileId: string | null;
  selectedSlotIndex: number | null;
  deadlineEpochMs: number | null;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onTileActivate: (tileId: string) => void;
  onSlotActivate: (slotIndex: number, tileId: string | null) => void;
  onSelectSliderTile: (tileId: string) => void;
  onPlaceTileInSlot: (tileId: string, slotIndex: number) => void;
  onRemoveTileFromBoard: (slotIndex: number) => void;
  onClearBoard: () => void;
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
  selectedSlotIndex,
  deadlineEpochMs,
  showSymbols,
  shouldReduceMotion,
  onTileActivate,
  onSlotActivate,
  onSelectSliderTile,
  onPlaceTileInSlot,
  onRemoveTileFromBoard,
  onClearBoard,
  onDirectSwap,
  onLockInSolution,
  onRecreateExpire,
}: RecreateScreenProps) {
  const [sliderHoveredSlotIndex, setSliderHoveredSlotIndex] = useState<number | null>(
    null,
  );

  const placedCount = countPlacedTiles(currentTileOrder);
  const totalCount = puzzle.targetOrder.length;
  const allPlaced = placedCount === totalCount;

  const instructionText =
    selectedSlotIndex !== null
      ? `Square ${selectedSlotIndex + 1} armed — tap or slide a colour below to fill it.`
      : selectedTileId !== null
        ? 'Colour armed — tap any empty square (or another tile to swap).'
        : allPlaced
          ? 'All squares filled! Drag to adjust or Lock In Solution.'
          : 'Drag colours up from the slider bar, or tap a colour then tap an empty square.';

  return (
    <section
      className="flex-1 flex flex-col justify-between py-1.5 gap-2.5"
      data-testid="recreate-screen"
    >
      {/* Top countdown & pattern telemetry bar */}
      <div className="space-y-2">
        <Countdown
          deadlineEpochMs={deadlineEpochMs}
          totalDurationMs={config.solveMs}
          mode="recreate"
          active={true}
          onExpire={onRecreateExpire}
        />

        <div className="flex items-center justify-between text-xs h-7 px-3 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/55">
            Pattern:{' '}
            <strong className="text-white font-medium">
              {puzzle.pattern.patternName}
            </strong>
          </span>
          <div className="flex items-center gap-2.5 tabular-nums">
            <span
              className={`font-semibold ${
                allPlaced ? 'text-[#55EFC4]' : 'text-white/80'
              }`}
              data-testid="placed-counter"
            >
              Placed: {placedCount}/{totalCount}
            </span>
            <span className="text-white/20" aria-hidden="true">
              ·
            </span>
            <span
              className="font-semibold text-white/90 tabular-nums"
              data-testid="swap-counter"
            >
              Swaps: {swapCount}
            </span>
          </div>
        </div>
      </div>

      {/* Central interactive empty-socket board */}
      <div className="my-auto flex flex-col items-center justify-center gap-2">
        <GameBoard
          tileOrder={currentTileOrder}
          tiles={puzzle.tiles}
          columns={config.columns}
          pattern={puzzle.pattern}
          interactive={true}
          selectedTileId={selectedTileId}
          selectedSlotIndex={selectedSlotIndex}
          externalHoveredSlotIndex={sliderHoveredSlotIndex}
          showSymbols={showSymbols}
          shouldReduceMotion={shouldReduceMotion}
          ariaLabel={`Round ${config.roundId} recreation board`}
          onTileActivate={onTileActivate}
          onSlotActivate={onSlotActivate}
          onDirectSwap={onDirectSwap}
          onPlaceTileInSlot={onPlaceTileInSlot}
          onRemoveTileFromSlot={onRemoveTileFromBoard}
        />

        <p
          className="text-[11px] font-medium text-white/55 text-center px-2"
          data-testid="phase-instruction"
        >
          {instructionText}
        </p>
      </div>

      {/* Bottom Colour Slider Bar & Lock In Solution CTA */}
      <div className="space-y-2.5 pt-0.5">
        <ColorSliderBar
          shuffledOrder={puzzle.shuffledOrder}
          currentBoardOrder={currentTileOrder}
          tiles={puzzle.tiles}
          selectedTileId={selectedTileId}
          showSymbols={showSymbols}
          shouldReduceMotion={shouldReduceMotion}
          onSelectTile={onSelectSliderTile}
          onPlaceTileInSlot={onPlaceTileInSlot}
          onRemoveTileFromBoard={onRemoveTileFromBoard}
          onClearBoard={onClearBoard}
          onHoverBoardSlotChange={setSliderHoveredSlotIndex}
        />

        <PrimaryButton
          onClick={onLockInSolution}
          data-testid="lock-in-button"
          className={allPlaced ? 'dialed-spectrum-ring' : ''}
        >
          <Lock className="w-4 h-4" aria-hidden="true" />
          <span>
            {allPlaced
              ? 'Lock In Solution'
              : `Lock In Solution (${placedCount}/${totalCount} placed)`}
          </span>
        </PrimaryButton>
      </div>
    </section>
  );
}
