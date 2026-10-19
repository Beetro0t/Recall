import { FastForward, RotateCcw, Shuffle, Terminal } from 'lucide-react';
import { ROUND_CONFIGS } from '../game/config';
import type { GamePhase } from '../game/types';

export interface DevToolbarProps {
  challengeId: string;
  currentRoundId: number;
  phase: GamePhase;
  onResetAndReplay: () => void;
  onNextDailyPuzzle: () => void;
  onJumpToRound: (roundId: number) => void;
  onSkipMemoriseTimer: () => void;
}

export function DevToolbar({
  challengeId,
  currentRoundId,
  phase,
  onResetAndReplay,
  onNextDailyPuzzle,
  onJumpToRound,
  onSkipMemoriseTimer,
}: DevToolbarProps) {
  const canSkipMemorise = phase === 'memorising' || phase === 'concealing';

  return (
    <div
      className="w-full mb-2 px-3 py-2 rounded-[14px] bg-[#191B24] border border-[#91ADFF]/35 flex flex-wrap items-center justify-between gap-2 text-xs shadow-md"
      data-testid="dev-toolbar"
    >
      <div className="flex items-center gap-1.5 text-[#91ADFF] font-semibold">
        <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
        <span>DEV</span>
        <span className="text-[#9297A3] font-normal tabular-nums">({challengeId})</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onResetAndReplay}
          data-testid="dev-reset-replay-button"
          className="px-2.5 py-1 rounded-[8px] bg-[#91ADFF]/15 text-[#91ADFF] hover:bg-[#91ADFF]/25 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors focus-ring"
          title="Unlock daily limit and replay from Round 1"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          <span>Replay</span>
        </button>

        <button
          type="button"
          onClick={onNextDailyPuzzle}
          data-testid="dev-next-puzzle-button"
          className="px-2.5 py-1 rounded-[8px] bg-[#24262D] text-[#F5F5F7] hover:bg-[#2F323C] font-medium inline-flex items-center gap-1 cursor-pointer transition-colors focus-ring"
          title="Load next day's puzzle seed"
        >
          <Shuffle className="w-3 h-3" aria-hidden="true" />
          <span>New Seed</span>
        </button>

        {canSkipMemorise && (
          <button
            type="button"
            onClick={onSkipMemoriseTimer}
            data-testid="dev-skip-timer-button"
            className="px-2.5 py-1 rounded-[8px] bg-[#73C8AC]/15 text-[#73C8AC] hover:bg-[#73C8AC]/25 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors focus-ring"
            title="Skip memorisation timer"
          >
            <FastForward className="w-3 h-3" aria-hidden="true" />
            <span>Skip Timer</span>
          </button>
        )}

        <div className="inline-flex items-center rounded-[8px] bg-[#101114] border border-[#2D313B] p-0.5">
          {ROUND_CONFIGS.map((r) => (
            <button
              key={r.roundId}
              type="button"
              onClick={() => onJumpToRound(r.roundId)}
              data-testid={`dev-jump-r${r.roundId}`}
              className={`px-2 py-0.5 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-colors ${
                currentRoundId === r.roundId && phase !== 'results'
                  ? 'bg-[#91ADFF] text-[#101114]'
                  : 'text-[#9297A3] hover:text-[#F5F5F7]'
              }`}
              title={`Jump to Round ${r.roundId}`}
            >
              R{r.roundId}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
