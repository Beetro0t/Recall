import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import type { Tile as TileModel } from '../game/types';
import { TileSymbol } from './TileSymbol';

export interface ColorSliderBarProps {
  shuffledOrder: readonly string[];
  currentBoardOrder: readonly string[];
  tiles: Record<string, TileModel>;
  selectedTileId: string | null;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onSelectTile: (tileId: string) => void;
  onPlaceTileInSlot: (tileId: string, slotIndex: number) => void;
  onRemoveTileFromBoard: (slotIndex: number) => void;
  onClearBoard: () => void;
  onHoverBoardSlotChange?: (slotIndex: number | null) => void;
}

interface SliderDragState {
  tileId: string;
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hasMovedPastThreshold: boolean;
  hoveredSlotIndex: number | null;
}

const DRAG_THRESHOLD_PX = 6;

export const ColorSliderBar = memo(function ColorSliderBar({
  shuffledOrder,
  currentBoardOrder,
  tiles,
  selectedTileId,
  showSymbols,
  shouldReduceMotion,
  onSelectTile,
  onPlaceTileInSlot,
  onRemoveTileFromBoard,
  onClearBoard,
  onHoverBoardSlotChange,
}: ColorSliderBarProps) {
  const [dragState, setDragState] = useState<SliderDragState | null>(null);
  const suppressClickUntilMsRef = useRef<number>(0);

  const placedSet = new Set(currentBoardOrder.filter((id) => id !== ''));
  const unplacedIds = shuffledOrder.filter((id) => !placedSet.has(id));
  const placedCount = placedSet.size;
  const totalCount = shuffledOrder.length;

  // Slider scrub index (0 .. shuffledOrder.length - 1) synchronized with selectedTileId
  const selectedSliderIndex = selectedTileId
    ? Math.max(0, shuffledOrder.indexOf(selectedTileId))
    : unplacedIds.length > 0
      ? Math.max(0, shuffledOrder.indexOf(unplacedIds[0]))
      : 0;

  // Build gradient stops for the Dialed-style colour slider track
  const gradientStops = shuffledOrder
    .map((id, idx) => {
      const hex = tiles[id]?.hex ?? '#333';
      const pct =
        shuffledOrder.length > 1
          ? Math.round((idx / (shuffledOrder.length - 1)) * 100)
          : 50;
      return `${hex} ${pct}%`;
    })
    .join(', ');

  const handleRangeScrub = (e: ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    const tileId = shuffledOrder[idx];
    if (tileId) {
      onSelectTile(tileId);
    }
  };

  const handleTilePointerDown = useCallback(
    (tileId: string, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      setDragState({
        tileId,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        hasMovedPastThreshold: false,
        hoveredSlotIndex: null,
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragState) return;

    const findUnderlyingBoardSlot = (
      clientX: number,
      clientY: number,
    ): number | null => {
      if (
        typeof document === 'undefined' ||
        typeof document.elementsFromPoint !== 'function'
      ) {
        return null;
      }
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        const slotBtn = (el as HTMLElement).closest?.('[data-slot-index]');
        if (slotBtn) {
          const rawIdx = slotBtn.getAttribute('data-slot-index');
          if (rawIdx !== null) {
            const parsed = Number(rawIdx);
            if (Number.isInteger(parsed)) {
              return parsed;
            }
          }
        }
      }
      return null;
    };

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const dist = Math.hypot(dx, dy);

      const hasMovedPastThreshold =
        dragState.hasMovedPastThreshold || dist >= DRAG_THRESHOLD_PX;

      const hoveredSlotIndex = hasMovedPastThreshold
        ? findUnderlyingBoardSlot(e.clientX, e.clientY)
        : null;

      onHoverBoardSlotChange?.(hoveredSlotIndex);

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              hasMovedPastThreshold,
              hoveredSlotIndex,
            }
          : null,
      );
    };

    const handleWindowPointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return;

      if (dragState.hasMovedPastThreshold) {
        suppressClickUntilMsRef.current = Date.now() + 220;
        const targetSlot =
          findUnderlyingBoardSlot(e.clientX, e.clientY) ?? dragState.hoveredSlotIndex;

        if (targetSlot !== null) {
          onPlaceTileInSlot(dragState.tileId, targetSlot);
        }
      }

      onHoverBoardSlotChange?.(null);
      setDragState(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, {
      passive: true,
    });
    window.addEventListener('pointerup', handleWindowPointerUpOrCancel);
    window.addEventListener('pointercancel', handleWindowPointerUpOrCancel);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUpOrCancel);
      window.removeEventListener('pointercancel', handleWindowPointerUpOrCancel);
    };
  }, [dragState, onHoverBoardSlotChange, onPlaceTileInSlot]);

  const handleSliderBarDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSliderBarDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedTileId = e.dataTransfer?.getData('text/plain');
    if (!droppedTileId) return;
    const boardSlotIdx = currentBoardOrder.indexOf(droppedTileId);
    if (boardSlotIdx !== -1) {
      onRemoveTileFromBoard(boardSlotIdx);
    }
  };

  return (
    <motion.div
      data-testid="color-slider-bar"
      data-slider-bar="true"
      onDragOver={handleSliderBarDragOver}
      onDrop={handleSliderBarDrop}
      initial={shouldReduceMotion ? false : { y: -36, opacity: 0 }}
      animate={shouldReduceMotion ? undefined : { y: 0, opacity: 1 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full rounded-[22px] bg-[#0B0C10]/95 border border-white/[0.11] p-3 sm:p-3.5 shadow-[0_18px_48px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] space-y-2.5 no-select"
    >
      {/* Top status row of the slider bar */}
      <div className="flex items-center justify-between px-1 text-[11px] font-medium tracking-wide">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-[0.14em] text-white/55 font-semibold">
            Colour Slider
          </span>
          <span className="text-white/30" aria-hidden="true">
            ·
          </span>
          <span
            className="text-white/80 tabular-nums"
            data-testid="slider-remaining-count"
          >
            {unplacedIds.length === 0
              ? 'All colours placed'
              : `${unplacedIds.length} of ${totalCount} left to place`}
          </span>
        </div>

        {placedCount > 0 && (
          <button
            type="button"
            onClick={onClearBoard}
            data-testid="clear-board-button"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-white/75 hover:text-white text-[11px] font-medium transition-colors cursor-pointer focus-ring"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Swatch tiles on the slider bar (slide down from the board after memorisation) */}
      <div
        role="group"
        aria-label="Colour slider bar tiles"
        className="grid gap-2 items-center"
        style={{
          gridTemplateColumns: `repeat(${shuffledOrder.length}, minmax(0, 1fr))`,
        }}
      >
        {shuffledOrder.map((tileId, idx) => {
          const tile = tiles[tileId];
          if (!tile) return null;

          const isPlacedOnBoard = placedSet.has(tileId);
          const isSelected = selectedTileId === tileId;
          const isDraggingThis = Boolean(
            dragState && dragState.tileId === tileId && dragState.hasMovedPastThreshold,
          );

          const dragOffset =
            isDraggingThis && dragState
              ? {
                  x: dragState.currentX - dragState.startX,
                  y: dragState.currentY - dragState.startY,
                }
              : null;

          return (
            <motion.button
              key={tile.id}
              type="button"
              initial={shouldReduceMotion ? false : { y: -48, scale: 0.82, opacity: 0 }}
              animate={shouldReduceMotion ? undefined : { y: 0, scale: 1, opacity: 1 }}
              transition={{
                duration: 0.44,
                delay: idx * 0.035,
                ease: [0.22, 1, 0.36, 1],
              }}
              draggable={!isPlacedOnBoard}
              data-testid={`slider-tile-${idx}`}
              data-slider-tile-id={tile.id}
              data-tile-placed={isPlacedOnBoard ? 'true' : 'false'}
              aria-label={`${tile.colorName} colour swatch${
                isPlacedOnBoard
                  ? ' (placed on board, tap to recall)'
                  : isSelected
                    ? ' (selected)'
                    : ''
              }`}
              aria-pressed={isSelected}
              onClick={() => {
                if (Date.now() < suppressClickUntilMsRef.current) return;
                if (isPlacedOnBoard) {
                  // Clicking a ghost dock recalls that tile or selects it on the board
                  const boardIdx = currentBoardOrder.indexOf(tile.id);
                  if (boardIdx !== -1 && selectedTileId === tile.id) {
                    onRemoveTileFromBoard(boardIdx);
                  } else {
                    onSelectTile(tile.id);
                  }
                  return;
                }
                onSelectTile(tile.id);
              }}
              onPointerDown={(e) => {
                if (isPlacedOnBoard) return;
                handleTilePointerDown(tile.id, e);
              }}
              onDragStart={(e) => {
                if (isPlacedOnBoard) return;
                const nativeDrag = e as unknown as DragEvent<HTMLButtonElement>;
                nativeDrag.dataTransfer?.setData('text/plain', tile.id);
                onSelectTile(tile.id);
              }}
              className={`
                relative aspect-square w-full rounded-[13px] flex items-center justify-center focus-ring
                ${
                  isPlacedOnBoard
                    ? 'bg-white/[0.03] border border-dashed border-white/15 opacity-35 hover:opacity-65 cursor-pointer transition-opacity'
                    : isDraggingThis
                      ? 'z-40 ring-2 ring-white shadow-[0_18px_40px_rgba(0,0,0,0.85)] cursor-grabbing'
                      : isSelected
                        ? 'ring-[2.5px] ring-white ring-offset-2 ring-offset-[#0B0C10] scale-[1.06] z-20 shadow-[0_0_22px_rgba(255,255,255,0.32)] cursor-grab active:cursor-grabbing transition-transform duration-150'
                        : 'border border-white/20 shadow-[0_6px_14px_rgba(0,0,0,0.45)] hover:scale-[1.04] cursor-grab active:cursor-grabbing transition-transform duration-150'
                }
              `}
              style={{
                backgroundColor: isPlacedOnBoard ? 'transparent' : tile.hex,
                transform:
                  isDraggingThis && dragOffset
                    ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.12)`
                    : undefined,
                touchAction: 'none',
              }}
            >
              {!isPlacedOnBoard && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[13px] bg-gradient-to-b from-white/25 via-transparent to-black/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                />
              )}

              {!isPlacedOnBoard && showSymbols && (
                <TileSymbol
                  symbolId={tile.symbolId}
                  className="w-4 h-4 sm:w-5 sm:h-5 relative z-10"
                />
              )}

              {isPlacedOnBoard && (
                <Check className="w-3.5 h-3.5 text-white/55" aria-hidden="true" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Dialed.gg-inspired continuous tactile scrubber rail */}
      <div className="relative pt-1 px-1 flex items-center">
        <div
          aria-hidden="true"
          className="w-full h-2.5 rounded-full border border-white/15 shadow-inner overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${gradientStops})`,
          }}
        />
        <input
          type="range"
          min={0}
          max={Math.max(0, shuffledOrder.length - 1)}
          step={1}
          value={selectedSliderIndex}
          onChange={handleRangeScrub}
          aria-label="Slide to scrub across colours"
          data-testid="color-slider-range"
          className="dialed-slider-input absolute inset-x-1 w-[calc(100%-0.5rem)] h-6 opacity-100 cursor-grab active:cursor-grabbing"
        />
      </div>
    </motion.div>
  );
});
