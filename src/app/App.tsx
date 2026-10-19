import { useState } from 'react';
import { ROUND_CONFIGS } from '../game/config';
import { calculateDailyTotalScore } from '../game/scoring';
import { useGameSession } from '../hooks/useGameSession';
import { usePreferences } from '../hooks/usePreferences';
import { DevToolbar } from '../components/DevToolbar';
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
    setDevModeEnabled,
    markOnboardingComplete,
  } = usePreferences();

  const {
    challenge,
    session,
    stats,
    effectiveStreak,
    currentRoundConfig,
    currentRoundPuzzle,
    latestRoundResult,
    selectedTileId,
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
    handleDirectTileSwap,
    handleLockInSolution,
    handleContinueFromRoundEnd,
    handleBeginNextRound,
    devResetAndReplay,
    devNextDailyPuzzle,
    devJumpToRound,
    devSkipMemoriseTimer,
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
      ? 'rgba(115, 200, 172, 0.08)'
      : session.phase === 'round-failure'
        ? 'rgba(241, 141, 131, 0.08)'
        : session.phase === 'recreating'
          ? 'rgba(145, 173, 255, 0.09)'
          : 'rgba(90, 130, 230, 0.06)';

  return (
    <div
      className="relative min-h-dvh w-full bg-[#101114] text-[#F5F5F7] flex flex-col items-center justify-between px-4 sm:px-6 py-3 overflow-x-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 28%, ${ambientGlowColor}, transparent 68%)`,
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

      <div className="relative z-10 w-full max-w-[460px] flex-1 flex flex-col justify-between">
        <RoundHeader
          roundId={isRoundHeaderActive ? session.currentRoundId : undefined}
          tileCount={isRoundHeaderActive ? currentRoundConfig.tileCount : undefined}
          showHomeButton={!showingHome}
          showReviewButton={session.results.length > 0}
          devModeEnabled={preferences.devModeEnabled}
          onToggleDevMode={() => setDevModeEnabled(!preferences.devModeEnabled)}
          onNavigateHome={navigateHome}
          onOpenReview={openReview}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTutorial={
            showingHome || session.phase === 'results' ? openTutorial : undefined
          }
        />

        {preferences.devModeEnabled && (
          <DevToolbar
            challengeId={challenge.challengeId}
            currentRoundId={session.currentRoundId}
            phase={session.phase}
            onResetAndReplay={devResetAndReplay}
            onNextDailyPuzzle={devNextDailyPuzzle}
            onJumpToRound={devJumpToRound}
            onSkipMemoriseTimer={devSkipMemoriseTimer}
          />
        )}

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
              deadlineEpochMs={session.phaseDeadlineEpochMs}
              showSymbols={preferences.symbolsEnabled}
              shouldReduceMotion={shouldReduceMotion}
              onTileActivate={handleTileActivate}
              onDirectSwap={handleDirectTileSwap}
              onLockInSolution={handleLockInSolution}
              onRecreateExpire={handleRecreationExpire}
            />
          ) : (session.phase === 'round-success' ||
              session.phase === 'round-failure') &&
            latestRoundResult ? (
            <RoundResultScreen
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
        onToggleDevMode={setDevModeEnabled}
        onOpenTutorial={openTutorial}
      />
    </div>
  );
}
