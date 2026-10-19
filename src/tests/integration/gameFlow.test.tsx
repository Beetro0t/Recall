import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { generateDailyChallenge } from '../../game/puzzleGenerator';
import {
  clearCommunityStorageForTesting,
  recordDailyPlayerChoices,
  recordRoundPlayerChoices,
} from '../../services/communityStats';

/**
 * Helper to place all tiles from the bottom ColorSliderBar into the empty
 * board squares to match `targetOrder`, using either Drag-and-Drop or
 * Tap-to-Place, and then click Lock In Solution.
 */
function placeFromSliderAndLockIn(
  targetOrder: readonly string[],
  useDragAndDrop = false,
) {
  expect(screen.getByTestId('recreate-screen')).toBeInTheDocument();
  expect(screen.getByTestId('color-slider-bar')).toBeInTheDocument();
  expect(screen.queryByTestId('color-slider-range')).not.toBeInTheDocument();

  // Verify the board starts with empty squares
  for (let i = 0; i < targetOrder.length; i++) {
    expect(screen.getByTestId(`board-tile-${i}`)).toHaveAttribute('data-tile-id', '');
  }

  for (let slotIndex = 0; slotIndex < targetOrder.length; slotIndex++) {
    const desiredTileId = targetOrder[slotIndex];
    const sliderButton = document.querySelector<HTMLButtonElement>(
      `[data-slider-tile-id="${desiredTileId}"]`,
    );
    expect(sliderButton).not.toBeNull();

    const boardSlot = screen.getByTestId(`board-tile-${slotIndex}`);

    if (useDragAndDrop) {
      fireEvent.dragStart(sliderButton!);
      fireEvent.dragOver(boardSlot);
      fireEvent.drop(boardSlot);
    } else {
      fireEvent.click(sliderButton!);
      fireEvent.click(boardSlot);
    }

    expect(screen.getByTestId(`board-tile-${slotIndex}`)).toHaveAttribute(
      'data-tile-id',
      desiredTileId,
    );
  }

  fireEvent.click(screen.getByTestId('lock-in-button'));
}

describe('Recall Integration Game Flows', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
    clearCommunityStorageForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides community comparison when no one else has played yet (zero mocked data), and completes all 3 rounds on Daily #001', () => {
    const challenge = generateDailyChallenge('2026-10-19');
    expect(challenge.challengeNumber).toBe(1);

    render(<App overrideChallengeId="2026-10-19" />);

    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
    expect(screen.getByTestId('home-screen')).toHaveTextContent('Daily #001');
    expect(screen.queryByTestId('header-dev-mode-button')).not.toBeInTheDocument();

    // First-time click opens tutorial
    fireEvent.click(screen.getByTestId('start-challenge-button'));
    expect(screen.getByTestId('tutorial-screen')).toBeInTheDocument();

    // Start Round 1 from tutorial
    fireEvent.click(screen.getByTestId('tutorial-start-button'));
    expect(screen.getByTestId('memorise-screen')).toBeInTheDocument();

    // Advance past Round 1 memorise (8s) + conceal (250ms)
    act(() => {
      vi.advanceTimersByTime(8_100);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByTestId('recreate-screen')).toBeInTheDocument();

    // Solve Round 1 by dragging colours from the slider bar into the empty squares + Lock In
    placeFromSliderAndLockIn(challenge.rounds[0].targetOrder, true);
    expect(screen.getByTestId('round-success-screen')).toBeInTheDocument();
    expect(screen.getByTestId('celebration-burst')).toBeInTheDocument();
    expect(screen.getByTestId('round-result-score')).toHaveTextContent('+100');

    // Because no other player has played Round 1 yet, community comparison is NOT shown
    expect(screen.queryByTestId('round-community-choices')).not.toBeInTheDocument();
    expect(screen.getByTestId('round-result-swaps')).toBeInTheDocument();

    // Click Continue to Round 2 -> loads Round 2 memorisation directly
    expect(screen.getByTestId('round-continue-button')).toHaveTextContent(
      'Continue to Round 2',
    );
    fireEvent.click(screen.getByTestId('round-continue-button'));
    expect(screen.getByTestId('memorise-screen')).toBeInTheDocument();

    // Advance past Round 2 memorisation (10s) + conceal (250ms)
    act(() => {
      vi.advanceTimersByTime(10_100);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByTestId('recreate-screen')).toBeInTheDocument();

    // Lock in an empty/unarranged board on Round 2 to test mismatch review ("Your Board" vs "Target Solution")
    fireEvent.click(screen.getByTestId('lock-in-button'));
    expect(screen.getByTestId('round-failure-screen')).toBeInTheDocument();
    expect(screen.queryByTestId('celebration-burst')).not.toBeInTheDocument();
    expect(screen.getByTestId('round-result-player-board')).toBeInTheDocument();
    expect(screen.getByTestId('round-result-target-board')).toBeInTheDocument();
    expect(screen.queryByTestId('round-community-choices')).not.toBeInTheDocument();

    // Click Continue to Round 3 -> loads Round 3 memorisation directly
    expect(screen.getByTestId('round-continue-button')).toHaveTextContent(
      'Continue to Round 3',
    );
    fireEvent.click(screen.getByTestId('round-continue-button'));
    expect(screen.getByTestId('memorise-screen')).toBeInTheDocument();

    // Advance past Round 3 memorisation (15s) + conceal (250ms)
    act(() => {
      vi.advanceTimersByTime(15_100);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Solve Round 3 using Tap-to-Place from the slider bar + Lock In
    placeFromSliderAndLockIn(challenge.rounds[2].targetOrder, false);
    expect(screen.getByTestId('round-success-screen')).toBeInTheDocument();
    expect(screen.getByTestId('round-result-score')).toHaveTextContent('+200');

    // Click View Results Dashboard -> loads Final Results Dashboard directly
    expect(screen.getByTestId('round-continue-button')).toHaveTextContent(
      'View Results Dashboard',
    );
    fireEvent.click(screen.getByTestId('round-continue-button'));
    expect(screen.getByTestId('results-screen')).toBeInTheDocument();
    expect(screen.getByTestId('final-solved-count')).toHaveTextContent('2/3');
    expect(screen.getByTestId('final-matched-tiles')).toHaveTextContent('12/18');
    expect(screen.getByTestId('final-total-score')).toHaveTextContent('300');

    // Because no other player has completed today's challenge, community comparison card is hidden
    expect(screen.queryByTestId('community-comparison-card')).not.toBeInTheDocument();

    // Open full-size Review Inspector modal
    fireEvent.click(screen.getByTestId('open-review-button'));
    expect(screen.getByTestId('review-modal')).toBeInTheDocument();
    expect(screen.getByTestId('review-player-board-r1')).toBeInTheDocument();
    expect(screen.getByTestId('review-solution-board-r1')).toBeInTheDocument();

    // Close Review modal and test Home button navigation
    fireEvent.click(screen.getByTestId('done-review-button'));
    fireEvent.click(screen.getByTestId('results-home-button'));
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
    expect(screen.getByTestId('home-round-card-1')).toHaveTextContent('4/4 right');
    expect(screen.getByTestId('home-round-card-2')).toHaveTextContent('0/6 right');
    expect(screen.getByTestId('home-round-card-3')).toHaveTextContent('8/8 right');
    expect(screen.getByTestId('start-challenge-button')).toHaveTextContent(
      'Results (12/18 right)',
    );
  });

  it('displays real community comparison stats once another player has recorded their choices', () => {
    const challenge = generateDailyChallenge('2026-10-19');

    // Record another real player's round & daily choices first
    const otherR1Result = {
      roundId: 1,
      status: 'success' as const,
      swaps: 4,
      optimalSwaps: 2,
      solveTimeMs: 5000,
      remainingMs: 15000,
      score: 100,
      finalTileOrder: [...challenge.rounds[0].targetOrder],
      matchedTiles: 4,
      totalTiles: 4,
      scoringVersion: 'score-v2',
    };
    const otherR2Result = {
      roundId: 2,
      status: 'failure' as const,
      failureReason: 'mismatch' as const,
      swaps: 6,
      optimalSwaps: 3,
      solveTimeMs: 10000,
      remainingMs: 20000,
      score: 50,
      finalTileOrder: [...challenge.rounds[1].shuffledOrder],
      matchedTiles: 2,
      totalTiles: 6,
      scoringVersion: 'score-v2',
    };
    const otherR3Result = {
      roundId: 3,
      status: 'failure' as const,
      failureReason: 'mismatch' as const,
      swaps: 8,
      optimalSwaps: 5,
      solveTimeMs: 20000,
      remainingMs: 25000,
      score: 100,
      finalTileOrder: [...challenge.rounds[2].shuffledOrder],
      matchedTiles: 4,
      totalTiles: 8,
      scoringVersion: 'score-v2',
    };

    recordRoundPlayerChoices('2026-10-19', otherR1Result, Date.now(), 'other-player-1');
    recordRoundPlayerChoices('2026-10-19', otherR2Result, Date.now(), 'other-player-1');
    recordRoundPlayerChoices('2026-10-19', otherR3Result, Date.now(), 'other-player-1');
    recordDailyPlayerChoices(
      '2026-10-19',
      [otherR1Result, otherR2Result, otherR3Result],
      Date.now(),
      'other-player-1',
    );

    render(<App overrideChallengeId="2026-10-19" />);
    fireEvent.click(screen.getByTestId('start-challenge-button'));
    fireEvent.click(screen.getByTestId('tutorial-start-button'));

    act(() => {
      vi.advanceTimersByTime(8_100);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    placeFromSliderAndLockIn(challenge.rounds[0].targetOrder, false);
    expect(screen.getByTestId('round-community-choices')).toBeInTheDocument();
    expect(screen.getByTestId('round-result-percentile')).toHaveTextContent(
      'Beat 100%',
    );
  });

  it('enables tactile sounds by default, removes dev settings, and persists preferences across reloads', () => {
    const { unmount } = render(<App overrideChallengeId="2026-10-19" />);

    fireEvent.click(screen.getByTestId('open-settings-button'));
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('toggle-dev-mode')).not.toBeInTheDocument();

    const soundToggle = screen.getByTestId('toggle-sound');
    expect(soundToggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(soundToggle);
    expect(soundToggle).toHaveAttribute('aria-checked', 'false');

    const symbolToggle = screen.getByTestId('toggle-symbols');
    expect(symbolToggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(symbolToggle);
    expect(symbolToggle).toHaveAttribute('aria-checked', 'true');

    unmount();

    render(<App overrideChallengeId="2026-10-19" />);
    fireEvent.click(screen.getByTestId('open-settings-button'));
    expect(screen.getByTestId('toggle-sound')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('toggle-symbols')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
