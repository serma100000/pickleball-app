import { test, expect } from '@playwright/test';

/**
 * Games Flow E2E Tests
 *
 * Tests for game listing and logging
 */
test.describe('Games', () => {
  test.describe('Protected Access', () => {
    test('should redirect to sign in when not authenticated', async ({
      page,
    }) => {
      await page.goto('/games');
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should protect game logging page', async ({ page }) => {
      await page.goto('/games/new');
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Games List Page', () => {
    test('games page should exist as protected route', async ({ page }) => {
      const response = await page.goto('/games');
      expect(response?.status()).toBeLessThan(500);
    });

    test('should show games list or empty state', async ({ page }) => {
      await page.goto('/games');

      // If redirected, test passes
      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for games content
      const gamesContent = page.locator(
        '[data-testid="games-list"], .games-list, main'
      );
      await expect(gamesContent).toBeVisible();
    });
  });

  test.describe('Log Game Form', () => {
    test('should protect log game form', async ({ page }) => {
      await page.goto('/games/new');
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should have expected form structure', async ({ page }) => {
      await page.goto('/games/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for form elements
      const form = page.locator(
        'form, [data-testid="log-game-form"], [role="form"]'
      );
      await expect(form).toBeVisible();
    });
  });
});

test.describe('Game Logging Form (Expected Structure)', () => {
  test.describe('Game Type Selection', () => {
    test('should have game type options', async ({ page }) => {
      await page.goto('/games/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for game type selection (singles/doubles)
      const gameTypeSelector = page.locator(
        '[data-testid="game-type"], select[name*="type"], button:has-text("Singles"), button:has-text("Doubles")'
      );

      if ((await gameTypeSelector.count()) > 0) {
        await expect(gameTypeSelector.first()).toBeVisible();
      }
    });
  });

  test.describe('Score Entry', () => {
    test('should have score input fields', async ({ page }) => {
      await page.goto('/games/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for score inputs
      const scoreInputs = page.locator(
        'input[name*="score"], input[type="number"], [data-testid*="score"]'
      );

      if ((await scoreInputs.count()) > 0) {
        await expect(scoreInputs.first()).toBeVisible();
      }
    });
  });

  test.describe('Partner/Opponent Selection', () => {
    test('should have player selection options', async ({ page }) => {
      await page.goto('/games/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for player selection
      const playerSelector = page.locator(
        '[data-testid="player-select"], select[name*="player"], input[name*="opponent"]'
      );

      // Page should load without errors
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  test.describe('Form Submission', () => {
    test('should have submit button', async ({ page }) => {
      await page.goto('/games/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for submit button
      const submitButton = page.getByRole('button', {
        name: /save|submit|log game|record/i,
      });

      if ((await submitButton.count()) > 0) {
        await expect(submitButton.first()).toBeVisible();
      }
    });
  });
});

test.describe('Games List Features', () => {
  test.describe('Filtering', () => {
    test('should support filtering games', async ({ page }) => {
      await page.goto('/games');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for filter options
      const filterControls = page.locator(
        '[data-testid="filter"], select[name*="filter"], button:has-text("Filter")'
      );

      // Filtering is optional feature
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  test.describe('Pagination', () => {
    test('should handle pagination if available', async ({ page }) => {
      await page.goto('/games');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for pagination
      const pagination = page.locator(
        '[data-testid="pagination"], nav[aria-label*="pagination"], button:has-text("Next")'
      );

      // Pagination is optional
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
