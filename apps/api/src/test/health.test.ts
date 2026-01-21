/**
 * Health Endpoint Tests
 *
 * TDD approach: These tests define the expected behavior of the health endpoint.
 * The health endpoint should return:
 * - status: 'healthy'
 * - timestamp: ISO date string
 * - version: API version
 * - environment: current environment
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../app.js';

describe('Health Endpoint', () => {
  describe('GET /health', () => {
    it('should return 200 status code', async () => {
      const response = await app.request('/health');

      expect(response.status).toBe(200);
    });

    it('should return JSON content type', async () => {
      const response = await app.request('/health');

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should return healthy status', async () => {
      const response = await app.request('/health');
      const body = await response.json();

      expect(body.status).toBe('healthy');
    });

    it('should return a valid timestamp', async () => {
      const response = await app.request('/health');
      const body = await response.json();

      expect(body.timestamp).toBeDefined();

      // Verify it's a valid ISO date string
      const date = new Date(body.timestamp);
      expect(date.toISOString()).toBe(body.timestamp);
    });

    it('should return the API version', async () => {
      const response = await app.request('/health');
      const body = await response.json();

      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe('string');
      // Version should follow semver pattern
      expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should return the environment', async () => {
      const response = await app.request('/health');
      const body = await response.json();

      expect(body.environment).toBeDefined();
      expect(['development', 'test', 'production', 'staging']).toContain(body.environment);
    });

    it('should respond within acceptable time (< 100ms)', async () => {
      const start = Date.now();
      await app.request('/health');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should return all expected fields in response', async () => {
      const response = await app.request('/health');
      const body = await response.json();

      expect(body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
      });
    });
  });

  describe('Health Endpoint - Edge Cases', () => {
    it('should handle HEAD requests', async () => {
      const response = await app.request('/health', { method: 'HEAD' });

      // HEAD should return headers but no body
      expect(response.status).toBe(200);
    });

    it('should reject POST requests to health endpoint', async () => {
      const response = await app.request('/health', { method: 'POST' });

      // Should return 404 or 405 for unsupported method
      expect([404, 405]).toContain(response.status);
    });
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await app.request('/unknown-route-that-does-not-exist');

    expect(response.status).toBe(404);
  });

  it('should return proper error structure for 404', async () => {
    const response = await app.request('/unknown-route');
    const body = await response.json();

    expect(body).toMatchObject({
      error: 'Not Found',
      message: expect.any(String),
      statusCode: 404,
    });
  });
});
