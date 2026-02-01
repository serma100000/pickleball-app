import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from '../middleware/errorHandler.js';
import waitlist from './waitlist.js';

// Mock the database
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
      tournaments: {
        findFirst: vi.fn(),
      },
      tournamentRegistrations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      leagues: {
        findFirst: vi.fn(),
      },
      leagueSeasons: {
        findFirst: vi.fn(),
      },
    },
  },
  schema: {
    users: { id: 'id', clerkId: 'clerk_id' },
    tournaments: { id: 'id', name: 'name', organizerId: 'organizer_id' },
    leagues: { id: 'id', name: 'name', organizerId: 'organizer_id' },
    tournamentRegistrations: { id: 'id', tournamentId: 'tournament_id' },
    leagueParticipants: { id: 'id', seasonId: 'season_id' },
  },
}));

// Mock waitlist service
vi.mock('../services/waitlistService.js', () => ({
  waitlistService: {
    addToWaitlist: vi.fn(),
    getWaitlistPosition: vi.fn(),
    processWaitlist: vi.fn(),
    acceptWaitlistSpot: vi.fn(),
    declineWaitlistSpot: vi.fn(),
    expireOldSpotOffers: vi.fn(),
    isEventFull: vi.fn(),
    getWaitlistEntries: vi.fn(),
  },
}));

vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from '@clerk/backend';
import { db } from '../db/index.js';
import { waitlistService } from '../services/waitlistService.js';

function createTestApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.route('/waitlist', waitlist);
  return app;
}

// Valid UUIDs for testing
const TEST_UUID_USER = '00000000-0000-0000-0000-000000000001';
const TEST_UUID_TOURNAMENT = '00000000-0000-0000-0000-000000000002';
const TEST_UUID_LEAGUE = '00000000-0000-0000-0000-000000000003';
const TEST_UUID_SEASON = '00000000-0000-0000-0000-000000000004';
const TEST_UUID_REG = '00000000-0000-0000-0000-000000000005';
const TEST_UUID_PART = '00000000-0000-0000-0000-000000000006';

function createMockUser(overrides = {}) {
  return {
    id: TEST_UUID_USER,
    clerkId: 'clerk_abc123',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    skillLevel: 'intermediate',
    ...overrides,
  };
}

function createMockTournament(overrides = {}) {
  return {
    id: TEST_UUID_TOURNAMENT,
    name: 'Test Tournament',
    organizerId: TEST_UUID_USER,
    status: 'registration_open',
    currentParticipants: 10,
    maxParticipants: 32,
    ...overrides,
  };
}

function createMockLeague(overrides = {}) {
  return {
    id: TEST_UUID_LEAGUE,
    name: 'Test League',
    organizerId: TEST_UUID_USER,
    ...overrides,
  };
}

function setupAuthMock(clerkId: string) {
  vi.mocked(verifyToken).mockResolvedValue({
    sub: clerkId,
    sid: 'session_123',
    iat: Date.now() / 1000,
    exp: Date.now() / 1000 + 3600,
    nbf: Date.now() / 1000,
    iss: 'https://clerk.test',
    azp: 'test_client',
  } as any);
}

describe('Waitlist API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /waitlist - Join waitlist', () => {
    it('should add user to tournament waitlist successfully', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
        registrationId: TEST_UUID_REG,
        position: 3,
      });

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Successfully added to waitlist');
      expect(data.registrationId).toBe(TEST_UUID_REG);
      expect(data.position).toBe(3);
    });

    it('should add user to league waitlist successfully', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.addToWaitlist).mockResolvedValue({
        registrationId: TEST_UUID_PART,
        position: 2,
      });

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'league',
          eventId: TEST_UUID_LEAGUE,
          eventSubId: TEST_UUID_SEASON,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Successfully added to waitlist');
      expect(data.position).toBe(2);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: 'tournament-uuid-123',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 when user not found in database', async () => {
      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid event type', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'invalid',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid event ID format', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: 'not-a-uuid',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when already on waitlist', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.addToWaitlist).mockRejectedValue(
        new Error('Already on waitlist')
      );

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('Already on waitlist');
    });
  });

  describe('GET /waitlist/position - Get position', () => {
    it('should return user position on waitlist', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.getWaitlistPosition).mockResolvedValue({
        position: 3,
        totalWaitlisted: 10,
        estimatedWaitDays: 9,
        status: 'waitlisted',
        spotOfferedAt: null,
        spotExpiresAt: null,
      });

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/position?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.onWaitlist).toBe(true);
      expect(data.position).toBe(3);
      expect(data.totalWaitlisted).toBe(10);
    });

    it('should return onWaitlist false when not on waitlist', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.getWaitlistPosition).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/position?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.onWaitlist).toBe(false);
      expect(data.message).toBe('You are not on the waitlist for this event');
    });

    it('should include spot offer info when status is spot_offered', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      const spotOfferedAt = new Date();
      const spotExpiresAt = new Date(spotOfferedAt.getTime() + 24 * 60 * 60 * 1000);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.getWaitlistPosition).mockResolvedValue({
        position: 1,
        totalWaitlisted: 5,
        estimatedWaitDays: 3,
        status: 'spot_offered',
        spotOfferedAt,
        spotExpiresAt,
      });

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/position?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.onWaitlist).toBe(true);
      expect(data.status).toBe('spot_offered');
      expect(data.spotOfferedAt).toBeDefined();
      expect(data.spotExpiresAt).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/position?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing query params', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/waitlist/position?eventType=tournament', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /waitlist/accept - Accept spot', () => {
    it('should accept spot successfully', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.acceptWaitlistSpot).mockResolvedValue({
        success: true,
        message: 'Spot accepted successfully',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Spot accepted successfully');
    });

    it('should return 400 when spot offer expired', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.acceptWaitlistSpot).mockResolvedValue({
        success: false,
        message: 'Spot offer has expired',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('Spot offer has expired');
    });

    it('should return 400 when no spot offered', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.acceptWaitlistSpot).mockResolvedValue({
        success: false,
        message: 'No spot offer found',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('No spot offer found');
    });

    it('should return 400 for league accept (not supported)', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.acceptWaitlistSpot).mockResolvedValue({
        success: false,
        message: 'Accept spot is only available for tournaments',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'league',
          eventId: TEST_UUID_LEAGUE,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/waitlist/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /waitlist/decline - Decline spot', () => {
    it('should decline spot successfully', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.declineWaitlistSpot).mockResolvedValue({
        success: true,
        message: 'Spot declined. The next person in line will be notified.',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 400 when no spot to decline', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(waitlistService.declineWaitlistSpot).mockResolvedValue({
        success: false,
        message: 'No spot offer found',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/waitlist/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /waitlist/status - Check if event is full', () => {
    it('should return event full status for tournament', async () => {
      vi.mocked(waitlistService.isEventFull).mockResolvedValue({
        isFull: true,
        currentCount: 32,
        maxCount: 32,
      });
      vi.mocked(waitlistService.getWaitlistEntries).mockResolvedValue([
        { id: '1', position: 1, status: 'waitlisted', user: { id: 'u1', displayName: 'User', email: 'u@test.com' }, registeredAt: new Date() },
        { id: '2', position: 2, status: 'waitlisted', user: { id: 'u2', displayName: 'User 2', email: 'u2@test.com' }, registeredAt: new Date() },
      ]);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/status?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isFull).toBe(true);
      expect(data.currentCount).toBe(32);
      expect(data.maxCount).toBe(32);
      expect(data.waitlistEnabled).toBe(true);
      expect(data.waitlistCount).toBe(2);
    });

    it('should return event not full for league', async () => {
      vi.mocked(waitlistService.isEventFull).mockResolvedValue({
        isFull: false,
        currentCount: 15,
        maxCount: 20,
      });
      vi.mocked(waitlistService.getWaitlistEntries).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/status?eventType=league&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isFull).toBe(false);
      expect(data.currentCount).toBe(15);
      expect(data.maxCount).toBe(20);
      expect(data.waitlistCount).toBe(0);
    });

    it('should return 400 when event not found', async () => {
      vi.mocked(waitlistService.isEventFull).mockRejectedValue(
        new Error('Tournament not found')
      );

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/status?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(400);
    });

    it('should work without authentication (public endpoint)', async () => {
      vi.mocked(waitlistService.isEventFull).mockResolvedValue({
        isFull: false,
        currentCount: 10,
        maxCount: 32,
      });
      vi.mocked(waitlistService.getWaitlistEntries).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/status?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(200);
    });

    it('should return 400 for missing query params', async () => {
      const app = createTestApp();
      const response = await app.request('/waitlist/status?eventType=tournament', {
        method: 'GET',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /waitlist/entries - Get waitlist entries (admin)', () => {
    it('should return entries for tournament organizer', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ organizerId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(waitlistService.getWaitlistEntries).mockResolvedValue([
        {
          id: 'reg-1',
          position: 1,
          status: 'waitlisted',
          user: { id: 'user-1', displayName: 'User One', email: 'user1@test.com' },
          spotOfferedAt: null,
          spotExpiresAt: null,
          registeredAt: new Date(),
        },
      ]);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/entries?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.entries).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should return entries for league organizer', async () => {
      const mockUser = createMockUser();
      const mockLeague = createMockLeague({ organizerId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);
      vi.mocked(waitlistService.getWaitlistEntries).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/entries?eventType=league&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.entries).toHaveLength(0);
    });

    it('should return 403 when not the organizer', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ organizerId: 'different-user' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/entries?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(403);
    });

    it('should return 404 when tournament not found', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/entries?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should return 404 when league not found', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.leagues.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/entries?eventType=league&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request(
        '/waitlist/entries?eventType=tournament&eventId=00000000-0000-0000-0000-000000000001',
        {
          method: 'GET',
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('POST /waitlist/process - Process waitlist (admin)', () => {
    it('should process waitlist successfully', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ organizerId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(waitlistService.processWaitlist).mockResolvedValue({
        userId: '00000000-0000-0000-0000-000000000007',
        registrationId: '00000000-0000-0000-0000-000000000008',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processed).toBe(true);
      expect(data.userId).toBe('00000000-0000-0000-0000-000000000007');
    });

    it('should return processed false when waitlist is empty', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ organizerId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(waitlistService.processWaitlist).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/waitlist/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.processed).toBe(false);
      expect(data.message).toBe('No one on the waitlist to offer a spot to');
    });

    it('should return 403 when not the organizer', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ organizerId: '00000000-0000-0000-0000-000000000099' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request('/waitlist/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 when tournament not found', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/waitlist/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should work for league organizer', async () => {
      const mockUser = createMockUser();
      const mockLeague = createMockLeague({ organizerId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);
      vi.mocked(waitlistService.processWaitlist).mockResolvedValue({
        userId: '00000000-0000-0000-0000-000000000007',
        registrationId: '00000000-0000-0000-0000-000000000008',
      });

      const app = createTestApp();
      const response = await app.request('/waitlist/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'league',
          eventId: TEST_UUID_LEAGUE,
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/waitlist/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent add to waitlist requests gracefully', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      // First call succeeds, second fails (duplicate)
      vi.mocked(waitlistService.addToWaitlist)
        .mockResolvedValueOnce({ registrationId: TEST_UUID_REG, position: 1 })
        .mockRejectedValueOnce(new Error('Already on waitlist'));

      const app = createTestApp();

      const response1 = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      const response2 = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(400);
    });

    it('should handle event type case sensitivity', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'TOURNAMENT', // uppercase
          eventId: TEST_UUID_TOURNAMENT,
        }),
      });

      expect(response.status).toBe(400); // Should fail validation
    });

    it('should handle empty UUID for eventId', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          eventType: 'tournament',
          eventId: '',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle missing body gracefully', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON body', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: 'not valid json',
      });

      expect(response.status).toBe(400);
    });
  });
});
