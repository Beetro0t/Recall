import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { countMatchedTiles } from '../game/board';
import { ROUND_CONFIGS } from '../game/config';
import type { RoundConfig, RoundPuzzle, RoundResult } from '../game/types';
import { getRoundCommunityComparison } from '../services/communityStats';
import { CelebrationBurst } from '../components/CelebrationBurst';
import { GameBoard } from '../components/GameBoard';
import { PrimaryButton } from '../components/PrimaryButton';

export interface RoundResultScreenProps {
  challengeId: string;
  config: RoundConfig;
  puzzle: RoundPuzzle;
  result: RoundResult;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onContinue: () => void;
}

export function RoundResultScreen({
  challengeId,
  config,
  puzzle,
  result,
  showSymbols,
  shouldReduceMotion,
  onContinue,
}: RoundResultScreenProps) {
  const isSuccess = result.status === 'success';
  const isMismatch = !isSuccess && result.failureReason === 'mismatch';
  const isFinalRound = config.roundId >= ROUND_CONFIGS.length;

  const playerOrder =
    result.finalTileOrder && result.finalTileOrder.length === puzzle.targetOrder.length
      ? result.finalTileOrder
      : puzzle.targetOrder;

  const matchedCount =
    result.matchedTiles ?? countMatchedTiles(playerOrder, puzzle.targetOrder);
  const totalCount = result.totalTiles ?? puzzle.targetOrder.length;
  const roundColors = puzzle.targetOrder
    .map((id) => puzzle.tiles[id]?.hex)
    .filter((hex): hex is string => Boolean(hex));

  const community = useMemo(
    () => getRoundCommunityComparison(challengeId, puzzle, result),
    [challengeId, puzzle, result],
  );

  return (
    <section
      className="relative flex-1 flex flex-col justify-between py-2 gap-2.5"
      data-testid={isSuccess ? 'round-success-screen' : 'round-failure-screen'}
    >
      {/* Status banner */}
      <motion.div
        initial={
          shouldReduceMotion ? false : isSuccess ? { scale: 0.9, opacity: 0 } : { x: 0 }
        }
        animate={
          shouldReduceMotion
            ? undefined
            : isSuccess
              ? { scale: [0.9, 1.04, 1], opacity: 1 }
              : { x: [0, -8, 8, -5, 5, 0] }
        }
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-1 text-center"
      >
        <div
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold ${
            isSuccess
              ? 'bg-[#55EFC4]/15 text-[#55EFC4] border border-[#55EFC4]/40 shadow-[0_0_20px_rgba(85,239,196,0.2)]'
              : 'bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/35'
          }`}
        >
          {isSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <Sparkles className="w-3 h-3" aria-hidden="true" />
            </>
          ) : isMismatch ? (
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>
            Round {config.roundId} · {matchedCount}/{totalCount} Correct
          </span>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-semibold tracking-[-0.04em] text-white"
          data-testid="round-outcome-heading"
        >
          {isSuccess
            ? 'Pattern restored!'
            : isMismatch
              ? `${matchedCount} of ${totalCount} tiles matched.`
              : "Time's up."}
        </h1>
      </motion.div>

      {/* Board display */}
      <div className="relative my-auto">
        {isSuccess ? (
          <div className="relative space-y-1.5">
            <CelebrationBurst
              shouldReduceMotion={shouldReduceMotion}
              colors={roundColors}
            />
            <span className="block text-xs text-center text-[#55EFC4] font-medium">
              All {totalCount} tiles in position (+{result.score} pts)
            </span>
            <GameBoard
              tileOrder={puzzle.targetOrder}
              tiles={puzzle.tiles}
              columns={config.columns}
              pattern={puzzle.pattern}
              interactive={false}
              selectedTileId={null}
              isSuccessHighlight={true}
              isCelebration={true}
              showSymbols={showSymbols}
              shouldReduceMotion={shouldReduceMotion}
              ariaLabel={`Round ${config.roundId} restored arrangement`}
            />
          </div>
        ) : (
          <motion.div
            initial={shouldReduceMotion ? false : { x: 0 }}
            animate={shouldReduceMotion ? undefined : { x: [0, -6, 6, -3, 3, 0] }}
            transition={{ duration: 0.42 }}
            className="grid grid-cols-2 gap-3 items-start"
          >
            <div
              className="space-y-1.5 text-center"
              data-testid="round-result-player-board"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 block">
                Your Board ({matchedCount}/{totalCount})
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
                ariaLabel={`Round ${config.roundId} your arrangement`}
              />
            </div>

            <div
              className="space-y-1.5 text-center"
              data-testid="round-result-target-board"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#55EFC4] block">
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
                ariaLabel={`Round ${config.roundId} target arrangement`}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Round metrics + Community choice comparison */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 bg-white/[0.03] border border-white/[0.08] rounded-[18px] p-2.5 text-center tabular-nums">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
              Points Earned
            </span>
            <span
              className="text-lg font-semibold tracking-[-0.03em] text-white mt-0.5 block"
              data-testid="round-result-score"
            >
              +{result.score}
            </span>
          </div>

          <div className="border-x border-white/[0.08]">
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
              Correct Tiles
            </span>
            <span
              className="text-lg font-semibold tracking-[-0.03em] text-[#55EFC4] mt-0.5 block"
              data-testid="round-result-matched"
            >
              {matchedCount}/{totalCount}
            </span>
          </div>

          <div>
            <span className="block text-[10px] uppercase tracking-[0.14em] text-white/50">
              vs. Others
            </span>
            <span
              className="text-lg font-semibold tracking-[-0.03em] text-white mt-0.5 block"
              data-testid="round-result-percentile"
            >
              Beat {community.betterThanPct}%
            </span>
          </div>
        </div>

        {/* Square-by-square crowd choice agreement strip */}
        <div
          className="rounded-[18px] bg-white/[0.03] border border-white/[0.08] p-2.5 space-y-2"
          data-testid="round-community-choices"
        >
          <div className="flex items-center justify-between text-[11px] text-white/60 px-0.5 tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white/85">
              <Users className="w-3.5 h-3.5 text-[#55EFC4]" aria-hidden="true" />
              <span>How Your Choices Compare</span>
            </span>
            <span>
              Crowd avg {community.avgMatchedTiles}/{totalCount} ·{' '}
              {community.roundClearRatePct}% cleared
            </span>
          </div>

          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${community.slotBreakdown.length}, minmax(0, 1fr))`,
            }}
          >
            {community.slotBreakdown.map((slot) => {
              const chosenTile = slot.playerTileId
                ? puzzle.tiles[slot.playerTileId]
                : null;
              const targetTile = puzzle.tiles[slot.targetTileId];

              return (
                <div
                  key={slot.slotIndex}
                  className={`p-1.5 rounded-[11px] border text-center tabular-nums ${
                    slot.isPlayerCorrect
                      ? 'bg-[#55EFC4]/[0.06] border-[#55EFC4]/30'
                      : 'bg-[#FF6B6B]/[0.06] border-[#FF6B6B]/30'
                  }`}
                  title={
                    slot.isPlayerCorrect
                      ? `Square ${slot.slotIndex + 1}: ${slot.sameChoicePct}% of players also placed ${targetTile?.colorName ?? 'this colour'} here`
                      : `Square ${slot.slotIndex + 1}: ${slot.sameChoicePct}% picked your choice; ${slot.correctRatePct}% got ${targetTile?.colorName ?? 'the target'} right`
                  }
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                      style={{
                        backgroundColor: chosenTile?.hex ?? 'transparent',
                      }}
                    />
                    <span className="text-[10px] font-semibold text-white/90">
                      {slot.sameChoicePct}%
                    </span>
                  </div>
                  <span className="block text-[9px] text-white/45 leading-tight truncate">
                    {slot.isPlayerCorrect ? 'matched' : 'same pick'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continue to next round button (loads next round directly without an intermission screen) */}
      <PrimaryButton
        onClick={onContinue}
        data-testid="round-continue-button"
        className={isSuccess ? 'dialed-spectrum-ring' : ''}
      >
        <span>
          {isFinalRound
            ? 'View Results Dashboard'
            : `Continue to Round ${config.roundId + 1}`}
        </span>
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </PrimaryButton>
    </section>
  );
}
