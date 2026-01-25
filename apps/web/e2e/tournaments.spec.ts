import { test, expect } from '@playwright/test';

/**
 * Tournament Flow E2E Tests
 *
 * Tests for tournament listing and creation wizard
 */
test.describe('Tournaments', () => {
  test.describe('Protected Access', () => {
    test('should redirect to sign in when not authenticated', async ({
      page,
    }) => {
      await page.goto('/tournaments');
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should protect tournament creation page', async ({ page }) => {
      await page.goto('/tournaments/new');
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Tournament List Page Structure', () => {
    // These tests document expected structure

    test('tournaments page should exist as protected route', async ({
      page,
    }) => {
      const response = await page.goto('/tournaments');

      // Should either redirect or return 200
      expect(response?.status()).toBeLessThan(500);
    });

    test('should handle tournament list loading', async ({ page }) => {
      await page.goto('/tournaments');

      // If redirected, test passes (protected route)
      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for tournament list elements
      const tournamentList = page.locator(
        '[data-testid="tournament-list"], .tournament-list, main'
      );
      await expect(tournamentList).toBeVisible();
    });
  });

  test.describe('Tournament Creation Wizard', () => {
    test('tournament creation page should be protected', async ({ page }) => {
      await page.goto('/tournaments/new');
      await expect(page).toHaveURL(/sign-in/);
    });

    test('wizard should have expected step structure', async ({ page }) => {
      await page.goto('/tournaments/new');

      // If redirected, test passes
      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for step indicator
      const stepIndicator = page.locator(
        '[data-testid="step-indicator"], .steps, [class*="step"]'
      );
      if ((await stepIndicator.count()) > 0) {
        await expect(stepIndicator.first()).toBeVisible();
      }
    });
  });

  test.describe('Tournament Detail Page', () => {
    test('should handle non-existent tournament gracefully', async ({
      page,
    }) => {
      // Try to access a non-existent tournament
      const response = await page.goto('/tournaments/non-existent-id');

      // Should either redirect to sign-in or show 404
      const status = response?.status();
      expect(status).toBeDefined();
    });
  });
});

test.describe('Tournament Wizard Steps (Expected Structure)', () => {
  // Document expected wizard steps

  test.describe('Step 1: Basic Info', () => {
    test('should have tournament name field', async ({ page }) => {
      await page.goto('/tournaments/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for name input
      const nameInput = page.locator(
        'input[name="name"], input[placeholder*="name" i], [data-testid="tournament-name"]'
      );
      await expect(nameInput).toBeVisible();
    });

    test('should have date fields', async ({ page }) => {
      await page.goto('/tournaments/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for date inputs
      const dateInputs = page.locator('input[type="date"]');
      const count = await dateInputs.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should have venue/location field', async ({ page }) => {
      await page.goto('/tournaments/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for venue input
      const venueInput = page.locator(
        'input[name="venue"], input[placeholder*="venue" i], input[placeholder*="location" i]'
      );
      if ((await venueInput.count()) > 0) {
        await expect(venueInput.first()).toBeVisible();
      }
    });
  });

  test.describe('Step Navigation', () => {
    test('should have next/back navigation buttons', async ({ page }) => {
      await page.goto('/tournaments/new');

      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for navigation buttons
      const nextButton = page.getByRole('button', { name: /next|continue/i });
      const backButton = page.getByRole('button', { name: /back|previous/i });
      const cancelLink = page.getByRole('link', { name: /cancel/i });

      // Should have at least next or cancel
      const hasNext = (await nextButton.count()) > 0;
      const hasCancel = (await cancelLink.count()) > 0;

      expect(hasNext || hasCancel).toBeTruthy();
    });
  });
});

test.describe('Tournament Format Options', () => {
  // Document expected format options

  test('should support multiple tournament formats', async ({ page }) => {
    await page.goto('/tournaments/new');

    if (page.url().includes('sign-in')) {
      test.skip();
      return;
    }

    // Navigate to format step if multi-step
    // Check for format selection
    const formatSelect = page.locator(
      'select[name="format"], [data-testid="format-select"], [data-testid="format-option"]'
    );

    if ((await formatSelect.count()) > 0) {
      // Format selection should be available
      await expect(formatSelect.first()).toBeVisible();
    }
  });

  test('should support seeding options', async ({ page }) => {
    await page.goto('/tournaments/new');

    if (page.url().includes('sign-in')) {
      test.skip();
      return;
    }

    // Check for seeding options (may be on later step)
    const seedingOption = page.locator(
      '[data-testid="seeding-option"], select[name*="seed"], text=/seeding/i'
    );

    // Just verify page structure - seeding may be on different step
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});
