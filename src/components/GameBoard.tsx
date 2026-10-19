import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { BoardPattern, Tile as TileModel } from '../game/types';
import { Tile } from './Tile';

export interface GameBoardProps {
  tileOrder: readonly string[];
  tiles: Record<string, TileModel>;
  columns: number;
  pattern?: BoardPattern;
  interactive: boolean;
  selectedTileId: string | null;
  selectedSlotIndex?: number | null;
  externalHoveredSlotIndex?: number | null;
  compareTargetOrder?: readonly string[] | null;
  isConcealed?: boolean;
  isSuccessHighlight?: boolean;
  isCelebration?: boolean;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  sizeVariant?: 'normal' | 'compact' | 'mini';
  ariaLabel?: string;
  onTileActivate?: (tileId: string) => void;
  onDirectSwap?: (tileIdA: string, tileIdB: string) => void;
  onSlotActivate?: (slotIndex: number, tileId: string | null) => void;
  onPlaceTileInSlot?: (tileId: string, slotIndex: number) => void;
  onRemoveTileFromSlot?: (slotIndex: number) => void;
}

interface ActiveDragState {
  tileId: string;
  sourceSlotIndex: number;
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hasMovedPastThreshold: boolean;
  hoveredSlotIndex: number | null;
  hoveredOverSliderBar: boolean;
}

const DRAG_THRESHOLD_PX = 7;

export const GameBoard = memo(function GameBoard({
  tileOrder,
  tiles,
  columns,
  pattern,
  interactive,
  selectedTileId,
  selectedSlotIndex = null,
  externalHoveredSlotIndex = null,
  compareTargetOrder = null,
  isConcealed = false,
  isSuccessHighlight = false,
  isCelebration = false,
  showSymbols,
  shouldReduceMotion,
  sizeVariant = 'normal',
  ariaLabel = 'Puzzle tile grid',
  onTileActivate,
  onDirectSwap,
  onSlotActivate,
  onPlaceTileInSlot,
  onRemoveTileFromSlot,
}: GameBoardProps) {
  const [dragState, setDragState] = useState<ActiveDragState | null>(null);
  const [nativeDragSourceId, setNativeDragSourceId] = useState<string | null>(null);
  const [nativeDropSlotIndex, setNativeDropSlotIndex] = useState<number | null>(null);

  const suppressClickUntilMsRef = useRef<number>(0);

  const effectiveCols = pattern ? pattern.columns : columns;
  const effectiveRows = pattern
    ? pattern.rows
    : Math.ceil(tileOrder.length / Math.max(1, effectiveCols));

  const maxWidthClass =
    sizeVariant === 'mini'
      ? effectiveCols <= 2
        ? 'max-w-[115px]'
        : effectiveCols === 3
          ? 'max-w-[150px]'
          : 'max-w-[180px]'
      : sizeVariant === 'compact'
        ? effectiveCols <= 2
          ? 'max-w-[175px]'
          : effectiveCols === 3
            ? 'max-w-[235px]'
            : 'max-w-[285px]'
        : effectiveCols <= 2
          ? 'max-w-[235px]'
          : effectiveCols === 3
            ? effectiveRows >= 3
              ? 'max-w-[295px]'
              : 'max-w-[330px]'
            : effectiveRows >= 4
              ? 'max-w-[310px]'
              : effectiveRows === 3
                ? 'max-w-[355px]'
                : 'max-w-[400px]';

  const gapClass =
    sizeVariant === 'mini'
      ? 'gap-1.5 p-2 rounded-[14px]'
      : sizeVariant === 'compact'
        ? 'gap-2 p-2.5 rounded-[18px]'
        : 'gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-[24px]';

  const handleTilePointerDown = useCallback(
    (slotIndex: number, tileId: string, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!interactive || isConcealed || !tileId) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      setDragState({
        tileId,
        sourceSlotIndex: slotIndex,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        hasMovedPastThreshold: false,
        hoveredSlotIndex: null,
        hoveredOverSliderBar: false,
      });
    },
    [interactive, isConcealed],
  );

  useEffect(() => {
    if (!dragState) return;

    const inspectDropTarget = (
      clientX: number,
      clientY: number,
      sourceSlotIndex: number,
    ): { slotIndex: number | null; overSliderBar: boolean } => {
      if (
        typeof document === 'undefined' ||
        typeof document.elementsFromPoint !== 'function'
      ) {
        return { slotIndex: null, overSliderBar: false };
      }
      const elements = document.elementsFromPoint(clientX, clientY);
      let foundSlot: number | null = null;
      let overSlider = false;

      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        const slotBtn = htmlEl.closest?.('[data-slot-index]');
        if (slotBtn && foundSlot === null) {
          const rawIdx = slotBtn.getAttribute('data-slot-index');
          if (rawIdx !== null) {
            const parsed = Number(rawIdx);
            if (Number.isInteger(parsed) && parsed !== sourceSlotIndex) {
              foundSlot = parsed;
            }
          }
        }
        if (htmlEl.closest?.('[data-slider-bar="true"]')) {
          overSlider = true;
        }
      }
      return { slotIndex: foundSlot, overSliderBar: overSlider };
    };

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const dist = Math.hypot(dx, dy);

      const hasMovedPastThreshold =
        dragState.hasMovedPastThreshold || dist >= DRAG_THRESHOLD_PX;

      const hit = hasMovedPastThreshold
        ? inspectDropTarget(e.clientX, e.clientY, dragState.sourceSlotIndex)
        : { slotIndex: null, overSliderBar: false };

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              hasMovedPastThreshold,
              hoveredSlotIndex: hit.slotIndex,
              hoveredOverSliderBar: hit.overSliderBar,
            }
          : null,
      );
    };

    const handleWindowPointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return;

      if (dragState.hasMovedPastThreshold) {
        suppressClickUntilMsRef.current = Date.now() + 220;
        const hit = inspectDropTarget(e.clientX, e.clientY, dragState.sourceSlotIndex);
        const targetSlotIndex = hit.slotIndex ?? dragState.hoveredSlotIndex;
        const overSlider = hit.overSliderBar || dragState.hoveredOverSliderBar;

        if (targetSlotIndex !== null && targetSlotIndex !== dragState.sourceSlotIndex) {
          if (onPlaceTileInSlot) {
            onPlaceTileInSlot(dragState.tileId, targetSlotIndex);
          } else {
            const targetTileId = tileOrder[targetSlotIndex];
            if (targetTileId && onDirectSwap) {
              onDirectSwap(dragState.tileId, targetTileId);
            }
          }
        } else if (overSlider && onRemoveTileFromSlot) {
          onRemoveTileFromSlot(dragState.sourceSlotIndex);
        }
      }

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
  }, [dragState, onDirectSwap, onPlaceTileInSlot, onRemoveTileFromSlot, tileOrder]);

  const handleSlotActivateGuarded = useCallback(
    (slotIndex: number, tileId: string | null) => {
      if (Date.now() < suppressClickUntilMsRef.current) {
        return;
      }
      if (onSlotActivate) {
        onSlotActivate(slotIndex, tileId);
      } else if (tileId && onTileActivate) {
        onTileActivate(tileId);
      }
    },
    [onSlotActivate, onTileActivate],
  );

  const handleNativeDragStart = useCallback((tileId: string) => {
    setNativeDragSourceId(tileId);
  }, []);

  const handleNativeDragOver = useCallback(
    (slotIndex: number, e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setNativeDropSlotIndex(slotIndex);
    },
    [],
  );

  const handleNativeDrop = useCallback(
    (slotIndex: number, e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const sourceTileId =
        nativeDragSourceId || e.dataTransfer?.getData('text/plain') || selectedTileId;
      setNativeDragSourceId(null);
      setNativeDropSlotIndex(null);

      if (!sourceTileId) return;

      if (onPlaceTileInSlot) {
        onPlaceTileInSlot(sourceTileId, slotIndex);
        return;
      }

      const targetTileId = tileOrder[slotIndex];
      if (targetTileId && sourceTileId !== targetTileId) {
        if (onDirectSwap) {
          onDirectSwap(sourceTileId, targetTileId);
        } else if (onTileActivate) {
          onTileActivate(sourceTileId);
          onTileActivate(targetTileId);
        }
      }
    },
    [
      nativeDragSourceId,
      onDirectSwap,
      onPlaceTileInSlot,
      onTileActivate,
      selectedTileId,
      tileOrder,
    ],
  );

  // Build SVG path points if pattern specifies connectPath (e.g. Snake, Diamond, Hollow Box, Arch)
  const svgPoints =
    pattern?.connectPath && pattern.cells.length > 1
      ? [...pattern.cells, ...(pattern.closePath ? [pattern.cells[0]] : [])]
          .map((c) => {
            const x = ((c.col - 0.5) / effectiveCols) * 100;
            const y = ((c.row - 0.5) / effectiveRows) * 100;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ')
      : null;

  const isAnySliderTileSelected = Boolean(
    selectedTileId && !tileOrder.includes(selectedTileId),
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid="game-board"
      data-columns={effectiveCols}
      data-pattern={pattern?.patternId ?? 'grid'}
      className={`
        relative w-full mx-auto grid ${maxWidthClass} ${gapClass}
        bg-[#090A0E]/95 border border-white/[0.09]
        shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)]
        no-select
      `}
      style={{
        gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${effectiveRows}, minmax(0, 1fr))`,
      }}
    >
      {/* Subtle geometric connector path behind tiles for Snake, Diamond, Ring, and Line patterns */}
      {svgPoints && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-3 sm:inset-4 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] h-[calc(100%-1.5rem)] sm:h-[calc(100%-2rem)] z-0 overflow-visible"
        >
          <polyline
            points={svgPoints}
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 3"
          />
        </svg>
      )}

      {tileOrder.map((tileId, index) => {
        const tile = tileId ? (tiles[tileId] ?? null) : null;

        const isDraggingThis = Boolean(
          dragState &&
          dragState.sourceSlotIndex === index &&
          dragState.hasMovedPastThreshold,
        );
        const isDropTargetThis =
          (dragState?.hasMovedPastThreshold && dragState.hoveredSlotIndex === index) ||
          nativeDropSlotIndex === index ||
          externalHoveredSlotIndex === index;

        const dragOffset =
          isDraggingThis && dragState
            ? {
                x: dragState.currentX - dragState.startX,
                y: dragState.currentY - dragState.startY,
              }
            : null;

        const matchStatus = compareTargetOrder
          ? tile && compareTargetOrder[index] === tile.id
            ? 'correct'
            : 'mismatch'
          : null;

        const cellCoord = pattern?.cells[index];
        const isSelected = Boolean(
          (tile && selectedTileId === tile.id) ||
          (!tile && selectedSlotIndex === index),
        );

        return (
          <Tile
            key={tile ? tile.id : `empty-slot-${index}`}
            tile={tile}
            positionIndex={index}
            cellCoord={cellCoord}
            interactive={interactive}
            isSelected={isSelected}
            isTargetSlotHighlighted={!tile && isAnySliderTileSelected}
            isDragging={isDraggingThis}
            isDropTarget={Boolean(isDropTargetThis)}
            dragOffset={dragOffset}
            isConcealed={isConcealed}
            isSuccessHighlight={isSuccessHighlight}
            isCelebration={isCelebration}
            matchStatus={matchStatus}
            showSymbol={showSymbols}
            shouldReduceMotion={shouldReduceMotion}
            sizeVariant={sizeVariant}
            onSlotActivate={handleSlotActivateGuarded}
            onTilePointerDown={handleTilePointerDown}
            onNativeDragStart={handleNativeDragStart}
            onNativeDragOver={handleNativeDragOver}
            onNativeDrop={handleNativeDrop}
          />
        );
      })}
    </div>
  );
});
