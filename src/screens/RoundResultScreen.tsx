import { ArrowRight, CheckCircle2, Clock, Sparkles, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { countMatchedTiles } from '../game/board';
import { ROUND_CONFIGS } from '../game/config';
import type { RoundConfig, RoundPuzzle, RoundResult } from '../game/types';
import { CelebrationBurst } from '../components/CelebrationBurst';
import { GameBoard } from '../components/GameBoard';
import { PrimaryButton } from '../components/PrimaryButton';

export interface RoundResultScreenProps {
  config: RoundConfig;
  puzzle: RoundPuzzle;
  result: RoundResult;
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  onContinue: () => void;
}

export function RoundResultScreen({
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

  return (
    <section
      className="relative flex-1 flex flex-col justify-between py-2 gap-3"
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
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isSuccess
              ? 'bg-[#73C8AC]/15 text-[#73C8AC] border border-[#73C8AC]/35 shadow-[0_0_20px_rgba(115,200,172,0.2)]'
              : 'bg-[#F18D83]/15 text-[#F18D83] border border-[#F18D83]/30'
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
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F7]"
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
            <span className="block text-xs text-center text-[#73C8AC] font-medium">
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
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F7] block">
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
                ariaLabel={`Round ${config.roundId} target arrangement`}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Round metrics */}
      <div className="grid grid-cols-3 gap-2.5 bg-[#16181E] border border-[#2D313B] rounded-[16px] p-3 text-center tabular-nums">
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-[#9297A3]">
            Points Earned
          </span>
          <span
            className="text-xl font-semibold text-[#F5F5F7] mt-0.5 block"
            data-testid="round-result-score"
          >
            +{result.score}
          </span>
        </div>

        <div className="border-x border-[#2D313B]">
          <span className="block text-[11px] uppercase tracking-wider text-[#9297A3]">
            Correct Tiles
          </span>
          <span
            className="text-xl font-semibold text-[#73C8AC] mt-0.5 block"
            data-testid="round-result-matched"
          >
            {matchedCount}/{totalCount}
          </span>
        </div>

        <div>
          <span className="block text-[11px] uppercase tracking-wider text-[#9297A3]">
            Swaps Used
          </span>
          <span
            className="text-xl font-semibold text-[#F5F5F7] mt-0.5 block"
            data-testid="round-result-swaps"
          >
            {result.swaps}{' '}
            <span className="text-xs font-normal text-[#9297A3]">
              (opt {result.optimalSwaps})
            </span>
          </span>
        </div>
      </div>

      {/* Continue to next round button (loads next round directly without an intermission screen) */}
      <PrimaryButton onClick={onContinue} data-testid="round-continue-button">
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
