import { useState } from 'react';
import { ROUND_CONFIGS } from '../game/config';
import { calculateDailyTotalScore } from '../game/scoring';
import { useGameSession } from '../hooks/useGameSession';
import { usePreferences } from '../hooks/usePreferences';
import { AdminPortalModal } from '../components/AdminPortalModal';
import { ReviewModal } from '../components/ReviewModal';
import { RoundHeader } from '../components/RoundHeader';
import { SettingsModal } from '../components/SettingsModal';
import { HomeScreen } from '../screens/HomeScreen';
import { IntermissionScreen } from '../screens/IntermissionScreen';
import { MemoriseScreen } from '../screens/MemoriseScreen';
import { RecreateScreen } from '../screens/RecreateScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { RoundResultScreen } from '../screens/RoundResultScreen';
import { TutorialScreen } from '../screens/TutorialScreen';

export interface AppProps {
  overrideChallengeId?: string;
}

export function App({ overrideChallengeId }: AppProps = {}) {
  const {
    preferences,
    shouldReduceMotion,
    setSoundEnabled,
    setSymbolsEnabled,
    setReducedMotionOverride,
    markOnboardingComplete,
  } = usePreferences();

  const {
    challenge,
    customSeed,
    session,
    stats,
    effectiveStreak,
    currentRoundConfig,
    currentRoundPuzzle,
    latestRoundResult,
    selectedTileId,
    selectedSlotIndex,
    isTutorialOpen,
    isHomeOverlayOpen,
    isReviewOpen,
    announcement,
    startOrContinueChallenge,
    navigateHome,
    openReview,
    closeReview,
    openTutorial,
    closeTutorial,
    completeTutorialAndStart,
    handleMemorisationExpire,
    handleConcealComplete,
    handleRecreationExpire,
    handleTileActivate,
    handleSelectSliderTile,
    handleBoardSlotActivate,
    handlePlaceTileInSlot,
    handleRemoveTileFromBoard,
    handleClearBoard,
    handleDirectTileSwap,
    handleLockInSolution,
    handleContinueFromRoundEnd,
    handleBeginNextRound,
    adminResetAndReplay,
    adminStepDailyDate,
    adminSetChallengeDate,
    adminSetCustomSeed,
    adminJumpToRound,
    adminSkipMemoriseTimer,
    adminAutoFillCurrentBoard,
  } = useGameSession({
    soundEnabled: preferences.soundEnabled,
    hasCompletedOnboarding: preferences.hasCompletedOnboarding,
    onCompleteOnboarding: markOnboardingComplete,
    overrideChallengeId,
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const showingHome =
    !isTutorialOpen &&
    (isHomeOverlayOpen || session.phase === 'home' || session.phase === 'ready');

  const isRoundHeaderActive =
    !isTutorialOpen &&
    !showingHome &&
    (session.phase === 'memorising' ||
      session.phase === 'concealing' ||
      session.phase === 'recreating' ||
      session.phase === 'round-success' ||
      session.phase === 'round-failure' ||
      session.phase === 'intermission');

  const isDailyCompleted =
    session.phase === 'results' && session.results.length === ROUND_CONFIGS.length;

  const hasInProgressSession =
    !isDailyCompleted &&
    (session.results.length > 0 ||
      session.phase === 'memorising' ||
      session.phase === 'concealing' ||
      session.phase === 'recreating' ||
      session.phase === 'intermission' ||
      session.phase === 'round-success' ||
      session.phase === 'round-failure');

  const totalScoreSoFar = calculateDailyTotalScore(session.results);

  const ambientGlowColor =
    session.phase === 'round-success'
      ? 'rgba(85, 239, 196, 0.11)'
      : session.phase === 'round-failure'
        ? 'rgba(255, 107, 107, 0.11)'
        : session.phase === 'recreating'
          ? 'rgba(108, 92, 231, 0.11)'
          : 'rgba(0, 206, 201, 0.08)';

  return (
    <div
      className="relative min-h-dvh w-full bg-[#050507] text-white flex flex-col items-center justify-center sm:py-5 px-3 sm:px-6 overflow-x-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 24%, ${ambientGlowColor}, transparent 68%)`,
      }}
    >
      {/* Screen-reader live region for controlled announcements (Section 12) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="sr-announcer"
      >
        {announcement}
      </div>

      {/* Dialed.gg-style pitch-black studio game container */}
      <div className="relative z-10 w-full max-w-[472px] min-h-[calc(100dvh-16px)] sm:min-h-[690px] flex-1 sm:flex-initial flex flex-col justify-between bg-[#07080B]/95 sm:rounded-[28px] sm:border sm:border-white/[0.09] sm:shadow-[0_4px_16px_rgba(0,0,0,0.6),0_34px_56px_rgba(0,0,0,0.48)] px-3 sm:px-5 py-2.5">
        <RoundHeader
          roundId={isRoundHeaderActive ? session.currentRoundId : undefined}
          tileCount={isRoundHeaderActive ? currentRoundConfig.tileCount : undefined}
          showHomeButton={!showingHome}
          showReviewButton={session.results.length > 0}
          onNavigateHome={navigateHome}
          onOpenReview={openReview}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTutorial={
            showingHome || session.phase === 'results' ? openTutorial : undefined
          }
        />

        {/* Hidden Owner Admin & Dev Console (only renders when accessed via #admin / Ctrl+Shift+D and unlocked) */}
        <AdminPortalModal
          challenge={challenge}
          customSeed={customSeed}
          currentRoundId={session.currentRoundId}
          phase={session.phase}
          stats={stats}
          onResetAndReplay={adminResetAndReplay}
          onStepDailyDate={adminStepDailyDate}
          onSetChallengeDate={adminSetChallengeDate}
          onSetCustomSeed={adminSetCustomSeed}
          onJumpToRound={adminJumpToRound}
          onSkipMemoriseTimer={adminSkipMemoriseTimer}
          onAutoFillCurrentBoard={adminAutoFillCurrentBoard}
        />

        <main className="flex-1 flex flex-col">
          {isTutorialOpen ? (
            <TutorialScreen
              showSymbols={preferences.symbolsEnabled}
              shouldReduceMotion={shouldReduceMotion}
              canStartChallenge={session.phase === 'home' || session.phase === 'ready'}
              onStartChallenge={completeTutorialAndStart}
              onClose={closeTutorial}
            />
          ) : showingHome ? (
            <HomeScreen
              challengeId={challenge.challengeId}
              challengeNumber={challenge.challengeNumber}
              hasInProgressSession={hasInProgressSession}
              isDailyCompleted={isDailyCompleted}
              currentRoundId={session.currentRoundId}
              results={session.results}
              effectiveStreak={effectiveStreak}
              bestStreak={stats.bestStreak}
              showSymbols={preferences.symbolsEnabled}
              onStartOrContinue={startOrContinueChallenge}
              onOpenReview={openReview}
              onOpenTutorial={openTutorial}
            />
          ) : session.phase === 'memorising' || session.phase === 'concealing' ? (
            <MemoriseScreen
              config={currentRoundConfig}
              puzzle={currentRoundPuzzle}
              phase={session.phase}
              deadlineEpochMs={session.phaseDeadlineEpochMs}
              showSymbols={preferences.symbolsEnabled}
              shouldReduceMotion={shouldReduceMotion}
              onMemoriseExpire={handleMemorisationExpire}
              onConcealComplete={handleConcealComplete}
            />
          ) : session.phase === 'recreating' ? (
            <RecreateScreen
              config={currentRoundConfig}
              puzzle={currentRoundPuzzle}
              currentTileOrder={session.currentTileOrder}
              swapCount={session.swapCount}
              selectedTileId={selectedTileId}
              selectedSlotIndex={selectedSlotIndex}
              deadlineEpochMs={session.phaseDeadlineEpochMs}
              showSymbols={preferences.symbolsEnabled}
              shouldReduceMotion={shouldReduceMotion}
              onTileActivate={handleTileActivate}
              onSlotActivate={handleBoardSlotActivate}
              onSelectSliderTile={handleSelectSliderTile}
              onPlaceTileInSlot={handlePlaceTileInSlot}
              onRemoveTileFromBoard={handleRemoveTileFromBoard}
              onClearBoard={handleClearBoard}
              onDirectSwap={handleDirectTileSwap}
              onLockInSolution={handleLockInSolution}
              onRecreateExpire={handleRecreationExpire}
            />
          ) : (session.phase === 'round-success' ||
              session.phase === 'round-failure') &&
            latestRoundResult ? (
            <RoundResultScreen
              challengeId={challenge.challengeId}
              config={currentRoundConfig}
              puzzle={currentRoundPuzzle}
              result={latestRoundResult}
              showSymbols={preferences.symbolsEnabled}
              shouldReduceMotion={shouldReduceMotion}
              onContinue={handleContinueFromRoundEnd}
            />
          ) : session.phase === 'intermission' ? (
            <IntermissionScreen
              nextRoundId={session.currentRoundId}
              previousResult={latestRoundResult}
              totalScoreSoFar={totalScoreSoFar}
              onStartNextRound={handleBeginNextRound}
            />
          ) : (
            <ResultsScreen
              challenge={challenge}
              challengeId={challenge.challengeId}
              challengeNumber={challenge.challengeNumber}
              results={session.results}
              currentStreak={effectiveStreak}
              bestStreak={stats.bestStreak}
              showSymbols={preferences.symbolsEnabled}
              shouldReduceMotion={shouldReduceMotion}
              onOpenReview={openReview}
              onNavigateHome={navigateHome}
            />
          )}
        </main>
      </div>

      <ReviewModal
        isOpen={isReviewOpen}
        challenge={challenge}
        results={session.results}
        showSymbols={preferences.symbolsEnabled}
        shouldReduceMotion={shouldReduceMotion}
        onClose={closeReview}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        preferences={preferences}
        shouldReduceMotion={shouldReduceMotion}
        onClose={() => setIsSettingsOpen(false)}
        onToggleSymbols={setSymbolsEnabled}
        onToggleSound={setSoundEnabled}
        onToggleReducedMotion={setReducedMotionOverride}
        onOpenTutorial={openTutorial}
      />
    </div>
  );
}
