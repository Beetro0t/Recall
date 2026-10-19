import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import { countMatchedTiles, isBoardSolved, swapTilesById } from '../game/board';
import { generatePracticePuzzle } from '../game/puzzleGenerator';
import { GameBoard } from '../components/GameBoard';
import { PrimaryButton } from '../components/PrimaryButton';

export interface TutorialScreenProps {
  showSymbols: boolean;
  shouldReduceMotion: boolean;
  canStartChallenge: boolean;
  onStartChallenge: () => void;
  onClose: () => void;
}

export function TutorialScreen({
  showSymbols,
  shouldReduceMotion,
  canStartChallenge,
  onStartChallenge,
  onClose,
}: TutorialScreenProps) {
  const practicePuzzle = useMemo(() => generatePracticePuzzle(), []);
  const [practiceOrder, setPracticeOrder] = useState<string[]>(() => [
    ...practicePuzzle.shuffledOrder,
  ]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [swapCount, setSwapCount] = useState<number>(0);
  const [lockedStatus, setLockedStatus] = useState<'editing' | 'solved' | 'mismatch'>(
    'editing',
  );

  const performPracticeSwap = (tileIdA: string, tileIdB: string) => {
    const res = swapTilesById(practiceOrder, tileIdA, tileIdB);
    setSelectedTileId(null);
    if (res.swapped) {
      setPracticeOrder(res.nextOrder);
      setSwapCount((c) => c + 1);
      if (lockedStatus === 'mismatch') {
        setLockedStatus('editing');
      }
    }
  };

  const handleTileActivate = (tileId: string) => {
    if (lockedStatus === 'solved') return;
    if (selectedTileId === null) {
      setSelectedTileId(tileId);
      return;
    }
    if (selectedTileId === tileId) {
      setSelectedTileId(null);
      return;
    }
    performPracticeSwap(selectedTileId, tileId);
  };

  const handleLockPractice = () => {
    setSelectedTileId(null);
    if (isBoardSolved(practiceOrder, practicePuzzle.targetOrder)) {
      setLockedStatus('solved');
    } else {
      setLockedStatus('mismatch');
    }
  };

  const resetPractice = () => {
    setPracticeOrder([...practicePuzzle.shuffledOrder]);
    setSelectedTileId(null);
    setSwapCount(0);
    setLockedStatus('editing');
  };

  const matchedCount = countMatchedTiles(practiceOrder, practicePuzzle.targetOrder);

  return (
    <section
      className="flex-1 flex flex-col justify-between py-2 gap-3.5"
      data-testid="tutorial-screen"
    >
      <div className="space-y-2.5">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F7]">
          How to Play
        </h1>

        <ol className="space-y-1.5 text-sm text-[#9297A3] list-decimal list-inside bg-[#16181E] border border-[#2D313B] rounded-[16px] p-3.5">
          <li>
            <span className="text-[#F5F5F7] font-medium">
              Memorise the tile pattern
            </span>{' '}
            before the countdown finishes.
          </li>
          <li>
            <span className="text-[#F5F5F7] font-medium">
              Drag &amp; drop or tap two tiles
            </span>{' '}
            to swap their positions after they shuffle.
          </li>
          <li>
            <span className="text-[#F5F5F7] font-medium">Lock in your solution</span>{' '}
            once your board matches the original arrangement.
          </li>
        </ol>
      </div>

      {/* Untimed interactive practice board (never affects daily challenge) */}
      <div className="space-y-3 bg-[#16181E]/85 border border-[#2D313B] rounded-[18px] p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-[#9297A3]">
            Untimed Practice ({swapCount} swaps)
          </span>
          <button
            type="button"
            onClick={resetPractice}
            data-testid="reset-practice-button"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#91ADFF] hover:underline cursor-pointer focus-ring rounded px-1"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="space-y-1 text-center">
            <span className="text-xs text-[#9297A3] block">Target pattern</span>
            <GameBoard
              tileOrder={practicePuzzle.targetOrder}
              tiles={practicePuzzle.tiles}
              columns={2}
              interactive={false}
              selectedTileId={null}
              showSymbols={showSymbols}
              shouldReduceMotion={shouldReduceMotion}
              sizeVariant="compact"
              ariaLabel="Practice target board"
            />
          </div>

          <div className="space-y-1 text-center">
            <span className="text-xs text-[#9297A3] block">
              {lockedStatus === 'solved'
                ? `Locked in (${swapCount} swaps)!`
                : 'Drag or tap below'}
            </span>
            <GameBoard
              tileOrder={practiceOrder}
              tiles={practicePuzzle.tiles}
              columns={2}
              interactive={lockedStatus !== 'solved'}
              selectedTileId={selectedTileId}
              compareTargetOrder={
                lockedStatus === 'mismatch' ? practicePuzzle.targetOrder : null
              }
              isSuccessHighlight={lockedStatus === 'solved'}
              showSymbols={showSymbols}
              shouldReduceMotion={shouldReduceMotion}
              sizeVariant="compact"
              ariaLabel="Practice interactive board"
              onTileActivate={handleTileActivate}
              onDirectSwap={performPracticeSwap}
            />
          </div>
        </div>

        {lockedStatus === 'solved' ? (
          <div
            className="flex items-center justify-center gap-2 text-xs font-medium text-[#73C8AC] pt-0.5"
            data-testid="practice-solved-banner"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Practice solution locked in! Ready for today&apos;s puzzle.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {lockedStatus === 'mismatch' && (
              <p className="text-xs text-center text-[#F18D83]">
                {matchedCount}/4 tiles match target — swap the remaining tiles and lock
                in again!
              </p>
            )}
            <PrimaryButton
              variant="secondary"
              onClick={handleLockPractice}
              data-testid="practice-lock-in-button"
              className="min-h-[42px] py-2 text-xs"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Lock In Practice Board</span>
            </PrimaryButton>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {canStartChallenge ? (
          <PrimaryButton onClick={onStartChallenge} data-testid="tutorial-start-button">
            <span>Start Daily Challenge</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </PrimaryButton>
        ) : (
          <PrimaryButton
            variant="secondary"
            onClick={onClose}
            data-testid="tutorial-close-button"
          >
            Back to Game
          </PrimaryButton>
        )}
      </div>
    </section>
  );
}
