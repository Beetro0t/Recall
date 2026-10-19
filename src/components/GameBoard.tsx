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
}

interface ActiveDragState {
  tileId: string;
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  hasMovedPastThreshold: boolean;
  hoveredTargetId: string | null;
}

const DRAG_THRESHOLD_PX = 7;

export const GameBoard = memo(function GameBoard({
  tileOrder,
  tiles,
  columns,
  pattern,
  interactive,
  selectedTileId,
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
}: GameBoardProps) {
  const [dragState, setDragState] = useState<ActiveDragState | null>(null);
  const [nativeDragSourceId, setNativeDragSourceId] = useState<string | null>(null);
  const [nativeDropTargetId, setNativeDropTargetId] = useState<string | null>(null);

  const suppressClickUntilMsRef = useRef<number>(0);

  const effectiveCols = pattern ? pattern.columns : columns;
  const effectiveRows = pattern
    ? pattern.rows
    : Math.ceil(tileOrder.length / Math.max(1, effectiveCols));

  const maxWidthClass =
    sizeVariant === 'mini'
      ? effectiveCols <= 2
        ? 'max-w-[120px]'
        : effectiveCols === 3
          ? 'max-w-[155px]'
          : 'max-w-[185px]'
      : sizeVariant === 'compact'
        ? effectiveCols <= 2
          ? 'max-w-[180px]'
          : effectiveCols === 3
            ? 'max-w-[245px]'
            : 'max-w-[295px]'
        : effectiveCols <= 2
          ? 'max-w-[250px]'
          : effectiveCols === 3
            ? effectiveRows >= 3
              ? 'max-w-[310px]'
              : 'max-w-[345px]'
            : effectiveRows >= 4
              ? 'max-w-[330px]'
              : effectiveRows === 3
                ? 'max-w-[375px]'
                : 'max-w-[425px]';

  const gapClass =
    sizeVariant === 'mini'
      ? 'gap-1.5 p-2 rounded-[14px]'
      : sizeVariant === 'compact'
        ? 'gap-2 p-2.5 rounded-[16px]'
        : 'gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-[22px]';

  const handleTilePointerDown = useCallback(
    (tileId: string, e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!interactive || isConcealed) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      setDragState({
        tileId,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        hasMovedPastThreshold: false,
        hoveredTargetId: null,
      });
    },
    [interactive, isConcealed],
  );

  useEffect(() => {
    if (!dragState) return;

    const findUnderlyingTileId = (
      clientX: number,
      clientY: number,
      sourceTileId: string,
    ): string | null => {
      if (
        typeof document === 'undefined' ||
        typeof document.elementsFromPoint !== 'function'
      ) {
        return null;
      }
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        const button = (el as HTMLElement).closest?.('[data-tile-id]');
        if (button) {
          const candidateId = button.getAttribute('data-tile-id');
          if (candidateId && candidateId !== sourceTileId) {
            return candidateId;
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

      const hoveredTargetId = hasMovedPastThreshold
        ? findUnderlyingTileId(e.clientX, e.clientY, dragState.tileId)
        : null;

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              hasMovedPastThreshold,
              hoveredTargetId,
            }
          : null,
      );
    };

    const handleWindowPointerUpOrCancel = (e: PointerEvent) => {
      if (e.pointerId !== dragState.pointerId) return;

      if (dragState.hasMovedPastThreshold) {
        suppressClickUntilMsRef.current = Date.now() + 220;
        const targetId =
          findUnderlyingTileId(e.clientX, e.clientY, dragState.tileId) ??
          dragState.hoveredTargetId;

        if (targetId && targetId !== dragState.tileId) {
          if (onDirectSwap) {
            onDirectSwap(dragState.tileId, targetId);
          } else if (onTileActivate) {
            onTileActivate(dragState.tileId);
            onTileActivate(targetId);
          }
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
  }, [dragState, onDirectSwap, onTileActivate]);

  const handleTileActivateGuarded = useCallback(
    (tileId: string) => {
      if (Date.now() < suppressClickUntilMsRef.current) {
        return;
      }
      onTileActivate?.(tileId);
    },
    [onTileActivate],
  );

  const handleNativeDragStart = useCallback((tileId: string) => {
    setNativeDragSourceId(tileId);
  }, []);

  const handleNativeDragOver = useCallback(
    (tileId: string, e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (nativeDragSourceId && nativeDragSourceId !== tileId) {
        setNativeDropTargetId(tileId);
      }
    },
    [nativeDragSourceId],
  );

  const handleNativeDrop = useCallback(
    (tileId: string, e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const sourceId = nativeDragSourceId || e.dataTransfer?.getData('text/plain');
      setNativeDragSourceId(null);
      setNativeDropTargetId(null);
      if (sourceId && sourceId !== tileId) {
        if (onDirectSwap) {
          onDirectSwap(sourceId, tileId);
        } else if (onTileActivate) {
          onTileActivate(sourceId);
          onTileActivate(tileId);
        }
      }
    },
    [nativeDragSourceId, onDirectSwap, onTileActivate],
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

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid="game-board"
      data-columns={effectiveCols}
      data-pattern={pattern?.patternId ?? 'grid'}
      className={`
        relative w-full mx-auto grid ${maxWidthClass} ${gapClass}
        bg-[#16181E]/95 border border-[#2D313B]
        shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]
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
            stroke="rgba(145, 173, 255, 0.22)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 3"
          />
        </svg>
      )}

      {tileOrder.map((tileId, index) => {
        const tile = tiles[tileId];
        if (!tile) return null;

        const isDraggingThis = Boolean(
          dragState && dragState.tileId === tile.id && dragState.hasMovedPastThreshold,
        );
        const isDropTargetThis =
          (dragState?.hasMovedPastThreshold && dragState.hoveredTargetId === tile.id) ||
          nativeDropTargetId === tile.id;

        const dragOffset =
          isDraggingThis && dragState
            ? {
                x: dragState.currentX - dragState.startX,
                y: dragState.currentY - dragState.startY,
              }
            : null;

        const matchStatus = compareTargetOrder
          ? compareTargetOrder[index] === tile.id
            ? 'correct'
            : 'mismatch'
          : null;

        const cellCoord = pattern?.cells[index];

        return (
          <Tile
            key={tile.id}
            tile={tile}
            positionIndex={index}
            cellCoord={cellCoord}
            interactive={interactive}
            isSelected={selectedTileId === tile.id}
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
            onActivate={handleTileActivateGuarded}
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
