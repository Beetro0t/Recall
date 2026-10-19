import { expect, test } from '@playwright/test';

test.describe('Recall End-to-End Browser Verification', () => {
  test('renders home screen, opens tutorial practice, and completes a full 3-round daily challenge with auto-advance and Results Dashboard', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-19T12:00:00Z') });
    await page.goto('/');

    await expect(page.getByTestId('home-screen')).toBeVisible();
    await expect(page.getByText('How sharp is your memory?')).toBeVisible();

    // Open onboarding tutorial
    await page.getByTestId('start-challenge-button').click();
    await expect(page.getByTestId('tutorial-screen')).toBeVisible();

    // Start Round 1
    await page.getByTestId('tutorial-start-button').click();
    await expect(page.getByTestId('memorise-screen')).toBeVisible();

    const r1TargetIds = await page
      .locator('[data-testid^="board-tile-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile-id')!));
    expect(r1TargetIds).toHaveLength(4);

    // Fast-forward past Round 1 memorisation (8s) + conceal (250ms)
    await page.clock.fastForward(8_500);
    await expect(page.getByTestId('recreate-screen')).toBeVisible();

    // Solve Round 1 by swapping tiles to match r1TargetIds and clicking Lock In
    for (let i = 0; i < r1TargetIds.length; i++) {
      const currentOrder = await page
        .locator('[data-testid^="board-tile-"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile-id')!));
      const idx = currentOrder.indexOf(r1TargetIds[i]);
      if (idx !== i) {
        await page.getByTestId(`board-tile-${i}`).click();
        await page.getByTestId(`board-tile-${idx}`).click();
      }
    }
    await page.getByTestId('lock-in-button').click();

    await expect(page.getByTestId('round-success-screen')).toBeVisible();
    // Auto-advance (2.6s) goes straight into Round 2 memorising without a second continue screen
    await page.clock.fastForward(2_700);

    await expect(page.getByTestId('memorise-screen')).toBeVisible();
    const r2TargetIds = await page
      .locator('[data-testid^="board-tile-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile-id')!));
    expect(r2TargetIds).toHaveLength(6);

    await page.clock.fastForward(10_500);
    await expect(page.getByTestId('recreate-screen')).toBeVisible();

    // Test refresh persistence during Round 2 recreation
    await page.reload();
    await expect(page.getByTestId('recreate-screen')).toBeVisible();

    // Solve Round 2 and Lock In
    for (let i = 0; i < r2TargetIds.length; i++) {
      const currentOrder = await page
        .locator('[data-testid^="board-tile-"]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile-id')!));
      const idx = currentOrder.indexOf(r2TargetIds[i]);
      if (idx !== i) {
        await page.getByTestId(`board-tile-${i}`).click();
        await page.getByTestId(`board-tile-${idx}`).click();
      }
    }
    await page.getByTestId('lock-in-button').click();

    await expect(page.getByTestId('round-success-screen')).toBeVisible();
    // Auto-advance (2.6s) goes straight into Round 3 memorising
    await page.clock.fastForward(2_700);

    await expect(page.getByTestId('memorise-screen')).toBeVisible();
    await page.clock.fastForward(15_500);
    await expect(page.getByTestId('recreate-screen')).toBeVisible();

    // Let Round 3 expire to test timeout handling
    await page.clock.fastForward(46_000);
    await expect(page.getByTestId('round-failure-screen')).toBeVisible();
    await page.clock.fastForward(2_700);

    // Final Results Dashboard & Home navigation
    await expect(page.getByTestId('results-screen')).toBeVisible();
    await expect(page.getByTestId('final-solved-count')).toHaveText('2/3');

    await page.getByTestId('open-review-button').click();
    await expect(page.getByTestId('review-modal')).toBeVisible();
    await page.getByTestId('done-review-button').click();

    await page.getByTestId('results-home-button').click();
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });
});
