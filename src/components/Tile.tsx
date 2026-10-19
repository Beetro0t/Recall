import { memo } from 'react';
import type { DragEvent, PointerEvent } from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { BoardCellCoord, Tile as TileModel } from '../game/types';
import { TileSymbol } from './TileSymbol';

export interface TileProps {
  tile: TileModel;
  positionIndex: number;
  cellCoord?: BoardCellCoord;
  interactive: boolean;
  isSelected: boolean;
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
  onActivate?: (tileId: string) => void;
  onTilePointerDown?: (tileId: string, e: PointerEvent<HTMLButtonElement>) => void;
  onNativeDragStart?: (tileId: string) => void;
  onNativeDragOver?: (tileId: string, e: DragEvent<HTMLButtonElement>) => void;
  onNativeDrop?: (tileId: string, e: DragEvent<HTMLButtonElement>) => void;
}

export const Tile = memo(function Tile({
  tile,
  positionIndex,
  cellCoord,
  interactive,
  isSelected,
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
  onActivate,
  onTilePointerDown,
  onNativeDragStart,
  onNativeDragOver,
  onNativeDrop,
}: TileProps) {
  const positionNumber = positionIndex + 1;

  const label = isConcealed
    ? `Position ${positionNumber}: Concealed tile`
    : `Position ${positionNumber}: ${tile.colorName} tile${
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
    onActivate?.(tile.id);
  };

  const radiusClass =
    sizeVariant === 'mini'
      ? 'rounded-[9px]'
      : sizeVariant === 'compact'
        ? 'rounded-[12px]'
        : 'rounded-[16px]';

  return (
    <motion.button
      type="button"
      layout={!shouldReduceMotion && !isDragging}
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
                  duration: 0.18,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
      }
      disabled={!interactive || isConcealed}
      draggable={interactive && !isConcealed}
      aria-label={label}
      aria-pressed={interactive ? isSelected : undefined}
      data-testid={`board-tile-${positionIndex}`}
      data-tile-id={tile.id}
      data-tile-color={tile.colorId}
      onClick={handleClick}
      onPointerDown={(e) => {
        if (!interactive || isConcealed) return;
        onTilePointerDown?.(tile.id, e);
      }}
      onDragStart={() => {
        if (!interactive || isConcealed) return;
        onNativeDragStart?.(tile.id);
      }}
      onDragOver={(e) => {
        if (!interactive || isConcealed) return;
        onNativeDragOver?.(tile.id, e);
      }}
      onDrop={(e) => {
        if (!interactive || isConcealed) return;
        onNativeDrop?.(tile.id, e);
      }}
      className={`
        group relative z-10 aspect-square w-full ${radiusClass} no-select focus-ring
        flex items-center justify-center
        ${
          interactive && !isConcealed
            ? 'cursor-grab active:cursor-grabbing hover:brightness-[1.06]'
            : 'cursor-default'
        }
        ${
          isDragging
            ? 'z-30 shadow-[0_18px_38px_rgba(0,0,0,0.65)] ring-2 ring-white/90'
            : 'transition-transform duration-120'
        }
        ${
          !isDragging && isSelected
            ? 'ring-[3px] ring-[#91ADFF] ring-offset-2 ring-offset-[#101114] scale-[0.95] z-20 shadow-[0_0_24px_rgba(145,173,255,0.35)]'
            : ''
        }
        ${
          !isDragging && isDropTarget
            ? 'ring-[3px] ring-white/90 ring-offset-2 ring-offset-[#101114] scale-[1.04] z-20'
            : ''
        }
        ${
          !isSelected && !isDropTarget && !isDragging
            ? 'border border-white/15 shadow-[0_6px_16px_rgba(0,0,0,0.28)]'
            : ''
        }
        ${
          isSuccessHighlight
            ? 'ring-2 ring-[#73C8AC] ring-offset-1 ring-offset-[#101114]'
            : ''
        }
        ${
          matchStatus === 'mismatch'
            ? 'ring-2 ring-[#F18D83]/90 ring-offset-1 ring-offset-[#101114]'
            : matchStatus === 'correct'
              ? 'ring-2 ring-[#73C8AC]/85 ring-offset-1 ring-offset-[#101114]'
              : ''
        }
      `}
      style={{
        backgroundColor: isConcealed ? '#20232B' : tile.hex,
        gridColumnStart: cellCoord?.col,
        gridRowStart: cellCoord?.row,
        transform:
          isDragging && dragOffset
            ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.06)`
            : undefined,
        touchAction: interactive ? 'none' : 'manipulation',
      }}
    >
      {/* Tactile ceramic top-lighting and inner bezel */}
      {!isConcealed && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${radiusClass} bg-gradient-to-b from-white/18 via-transparent to-black/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]`}
        />
      )}

      {/* Optional colour-independent geometric symbol */}
      {!isConcealed && showSymbol && (
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
      {isSelected && !isConcealed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#F5F5F7] border border-[#101114] shadow-sm"
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
              ? 'bg-[#101114]/90 text-[#73C8AC]'
              : 'bg-[#101114]/90 text-[#F18D83]'
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
