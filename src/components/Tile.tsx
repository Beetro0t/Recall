import { memo } from 'react';
import type { DragEvent, PointerEvent } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { BoardCellCoord, Tile as TileModel } from '../game/types';
import { TileSymbol } from './TileSymbol';

export interface TileProps {
  tile: TileModel | null;
  positionIndex: number;
  cellCoord?: BoardCellCoord;
  interactive: boolean;
  isSelected: boolean;
  isTargetSlotHighlighted?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  dragOffset?: { x: number; y: number } | null;
  isConcealed?: boolean;
  isSuccessHighlight?: boolean;
  isCelebration?: boolean;
  matchStatus?: 'correct' | 'mismatch' | null;
  showSymbol: boolean;
  shouldReduceMotion: boolean;
  sizeVariant?: 'normal' | 'compact' | 'mini';
  onSlotActivate?: (slotIndex: number, tileId: string | null) => void;
  onTilePointerDown?: (
    slotIndex: number,
    tileId: string,
    e: PointerEvent<HTMLButtonElement>,
  ) => void;
  onNativeDragStart?: (tileId: string, slotIndex: number) => void;
  onNativeDragOver?: (slotIndex: number, e: DragEvent<HTMLButtonElement>) => void;
  onNativeDrop?: (slotIndex: number, e: DragEvent<HTMLButtonElement>) => void;
}

export const Tile = memo(function Tile({
  tile,
  positionIndex,
  cellCoord,
  interactive,
  isSelected,
  isTargetSlotHighlighted = false,
  isDragging = false,
  isDropTarget = false,
  dragOffset = null,
  isConcealed = false,
  isSuccessHighlight = false,
  isCelebration = false,
  matchStatus = null,
  showSymbol,
  shouldReduceMotion,
  sizeVariant = 'normal',
  onSlotActivate,
  onTilePointerDown,
  onNativeDragStart,
  onNativeDragOver,
  onNativeDrop,
}: TileProps) {
  const positionNumber = positionIndex + 1;
  const isEmpty = !tile;

  const label = isConcealed
    ? `Square ${positionNumber}: Concealed`
    : isEmpty
      ? `Square ${positionNumber}: Empty square${
          isSelected ? ', targeted for placement' : ''
        }${matchStatus === 'mismatch' ? ', unplaced' : ''}`
      : `Square ${positionNumber}: ${tile.colorName} tile${
          showSymbol ? ` (${tile.symbolId})` : ''
        }${isSelected ? ', selected' : ''}${
          matchStatus === 'correct'
            ? ', matched'
            : matchStatus === 'mismatch'
              ? ', misplaced'
              : ''
        }`;

  const handleClick = () => {
    if (!interactive || isConcealed) return;
    onSlotActivate?.(positionIndex, tile?.id ?? null);
  };

  const radiusClass =
    sizeVariant === 'mini'
      ? 'rounded-[10px]'
      : sizeVariant === 'compact'
        ? 'rounded-[14px]'
        : 'rounded-[18px]';

  return (
    <motion.button
      type="button"
      layout={!shouldReduceMotion && !isDragging && !isEmpty}
      initial={isCelebration && !shouldReduceMotion ? { scale: 0.85, y: 8 } : false}
      animate={
        isCelebration && !shouldReduceMotion
          ? {
              scale: [0.85, 1.09, 0.98, 1],
              y: [8, -10, 2, 0],
            }
          : undefined
      }
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : isCelebration
            ? {
                duration: 0.52,
                delay: positionIndex * 0.055,
                ease: [0.22, 1, 0.36, 1],
              }
            : {
                layout: {
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
      }
      disabled={!interactive || isConcealed}
      draggable={interactive && !isConcealed && !isEmpty}
      aria-label={label}
      aria-pressed={interactive ? isSelected : undefined}
      data-testid={`board-tile-${positionIndex}`}
      data-slot-index={positionIndex}
      data-tile-id={tile?.id ?? ''}
      data-tile-color={tile?.colorId ?? ''}
      onClick={handleClick}
      onPointerDown={(e) => {
        if (!interactive || isConcealed || !tile) return;
        onTilePointerDown?.(positionIndex, tile.id, e);
      }}
      onDragStart={(e) => {
        if (!interactive || isConcealed || !tile) return;
        const nativeDrag = e as unknown as DragEvent<HTMLButtonElement>;
        nativeDrag.dataTransfer?.setData('text/plain', tile.id);
        onNativeDragStart?.(tile.id, positionIndex);
      }}
      onDragOver={(e) => {
        if (!interactive || isConcealed) return;
        onNativeDragOver?.(positionIndex, e);
      }}
      onDrop={(e) => {
        if (!interactive || isConcealed) return;
        onNativeDrop?.(positionIndex, e);
      }}
      className={`
        group relative z-10 aspect-square w-full ${radiusClass} no-select focus-ring
        flex items-center justify-center
        ${
          interactive && !isConcealed
            ? isEmpty
              ? 'cursor-pointer hover:border-white/40 hover:bg-white/[0.06]'
              : 'cursor-grab active:cursor-grabbing hover:brightness-[1.06]'
            : 'cursor-default'
        }
        ${
          isDragging
            ? 'z-30 shadow-[0_20px_44px_rgba(0,0,0,0.75)] ring-2 ring-white'
            : 'transition-all duration-150'
        }
        ${
          isEmpty
            ? isDropTarget || isSelected
              ? 'bg-white/[0.09] border-2 border-white shadow-[0_0_24px_rgba(255,255,255,0.2),inset_0_2px_10px_rgba(0,0,0,0.6)] scale-[1.03]'
              : isTargetSlotHighlighted
                ? 'bg-white/[0.04] border-[1.5px] border-dashed border-white/45 shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]'
                : 'bg-[#0C0D12]/90 border-[1.5px] border-dashed border-white/18 shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]'
            : ''
        }
        ${
          !isEmpty && !isDragging && isSelected
            ? 'ring-[3px] ring-white ring-offset-2 ring-offset-[#050507] scale-[0.95] z-20 shadow-[0_0_28px_rgba(255,255,255,0.35)]'
            : ''
        }
        ${
          !isEmpty && !isDragging && isDropTarget
            ? 'ring-[3px] ring-white/95 ring-offset-2 ring-offset-[#050507] scale-[1.05] z-20'
            : ''
        }
        ${
          !isEmpty && !isSelected && !isDropTarget && !isDragging
            ? 'border border-white/18 shadow-[0_8px_20px_rgba(0,0,0,0.45)]'
            : ''
        }
        ${
          isSuccessHighlight && !isEmpty
            ? 'ring-2 ring-[#34D399] ring-offset-1 ring-offset-[#050507]'
            : ''
        }
        ${
          matchStatus === 'mismatch'
            ? 'ring-2 ring-[#FF6B6B]/90 ring-offset-1 ring-offset-[#050507]'
            : matchStatus === 'correct'
              ? 'ring-2 ring-[#34D399]/90 ring-offset-1 ring-offset-[#050507]'
              : ''
        }
      `}
      style={{
        backgroundColor: isConcealed ? '#14151A' : isEmpty ? undefined : tile.hex,
        gridColumnStart: cellCoord?.col,
        gridRowStart: cellCoord?.row,
        transform:
          isDragging && dragOffset
            ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.06)`
            : undefined,
        touchAction: interactive ? 'none' : 'manipulation',
      }}
    >
      {/* Empty square precision socket indicator */}
      {isEmpty && !isConcealed && (
        <span
          aria-hidden="true"
          className={`pointer-events-none flex items-center justify-center rounded-full transition-all duration-150 ${
            isDropTarget || isSelected || isTargetSlotHighlighted
              ? 'w-6 h-6 bg-white/15 text-white scale-105'
              : 'w-2 h-2 bg-white/15 group-hover:bg-white/30'
          }`}
        >
          {(isDropTarget || isSelected || isTargetSlotHighlighted) && (
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </span>
      )}

      {/* Tactile ceramic top-lighting and inner bezel for placed tiles */}
      {!isEmpty && !isConcealed && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${radiusClass} bg-gradient-to-b from-white/22 via-transparent to-black/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)]`}
        />
      )}

      {/* Optional colour-independent geometric symbol */}
      {!isEmpty && !isConcealed && showSymbol && (
        <TileSymbol
          symbolId={tile.symbolId}
          className={
            sizeVariant === 'mini'
              ? 'w-3.5 h-3.5 relative z-10'
              : sizeVariant === 'compact'
                ? 'w-5 h-5 relative z-10'
                : 'w-7 h-7 sm:w-8 sm:h-8 relative z-10 drop-shadow-xs'
          }
        />
      )}

      {/* Selected indicator dot */}
      {!isEmpty && isSelected && !isConcealed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-white border border-black shadow-sm"
        />
      )}

      {/* Review match/mismatch badge */}
      {matchStatus && !isConcealed && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1 right-1 ${
            sizeVariant === 'mini' ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } rounded-full flex items-center justify-center shadow-sm ${
            matchStatus === 'correct'
              ? 'bg-black/90 text-[#34D399]'
              : 'bg-black/90 text-[#FF6B6B]'
          }`}
        >
          {matchStatus === 'correct' ? (
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          ) : (
            <X className="w-2.5 h-2.5 stroke-[3]" />
          )}
        </span>
      )}
    </motion.button>
  );
});
