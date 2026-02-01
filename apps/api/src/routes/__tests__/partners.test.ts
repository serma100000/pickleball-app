/**
 * Partner API Routes Tests
 *
 * Comprehensive tests for the partner marketplace endpoints including:
 * - GET /partners/listings - List partner listings with filters
 * - POST /partners/listings - Create partner listing
 * - DELETE /partners/listings/:id - Delete own listing
 * - POST /partners/listings/:id/contact - Express interest
 * - GET /partners/listings/my - Get current user's listings
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Mock the database module
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      partnerListings: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      tournaments: {
        findFirst: vi.fn(),
      },
      leagues: {
        findFirst: vi.fn(),
      },
      userRatings: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
  schema: {
    users: {},
    partnerListings: {},
    userRatings: {},
    tournaments: {},
    leagues: {},
    notifications: {},
  },
}));

// Mock the Clerk backend
vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(),
}));

import { db } from '../../db/index.js';
import { verifyToken } from '@clerk/backend';
import partnersRouter from '../partners.js';

// Error handler for test app (mimics the real error handler)
function testErrorHandler(err: Error, c: any): Response {
  if (err instanceof HTTPException) {
    return c.json({
      error: getErrorName(err.status),
      message: err.message,
      statusCode: err.status,
      details: err.cause,
    }, err.status);
  }
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    statusCode: 500,
  }, 500);
}

function getErrorName(status: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
  };
  return errorNames[status] || 'Error';
}

// Test app setup
function createTestApp() {
  const app = new Hono();
  app.onError(testErrorHandler);
  app.route('/partners', partnersRouter);
  return app;
}

// Mock data generators
function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    clerkId: 'clerk-user-123',
    username: 'testuser',
    displayName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: 'https://example.com/avatar.jpg',
    city: 'Seattle',
    state: 'WA',
    skillLevel: 'intermediate',
    ...overrides,
  };
}

function createMockListing(overrides = {}) {
  return {
    id: 'listing-123',
    userId: 'user-123',
    tournamentId: 'tournament-123',
    leagueId: null,
    eventId: 'event-123',
    skillLevelMin: '3.0',
    skillLevelMax: '4.0',
    message: 'Looking for a doubles partner',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createMockTournament(overrides = {}) {
  return {
    id: 'tournament-123',
    name: 'Spring Championship',
    slug: 'spring-championship',
    ...overrides,
  };
}

function createMockLeague(overrides = {}) {
  return {
    id: 'league-123',
    name: 'Weekend League',
    slug: 'weekend-league',
    ...overrides,
  };
}

// Helper to create authorization header
function createAuthHeader(token = 'valid-token') {
  return { Authorization: `Bearer ${token}` };
}

describe('Partner API Routes', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /partners/listings
  // ============================================================================
  describe('GET /partners/listings', () => {
    describe('Success Cases', () => {
      it('should return active listings without filters', async () => {
        const mockListings = [
          {
            ...createMockListing(),
            user: createMockUser(),
            tournament: createMockTournament(),
            league: null,
          },
        ];

        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue(mockListings);
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        } as any);
        vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

        const response = await app.request('/partners/listings');

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('listings');
        expect(body).toHaveProperty('pagination');
        expect(body.pagination).toMatchObject({
          page: 1,
          limit: 20,
        });
      });

      it('should filter by tournamentId', async () => {
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        } as any);
        vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

        const tournamentId = '550e8400-e29b-41d4-a716-446655440000';
        const response = await app.request(
          `/partners/listings?tournamentId=${tournamentId}`
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.listings).toEqual([]);
      });

      it('should filter by leagueId', async () => {
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        } as any);
        vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

        const leagueId = '550e8400-e29b-41d4-a716-446655440001';
        const response = await app.request(
          `/partners/listings?leagueId=${leagueId}`
        );

        expect(response.status).toBe(200);
      });

      it('should filter by skill level range', async () => {
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        } as any);
        vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

        const response = await app.request(
          '/partners/listings?skillMin=3&skillMax=5'
        );

        expect(response.status).toBe(200);
      });

      it('should support pagination', async () => {
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 50 }]),
          }),
        } as any);
        vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

        const response = await app.request(
          '/partners/listings?page=2&limit=10'
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.pagination.page).toBe(2);
        expect(body.pagination.limit).toBe(10);
      });

      it('should return empty array when no listings exist', async () => {
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        } as any);
        vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

        const response = await app.request('/partners/listings');

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.listings).toEqual([]);
        expect(body.pagination.total).toBe(0);
      });

      it('should include user ratings in response', async () => {
        const mockUser = createMockUser();
        const mockListing = {
          ...createMockListing(),
          user: mockUser,
          tournament: createMockTournament(),
          league: null,
        };

        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([mockListing]);
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        } as any);
        vi.mocked(db.query.userRatings.findMany).mockResolvedValue([
          {
            id: 'rating-1',
            userId: 'user-123',
            rating: '4.25',
            ratingType: 'internal',
            gameFormat: 'doubles',
          },
        ]);

        const response = await app.request('/partners/listings');

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.listings[0].user.rating).toBe(4.25);
        expect(body.listings[0].user.ratingSource).toBe('internal');
      });
    });

    describe('Validation Errors', () => {
      it('should reject invalid tournamentId format', async () => {
        const response = await app.request(
          '/partners/listings?tournamentId=invalid-uuid'
        );

        expect(response.status).toBe(400);
      });

      it('should reject skill level out of range (below 1)', async () => {
        const response = await app.request(
          '/partners/listings?skillMin=0'
        );

        expect(response.status).toBe(400);
      });

      it('should reject skill level out of range (above 7)', async () => {
        const response = await app.request(
          '/partners/listings?skillMax=8'
        );

        expect(response.status).toBe(400);
      });

      it('should reject invalid page number', async () => {
        const response = await app.request(
          '/partners/listings?page=0'
        );

        expect(response.status).toBe(400);
      });

      it('should reject limit exceeding maximum', async () => {
        const response = await app.request(
          '/partners/listings?limit=101'
        );

        expect(response.status).toBe(400);
      });
    });
  });

  // ============================================================================
  // POST /partners/listings
  // ============================================================================
  describe('POST /partners/listings', () => {
    describe('Success Cases', () => {
      it('should create a listing for tournament', async () => {
        const mockUser = createMockUser();
        const mockTournament = createMockTournament();
        const mockListing = createMockListing();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);
        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament);
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockListing]),
          }),
        } as any);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
            eventId: '550e8400-e29b-41d4-a716-446655440001',
            skillLevelMin: 3,
            skillLevelMax: 4,
            message: 'Looking for a doubles partner',
          }),
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.message).toBe('Partner listing created successfully');
        expect(body.listing).toBeDefined();
      });

      it('should create a listing for league', async () => {
        const mockUser = createMockUser();
        const mockLeague = createMockLeague();
        const mockListing = createMockListing({ leagueId: 'league-123', tournamentId: null });

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);
        vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague);
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockListing]),
          }),
        } as any);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leagueId: '550e8400-e29b-41d4-a716-446655440002',
            message: 'Looking for league partner',
          }),
        });

        expect(response.status).toBe(201);
      });

      it('should create a listing without optional fields', async () => {
        const mockUser = createMockUser();
        const mockTournament = createMockTournament();
        const mockListing = createMockListing({
          skillLevelMin: null,
          skillLevelMax: null,
          message: null,
        });

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);
        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament);
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockListing]),
          }),
        } as any);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        });

        expect(response.status).toBe(201);
      });
    });

    describe('Authentication Errors', () => {
      it('should reject request without authorization header', async () => {
        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        });

        expect(response.status).toBe(401);
      });

      it('should reject request with invalid token', async () => {
        vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader('invalid-token'),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        });

        expect(response.status).toBe(401);
      });

      it('should reject when user not found in database', async () => {
        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        });

        expect(response.status).toBe(401);
      });
    });

    describe('Validation Errors', () => {
      it('should reject when neither tournamentId nor leagueId is provided', async () => {
        const mockUser = createMockUser();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Looking for partner',
          }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toContain('tournamentId or leagueId is required');
      });

      it('should reject invalid skill level (below 1)', async () => {
        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
            skillLevelMin: 0,
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject invalid skill level (above 7)', async () => {
        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
            skillLevelMax: 8,
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject message exceeding 500 characters', async () => {
        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
            message: 'a'.repeat(501),
          }),
        });

        expect(response.status).toBe(400);
      });
    });

    describe('Business Logic Errors', () => {
      it('should reject duplicate listing for same event', async () => {
        const mockUser = createMockUser();
        const existingListing = createMockListing();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(existingListing);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        });

        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body.message).toContain('already have an active partner listing');
      });

      it('should reject when tournament not found', async () => {
        const mockUser = createMockUser();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);
        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        });

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe('Tournament not found');
      });

      it('should reject when league not found', async () => {
        const mockUser = createMockUser();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);
        vi.mocked(db.query.leagues.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leagueId: '550e8400-e29b-41d4-a716-446655440000',
          }),
        });

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe('League not found');
      });
    });
  });

  // ============================================================================
  // DELETE /partners/listings/:id
  // ============================================================================
  describe('DELETE /partners/listings/:id', () => {
    describe('Success Cases', () => {
      it('should delete own listing', async () => {
        const mockUser = createMockUser();
        const mockListing = createMockListing();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(mockListing);
        vi.mocked(db.delete).mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        } as any);

        const response = await app.request('/partners/listings/listing-123', {
          method: 'DELETE',
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.message).toBe('Listing deleted successfully');
      });
    });

    describe('Authentication Errors', () => {
      it('should reject request without authorization', async () => {
        const response = await app.request('/partners/listings/listing-123', {
          method: 'DELETE',
        });

        expect(response.status).toBe(401);
      });

      it('should reject when user not found', async () => {
        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings/listing-123', {
          method: 'DELETE',
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(401);
      });
    });

    describe('Authorization Errors', () => {
      it('should reject deleting another user\'s listing', async () => {
        const mockUser = createMockUser();
        const otherUserListing = createMockListing({ userId: 'other-user-456' });

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(otherUserListing);

        const response = await app.request('/partners/listings/listing-123', {
          method: 'DELETE',
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toBe('You can only delete your own listings');
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 when listing not found', async () => {
        const mockUser = createMockUser();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings/nonexistent-id', {
          method: 'DELETE',
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe('Listing not found');
      });
    });
  });

  // ============================================================================
  // POST /partners/listings/:id/contact
  // ============================================================================
  describe('POST /partners/listings/:id/contact', () => {
    describe('Success Cases', () => {
      it('should send contact request successfully', async () => {
        const mockUser = createMockUser();
        const listingOwner = createMockUser({ id: 'owner-456', clerkId: 'clerk-owner-456' });
        const mockListing = {
          ...createMockListing({ userId: 'owner-456' }),
          user: listingOwner,
          tournament: createMockTournament(),
          league: null,
        };

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(mockListing);
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        } as any);

        const response = await app.request('/partners/listings/listing-123/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'I would love to partner with you!',
          }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.message).toBe('Contact request sent successfully');
        expect(body.contacted).toBeDefined();
      });

      it('should include league name when listing is for a league', async () => {
        const mockUser = createMockUser();
        const listingOwner = createMockUser({ id: 'owner-456', displayName: 'Owner User' });
        const mockListing = {
          ...createMockListing({ userId: 'owner-456', tournamentId: null, leagueId: 'league-123' }),
          user: listingOwner,
          tournament: null,
          league: createMockLeague(),
        };

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(mockListing);
        vi.mocked(db.insert).mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        } as any);

        const response = await app.request('/partners/listings/listing-123/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Interested in joining your team!',
          }),
        });

        expect(response.status).toBe(200);
      });
    });

    describe('Authentication Errors', () => {
      it('should reject request without authorization', async () => {
        const response = await app.request('/partners/listings/listing-123/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Hello!',
          }),
        });

        expect(response.status).toBe(401);
      });
    });

    describe('Validation Errors', () => {
      it('should reject empty message', async () => {
        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);

        const response = await app.request('/partners/listings/listing-123/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: '',
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject message exceeding 1000 characters', async () => {
        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);

        const response = await app.request('/partners/listings/listing-123/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'a'.repeat(1001),
          }),
        });

        expect(response.status).toBe(400);
      });

      it('should reject missing message field', async () => {
        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);

        const response = await app.request('/partners/listings/listing-123/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        expect(response.status).toBe(400);
      });
    });

    describe('Business Logic Errors', () => {
      it('should reject contacting own listing', async () => {
        const mockUser = createMockUser();
        const mockListing = {
          ...createMockListing(),
          user: mockUser,
          tournament: createMockTournament(),
          league: null,
        };

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(mockListing);

        const response = await app.request('/partners/listings/listing-123/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Hello myself!',
          }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe('You cannot contact your own listing');
      });

      it('should return 404 when listing not found', async () => {
        const mockUser = createMockUser();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings/nonexistent/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Hello!',
          }),
        });

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe('Listing not found or no longer active');
      });

      it('should return 404 when listing is not active', async () => {
        const mockUser = createMockUser();
        // The query should return null since it filters by status: 'active'
        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings/expired-listing/contact', {
          method: 'POST',
          headers: {
            ...createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Hello!',
          }),
        });

        expect(response.status).toBe(404);
      });
    });
  });

  // ============================================================================
  // GET /partners/listings/my
  // ============================================================================
  describe('GET /partners/listings/my', () => {
    describe('Success Cases', () => {
      it('should return current user\'s listings', async () => {
        const mockUser = createMockUser();
        const mockListings = [
          {
            ...createMockListing(),
            tournament: createMockTournament(),
            league: null,
          },
          {
            ...createMockListing({
              id: 'listing-456',
              tournamentId: null,
              leagueId: 'league-123',
            }),
            tournament: null,
            league: createMockLeague(),
          },
        ];

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue(mockListings);

        const response = await app.request('/partners/listings/my', {
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.listings).toHaveLength(2);
        expect(body.listings[0]).toHaveProperty('id');
        expect(body.listings[0]).toHaveProperty('tournament');
        expect(body.listings[0]).toHaveProperty('league');
        expect(body.listings[0]).toHaveProperty('status');
      });

      it('should return empty array when user has no listings', async () => {
        const mockUser = createMockUser();

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);

        const response = await app.request('/partners/listings/my', {
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.listings).toEqual([]);
      });

      it('should parse skill levels as numbers', async () => {
        const mockUser = createMockUser();
        const mockListings = [
          {
            ...createMockListing({
              skillLevelMin: '3.5',
              skillLevelMax: '4.5',
            }),
            tournament: createMockTournament(),
            league: null,
          },
        ];

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue(mockListings);

        const response = await app.request('/partners/listings/my', {
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.listings[0].skillLevelMin).toBe(3.5);
        expect(body.listings[0].skillLevelMax).toBe(4.5);
      });

      it('should return null for null skill levels', async () => {
        const mockUser = createMockUser();
        const mockListings = [
          {
            ...createMockListing({
              skillLevelMin: null,
              skillLevelMax: null,
            }),
            tournament: createMockTournament(),
            league: null,
          },
        ];

        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
        vi.mocked(db.query.partnerListings.findMany).mockResolvedValue(mockListings);

        const response = await app.request('/partners/listings/my', {
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.listings[0].skillLevelMin).toBeNull();
        expect(body.listings[0].skillLevelMax).toBeNull();
      });
    });

    describe('Authentication Errors', () => {
      it('should reject request without authorization', async () => {
        const response = await app.request('/partners/listings/my');

        expect(response.status).toBe(401);
      });

      it('should reject when user not found in database', async () => {
        vi.mocked(verifyToken).mockResolvedValue({
          sub: 'clerk-user-123',
          sid: 'session-123',
        } as any);
        vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

        const response = await app.request('/partners/listings/my', {
          headers: createAuthHeader(),
        });

        expect(response.status).toBe(401);
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle concurrent listing creation (race condition protection)', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament();

      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'clerk-user-123',
        sid: 'session-123',
      } as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      // First call returns null (no existing listing), second call returns existing
      let callCount = 0;
      vi.mocked(db.query.partnerListings.findFirst).mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? null : createMockListing();
      });
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createMockListing()]),
        }),
      } as any);

      const response = await app.request('/partners/listings', {
        method: 'POST',
        headers: {
          ...createAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });

      // First request should succeed
      expect(response.status).toBe(201);
    });

    it('should handle special characters in message', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament();
      const mockListing = createMockListing({
        message: 'Looking for partner! <script>alert("xss")</script>',
      });

      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'clerk-user-123',
        sid: 'session-123',
      } as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockListing]),
        }),
      } as any);

      const response = await app.request('/partners/listings', {
        method: 'POST',
        headers: {
          ...createAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          message: 'Looking for partner! <script>alert("xss")</script>',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should handle unicode characters in message', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament();
      const mockListing = createMockListing({
        message: 'Looking for partner! Japanese: Japanese Korean: Korean',
      });

      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'clerk-user-123',
        sid: 'session-123',
      } as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.partnerListings.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockListing]),
        }),
      } as any);

      const response = await app.request('/partners/listings', {
        method: 'POST',
        headers: {
          ...createAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: '550e8400-e29b-41d4-a716-446655440000',
          message: 'Looking for partner! Japanese: Japanese Korean: Korean',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should handle multiple filters together', async () => {
      vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      } as any);
      vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

      const tournamentId = '550e8400-e29b-41d4-a716-446655440000';
      const eventId = '550e8400-e29b-41d4-a716-446655440001';

      const response = await app.request(
        `/partners/listings?tournamentId=${tournamentId}&eventId=${eventId}&skillMin=3&skillMax=5&page=1&limit=10`
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('listings');
      expect(body).toHaveProperty('pagination');
    });

    it('should return correct total pages in pagination', async () => {
      vi.mocked(db.query.partnerListings.findMany).mockResolvedValue([]);
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 45 }]),
        }),
      } as any);
      vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

      const response = await app.request('/partners/listings?page=1&limit=10');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.pagination.total).toBe(45);
      expect(body.pagination.totalPages).toBe(5); // ceil(45/10) = 5
    });
  });
});
