import { test, expect } from '@playwright/test';

/**
 * Smoke tests to verify basic app functionality and authentication.
 */

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Paddle|Pickleball/i);
  });

  test('dashboard is accessible when authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should not redirect to sign-in (we're authenticated)
    await expect(page).not.toHaveURL(/sign-in/);

    // Should see dashboard content
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('can navigate to tournament creation', async ({ page }) => {
    await page.goto('/tournaments/new');

    // Should see the tournament creation form
    await expect(page.locator('text=Create Tournament')).toBeVisible();

    // Should see the first step
    await expect(page.locator('input#tournament-name')).toBeVisible();
  });

  test('can navigate to league creation', async ({ page }) => {
    await page.goto('/leagues/new');

    // Should see the league creation form
    await expect(page.locator('text=Create League')).toBeVisible();

    // Should see league type options
    await expect(page.locator('text=Ladder League')).toBeVisible();
  });
});
