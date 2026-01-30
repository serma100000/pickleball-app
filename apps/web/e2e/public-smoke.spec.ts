import { test, expect } from '@playwright/test';

/**
 * Public Pages Smoke Tests
 * These tests don't require authentication and test public routes.
 */
test.describe('Public Pages', () => {
  test('homepage loads and shows main content', async ({ page }) => {
    await page.goto('/');

    // Check title contains expected brand
    await expect(page).toHaveTitle(/Paddle|Pickleball|PaddleUp/i);

    // Check for hero heading
    const heroHeading = page.getByRole('heading', { name: /organize tournaments|pickleball/i }).first();
    await expect(heroHeading).toBeVisible();

    // Check for navigation
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('sign-in page loads', async ({ page }) => {
    await page.goto('/sign-in');

    // Wait for Clerk form to load
    const emailInput = page.getByPlaceholder('Enter your email address');
    await expect(emailInput).toBeVisible({ timeout: 30000 });

    // Check for sign-in related content
    await expect(page.getByText(/sign in|welcome back/i).first()).toBeVisible();
  });

  test('sign-up page loads', async ({ page }) => {
    await page.goto('/sign-up');

    // Wait for Clerk form to load
    await page.waitForLoadState('domcontentloaded');

    // Check for sign-up related content
    const signUpContent = page.getByText(/sign up|create.*account|join/i).first();
    await expect(signUpContent).toBeVisible({ timeout: 30000 });
  });

  test('navigation is accessible', async ({ page }) => {
    await page.goto('/');

    // Check for skip link (accessibility)
    const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip")').first();
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeVisible();
    }

    // Check for navigation element
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
  });

  test('page has proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag exists
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});
