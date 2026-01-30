import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Auth state file path
const authFile = path.join(__dirname, '.playwright/.auth/user.json');

/**
 * Playwright E2E Test Configuration for Paddle Up
 *
 * Test against multiple browsers and mobile devices to ensure
 * cross-platform compatibility.
 *
 * Authentication:
 * - Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD in .env.local
 * - Run `pnpm test:e2e` to run all tests with authentication
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    // Use 127.0.0.1 instead of localhost for better WSL2 compatibility
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video recording on failure
    video: 'on-first-retry',

    // Maximum time each action can take
    actionTimeout: 15000,

    // Maximum time for navigation - increased for Clerk which loads client-side
    navigationTimeout: 60000,
  },

  // Global timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',

  // Configure projects for multiple browsers and devices
  // Local: Chrome only (fast, covers most users)
  // CI: All browsers (comprehensive cross-browser testing)
  projects: [
    // Authentication setup - runs first
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Public pages - no auth required
    {
      name: 'Public Pages',
      testMatch: /public-.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      // No dependencies - can run without auth
    },

    // Desktop Chrome (primary - with auth)
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome (with auth)
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Firefox/Safari/WebKit - CI only (requires browser install, flaky in WSL)
    ...(process.env.CI
      ? [
          // Desktop Firefox (with auth)
          {
            name: 'Desktop Firefox',
            use: {
              ...devices['Desktop Firefox'],
              viewport: { width: 1280, height: 720 },
              storageState: authFile,
            },
            dependencies: ['setup'],
          },

          // Desktop Safari (with auth)
          {
            name: 'Desktop Safari',
            use: {
              ...devices['Desktop Safari'],
              viewport: { width: 1280, height: 720 },
              storageState: authFile,
            },
            dependencies: ['setup'],
          },

          // Mobile Safari (with auth)
          {
            name: 'Mobile Safari',
            use: {
              ...devices['iPhone 12'],
              storageState: authFile,
            },
            dependencies: ['setup'],
          },

          // Tablet (with auth)
          {
            name: 'Tablet',
            use: {
              ...devices['iPad Pro 11'],
              storageState: authFile,
            },
            dependencies: ['setup'],
          },
        ]
      : []),
  ],

  // Web server to start before running tests (optional)
  // Uncomment if you want Playwright to start your dev server
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
