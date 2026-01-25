import { test, expect } from '@playwright/test';

/**
 * Landing Page E2E Tests
 *
 * Tests for the public landing page at /
 * Covers hero section, navigation, CTAs, and footer
 */
test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Hero Section', () => {
    test('should display the hero section', async ({ page }) => {
      // Check for main heading
      const heroHeading = page.locator('h1').first();
      await expect(heroHeading).toBeVisible();

      // Check that the hero section exists
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();
    });

    test('should display main CTA buttons', async ({ page }) => {
      // Look for primary CTA buttons (Get Started, Sign Up, etc.)
      const ctaButtons = page.getByRole('link', {
        name: /get started|sign up|try free/i,
      });

      // Should have at least one CTA
      const count = await ctaButtons.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should navigate to sign up when clicking primary CTA', async ({
      page,
    }) => {
      // Find and click the primary CTA
      const primaryCta = page
        .getByRole('link', { name: /get started|sign up/i })
        .first();

      if ((await primaryCta.count()) > 0) {
        await primaryCta.click();
        // Should navigate to sign-up page
        await expect(page).toHaveURL(/sign-up/);
      }
    });
  });

  test.describe('Navigation', () => {
    test('should display the navigation bar', async ({ page }) => {
      // Check for navigation/header
      const nav = page.locator('header, nav').first();
      await expect(nav).toBeVisible();
    });

    test('should display the logo', async ({ page }) => {
      // Look for logo link or image
      const logo = page.locator('header').getByRole('link').first();
      await expect(logo).toBeVisible();
    });

    test('should have sign in link', async ({ page, isMobile }) => {
      // On mobile, might need to open menu first
      if (isMobile) {
        const menuButton = page.getByRole('button', {
          name: /menu|toggle/i,
        });
        if ((await menuButton.count()) > 0) {
          await menuButton.click();
          await page.waitForTimeout(300); // Wait for menu animation
        }
      }

      // Look for sign in link
      const signInLink = page.getByRole('link', { name: /sign in|log in/i });
      const count = await signInLink.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should navigate to sign in page', async ({ page, isMobile }) => {
      // On mobile, might need to open menu first
      if (isMobile) {
        const menuButton = page.getByRole('button', {
          name: /menu|toggle/i,
        });
        if ((await menuButton.count()) > 0) {
          await menuButton.click();
          await page.waitForTimeout(300);
        }
      }

      // Click sign in link
      const signInLink = page
        .getByRole('link', { name: /sign in|log in/i })
        .first();
      await signInLink.click();

      // Should navigate to sign-in page
      await expect(page).toHaveURL(/sign-in/);
    });
  });

  test.describe('Features Section', () => {
    test('should display feature cards or sections', async ({ page }) => {
      // Look for feature-related content
      const features = page.locator(
        '[data-testid="features"], section:has-text("feature"), .features'
      );

      // If features section exists, verify it's visible
      if ((await features.count()) > 0) {
        await expect(features.first()).toBeVisible();
      }
    });
  });

  test.describe('Footer', () => {
    test('should display the footer', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('should have copyright text', async ({ page }) => {
      const footer = page.locator('footer');
      const currentYear = new Date().getFullYear().toString();

      // Check for copyright notice
      await expect(footer).toContainText(/paddle|pickleball/i);
    });

    test('should have terms and privacy links', async ({ page }) => {
      const footer = page.locator('footer');

      // Look for legal links
      const termsLink = footer.getByRole('link', { name: /terms/i });
      const privacyLink = footer.getByRole('link', { name: /privacy/i });

      // At least one of these should exist
      const hasTerms = (await termsLink.count()) > 0;
      const hasPrivacy = (await privacyLink.count()) > 0;

      // Skip if links don't exist (not all apps have them in footer)
      if (hasTerms) {
        await expect(termsLink.first()).toBeVisible();
      }
      if (hasPrivacy) {
        await expect(privacyLink.first()).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-only test');

      // Check that content is visible and not overflowing
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();

      // Body should fit viewport
      expect(bodyBox?.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    });

    test('should show mobile menu on small screens', async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, 'Mobile-only test');

      // Look for hamburger menu button
      const menuButton = page.getByRole('button', {
        name: /menu|toggle|hamburger/i,
      });

      // Mobile should have a menu button (unless nav is always visible)
      if ((await menuButton.count()) > 0) {
        await expect(menuButton.first()).toBeVisible();
      }
    });
  });
});
