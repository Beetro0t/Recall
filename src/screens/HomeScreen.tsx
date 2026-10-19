import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Flame,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { ROUND_CONFIGS, TILE_PALETTE } from '../game/config';
import { formatChallengeNumber } from '../game/dailyChallenge';
import { calculateDailyMatchedTiles } from '../game/scoring';
import type { RoundResult } from '../game/types';
import { TileSymbol } from '../components/TileSymbol';
import { PrimaryButton } from '../components/PrimaryButton';

export interface HomeScreenProps {
  challengeId: string;
  challengeNumber: number;
  hasInProgressSession: boolean;
  isDailyCompleted: boolean;
  currentRoundId: number;
  results: readonly RoundResult[];
  effectiveStreak: number;
  bestStreak: number;
  showSymbols: boolean;
  onStartOrContinue: () => void;
  onOpenReview: () => void;
  onOpenTutorial: () => void;
}

export function HomeScreen({
  challengeId,
  challengeNumber,
  hasInProgressSession,
  isDailyCompleted,
  currentRoundId,
  results,
  effectiveStreak,
  bestStreak,
  showSymbols,
  onStartOrContinue,
  onOpenReview,
  onOpenTutorial,
}: HomeScreenProps) {
  const previewTiles = TILE_PALETTE.slice(0, 4);
  const dailyMatched = calculateDailyMatchedTiles(results);

  return (
    <section
      className="flex-1 flex flex-col justify-between py-3 gap-5"
      data-testid="home-screen"
    >
      {/* Top badge and hero section */}
      <div className="space-y-4 text-center pt-1">
        <div className="dialed-spectrum-ring inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#090A0E] text-xs font-medium text-white/65 tabular-nums shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#55EFC4]" aria-hidden="true" />
          <span className="text-white font-semibold tracking-[-0.01em]">
            Daily {formatChallengeNumber(challengeNumber)}
          </span>
          <span aria-hidden="true" className="text-white/25">
            ·
          </span>
          <span>{challengeId}</span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-[38px] font-semibold tracking-[-0.04em] leading-[1.08] text-white">
            How sharp is your memory?
          </h1>
          <p className="text-sm sm:text-base font-medium text-white/55 tracking-[-0.01em]">
            Memorise the colours. Rebuild the empty board from the slider.
          </p>
        </div>

        {/* Sleek unnumbered 2x2 architectural tile showcase */}
        <div
          aria-hidden="true"
          className="relative mx-auto w-32 h-32 grid grid-cols-2 gap-2.5 p-3 rounded-[24px] bg-[#0B0C10] border border-white/[0.09] shadow-[0_20px_48px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          {previewTiles.map((t) => (
            <div
              key={t.colorId}
              className="relative rounded-[13px] border border-white/20 flex items-center justify-center shadow-[0_6px_14px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.32)] transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: t.hex }}
            >
              {showSymbols && <TileSymbol symbolId={t.symbolId} className="w-5 h-5" />}
            </div>
          ))}
        </div>
      </div>

      {/* Three-round structure summary */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">
            {isDailyCompleted
              ? `Today's Result · ${dailyMatched.matched}/${dailyMatched.total} Matched`
              : "Today's 3 Rounds"}
          </span>
          {(effectiveStreak > 0 || bestStreak > 0) && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#55EFC4] tabular-nums"
              data-testid="home-streak-badge"
            >
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{effectiveStreak} day streak</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {ROUND_CONFIGS.map((round) => {
            const roundResult = results.find((r) => r.roundId === round.roundId);
            const isSolved = roundResult?.status === 'success';
            const isAttempted = Boolean(roundResult);
            const matchedCount = roundResult?.matchedTiles ?? 0;
            const totalCount = roundResult?.totalTiles ?? round.tileCount;

            return (
              <div
                key={round.roundId}
                data-testid={`home-round-card-${round.roundId}`}
                className={`p-3 rounded-[18px] bg-white/[0.03] border transition-colors ${
                  isSolved
                    ? 'border-[#55EFC4]/45 bg-[#55EFC4]/[0.05]'
                    : isAttempted
                      ? 'border-[#FF6B6B]/40 bg-[#FF6B6B]/[0.03]'
                      : 'border-white/[0.08]'
                } text-left`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Round {round.roundId}
                  </span>
                  {isSolved && (
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-[#55EFC4]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="text-base font-semibold tracking-[-0.02em] text-white mt-1 tabular-nums">
                  {roundResult
                    ? `${matchedCount}/${totalCount} right`
                    : `${round.tileCount} tiles`}
                </div>
                <div className="text-[11px] text-white/50 mt-0.5 tabular-nums">
                  {roundResult
                    ? `${roundResult.swaps} ${roundResult.swaps === 1 ? 'swap' : 'swaps'}`
                    : `${round.memoriseMs / 1000}s · ${round.solveMs / 1000}s`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary CTA and secondary actions */}
      <div className="space-y-2 pt-1">
        {isDailyCompleted ? (
          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton
              onClick={onStartOrContinue}
              data-testid="start-challenge-button"
            >
              <span>
                Results ({dailyMatched.matched}/{dailyMatched.total} right)
              </span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </PrimaryButton>
            <PrimaryButton
              variant="secondary"
              onClick={onOpenReview}
              data-testid="home-review-button"
            >
              <Eye className="w-4 h-4 text-[#55EFC4]" aria-hidden="true" />
              <span>Review Boards</span>
            </PrimaryButton>
          </div>
        ) : (
          <PrimaryButton
            onClick={onStartOrContinue}
            data-testid="start-challenge-button"
            className="dialed-spectrum-ring"
          >
            <span>
              {hasInProgressSession
                ? `Resume Round ${currentRoundId}`
                : 'Play Daily Challenge'}
            </span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </PrimaryButton>
        )}

        <PrimaryButton
          variant="ghost"
          onClick={onOpenTutorial}
          data-testid="home-tutorial-button"
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
          <span>How to play & interactive practice</span>
        </PrimaryButton>
      </div>
    </section>
  );
}
