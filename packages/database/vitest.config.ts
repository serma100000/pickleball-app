import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/test/connection.test.ts'], // Exclude integration test from vitest
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        'drizzle.config.ts',
        'tsup.config.ts',
        'vitest.config.ts',
      ],
    },
    testTimeout: 10000,
  },
});
