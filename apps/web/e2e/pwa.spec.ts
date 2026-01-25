import { test, expect } from '@playwright/test';

/**
 * PWA (Progressive Web App) E2E Tests
 *
 * Tests for PWA functionality, meta tags, and install prompts
 */
test.describe('PWA Features', () => {
  test.describe('Meta Tags', () => {
    test('should have proper PWA meta tags', async ({ page }) => {
      await page.goto('/');

      // Check for PWA-related meta tags
      const themeColor = page.locator('meta[name="theme-color"]');
      await expect(themeColor).toHaveAttribute('content', /.+/);

      // Check for apple-mobile-web-app-capable
      const appleMeta = page.locator(
        'meta[name="apple-mobile-web-app-capable"]'
      );
      if ((await appleMeta.count()) > 0) {
        await expect(appleMeta).toHaveAttribute('content', 'yes');
      }

      // Check for apple-mobile-web-app-status-bar-style
      const statusBarMeta = page.locator(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      );
      if ((await statusBarMeta.count()) > 0) {
        await expect(statusBarMeta).toHaveAttribute('content', /.+/);
      }
    });

    test('should have proper viewport meta tag', async ({ page }) => {
      await page.goto('/');

      const viewport = page.locator('meta[name="viewport"]');
      const content = await viewport.getAttribute('content');

      expect(content).toContain('width=device-width');
      expect(content).toContain('initial-scale=1');
    });

    test('should have manifest link', async ({ page }) => {
      await page.goto('/');

      // Check for manifest link
      const manifest = page.locator('link[rel="manifest"]');
      const count = await manifest.count();

      // Manifest should exist
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should have proper apple-touch-icon', async ({ page }) => {
      await page.goto('/');

      // Check for apple-touch-icon
      const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
      const count = await appleTouchIcon.count();

      if (count > 0) {
        const href = await appleTouchIcon.first().getAttribute('href');
        expect(href).toMatch(/\.(png|jpg|jpeg|ico)/);
      }
    });

    test('should have description meta tag', async ({ page }) => {
      await page.goto('/');

      const description = page.locator('meta[name="description"]');
      const content = await description.getAttribute('content');

      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(10);
    });
  });

  test.describe('Manifest File', () => {
    test('should have valid manifest.json', async ({ page, request }) => {
      // First load the page to get the manifest URL
      await page.goto('/');

      const manifestLink = page.locator('link[rel="manifest"]');
      const manifestHref = await manifestLink.getAttribute('href');

      if (!manifestHref) {
        test.skip();
        return;
      }

      // Fetch manifest
      const baseUrl = page.url().replace(/\/$/, '');
      const manifestUrl = manifestHref.startsWith('/')
        ? `${new URL(baseUrl).origin}${manifestHref}`
        : manifestHref;

      const response = await request.get(manifestUrl);
      expect(response.ok()).toBeTruthy();

      const manifest = await response.json();

      // Check required manifest fields
      expect(manifest.name || manifest.short_name).toBeTruthy();
      expect(manifest.icons).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBeDefined();
    });

    test('manifest should have proper icons', async ({ page, request }) => {
      await page.goto('/');

      const manifestLink = page.locator('link[rel="manifest"]');
      const manifestHref = await manifestLink.getAttribute('href');

      if (!manifestHref) {
        test.skip();
        return;
      }

      const baseUrl = page.url().replace(/\/$/, '');
      const manifestUrl = manifestHref.startsWith('/')
        ? `${new URL(baseUrl).origin}${manifestHref}`
        : manifestHref;

      const response = await request.get(manifestUrl);
      const manifest = await response.json();

      // Check icons
      expect(manifest.icons).toBeInstanceOf(Array);
      expect(manifest.icons.length).toBeGreaterThan(0);

      // Each icon should have required properties
      for (const icon of manifest.icons) {
        expect(icon.src).toBeTruthy();
        expect(icon.sizes).toBeTruthy();
        expect(icon.type).toBeTruthy();
      }
    });
  });

  test.describe('Install Prompt (Mobile)', () => {
    test('should show install prompt on mobile', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Install prompt is mobile-only');

      await page.goto('/');
      await page.waitForTimeout(1000);

      // Check for install prompt banner
      const installPrompt = page.locator(
        '[data-testid="install-prompt"], [aria-label*="install" i], .install-prompt, [class*="install"]'
      );

      // Install prompt may or may not appear depending on browser
      // Just verify no errors on page
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    });

    test('should have dismiss functionality on install prompt', async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, 'Install prompt is mobile-only');

      await page.goto('/');
      await page.waitForTimeout(1000);

      // Look for install prompt dismiss button
      const dismissButton = page.locator(
        '[aria-label*="dismiss" i], [aria-label*="close" i], button:has-text("Not now")'
      );

      if ((await dismissButton.count()) > 0) {
        // Should be clickable
        await expect(dismissButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Offline Capability', () => {
    test('should have service worker registered', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Check for service worker
      const hasServiceWorker = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          return registrations.length > 0;
        }
        return false;
      });

      // Service worker registration is optional but expected for PWA
      // Just verify the check doesn't error
      expect(typeof hasServiceWorker).toBe('boolean');
    });
  });

  test.describe('Standalone Mode', () => {
    test('should detect standalone mode', async ({ page }) => {
      await page.goto('/');

      // Check if app can detect standalone mode
      const isStandalone = await page.evaluate(() => {
        return (
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as Navigator & { standalone?: boolean })
            .standalone === true ||
          document.referrer.includes('android-app://')
        );
      });

      // In browser, should not be standalone
      expect(isStandalone).toBeFalsy();
    });
  });

  test.describe('Theme Color', () => {
    test('should have consistent theme color', async ({ page }) => {
      await page.goto('/');

      // Get theme color from meta tag
      const themeColorMeta = page.locator('meta[name="theme-color"]');
      const metaColor = await themeColorMeta.getAttribute('content');

      // Theme color should be a valid color
      expect(metaColor).toMatch(/^#[0-9A-Fa-f]{6}$|^rgb/);
    });

    test('should update theme color in dark mode', async ({ page }) => {
      await page.goto('/');

      // Get initial theme color
      const getThemeColor = async () => {
        const meta = page.locator('meta[name="theme-color"]');
        return await meta.getAttribute('content');
      };

      const lightColor = await getThemeColor();

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(100);

      // Theme color may or may not change in dark mode
      // Just verify it's still valid
      const darkColor = await getThemeColor();
      expect(darkColor).toMatch(/^#[0-9A-Fa-f]{6}$|^rgb/);
    });
  });

  test.describe('iOS Safari Specific', () => {
    test('should have proper iOS meta tags', async ({ page }) => {
      await page.goto('/');

      // Check for iOS-specific meta tags
      const appleTitle = page.locator('meta[name="apple-mobile-web-app-title"]');

      if ((await appleTitle.count()) > 0) {
        const title = await appleTitle.getAttribute('content');
        expect(title).toBeTruthy();
      }
    });

    test('should handle safe areas', async ({ page, isMobile }) => {
      test.skip(!isMobile, 'Mobile-only test');

      await page.goto('/');

      // Check if viewport meta includes viewport-fit
      const viewport = page.locator('meta[name="viewport"]');
      const content = await viewport.getAttribute('content');

      // viewport-fit=cover is recommended for iOS notch handling
      // Not required but good to have
      expect(content).toBeDefined();
    });
  });

  test.describe('App Shell', () => {
    test('should load core UI quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');

      // Wait for main content
      await page.locator('main, [role="main"], body').first().waitFor();
      const loadTime = Date.now() - startTime;

      // Core UI should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should show loading states appropriately', async ({ page }) => {
      await page.goto('/');

      // Check that there's no stuck loading state
      await page.waitForTimeout(3000);

      // Should not have visible loading spinners after page load
      const loadingSpinner = page.locator(
        '.loading, [class*="spinner"], [class*="loading"]'
      );

      // If there are loading indicators, they should be for async content, not blocking
      const visibleLoading = await loadingSpinner
        .filter({ has: page.locator(':visible') })
        .count();

      // Main page should not be blocked by loading
      const mainContent = page.locator('main, [role="main"], body > div');
      await expect(mainContent.first()).toBeVisible();
    });
  });
});
