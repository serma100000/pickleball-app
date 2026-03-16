/**
 * DUPR Integration Routes Tests
 *
 * Tests cover: GET /dupr/sso-url, POST /dupr/sso/callback, GET /dupr/settings,
 * GET /dupr/entitlements, POST /dupr/matches, DELETE /dupr/link,
 * POST /dupr/webhook (valid + invalid signature)
 */

import { createHmac } from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// ---------------------------------------------------------------------------
// Mock: database
// ---------------------------------------------------------------------------
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      duprAccounts: { findFirst: vi.fn(), findMany: vi.fn() },
      duprMatchSubmissions: { findFirst: vi.fn() },
      userRatings: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => []),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
  schema: {
    users: { id: 'id', clerkId: 'clerk_id' },
    duprAccounts: {
      id: 'id',
      userId: 'user_id',
      duprId: 'dupr_id',
    },
    duprMatchSubmissions: {
      id: 'id',
      duprMatchId: 'dupr_match_id',
    },
    userRatings: {
      id: 'id',
      userId: 'user_id',
      ratingType: 'rating_type',
      gameFormat: 'game_format',
    },
    ratingHistory: {},
  },
}));

// ---------------------------------------------------------------------------
// Mock: auth middleware
// ---------------------------------------------------------------------------
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (c, next) => {
    c.set('user', { userId: 'clerk_test_user', sessionId: 'session_1' });
    await next();
  }),
}));

// ---------------------------------------------------------------------------
// Mock: validation middleware (pass-through for JSON body)
// ---------------------------------------------------------------------------
vi.mock('../middleware/validation.js', () => ({
  validateBody: vi.fn((_schema) => {
    // Return a Hono middleware that parses JSON and stores via c.req.valid
    return async (c: { req: { raw: Request; valid: (type: string) => unknown; addValidatedData: (type: string, data: unknown) => void }; set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
      const body = await c.req.raw.clone().json();
      // Hono's zValidator stores data that c.req.valid() retrieves; we
      // shim that by attaching a _validatedJson property the route can read.
      c.req.addValidatedData('json', body);
      await next();
    };
  }),
}));

// ---------------------------------------------------------------------------
// Mock: DUPR service
// ---------------------------------------------------------------------------
vi.mock('../services/duprService.js', () => ({
  duprService: {
    isConfigured: vi.fn(),
    getSsoUrl: vi.fn(),
    validateSsoUser: vi.fn(),
    getPlayerEntitlements: vi.fn(),
    syncPlayerRatings: vi.fn(),
    createMatch: vi.fn(),
    updateMatch: vi.fn(),
    deleteMatch: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock: Redis
// ---------------------------------------------------------------------------
vi.mock('../lib/redis.js', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(true),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { db } from '../db/index.js';
import { duprService } from '../services/duprService.js';
import duprRouter, { duprWebhookRouter } from './dupr.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockDbUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  clerkId: 'clerk_test_user',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
};

const mockDuprAccount = {
  id: 'da-001',
  userId: mockDbUser.id,
  duprId: 'DUPR-12345',
  duprInternalId: '99',
  duprUserToken: 'tok_abc',
  duprRefreshToken: 'ref_abc',
  entitlementLevel: 'NONE',
  singlesRating: '4.25',
  doublesRating: '3.75',
  mixedDoublesRating: null,
  lastSyncAt: new Date('2025-01-15'),
  linkedAt: new Date('2025-01-01'),
  tokenExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// App helpers
// ---------------------------------------------------------------------------

function createTestApp() {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json(
        { error: err.message, message: err.message, statusCode: err.status },
        err.status
      );
    }
    return c.json(
      { error: 'Internal Server Error', message: err.message, statusCode: 500 },
      500
    );
  });

  app.route('/dupr', duprRouter);
  app.route('/dupr', duprWebhookRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DUPR API Routes', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();

    // Default: user exists in DB
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockDbUser);
  });

  // ========================================================================
  // GET /dupr/sso-url
  // ========================================================================

  describe('GET /dupr/sso-url', () => {
    it('should return a valid SSO URL when DUPR is configured', async () => {
      vi.mocked(duprService.isConfigured).mockReturnValue(true);
      vi.mocked(duprService.getSsoUrl).mockReturnValue(
        'https://uat.dupr.gg/login-external-app/abc123'
      );

      const res = await app.request('/dupr/sso-url', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('url');
      expect(data.url).toContain('dupr.gg');
      expect(duprService.getSsoUrl).toHaveBeenCalled();
    });

    it('should return 503 when DUPR is not configured', async () => {
      vi.mocked(duprService.isConfigured).mockReturnValue(false);

      const res = await app.request('/dupr/sso-url', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.message).toContain('not configured');
    });
  });

  // ========================================================================
  // POST /dupr/sso/callback
  // ========================================================================

  describe('POST /dupr/sso/callback', () => {
    const callbackBody = {
      userToken: 'sso_token_123',
      refreshToken: 'refresh_123',
      duprId: 'DUPR-12345',
      stats: { singles: 4.25, doubles: 3.75 },
    };

    it('should link a DUPR account for the first time', async () => {
      vi.mocked(duprService.validateSsoUser).mockResolvedValue({
        duprId: 'DUPR-12345',
        id: 99,
        ratings: { singles: 4.25, doubles: 3.75, mixedDoubles: null },
      } as any);
      vi.mocked(duprService.getPlayerEntitlements).mockResolvedValue({
        isPremium: false,
        isVerified: false,
        entitlementLevel: 'NONE',
      });
      // No existing DUPR link
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(null);
      // No existing userRatings for DUPR
      vi.mocked(db.query.userRatings.findFirst).mockResolvedValue(null);
      // Insert returns a row
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'da-new' }]),
        }),
      } as any);

      const res = await app.request('/dupr/sso/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(callbackBody),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.message).toContain('linked successfully');
      expect(data).toHaveProperty('duprId', 'DUPR-12345');
      expect(data).toHaveProperty('entitlementLevel', 'NONE');
      expect(data).toHaveProperty('ratings');
      expect(duprService.validateSsoUser).toHaveBeenCalledWith('sso_token_123');
    });

    it('should return 400 when SSO token validation fails', async () => {
      vi.mocked(duprService.validateSsoUser).mockResolvedValue(null);

      const res = await app.request('/dupr/sso/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(callbackBody),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('Failed to validate');
    });

    it('should return 409 when DUPR account is linked to another user', async () => {
      vi.mocked(duprService.validateSsoUser).mockResolvedValue({
        duprId: 'DUPR-12345',
        id: 99,
        ratings: {},
      } as any);
      // Existing link belongs to a different user
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue({
        ...mockDuprAccount,
        userId: 'different-user-id',
      });

      const res = await app.request('/dupr/sso/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(callbackBody),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.message).toContain('already linked to another user');
    });

    it('should update an existing link when the same user re-links', async () => {
      vi.mocked(duprService.validateSsoUser).mockResolvedValue({
        duprId: 'DUPR-12345',
        id: 99,
        ratings: { singles: 4.50, doubles: 4.00 },
      } as any);
      vi.mocked(duprService.getPlayerEntitlements).mockResolvedValue({
        isPremium: true,
        isVerified: false,
        entitlementLevel: 'PREMIUM_L1',
      });
      // Existing link for same user
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(mockDuprAccount);
      vi.mocked(db.query.userRatings.findFirst).mockResolvedValue(null);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      } as any);

      const res = await app.request('/dupr/sso/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(callbackBody),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.entitlementLevel).toBe('PREMIUM_L1');
      expect(db.update).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // GET /dupr/settings
  // ========================================================================

  describe('GET /dupr/settings', () => {
    it('should return linked account info when DUPR is linked', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(mockDuprAccount);

      const res = await app.request('/dupr/settings', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.linked).toBe(true);
      expect(data.duprId).toBe('DUPR-12345');
      expect(data.ratings).toHaveProperty('singles', '4.25');
      expect(data.ratings).toHaveProperty('doubles', '3.75');
      expect(data).toHaveProperty('entitlementLevel', 'NONE');
      expect(data).toHaveProperty('lastSync');
      expect(data).toHaveProperty('linkedAt');
    });

    it('should return unlinked state when no DUPR account exists', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(null);

      const res = await app.request('/dupr/settings', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.linked).toBe(false);
      expect(data.duprId).toBeNull();
      expect(data.ratings.singles).toBeNull();
      expect(data.ratings.doubles).toBeNull();
      expect(data.entitlementLevel).toBe('NONE');
    });
  });

  // ========================================================================
  // GET /dupr/entitlements
  // ========================================================================

  describe('GET /dupr/entitlements', () => {
    it('should return entitlement level for linked account', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue({
        ...mockDuprAccount,
        entitlementLevel: 'PREMIUM_L1',
      });

      const res = await app.request('/dupr/entitlements', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.linked).toBe(true);
      expect(data.isPremium).toBe(true);
      expect(data.isVerified).toBe(false);
      expect(data.entitlementLevel).toBe('PREMIUM_L1');
    });

    it('should return VERIFIED_L1 with isPremium and isVerified both true', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue({
        ...mockDuprAccount,
        entitlementLevel: 'VERIFIED_L1',
      });

      const res = await app.request('/dupr/entitlements', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.linked).toBe(true);
      expect(data.isPremium).toBe(true);
      expect(data.isVerified).toBe(true);
      expect(data.entitlementLevel).toBe('VERIFIED_L1');
    });

    it('should return NONE entitlement when no DUPR account linked', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(null);

      const res = await app.request('/dupr/entitlements', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.linked).toBe(false);
      expect(data.isPremium).toBe(false);
      expect(data.isVerified).toBe(false);
      expect(data.entitlementLevel).toBe('NONE');
    });
  });

  // ========================================================================
  // POST /dupr/matches
  // ========================================================================

  describe('POST /dupr/matches', () => {
    const matchBody = {
      matchType: 'SINGLES',
      team1Players: [{ duprId: 'DUPR-001' }],
      team2Players: [{ duprId: 'DUPR-002' }],
      scores: [{ team1Score: 11, team2Score: 7 }],
      playedAt: '2025-01-20T14:00:00Z',
    };

    it('should submit a match to DUPR and create a submission record', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(mockDuprAccount);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'sub-001' }]),
        }),
      } as any);
      vi.mocked(duprService.createMatch).mockResolvedValue({
        matchId: 'dupr-match-999',
        status: 'SUCCESS',
      });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const res = await app.request('/dupr/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(matchBody),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.message).toContain('submitted to DUPR successfully');
      expect(data).toHaveProperty('submissionId', 'sub-001');
      expect(data).toHaveProperty('duprMatchId', 'dupr-match-999');
      expect(data.status).toBe('submitted');
      expect(duprService.createMatch).toHaveBeenCalledWith(
        expect.objectContaining({ matchType: 'SINGLES' })
      );
    });

    it('should return 403 when user has no linked DUPR account', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(null);

      const res = await app.request('/dupr/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(matchBody),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toContain('linked DUPR account is required');
    });

    it('should return 502 when DUPR API fails and record failure', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(mockDuprAccount);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'sub-002' }]),
        }),
      } as any);
      vi.mocked(duprService.createMatch).mockRejectedValue(
        new Error('DUPR API timeout')
      );
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const res = await app.request('/dupr/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(matchBody),
      });

      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.message).toContain('DUPR match submission failed');
      // Verify the failure was recorded in the DB
      expect(db.update).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // DELETE /dupr/link
  // ========================================================================

  describe('DELETE /dupr/link', () => {
    it('should unlink a DUPR account successfully', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(mockDuprAccount);
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      } as any);
      vi.mocked(db.query.userRatings.findMany).mockResolvedValue([
        { id: 'ur-1', userId: mockDbUser.id, ratingType: 'dupr', rating: '4.25' },
      ]);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const res = await app.request('/dupr/link', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('unlinked successfully');
      expect(db.delete).toHaveBeenCalled();
    });

    it('should return 404 when no DUPR account is linked', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(null);

      const res = await app.request('/dupr/link', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.message).toContain('No DUPR account linked');
    });
  });

  // ========================================================================
  // POST /dupr/webhook
  // ========================================================================

  describe('POST /dupr/webhook', () => {
    const webhookSecret = 'test_webhook_secret_123';

    function signPayload(payload: string, secret: string): string {
      return createHmac('sha256', secret).update(payload).digest('hex');
    }

    it('should return 200 with valid signature', async () => {
      // Set the webhook secret env var
      const originalSecret = process.env.DUPR_WEBHOOK_SECRET;
      process.env.DUPR_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify({ topic: 'LOGIN', data: { duprId: 'DUPR-12345' } });
      const signature = signPayload(payload, webhookSecret);

      // Mock the DB lookup for LOGIN processing
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(mockDuprAccount);
      vi.mocked(duprService.syncPlayerRatings).mockResolvedValue({
        singles: 4.30,
        doubles: 3.80,
        mixedDoubles: null,
      });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const res = await app.request('/dupr/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dupr-signature': signature,
        },
        body: payload,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('received', true);

      // Restore
      if (originalSecret !== undefined) {
        process.env.DUPR_WEBHOOK_SECRET = originalSecret;
      } else {
        delete process.env.DUPR_WEBHOOK_SECRET;
      }
    });

    it('should return 401 with invalid signature', async () => {
      const originalSecret = process.env.DUPR_WEBHOOK_SECRET;
      process.env.DUPR_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify({ topic: 'LOGIN', data: { duprId: 'DUPR-12345' } });

      const res = await app.request('/dupr/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dupr-signature': 'invalid_signature_hex_0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: payload,
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.message).toContain('Invalid webhook signature');

      if (originalSecret !== undefined) {
        process.env.DUPR_WEBHOOK_SECRET = originalSecret;
      } else {
        delete process.env.DUPR_WEBHOOK_SECRET;
      }
    });

    it('should return 401 when signature header is missing', async () => {
      const originalSecret = process.env.DUPR_WEBHOOK_SECRET;
      process.env.DUPR_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify({ topic: 'LOGIN', data: {} });

      const res = await app.request('/dupr/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.message).toContain('Missing webhook signature');

      if (originalSecret !== undefined) {
        process.env.DUPR_WEBHOOK_SECRET = originalSecret;
      } else {
        delete process.env.DUPR_WEBHOOK_SECRET;
      }
    });

    it('should accept sha256= prefixed signatures', async () => {
      const originalSecret = process.env.DUPR_WEBHOOK_SECRET;
      process.env.DUPR_WEBHOOK_SECRET = webhookSecret;

      const payload = JSON.stringify({ topic: 'MATCH_RESULT', data: { matchId: 'M-100' } });
      const signature = `sha256=${signPayload(payload, webhookSecret)}`;

      vi.mocked(db.query.duprMatchSubmissions.findFirst).mockResolvedValue({
        id: 'sub-100',
        duprMatchId: 'M-100',
        status: 'submitted',
      } as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const res = await app.request('/dupr/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': signature,
        },
        body: payload,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);

      if (originalSecret !== undefined) {
        process.env.DUPR_WEBHOOK_SECRET = originalSecret;
      } else {
        delete process.env.DUPR_WEBHOOK_SECRET;
      }
    });

    it('should accept webhooks without verification when secret is not set', async () => {
      const originalSecret = process.env.DUPR_WEBHOOK_SECRET;
      delete process.env.DUPR_WEBHOOK_SECRET;

      const payload = JSON.stringify({ topic: 'UNKNOWN_EVENT', data: {} });

      const res = await app.request('/dupr/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);

      if (originalSecret !== undefined) {
        process.env.DUPR_WEBHOOK_SECRET = originalSecret;
      }
    });

    it('should handle MATCH_RESULT webhook and confirm submission', async () => {
      const originalSecret = process.env.DUPR_WEBHOOK_SECRET;
      delete process.env.DUPR_WEBHOOK_SECRET;

      const payload = JSON.stringify({
        topic: 'MATCH_RESULT',
        data: { matchId: 'M-200' },
      });

      vi.mocked(db.query.duprMatchSubmissions.findFirst).mockResolvedValue({
        id: 'sub-200',
        duprMatchId: 'M-200',
        status: 'submitted',
      } as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const res = await app.request('/dupr/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      expect(res.status).toBe(200);
      expect(db.update).toHaveBeenCalled();

      if (originalSecret !== undefined) {
        process.env.DUPR_WEBHOOK_SECRET = originalSecret;
      }
    });

    it('should return 400 for invalid JSON payload', async () => {
      const originalSecret = process.env.DUPR_WEBHOOK_SECRET;
      delete process.env.DUPR_WEBHOOK_SECRET;

      const res = await app.request('/dupr/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json{{{',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain('Invalid JSON');

      if (originalSecret !== undefined) {
        process.env.DUPR_WEBHOOK_SECRET = originalSecret;
      }
    });
  });

  // ========================================================================
  // POST /dupr/sync
  // ========================================================================

  describe('POST /dupr/sync', () => {
    it('should sync ratings from DUPR', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(mockDuprAccount);
      vi.mocked(duprService.syncPlayerRatings).mockResolvedValue({
        singles: 4.50,
        doubles: 4.00,
        mixedDoubles: null,
      });
      vi.mocked(duprService.getPlayerEntitlements).mockResolvedValue({
        isPremium: false,
        isVerified: false,
        entitlementLevel: 'NONE',
      });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);
      vi.mocked(db.query.userRatings.findFirst).mockResolvedValue(null);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      } as any);

      const res = await app.request('/dupr/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toContain('sync completed');
      expect(data).toHaveProperty('ratings');
      expect(data.ratings.singles).toBe(4.50);
      expect(duprService.syncPlayerRatings).toHaveBeenCalledWith('DUPR-12345');
    });

    it('should return 404 when no DUPR account is linked', async () => {
      vi.mocked(db.query.duprAccounts.findFirst).mockResolvedValue(null);

      const res = await app.request('/dupr/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.message).toContain('No DUPR account linked');
    });
  });

  // ========================================================================
  // Error handling: user not found
  // ========================================================================

  describe('Error handling', () => {
    it('should return 401 when DB user is not found', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const res = await app.request('/dupr/settings', {
        method: 'GET',
        headers: { Authorization: 'Bearer test_token' },
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.message).toContain('User not found');
    });
  });
});
