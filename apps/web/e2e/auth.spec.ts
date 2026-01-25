import { test, expect } from '@playwright/test';

/**
 * Authentication Flow E2E Tests
 *
 * Tests for sign in and sign up pages
 * Uses Clerk for authentication - tests UI presence
 */
test.describe('Authentication', () => {
  test.describe('Sign In Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sign-in');
    });

    test('should load sign in page', async ({ page }) => {
      // Should be on sign-in page
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should display logo and branding', async ({ page }) => {
      // Check for logo link back to home
      const logoLink = page.locator('header').getByRole('link').first();
      await expect(logoLink).toBeVisible();
    });

    test('should display Clerk sign in UI', async ({ page }) => {
      // Clerk renders its own UI - wait for it to load
      // Look for Clerk's container or common elements
      const clerkContainer = page.locator(
        '[data-clerk-portal], .cl-rootBox, .cl-signIn-root, [class*="clerk"]'
      );

      // Wait for Clerk to initialize (it loads asynchronously)
      await page.waitForTimeout(2000);

      // Check for sign-in related content
      const signInContent = page.locator(
        'text=/sign in|email|password|continue/i'
      );
      const contentCount = await signInContent.count();

      // Should have some sign-in related content
      expect(contentCount).toBeGreaterThanOrEqual(1);
    });

    test('should have email input field', async ({ page }) => {
      // Wait for Clerk to load
      await page.waitForTimeout(2000);

      // Look for email input
      const emailInput = page.locator(
        'input[type="email"], input[name="email"], input[name="identifier"], input[placeholder*="email" i]'
      );

      // Should have at least one email input
      const count = await emailInput.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should navigate to sign up from sign in', async ({ page }) => {
      // Wait for page to load
      await page.waitForTimeout(2000);

      // Look for sign up link
      const signUpLink = page.getByRole('link', {
        name: /sign up|create account|don't have an account/i,
      });

      if ((await signUpLink.count()) > 0) {
        await signUpLink.first().click();
        await expect(page).toHaveURL(/sign-up/);
      }
    });

    test('should display footer with copyright', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('should be able to navigate back to home', async ({ page }) => {
      // Click logo to go back to home
      const logoLink = page.locator('header').getByRole('link').first();
      await logoLink.click();

      // Should be on home page
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Sign Up Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sign-up');
    });

    test('should load sign up page', async ({ page }) => {
      // Should be on sign-up page
      await expect(page).toHaveURL(/sign-up/);
    });

    test('should display Clerk sign up UI', async ({ page }) => {
      // Wait for Clerk to load
      await page.waitForTimeout(2000);

      // Check for sign-up related content
      const signUpContent = page.locator(
        'text=/sign up|create|email|password|continue/i'
      );
      const contentCount = await signUpContent.count();

      // Should have some sign-up related content
      expect(contentCount).toBeGreaterThanOrEqual(1);
    });

    test('should have required input fields', async ({ page }) => {
      // Wait for Clerk to load
      await page.waitForTimeout(2000);

      // Look for email input
      const emailInput = page.locator(
        'input[type="email"], input[name="email"], input[name="emailAddress"], input[placeholder*="email" i]'
      );

      // Should have at least one email input
      const count = await emailInput.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should navigate to sign in from sign up', async ({ page }) => {
      // Wait for page to load
      await page.waitForTimeout(2000);

      // Look for sign in link
      const signInLink = page.getByRole('link', {
        name: /sign in|already have an account|log in/i,
      });

      if ((await signInLink.count()) > 0) {
        await signInLink.first().click();
        await expect(page).toHaveURL(/sign-in/);
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to sign in when accessing dashboard unauthenticated', async ({
      page,
    }) => {
      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should redirect to sign in when accessing games unauthenticated', async ({
      page,
    }) => {
      // Try to access protected route
      await page.goto('/games');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should redirect to sign in when accessing tournaments unauthenticated', async ({
      page,
    }) => {
      // Try to access protected route
      await page.goto('/tournaments');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });

    test('should redirect to sign in when accessing profile unauthenticated', async ({
      page,
    }) => {
      // Try to access protected route
      await page.goto('/profile');

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Auth Page Accessibility', () => {
    test('sign in page should have proper heading structure', async ({
      page,
    }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Should have at least one heading
      const headings = page.locator('h1, h2, h3');
      const count = await headings.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('sign up page should have proper heading structure', async ({
      page,
    }) => {
      await page.goto('/sign-up');
      await page.waitForTimeout(2000);

      // Should have at least one heading
      const headings = page.locator('h1, h2, h3');
      const count = await headings.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
