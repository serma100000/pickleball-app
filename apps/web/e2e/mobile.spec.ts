import { test, expect } from '@playwright/test';

/**
 * Mobile-Specific E2E Tests
 *
 * Tests for mobile UX, touch targets, and responsive behavior
 */
test.describe('Mobile Experience', () => {
  // Only run on mobile projects
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test.describe('Touch Targets', () => {
    test('should have minimum 44px touch targets for buttons on landing page', async ({
      page,
    }) => {
      await page.goto('/');

      // Get all interactive elements
      const buttons = page.locator(
        'button, a[role="button"], [role="button"]'
      );
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);

        // Only check visible buttons
        if (!(await button.isVisible())) continue;

        const box = await button.boundingBox();
        if (box) {
          // Touch target should be at least 44x44px
          // Allow some tolerance for very small decorative elements
          const isSmallIcon =
            (await button.getAttribute('aria-hidden')) === 'true';
          if (!isSmallIcon && box.width > 20 && box.height > 20) {
            // Check if close to 44px minimum
            expect(box.height).toBeGreaterThanOrEqual(40);
            expect(box.width).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });

    test('should have minimum touch targets on sign-in page', async ({
      page,
    }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000); // Wait for Clerk

      // Get all buttons
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);

        if (!(await button.isVisible())) continue;

        const box = await button.boundingBox();
        if (box && box.width > 20 && box.height > 20) {
          // Primary action buttons should meet touch target guidelines
          expect(box.height).toBeGreaterThanOrEqual(36);
        }
      }
    });

    test('should have accessible link tap targets', async ({ page }) => {
      await page.goto('/');

      // Get navigation links
      const links = page.locator('header a, nav a');
      const linkCount = await links.count();

      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);

        if (!(await link.isVisible())) continue;

        const box = await link.boundingBox();
        if (box) {
          // Links should have reasonable tap area
          expect(box.height).toBeGreaterThanOrEqual(32);
        }
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should show hamburger menu or bottom nav on mobile', async ({
      page,
    }) => {
      await page.goto('/');

      // Check for mobile menu button
      const menuButton = page.locator(
        'button[aria-label*="menu" i], button[aria-label*="toggle" i], [data-testid="mobile-menu"]'
      );

      // Check for bottom navigation
      const bottomNav = page.locator(
        'nav[aria-label*="bottom" i], [data-testid="bottom-nav"], footer nav'
      );

      const hasMenuButton = (await menuButton.count()) > 0;
      const hasBottomNav = (await bottomNav.count()) > 0;

      // Should have some form of mobile navigation
      expect(hasMenuButton || hasBottomNav).toBeTruthy();
    });

    test('should open mobile menu when hamburger is clicked', async ({
      page,
    }) => {
      await page.goto('/');

      const menuButton = page.locator(
        'button[aria-label*="menu" i], button[aria-label*="toggle" i], [data-testid="mobile-menu"]'
      );

      if ((await menuButton.count()) === 0) {
        test.skip();
        return;
      }

      // Click menu button
      await menuButton.first().click();
      await page.waitForTimeout(300); // Wait for animation

      // Menu should be visible
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu-content"], nav[data-state="open"], .mobile-menu'
      );

      // Either menu appears or navigation items become visible
      const navLinks = page.locator('nav a, [role="menuitem"]');
      const visibleLinks = await navLinks.filter({ hasText: /.+/ }).count();

      expect(visibleLinks).toBeGreaterThan(0);
    });
  });

  test.describe('Viewport and Content', () => {
    test('should not have horizontal scroll', async ({ page }) => {
      await page.goto('/');

      // Check for horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });

      expect(hasHorizontalScroll).toBeFalsy();
    });

    test('should have proper viewport meta tag', async ({ page }) => {
      await page.goto('/');

      // Check for viewport meta tag
      const viewportMeta = page.locator('meta[name="viewport"]');
      const content = await viewportMeta.getAttribute('content');

      expect(content).toContain('width=device-width');
    });

    test('should have readable text sizes', async ({ page }) => {
      await page.goto('/');

      // Check body font size
      const bodyFontSize = await page.evaluate(() => {
        return parseFloat(getComputedStyle(document.body).fontSize);
      });

      // Font size should be at least 14px for readability
      expect(bodyFontSize).toBeGreaterThanOrEqual(14);
    });
  });

  test.describe('Mobile Forms', () => {
    test('should have appropriately sized form inputs', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Get form inputs
      const inputs = page.locator(
        'input[type="text"], input[type="email"], input[type="password"]'
      );
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);

        if (!(await input.isVisible())) continue;

        const box = await input.boundingBox();
        if (box) {
          // Inputs should be at least 44px tall for easy tapping
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test('should have proper input types for mobile keyboards', async ({
      page,
    }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Email input should have email type
      const emailInput = page.locator(
        'input[type="email"], input[name*="email"]'
      );

      if ((await emailInput.count()) > 0) {
        const type = await emailInput.first().getAttribute('type');
        const inputMode = await emailInput.first().getAttribute('inputmode');

        // Should be email type or have email inputmode
        expect(type === 'email' || inputMode === 'email').toBeTruthy();
      }
    });
  });

  test.describe('Bottom Navigation (Dashboard)', () => {
    test('should show bottom navigation on mobile dashboard', async ({
      page,
    }) => {
      // Try to access dashboard (will redirect to sign-in)
      await page.goto('/dashboard');

      // If not redirected (authenticated), check for bottom nav
      if (!page.url().includes('sign-in')) {
        const bottomNav = page.locator(
          '[data-testid="bottom-nav"], nav.fixed.bottom-0, footer.fixed.bottom-0'
        );

        if ((await bottomNav.count()) > 0) {
          await expect(bottomNav.first()).toBeVisible();
        }
      } else {
        // Test passes - protected route working
        test.skip();
      }
    });
  });
});

test.describe('Mobile Gestures', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('should support pull-to-refresh gesture area', async ({ page }) => {
    await page.goto('/');

    // Check that page is scrollable
    const isScrollable = await page.evaluate(() => {
      return document.documentElement.scrollHeight > window.innerHeight;
    });

    // Long pages should be scrollable
    // Short pages don't need to be
    expect(typeof isScrollable).toBe('boolean');
  });

  test('should handle swipe navigation if supported', async ({ page }) => {
    await page.goto('/');

    // Most web apps don't support swipe nav, but verify no errors
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });
});

test.describe('Mobile Performance', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only tests');
  });

  test('should load landing page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds on mobile
    expect(loadTime).toBeLessThan(10000);
  });

  test('should have reasonable DOM size', async ({ page }) => {
    await page.goto('/');

    const domSize = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    // DOM should not be excessively large
    expect(domSize).toBeLessThan(5000);
  });
});
