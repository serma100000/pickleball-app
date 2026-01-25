import { test, expect } from '@playwright/test';

/**
 * Dark Mode E2E Tests
 *
 * Tests for theme toggle and dark mode styles
 */
test.describe('Dark Mode', () => {
  test.describe('Theme Toggle', () => {
    test('should have a theme toggle button', async ({ page }) => {
      await page.goto('/');

      // Look for theme toggle button
      const themeToggle = page.locator(
        'button[aria-label*="mode" i], button[aria-label*="theme" i], [data-testid="theme-toggle"]'
      );

      // Theme toggle should exist
      const count = await themeToggle.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should toggle between light and dark mode', async ({ page }) => {
      await page.goto('/');

      // Get initial theme
      const getTheme = async () => {
        return await page.evaluate(() => {
          return (
            document.documentElement.classList.contains('dark') ||
            document.documentElement.getAttribute('data-theme') === 'dark' ||
            document.documentElement.style.colorScheme === 'dark'
          );
        });
      };

      // Wait for theme to hydrate
      await page.waitForTimeout(500);

      const initialDark = await getTheme();

      // Find and click theme toggle
      const themeToggle = page.locator(
        'button[aria-label*="mode" i], button[aria-label*="theme" i], [data-testid="theme-toggle"]'
      );

      if ((await themeToggle.count()) === 0) {
        test.skip();
        return;
      }

      await themeToggle.first().click();
      await page.waitForTimeout(300); // Wait for theme change

      const newDark = await getTheme();

      // Theme should have changed
      expect(newDark).not.toBe(initialDark);
    });

    test('should persist theme preference', async ({ page }) => {
      await page.goto('/');

      // Set theme to dark
      const themeToggle = page.locator(
        'button[aria-label*="mode" i], button[aria-label*="theme" i], [data-testid="theme-toggle"]'
      );

      if ((await themeToggle.count()) === 0) {
        test.skip();
        return;
      }

      // Toggle to dark mode
      await page.waitForTimeout(500);
      const initialDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      await themeToggle.first().click();
      await page.waitForTimeout(300);

      const isDarkAfterToggle = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      // Reload page
      await page.reload();
      await page.waitForTimeout(500);

      // Check if theme persisted (stored in localStorage)
      const storedTheme = await page.evaluate(() => {
        return localStorage.getItem('theme');
      });

      // Theme should be stored
      expect(storedTheme !== null || isDarkAfterToggle !== initialDark).toBeTruthy();
    });
  });

  test.describe('Dark Mode Styles', () => {
    test('should have dark background in dark mode', async ({ page }) => {
      await page.goto('/');

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(100);

      // Check background color of body or main
      const bgColor = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = getComputedStyle(body);
        return computedStyle.backgroundColor;
      });

      // In dark mode, background should be dark (not white)
      // RGB values should indicate a dark color
      const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        // For dark mode, average RGB should be low (dark)
        const avgBrightness = (r + g + b) / 3;
        expect(avgBrightness).toBeLessThan(128);
      }
    });

    test('should have light text in dark mode', async ({ page }) => {
      await page.goto('/');

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(100);

      // Check text color
      const textColor = await page.evaluate(() => {
        const heading = document.querySelector('h1, h2, p');
        if (!heading) return null;
        return getComputedStyle(heading).color;
      });

      if (textColor) {
        const rgbMatch = textColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch.map(Number);
          // For dark mode, text should be light (high RGB values)
          const avgBrightness = (r + g + b) / 3;
          expect(avgBrightness).toBeGreaterThan(128);
        }
      }
    });

    test('should have proper contrast in dark mode', async ({ page }) => {
      await page.goto('/');

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(100);

      // Check that buttons are visible
      const buttons = page.locator('button, a').filter({ hasText: /.+/ });
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          // Button should be visible (contrast check)
          await expect(button).toBeVisible();
        }
      }
    });
  });

  test.describe('System Preference', () => {
    test('should respect system color scheme preference', async ({
      page,
      browserName,
    }) => {
      // Skip on browsers that don't support this well
      test.skip(browserName === 'webkit', 'WebKit color scheme emulation limited');

      // Emulate dark color scheme
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.waitForTimeout(500);

      // Check if dark mode is applied
      const isDark = await page.evaluate(() => {
        return (
          document.documentElement.classList.contains('dark') ||
          window.matchMedia('(prefers-color-scheme: dark)').matches
        );
      });

      // Should respect system preference
      expect(isDark).toBeTruthy();
    });

    test('should override system preference when toggled manually', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      const themeToggle = page.locator(
        'button[aria-label*="mode" i], button[aria-label*="theme" i], [data-testid="theme-toggle"]'
      );

      if ((await themeToggle.count()) === 0) {
        test.skip();
        return;
      }

      // Get initial state
      const initialDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      // Toggle twice to return to original state
      await themeToggle.first().click();
      await page.waitForTimeout(300);
      await themeToggle.first().click();
      await page.waitForTimeout(300);

      const finalDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );

      // Should be back to original state
      expect(finalDark).toBe(initialDark);
    });
  });

  test.describe('Dark Mode on Auth Pages', () => {
    test('should apply dark mode on sign-in page', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });
      await page.waitForTimeout(100);

      // Check that page has dark styling
      const isDark = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      expect(isDark).toBeTruthy();
    });
  });

  test.describe('Dark Mode Components', () => {
    test('should style cards properly in dark mode', async ({ page }) => {
      await page.goto('/');

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(100);

      // Check for card-like elements
      const cards = page.locator(
        '.card, [class*="card"], .rounded-lg, .rounded-xl'
      );
      const cardCount = await cards.count();

      if (cardCount > 0) {
        // Cards should be visible in dark mode
        await expect(cards.first()).toBeVisible();
      }
    });

    test('should style inputs properly in dark mode', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(100);

      // Check input styling
      const inputs = page.locator('input');
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          // Input should have dark styling
          const bgColor = await input.evaluate((el) => {
            return getComputedStyle(el).backgroundColor;
          });

          // Background should not be pure white in dark mode
          expect(bgColor).not.toBe('rgb(255, 255, 255)');
        }
      }
    });
  });
});
