/**
 * Vitest Test Setup
 *
 * This file runs before all tests and sets up the test environment.
 * - Configures environment variables for testing
 * - Sets up global test utilities
 * - Initializes mock services as needed
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Set test environment variables BEFORE any imports that might use them
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.ENABLE_RATE_LIMITING = 'false'; // Disable rate limiting in tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_mock';
process.env.CLERK_SECRET_KEY = 'sk_test_mock';

// Mock console methods to reduce noise (optional - comment out for debugging)
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'info').mockImplementation(() => {});

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  // Add any global setup here
  // e.g., database connections, service initialization
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  // Add any global cleanup here
  // e.g., close database connections, cleanup temp files
});

/**
 * Per-test cleanup - runs after each test
 */
afterEach(() => {
  // Reset all mocks after each test
  vi.clearAllMocks();
});

/**
 * Helper function to create a test request context
 */
export function createTestContext() {
  return {
    timestamp: new Date().toISOString(),
    testId: `test-${Date.now()}`,
  };
}

/**
 * Helper to wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to generate test data
 */
export const testHelpers = {
  /**
   * Generate a random test email
   */
  randomEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  },

  /**
   * Generate a random test ID
   */
  randomId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  },

  /**
   * Create mock user data
   */
  mockUser(overrides: Record<string, unknown> = {}) {
    return {
      id: this.randomId(),
      email: this.randomEmail(),
      name: 'Test User',
      skillLevel: 3.5,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  },
};
