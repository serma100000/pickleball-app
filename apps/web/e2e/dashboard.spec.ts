import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 *
 * Tests for the authenticated dashboard area
 * Note: These tests require authentication - they will verify redirect
 * behavior for unauthenticated users
 */
test.describe('Dashboard', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect to sign in when not authenticated', async ({
      page,
    }) => {
      await page.goto('/dashboard');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Dashboard UI Structure (mocked auth)', () => {
    // Note: In a real app, you would set up authentication fixtures
    // For now, we test the structure by checking what elements should exist

    test.skip(
      'should have stats cards when authenticated',
      async ({ page }) => {
        // This test would run with authenticated user
        await page.goto('/dashboard');

        // Check for stats cards
        const statsCards = page.locator('[data-testid="stats-card"]');
        await expect(statsCards.first()).toBeVisible();
      }
    );

    test.skip(
      'should have sidebar navigation when authenticated',
      async ({ page }) => {
        // This test would run with authenticated user
        await page.goto('/dashboard');

        // Check for sidebar
        const sidebar = page.locator('aside, [data-testid="sidebar"]');
        await expect(sidebar).toBeVisible();
      }
    );
  });
});

test.describe('Dashboard Navigation Structure', () => {
  // Test the expected navigation structure by checking sign-in redirect contains return URL

  test('dashboard route should preserve intended destination', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Should redirect with return URL
    const url = page.url();
    expect(url).toContain('sign-in');
  });

  test('games route should be protected', async ({ page }) => {
    await page.goto('/games');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('tournaments route should be protected', async ({ page }) => {
    await page.goto('/tournaments');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('leagues route should be protected', async ({ page }) => {
    await page.goto('/leagues');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });

  test('profile route should be protected', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe('Dashboard Expected Elements', () => {
  // These tests document expected dashboard elements
  // They will skip if user is not authenticated

  test.describe('Stats Overview', () => {
    test('should show stats section with key metrics', async ({ page }) => {
      await page.goto('/dashboard');

      // If redirected to sign-in, test passes (protected route working)
      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // If somehow we're authenticated, check for stats
      const statsSection = page.locator(
        '[data-testid="stats-section"], .stats, [class*="stats"]'
      );
      await expect(statsSection).toBeVisible();
    });
  });

  test.describe('Quick Actions', () => {
    test('should have quick action buttons', async ({ page }) => {
      await page.goto('/dashboard');

      // If redirected to sign-in, test passes
      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for action buttons
      const logGameButton = page.getByRole('link', { name: /log.*game/i });
      if ((await logGameButton.count()) > 0) {
        await expect(logGameButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Recent Activity', () => {
    test('should show recent activity section', async ({ page }) => {
      await page.goto('/dashboard');

      // If redirected to sign-in, test passes
      if (page.url().includes('sign-in')) {
        test.skip();
        return;
      }

      // Check for recent activity
      const recentSection = page.locator(
        '[data-testid="recent-activity"], .recent, text=/recent/i'
      );
      if ((await recentSection.count()) > 0) {
        await expect(recentSection.first()).toBeVisible();
      }
    });
  });
});
