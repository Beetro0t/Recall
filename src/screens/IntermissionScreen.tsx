import { ArrowRight } from 'lucide-react';
import { getRoundConfig } from '../game/config';
import type { RoundResult } from '../game/types';
import { PrimaryButton } from '../components/PrimaryButton';

export interface IntermissionScreenProps {
  nextRoundId: number;
  previousResult: RoundResult | null;
  totalScoreSoFar: number;
  onStartNextRound: () => void;
}

export function IntermissionScreen({
  nextRoundId,
  previousResult,
  totalScoreSoFar,
  onStartNextRound,
}: IntermissionScreenProps) {
  const nextConfig = getRoundConfig(nextRoundId);
  const prevConfig = previousResult ? getRoundConfig(previousResult.roundId) : null;

  return (
    <section
      className="flex-1 flex flex-col justify-between py-4 gap-6 text-center"
      data-testid="intermission-screen"
    >
      <div className="my-auto space-y-5">
        {previousResult && prevConfig && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B1D22] border border-[#30333B] text-xs font-medium text-[#9297A3] tabular-nums">
            <span>
              Round {previousResult.roundId}{' '}
              {previousResult.status === 'success'
                ? `Complete · ${prevConfig.tileCount} tiles remembered`
                : 'Complete'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[#F5F5F7]">Score: {totalScoreSoFar}</span>
          </div>
        )}

        <div className="space-y-2">
          <h1
            className="text-3xl font-semibold tracking-tight text-[#F5F5F7]"
            data-testid="intermission-heading"
          >
            Round {nextConfig.roundId} unlocked
          </h1>
          <p className="text-base text-[#9297A3] tabular-nums">
            {nextConfig.tileCount} tiles · {nextConfig.memoriseMs / 1000} seconds to
            memorise
          </p>
        </div>

        {/* Visual preview of next round grid dimensions */}
        <div
          aria-hidden="true"
          className={`mx-auto grid gap-2 p-3.5 rounded-[16px] bg-[#1B1D22] border border-[#30333B] ${
            nextConfig.columns === 3
              ? 'grid-cols-3 max-w-[220px]'
              : 'grid-cols-4 max-w-[270px]'
          }`}
        >
          {Array.from({ length: nextConfig.tileCount }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-[8px] bg-[#24262D] border border-[#30333B]"
            />
          ))}
        </div>
      </div>

      <div>
        <PrimaryButton onClick={onStartNextRound} data-testid="start-next-round-button">
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </PrimaryButton>
      </div>
    </section>
  );
}
