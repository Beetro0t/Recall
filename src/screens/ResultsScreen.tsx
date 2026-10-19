import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Flame,
  Home,
  Share2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { countMatchedTiles } from '../game/board';
import { getRoundConfig, ROUND_CONFIGS } from '../game/config';
import {
  formatChallengeNumber,
  getMsUntilNextUtcRollover,
} from '../game/dailyChallenge';
import { calculateDailyMatchedTiles, calculateDailyTotalScore } from '../game/scoring';
import { getRoundPuzzle } from '../game/stateMachine';
import type { DailyChallenge, RoundResult } from '../game/types';
import { formatShareableResults, shareOrCopyResults } from '../services/sharing';
import { CelebrationBurst } from '../components/CelebrationBurst';
import { GameBoard } from '../components/GameBoard';
import { PrimaryButton } from '../components/PrimaryButton';

export interface ResultsScreenProps {
  challenge: DailyChallenge;
  challengeId: string;
  challengeNumber: number;
  results: readonly RoundResult[];
  currentStreak: number;
  bestStreak: number;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onOpenReview: () => void;
  onNavigateHome: () => void;
}

function formatRolloverCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function ResultsScreen({
  challenge,
  challengeId,
  challengeNumber,
  results,
  currentStreak,
  bestStreak,
  showSymbols,
  shouldReduceMotion,
  onOpenReview,
  onNavigateHome,
}: ResultsScreenProps) {
  const [shareStatus, setShareStatus] = useState<
    'idle' | 'copied' | 'shared' | 'error'
  >('idle');
  const [msUntilNext, setMsUntilNext] = useState<number>(() =>
    getMsUntilNextUtcRollover(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMsUntilNext(getMsUntilNextUtcRollover());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalScore = calculateDailyTotalScore(results);
  const { matched: totalMatchedTiles, total: totalPossibleTiles } =
    calculateDailyMatchedTiles(results);
  const totalSwaps = results.reduce((sum, r) => sum + r.swaps, 0);
  const totalOptimalSwaps = results.reduce((sum, r) => sum + r.optimalSwaps, 0);
  const solvedCount = results.filter((r) => r.status === 'success').length;
  const isPerfectSweep =
    results.length === ROUND_CONFIGS.length && solvedCount === ROUND_CONFIGS.length;

  const shareText = formatShareableResults({
    challengeId,
    challengeNumber,
    results,
    streak: currentStreak,
  });

  const handleShare = async (preferNative: boolean) => {
    const outcome = await shareOrCopyResults(shareText, preferNative);
    if (outcome.ok) {
      setShareStatus(outcome.method === 'web-share' ? 'shared' : 'copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    } else if (outcome.error !== 'Share cancelled') {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const canWebShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <section
      className="relative flex-1 flex flex-col justify-between py-2 gap-3.5"
      data-testid="results-screen"
    >
      {/* Top total score & telemetry banner */}
      <div
        className={`relative p-4 rounded-[20px] bg-[#16181E] border ${
          isPerfectSweep ? 'border-[#73C8AC]/45' : 'border-[#2D313B]'
        } shadow-lg space-y-3 overflow-visible`}
      >
        {isPerfectSweep && <CelebrationBurst shouldReduceMotion={shouldReduceMotion} />}

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#101114] border border-[#2D313B] text-xs font-medium text-[#9297A3] tabular-nums">
            <span className="text-[#F5F5F7] font-semibold">
              Recall {formatChallengeNumber(challengeNumber)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{challengeId}</span>
          </div>

          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#91ADFF]/12 text-[#91ADFF] text-xs font-semibold tabular-nums"
            data-testid="final-streak-value"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{currentStreak}</span>
            {bestStreak > currentStreak && (
              <span className="text-[11px] font-normal text-[#9297A3]">
                (best {bestStreak})
              </span>
            )}
          </span>
        </div>

        {isPerfectSweep && (
          <div
            data-testid="perfect-recall-banner"
            className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-[#73C8AC]/15 border border-[#73C8AC]/35 text-xs font-semibold text-[#73C8AC]"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Perfect Recall · All {totalPossibleTiles} Tiles Matched!</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center tabular-nums pt-1">
          <div className="p-2 rounded-[12px] bg-[#101114]/70 border border-white/[0.05]">
            <span className="block text-[10px] uppercase tracking-wider text-[#9297A3]">
              Total Score
            </span>
            <span
              className="text-2xl font-bold text-[#F5F5F7] mt-0.5 block"
              data-testid="final-total-score"
            >
              {totalScore}
            </span>
          </div>

          <div className="p-2 rounded-[12px] bg-[#101114]/70 border border-white/[0.05]">
            <span className="block text-[10px] uppercase tracking-wider text-[#9297A3]">
              Tiles Right
            </span>
            <span
              className="text-lg font-semibold text-[#73C8AC] mt-1 block"
              data-testid="final-matched-tiles"
            >
              {totalMatchedTiles}/{totalPossibleTiles}
            </span>
          </div>

          <div className="p-2 rounded-[12px] bg-[#101114]/70 border border-white/[0.05]">
            <span className="block text-[10px] uppercase tracking-wider text-[#9297A3]">
              Cleared
            </span>
            <span
              className="text-lg font-semibold text-[#F5F5F7] mt-1 block"
              data-testid="final-solved-count"
            >
              {solvedCount}/{ROUND_CONFIGS.length}
            </span>
          </div>

          <div className="p-2 rounded-[12px] bg-[#101114]/70 border border-white/[0.05]">
            <span className="block text-[10px] uppercase tracking-wider text-[#9297A3]">
              Swaps
            </span>
            <span
              className="text-lg font-semibold text-[#F5F5F7] mt-1 block"
              data-testid="final-total-swaps"
            >
              {totalSwaps}
              <span className="text-[10px] text-[#9297A3] font-normal">
                /{totalOptimalSwaps}p
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Visual 3-Round Boards Dashboard Overview */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs text-[#9297A3]">
          <span className="font-semibold uppercase tracking-wider text-[#F5F5F7]">
            Boards Overview Dashboard
          </span>
          <span>25 pts per correct tile</span>
        </div>

        <div className="space-y-2.5">
          {results.map((res) => {
            const config = getRoundConfig(res.roundId);
            const puzzle = getRoundPuzzle(challenge, res.roundId);
            const playerOrder =
              res.finalTileOrder &&
              res.finalTileOrder.length === puzzle.targetOrder.length
                ? res.finalTileOrder
                : puzzle.targetOrder;
            const matchedCount =
              res.matchedTiles ?? countMatchedTiles(playerOrder, puzzle.targetOrder);
            const isSuccess = res.status === 'success';
            const isMismatch = !isSuccess && res.failureReason === 'mismatch';

            return (
              <div
                key={res.roundId}
                data-testid={`round-score-card-${res.roundId}`}
                className="p-3 rounded-[18px] bg-[#16181E] border border-[#2D313B] space-y-2.5"
              >
                {/* Card top header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <CheckCircle2
                        className="w-4 h-4 text-[#73C8AC]"
                        aria-hidden="true"
                      />
                    ) : isMismatch ? (
                      <XCircle className="w-4 h-4 text-[#F18D83]" aria-hidden="true" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#F18D83]" aria-hidden="true" />
                    )}
                    <span className="font-semibold text-[#F5F5F7]">
                      Round {res.roundId} · {puzzle.pattern.patternName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-[#9297A3]">
                      {matchedCount}/{config.tileCount} right
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#24262D] text-[#73C8AC] font-semibold">
                      +{res.score} pts
                    </span>
                  </div>
                </div>

                {/* Side-by-side mini boards: Your Board vs Solution */}
                <div className="grid grid-cols-2 gap-2.5 items-center bg-[#101114]/65 rounded-[14px] p-2.5 border border-white/[0.04]">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9297A3] block">
                      Your Board
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
                      sizeVariant="mini"
                      ariaLabel={`Round ${res.roundId} your board`}
                    />
                  </div>

                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#73C8AC] block">
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
                      sizeVariant="mini"
                      ariaLabel={`Round ${res.roundId} target solution`}
                    />
                  </div>
                </div>

                {/* Card footer details */}
                <div className="flex items-center justify-between text-[11px] text-[#9297A3] px-0.5 tabular-nums">
                  <span>
                    Swaps used: <strong className="text-[#F5F5F7]">{res.swaps}</strong>{' '}
                    (optimal: {res.optimalSwaps})
                  </span>
                  <span>
                    {res.remainingMs > 0
                      ? `${(res.remainingMs / 1000).toFixed(1)}s left`
                      : "Time's up"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review, Share & Home controls */}
      <div className="space-y-2 pt-0.5">
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton
            variant="secondary"
            onClick={onOpenReview}
            data-testid="open-review-button"
          >
            <Eye className="w-4 h-4 text-[#91ADFF]" aria-hidden="true" />
            <span>Inspect Full Size</span>
          </PrimaryButton>

          <PrimaryButton
            variant="secondary"
            onClick={onNavigateHome}
            data-testid="results-home-button"
          >
            <Home className="w-4 h-4 text-[#9297A3]" aria-hidden="true" />
            <span>Home</span>
          </PrimaryButton>
        </div>

        <div className="flex gap-2">
          <PrimaryButton
            onClick={() => handleShare(false)}
            data-testid="share-results-button"
          >
            {shareStatus === 'copied' || shareStatus === 'shared' ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>
                  {shareStatus === 'shared' ? 'Shared Results!' : 'Copied Results!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Spoiler-Free Results</span>
              </>
            )}
          </PrimaryButton>

          {canWebShare && (
            <PrimaryButton
              variant="secondary"
              fullWidth={false}
              onClick={() => handleShare(true)}
              aria-label="Share via system dialog"
              data-testid="native-share-button"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
            </PrimaryButton>
          )}
        </div>

        {shareStatus === 'error' && (
          <p
            role="alert"
            className="text-xs text-center text-[#F18D83]"
            data-testid="share-error-message"
          >
            Could not copy automatically. Please copy the summary below.
          </p>
        )}

        <div className="flex items-center justify-between px-1 text-xs text-[#9297A3] tabular-nums">
          <span>Completed for {challengeId}</span>
          <span data-testid="next-challenge-countdown">
            Next puzzle in {formatRolloverCountdown(msUntilNext)}
          </span>
        </div>
      </div>
    </section>
  );
}
