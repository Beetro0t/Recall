import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { getRoundConfig } from '../game/config';
import type { RoundResult } from '../game/types';

export interface ScoreCardProps {
  result: RoundResult;
}

export function ScoreCard({ result }: ScoreCardProps) {
  const config = getRoundConfig(result.roundId);
  const isSuccess = result.status === 'success';
  const isMismatch = !isSuccess && result.failureReason === 'mismatch';
  const remainingSec = Math.floor(result.remainingMs / 1000);
  const matchedTiles = result.matchedTiles ?? (isSuccess ? config.tileCount : 0);

  return (
    <div
      data-testid={`round-score-card-${result.roundId}`}
      className="w-full p-3.5 rounded-[14px] bg-[#16181E] border border-[#2D313B] flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${
            isSuccess
              ? 'bg-[#73C8AC]/15 text-[#73C8AC]'
              : 'bg-[#F18D83]/15 text-[#F18D83]'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          ) : isMismatch ? (
            <XCircle className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Clock className="w-4 h-4" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#F5F5F7]">
              Round {result.roundId}
            </span>
            <span className="text-xs text-[#9297A3] tabular-nums">
              · {matchedTiles}/{config.tileCount} tiles matched
            </span>
          </div>
          <div className="text-xs text-[#9297A3] tabular-nums mt-0.5">
            {isSuccess
              ? `${result.swaps} swaps (optimal ${result.optimalSwaps}) · ${remainingSec}s left`
              : isMismatch
                ? `Pattern mismatch · ${result.swaps} swaps`
                : `Time's up · ${result.swaps} swaps`}
          </div>
        </div>
      </div>

      <div className="text-right tabular-nums">
        <span
          className={`text-base font-semibold ${
            isSuccess ? 'text-[#F5F5F7]' : 'text-[#9297A3]'
          }`}
        >
          +{result.score}
        </span>
        <span className="block text-[11px] text-[#9297A3]">pts</span>
      </div>
    </div>
  );
}
