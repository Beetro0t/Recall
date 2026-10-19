import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Flame,
  Home,
  Share2,
  Sparkles,
  Users,
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
import { getDailyCommunityComparison } from '../services/communityStats';
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

  const community = useMemo(
    () => getDailyCommunityComparison(challenge, results),
    [challenge, results],
  );

  const maxBucketPct = Math.max(
    1,
    ...community.distributionBuckets.map((b) => b.percentage),
  );

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
        className={`relative p-4 rounded-[22px] bg-white/[0.03] border ${
          isPerfectSweep ? 'border-[#55EFC4]/45' : 'border-white/[0.09]'
        } shadow-lg space-y-3 overflow-visible`}
      >
        {isPerfectSweep && <CelebrationBurst shouldReduceMotion={shouldReduceMotion} />}

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-medium text-white/60 tabular-nums">
            <span className="text-white font-semibold">
              Recall {formatChallengeNumber(challengeNumber)}
            </span>
            <span aria-hidden="true" className="text-white/25">
              ·
            </span>
            <span>{challengeId}</span>
          </div>

          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#55EFC4]/15 text-[#55EFC4] text-xs font-semibold tabular-nums"
            data-testid="final-streak-value"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{currentStreak}</span>
            {bestStreak > currentStreak && (
              <span className="text-[11px] font-normal text-white/55">
                (best {bestStreak})
              </span>
            )}
          </span>
        </div>

        {isPerfectSweep && (
          <div
            data-testid="perfect-recall-banner"
            className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-[#55EFC4]/15 border border-[#55EFC4]/35 text-xs font-semibold text-[#55EFC4]"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Perfect Recall · All {totalPossibleTiles} Tiles Matched!</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center tabular-nums pt-1">
          <div className="p-2 rounded-[14px] bg-black/45 border border-white/[0.06]">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
              Total Score
            </span>
            <span
              className="text-2xl font-bold tracking-[-0.04em] text-white mt-0.5 block"
              data-testid="final-total-score"
            >
              {totalScore}
            </span>
          </div>

          <div className="p-2 rounded-[14px] bg-black/45 border border-white/[0.06]">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
              Tiles Right
            </span>
            <span
              className="text-lg font-semibold tracking-[-0.03em] text-[#55EFC4] mt-1 block"
              data-testid="final-matched-tiles"
            >
              {totalMatchedTiles}/{totalPossibleTiles}
            </span>
          </div>

          <div className="p-2 rounded-[14px] bg-black/45 border border-white/[0.06]">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
              Cleared
            </span>
            <span
              className="text-lg font-semibold tracking-[-0.03em] text-white mt-1 block"
              data-testid="final-solved-count"
            >
              {solvedCount}/{ROUND_CONFIGS.length}
            </span>
          </div>

          <div className="p-2 rounded-[14px] bg-black/45 border border-white/[0.06]">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
              Swaps
            </span>
            <span
              className="text-lg font-semibold tracking-[-0.03em] text-white mt-1 block"
              data-testid="final-total-swaps"
            >
              {totalSwaps}
              <span className="text-[10px] text-white/45 font-normal">
                /{totalOptimalSwaps}p
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Dialed.gg-style Community Comparison & Distribution Card */}
      <div
        className="p-3.5 rounded-[22px] bg-white/[0.03] border border-white/[0.09] space-y-3"
        data-testid="community-comparison-card"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            <BarChart3 className="w-3.5 h-3.5 text-[#55EFC4]" aria-hidden="true" />
            <span>How You Did vs. Others</span>
          </div>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#55EFC4]/15 border border-[#55EFC4]/35 text-[11px] font-semibold text-[#55EFC4] tabular-nums"
            data-testid="community-percentile-badge"
          >
            Top {community.topPercentile}% · Beat {community.betterThanPct}%
          </span>
        </div>

        {/* You vs Crowd Avg summary row */}
        <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
          <div className="px-3 py-2 rounded-[14px] bg-black/45 border border-white/[0.06] flex items-center justify-between">
            <span className="text-white/55">Your Accuracy</span>
            <strong className="text-white font-semibold">
              {totalMatchedTiles}/{totalPossibleTiles} ({totalScore} pts)
            </strong>
          </div>
          <div className="px-3 py-2 rounded-[14px] bg-black/45 border border-white/[0.06] flex items-center justify-between">
            <span className="text-white/55">Crowd Average</span>
            <strong className="text-white/85 font-semibold">
              {community.avgMatchedTiles}/{totalPossibleTiles} ({community.avgScore}{' '}
              pts)
            </strong>
          </div>
        </div>

        {/* 7-Bucket Accuracy Distribution Histogram */}
        <div className="pt-1 space-y-1.5" data-testid="community-distribution-chart">
          <div className="grid grid-cols-7 gap-1.5 items-end h-20 pt-4 px-1">
            {community.distributionBuckets.map((bucket) => {
              const barHeightPct = Math.max(
                14,
                Math.round((bucket.percentage / maxBucketPct) * 100),
              );
              return (
                <div
                  key={bucket.id}
                  className="h-full flex flex-col items-center justify-end gap-1"
                >
                  <span
                    className={`text-[9px] tabular-nums font-semibold ${
                      bucket.isPlayerBucket ? 'text-[#55EFC4]' : 'text-white/45'
                    }`}
                  >
                    {bucket.isPlayerBucket ? 'YOU' : `${bucket.percentage}%`}
                  </span>
                  <div
                    className={`w-full rounded-t-[6px] transition-all ${
                      bucket.isPlayerBucket
                        ? 'bg-[#55EFC4] shadow-[0_0_14px_rgba(85,239,196,0.5)]'
                        : 'bg-white/18'
                    }`}
                    style={{ height: `${barHeightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center px-1">
            {community.distributionBuckets.map((bucket) => (
              <span
                key={bucket.id}
                className={`text-[10px] tabular-nums ${
                  bucket.isPlayerBucket
                    ? 'text-[#55EFC4] font-semibold'
                    : 'text-white/45'
                }`}
              >
                {bucket.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Visual 3-Round Boards Dashboard Overview */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs text-white/55">
          <span className="font-semibold uppercase tracking-[0.14em] text-white">
            Boards & Choice Breakdown
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
            const roundCrowd = community.roundComparisons.find(
              (rc) => rc.roundId === res.roundId,
            );

            return (
              <div
                key={res.roundId}
                data-testid={`round-score-card-${res.roundId}`}
                className="p-3 rounded-[20px] bg-white/[0.03] border border-white/[0.08] space-y-2.5"
              >
                {/* Card top header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <CheckCircle2
                        className="w-4 h-4 text-[#55EFC4]"
                        aria-hidden="true"
                      />
                    ) : isMismatch ? (
                      <XCircle className="w-4 h-4 text-[#FF6B6B]" aria-hidden="true" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#FF6B6B]" aria-hidden="true" />
                    )}
                    <span className="font-semibold text-white">
                      Round {res.roundId} · {puzzle.pattern.patternName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-white/55">
                      {matchedCount}/{config.tileCount} right
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.07] text-[#55EFC4] font-semibold">
                      +{res.score} pts
                    </span>
                  </div>
                </div>

                {/* Side-by-side mini boards: Your Board vs Solution */}
                <div className="grid grid-cols-2 gap-2.5 items-center bg-black/45 rounded-[15px] p-2.5 border border-white/[0.05]">
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 block">
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
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#55EFC4] block">
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

                {/* Card footer details with relative crowd telemetry */}
                <div className="flex items-center justify-between text-[11px] text-white/50 px-0.5 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#55EFC4]" aria-hidden="true" />
                    <span>
                      Beat{' '}
                      <strong className="text-white">
                        {roundCrowd?.betterThanPct ?? 50}%
                      </strong>{' '}
                      · Crowd avg {roundCrowd?.avgMatchedTiles ?? matchedCount}/
                      {config.tileCount}
                    </span>
                  </span>
                  <span>
                    Swaps: <strong className="text-white">{res.swaps}</strong> (opt{' '}
                    {res.optimalSwaps})
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
            <Eye className="w-4 h-4 text-[#55EFC4]" aria-hidden="true" />
            <span>Inspect Full Size</span>
          </PrimaryButton>

          <PrimaryButton
            variant="secondary"
            onClick={onNavigateHome}
            data-testid="results-home-button"
          >
            <Home className="w-4 h-4 text-white/65" aria-hidden="true" />
            <span>Home</span>
          </PrimaryButton>
        </div>

        <div className="flex gap-2">
          <PrimaryButton
            onClick={() => handleShare(false)}
            data-testid="share-results-button"
            className="dialed-spectrum-ring"
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
            className="text-xs text-center text-[#FF6B6B]"
            data-testid="share-error-message"
          >
            Could not copy automatically. Please copy the summary below.
          </p>
        )}

        <div className="flex items-center justify-between px-1 text-xs text-white/50 tabular-nums">
          <span>Completed for {challengeId}</span>
          <span data-testid="next-challenge-countdown">
            Next puzzle in {formatRolloverCountdown(msUntilNext)}
          </span>
        </div>
      </div>
    </section>
  );
}
