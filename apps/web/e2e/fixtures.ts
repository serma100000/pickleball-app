import { test as base, expect } from '@playwright/test';

/**
 * Custom Test Fixtures for Paddle Up E2E Tests
 *
 * Extends Playwright's base test with custom fixtures
 * and helpers for common testing scenarios.
 */

// Extend base test with custom fixtures
export const test = base.extend<{
  // Add custom fixture types here as needed
}>({
  // Add custom fixtures here as needed
});

export { expect };

/**
 * Helper to wait for Clerk auth to initialize
 */
export async function waitForClerkInit(page: import('@playwright/test').Page) {
  // Wait for Clerk to initialize (it loads asynchronously)
  await page.waitForTimeout(2000);

  // Additional wait for any Clerk-related network requests
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch {
    // Network idle timeout is acceptable - Clerk might have background requests
  }
}

/**
 * Helper to check if user is on sign-in page (protected route redirect)
 */
export function isOnSignInPage(page: import('@playwright/test').Page): boolean {
  return page.url().includes('sign-in');
}

/**
 * Helper to generate test data
 */
export const testData = {
  user: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  },
  tournament: {
    name: 'Test Tournament 2025',
    description: 'A test tournament for E2E testing',
    venue: 'Test Venue, Test City',
    courts: 4,
  },
  game: {
    scores: [11, 9],
    type: 'doubles',
  },
};

/**
 * Selectors for common elements
 */
export const selectors = {
  // Navigation
  header: 'header',
  nav: 'nav, [role="navigation"]',
  mobileMenu: '[data-testid="mobile-menu"], button[aria-label*="menu" i]',
  bottomNav:
    '[data-testid="bottom-nav"], nav.fixed.bottom-0, footer.fixed.bottom-0',

  // Auth
  signInLink: 'a[href*="sign-in"], a:has-text("Sign In")',
  signUpLink: 'a[href*="sign-up"], a:has-text("Sign Up")',
  emailInput:
    'input[type="email"], input[name="email"], input[name="identifier"]',
  passwordInput: 'input[type="password"], input[name="password"]',

  // Theme
  themeToggle:
    'button[aria-label*="mode" i], button[aria-label*="theme" i], [data-testid="theme-toggle"]',

  // Dashboard
  statsCard: '[data-testid="stats-card"], .stats-card',
  sidebar: 'aside, [data-testid="sidebar"]',

  // Forms
  submitButton: 'button[type="submit"], input[type="submit"]',
  nextButton: 'button:has-text("Next"), button:has-text("Continue")',
  backButton: 'button:has-text("Back"), button:has-text("Previous")',

  // PWA
  installPrompt:
    '[data-testid="install-prompt"], [aria-label*="install" i], .install-prompt',

  // Loading
  loadingSpinner: '.loading, [class*="spinner"], [class*="loading"]',
};

/**
 * Helper to check touch target size
 */
export async function checkTouchTarget(
  element: import('@playwright/test').Locator,
  minSize: number = 44
): Promise<{ width: number; height: number; meetsMinimum: boolean }> {
  const box = await element.boundingBox();
  if (!box) {
    return { width: 0, height: 0, meetsMinimum: false };
  }
  return {
    width: box.width,
    height: box.height,
    meetsMinimum: box.width >= minSize && box.height >= minSize,
  };
}

/**
 * Helper to enable dark mode
 */
export async function enableDarkMode(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
  await page.waitForTimeout(100);
}

/**
 * Helper to disable dark mode
 */
export async function disableDarkMode(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
  await page.waitForTimeout(100);
}

/**
 * Helper to check if element has horizontal overflow
 */
export async function hasHorizontalOverflow(
  page: import('@playwright/test').Page
): Promise<boolean> {
  return await page.evaluate(() => {
    return (
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
    );
  });
}

/**
 * Helper to get all heading levels in order
 */
export async function getHeadingLevels(
  page: import('@playwright/test').Page
): Promise<number[]> {
  return await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headings).map((h) => parseInt(h.tagName.charAt(1)));
  });
}

/**
 * Helper to measure page load time
 */
export async function measurePageLoadTime(
  page: import('@playwright/test').Page,
  url: string
): Promise<number> {
  const startTime = Date.now();
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  return Date.now() - startTime;
}

/**
 * Route patterns for testing
 */
export const routes = {
  public: ['/', '/sign-in', '/sign-up'],
  protected: [
    '/dashboard',
    '/games',
    '/games/new',
    '/tournaments',
    '/tournaments/new',
    '/leagues',
    '/profile',
  ],
};

/**
 * Breakpoints for responsive testing
 */
export const breakpoints = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  tablet: { width: 768, height: 1024 }, // iPad
  desktop: { width: 1280, height: 720 }, // Standard desktop
  wide: { width: 1920, height: 1080 }, // Full HD
};
