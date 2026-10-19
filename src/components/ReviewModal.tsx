import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Eye, X, XCircle } from 'lucide-react';
import { countMatchedTiles } from '../game/board';
import { getRoundConfig } from '../game/config';
import { getRoundPuzzle } from '../game/stateMachine';
import type { DailyChallenge, RoundResult } from '../game/types';
import { GameBoard } from './GameBoard';
import { PrimaryButton } from './PrimaryButton';

export interface ReviewModalProps {
  isOpen: boolean;
  challenge: DailyChallenge;
  results: readonly RoundResult[];
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onClose: () => void;
}

export function ReviewModal({
  isOpen,
  challenge,
  results,
  showSymbols,
  shouldReduceMotion,
  onClose,
}: ReviewModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<number>(
    () => results[0]?.roundId ?? 1,
  );

  useEffect(() => {
    if (!isOpen) return;
    if (results.length > 0 && !results.some((r) => r.roundId === selectedRoundId)) {
      setSelectedRoundId(results[0].roundId);
    }
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, results, selectedRoundId]);

  if (!isOpen || results.length === 0) return null;

  const activeResult = results.find((r) => r.roundId === selectedRoundId) ?? results[0];
  const config = getRoundConfig(activeResult.roundId);
  const puzzle = getRoundPuzzle(challenge, activeResult.roundId);

  const playerOrder =
    activeResult.finalTileOrder &&
    activeResult.finalTileOrder.length === puzzle.targetOrder.length
      ? activeResult.finalTileOrder
      : puzzle.targetOrder;

  const matchedCount =
    activeResult.matchedTiles ?? countMatchedTiles(playerOrder, puzzle.targetOrder);
  const totalCount = activeResult.totalTiles ?? puzzle.targetOrder.length;
  const isSuccess = activeResult.status === 'success';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      data-testid="review-modal"
    >
      <div className="w-full max-w-[460px] max-h-[92dvh] flex flex-col rounded-[22px] bg-[#16181E] border border-[#2D313B] p-4 sm:p-5 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2D313B]">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#91ADFF]" aria-hidden="true" />
            <h2
              id="review-modal-title"
              className="text-base sm:text-lg font-semibold text-[#F5F5F7]"
            >
              Detailed Board Inspector
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close review"
            data-testid="close-review-button"
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[#9297A3] hover:text-[#F5F5F7] hover:bg-[#24262D] cursor-pointer focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Round selector tabs */}
        <div
          className="grid grid-cols-3 gap-2 my-3.5"
          role="tablist"
          aria-label="Select round to review"
        >
          {results.map((res) => {
            const isSelected = res.roundId === activeResult.roundId;
            const roundPassed = res.status === 'success';
            return (
              <button
                key={res.roundId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-testid={`review-tab-round-${res.roundId}`}
                onClick={() => setSelectedRoundId(res.roundId)}
                className={`py-2 px-3 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer focus-ring ${
                  isSelected
                    ? 'bg-[#24262D] text-[#F5F5F7] border-[#91ADFF]/60 shadow-xs'
                    : 'bg-[#1B1D22]/60 text-[#9297A3] border-[#2D313B] hover:text-[#F5F5F7]'
                }`}
              >
                {roundPassed ? (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-[#73C8AC]"
                    aria-hidden="true"
                  />
                ) : res.failureReason === 'mismatch' ? (
                  <XCircle className="w-3.5 h-3.5 text-[#F18D83]" aria-hidden="true" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-[#F18D83]" aria-hidden="true" />
                )}
                <span>Round {res.roundId}</span>
              </button>
            );
          })}
        </div>

        {/* Round telemetry summary */}
        <div className="p-3 rounded-[14px] bg-[#1B1D22] border border-[#2D313B] flex items-center justify-between text-xs tabular-nums mb-4">
          <div className="space-y-0.5">
            <span className="font-semibold text-[#F5F5F7] block">
              {puzzle.pattern.patternName} ·{' '}
              {isSuccess
                ? 'All Tiles Matched'
                : activeResult.failureReason === 'mismatch'
                  ? 'Partial Match'
                  : "Time's Up"}
            </span>
            <span className="text-[#9297A3] block">
              {matchedCount}/{totalCount} tiles right · {activeResult.swaps} swaps
              (optimal {activeResult.optimalSwaps})
            </span>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-[#73C8AC]">
              +{activeResult.score} pts
            </span>
            <span className="block text-[11px] text-[#9297A3]">
              {(activeResult.remainingMs / 1000).toFixed(1)}s left
            </span>
          </div>
        </div>

        {/* Side-by-Side Comparison: What You Did vs Target Solution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
          <div
            className="space-y-1.5 text-center"
            data-testid={`review-player-board-r${activeResult.roundId}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F7] block">
              What You Did ({matchedCount}/{totalCount})
            </span>
            <GameBoard
              tileOrder={playerOrder}
              tiles={puzzle.tiles}
              columns={config.columns}
              pattern={puzzle.pattern}
              interactive={false}
              selectedTileId={null}
              compareTargetOrder={puzzle.targetOrder}
              showSymbols={showSymbols}
              shouldReduceMotion={shouldReduceMotion}
              sizeVariant="compact"
              ariaLabel={`Round ${activeResult.roundId} your submitted arrangement`}
            />
          </div>

          <div
            className="space-y-1.5 text-center"
            data-testid={`review-solution-board-r${activeResult.roundId}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-[#73C8AC] block">
              Target Solution
            </span>
            <GameBoard
              tileOrder={puzzle.targetOrder}
              tiles={puzzle.tiles}
              columns={config.columns}
              pattern={puzzle.pattern}
              interactive={false}
              selectedTileId={null}
              isSuccessHighlight={true}
              showSymbols={showSymbols}
              shouldReduceMotion={shouldReduceMotion}
              sizeVariant="compact"
              ariaLabel={`Round ${activeResult.roundId} target solution arrangement`}
            />
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-[#2D313B]">
          <PrimaryButton
            variant="secondary"
            onClick={onClose}
            data-testid="done-review-button"
          >
            Done Reviewing
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
