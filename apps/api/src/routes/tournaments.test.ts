import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from '../middleware/errorHandler.js';
import tournaments from './tournaments.js';

// Mock the database
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
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
        findMany: vi.fn(),
      },
      tournamentEvents: {
        findMany: vi.fn(),
      },
      tournamentMatches: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      tournamentRegistrations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
  schema: {
    users: { id: 'id', clerkId: 'clerk_id' },
    tournaments: { id: 'id', name: 'name', slug: 'slug', organizerId: 'organizer_id' },
    tournamentEvents: { id: 'id', tournamentId: 'tournament_id' },
    tournamentMatches: { id: 'id', tournamentId: 'tournament_id' },
    tournamentRegistrations: { id: 'id', tournamentId: 'tournament_id' },
    tournamentRegistrationPlayers: { registrationId: 'registration_id', userId: 'user_id' },
  },
}));

vi.mock('../services/userService.js', () => ({
  userService: {
    logActivity: vi.fn(),
  },
}));

vi.mock('../lib/socket.js', () => ({
  emitToTournament: vi.fn(),
  SocketEvents: {
    TOURNAMENT_MATCH_UPDATE: 'tournament:match_update',
  },
}));

vi.mock('../lib/redis.js', () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from '@clerk/backend';
import { db } from '../db/index.js';
import { cache } from '../lib/redis.js';
import { userService } from '../services/userService.js';

function createTestApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.route('/tournaments', tournaments);
  return app;
}

function createMockUser(overrides = {}) {
  return {
    id: 'user-uuid-123',
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
    id: 'tournament-uuid-123',
    name: 'Test Tournament',
    slug: 'test-tournament-123abc',
    description: 'A test tournament',
    organizerId: 'user-uuid-123',
    status: 'draft',
    gameFormat: 'doubles',
    tournamentFormat: 'single_elimination',
    startsAt: new Date('2025-06-01'),
    endsAt: new Date('2025-06-02'),
    registrationClosesAt: new Date('2025-05-25'),
    locationNotes: 'Test Venue',
    maxParticipants: 32,
    currentParticipants: 0,
    pointsToWin: 11,
    winBy: 2,
    bestOf: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    events: [],
    ...overrides,
  };
}

function createValidTournamentPayload() {
  return {
    name: 'Summer Pickleball Championship',
    description: 'Annual summer tournament',
    startDate: '2025-06-01T09:00:00Z',
    endDate: '2025-06-02T18:00:00Z',
    registrationDeadline: '2025-05-25T23:59:59Z',
    venue: 'City Sports Complex',
    venueCoordinates: { lat: 37.7749, lng: -122.4194 },
    numberOfCourts: 8,
    director: {
      name: 'John Director',
      email: 'director@example.com',
      phone: '555-1234',
    },
    events: [
      {
        category: 'doubles' as const,
        skillLevel: '3.5' as const,
        ageGroup: 'open' as const,
        format: 'single_elimination' as const,
        maxParticipants: 32,
        entryFee: 50,
        prizeMoney: 1000,
        scoringFormat: 'best_of_3' as const,
        pointsTo: 11 as const,
        poolPlayConfig: {
          enabled: false,
          calculationMethod: 'auto' as const,
          numberOfPools: 4,
          gamesPerMatch: 1 as const,
          advancementCount: 2,
        },
        seedingConfig: {
          method: 'skill_based' as const,
          crossPoolSeeding: 'standard' as const,
        },
        bracketConfig: {
          format: 'single_elimination' as const,
          thirdPlaceMatch: true,
          consolationBracket: false,
        },
      },
    ],
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

describe('Tournament API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /tournaments - List tournaments', () => {
    it('should return a list of tournaments', async () => {
      const mockTournaments = [
        createMockTournament({ name: 'Tournament 1' }),
        createMockTournament({ id: 'tournament-2', name: 'Tournament 2' }),
      ];

      vi.mocked(db.query.tournaments.findMany).mockResolvedValue(mockTournaments as any);

      const app = createTestApp();
      const response = await app.request('/tournaments?page=1&limit=10');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tournaments).toHaveLength(2);
      expect(data.pagination.page).toBe(1);
    });

    it('should filter tournaments by status', async () => {
      vi.mocked(db.query.tournaments.findMany).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request('/tournaments?status=registration_open&page=1&limit=10');

      expect(response.status).toBe(200);
      expect(db.query.tournaments.findMany).toHaveBeenCalled();
    });

    it('should filter upcoming tournaments', async () => {
      vi.mocked(db.query.tournaments.findMany).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request('/tournaments?upcoming=true&page=1&limit=10');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /tournaments - Create tournament', () => {
    it('should create a tournament successfully', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const mockTournament = createMockTournament();
      const mockEvent = { id: 'event-1', tournamentId: mockTournament.id };

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        return callback({
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn()
            .mockResolvedValueOnce([mockTournament])
            .mockResolvedValueOnce([mockEvent]),
        });
      });

      vi.mocked(userService.logActivity).mockResolvedValue(undefined);

      const app = createTestApp();
      const payload = createValidTournamentPayload();

      const response = await app.request('/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe('Tournament created successfully');
      expect(data.tournament).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const payload = createValidTournamentPayload();

      const response = await app.request('/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid tournament data - missing name', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const payload = createValidTournamentPayload();
      delete (payload as any).name;

      const response = await app.request('/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid tournament data - empty events', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const payload = createValidTournamentPayload();
      payload.events = [];

      const response = await app.request('/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 when user not found in database', async () => {
      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const payload = createValidTournamentPayload();

      const response = await app.request('/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /tournaments/:idOrSlug - Get tournament details', () => {
    it('should return tournament by ID', async () => {
      const mockTournament = createMockTournament();
      vi.mocked(cache.get).mockResolvedValue(null);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(cache.set).mockResolvedValue(undefined);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tournament.id).toBe('tournament-uuid-123');
    });

    it('should return tournament by slug', async () => {
      const mockTournament = createMockTournament();
      vi.mocked(cache.get).mockResolvedValue(null);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(cache.set).mockResolvedValue(undefined);

      const app = createTestApp();
      const response = await app.request('/tournaments/test-tournament-123abc');

      expect(response.status).toBe(200);
    });

    it('should return cached tournament', async () => {
      const mockTournament = createMockTournament();
      vi.mocked(cache.get).mockResolvedValue(mockTournament);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123');

      expect(response.status).toBe(200);
      expect(db.query.tournaments.findFirst).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent tournament', async () => {
      vi.mocked(cache.get).mockResolvedValue(null);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/tournaments/nonexistent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /tournaments/:id - Update tournament', () => {
    it('should update tournament successfully', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ organizerId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockTournament, name: 'Updated Name' }]),
          }),
        }),
      } as any);
      vi.mocked(cache.del).mockResolvedValue(undefined);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(200);
    });

    it('should return 403 when user is not the organizer', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ organizerId: 'different-user-id' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent tournament', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/tournaments/nonexistent-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /tournaments/:id/register - Register for tournament', () => {
    it('should register user for tournament', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({
        status: 'registration_open',
        currentParticipants: 5,
        maxParticipants: 32,
        registrationClosesAt: new Date(Date.now() + 86400000), // Tomorrow
      });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      // Mock the db.select() chain for checking existing registrations
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No existing registrations
          }),
        }),
      } as any);
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'reg-123', status: 'registered' }]),
        }),
      } as any);
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);
      vi.mocked(cache.del).mockResolvedValue(undefined);
      vi.mocked(userService.logActivity).mockResolvedValue(undefined);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Successfully registered for the tournament');
    });

    it('should return 400 when registration is closed', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({ status: 'in_progress' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when tournament is full', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({
        status: 'registration_open',
        currentParticipants: 32,
        maxParticipants: 32,
      });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
    });

    it('should return 409 when already registered', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament({
        status: 'registration_open',
        currentParticipants: 5,
        maxParticipants: 32,
        registrationClosesAt: new Date(Date.now() + 86400000), // Tomorrow
      });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      // Mock the db.select() chain to return an existing registration
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 'existing-reg', status: 'registered' }]),
          }),
        }),
      } as any);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /tournaments/:id/brackets - Get tournament brackets', () => {
    it('should return tournament brackets', async () => {
      const mockTournament = createMockTournament();
      const mockMatches = [
        { id: 'match-1', roundNumber: 1, matchNumber: 1, tournamentId: mockTournament.id },
        { id: 'match-2', roundNumber: 1, matchNumber: 2, tournamentId: mockTournament.id },
      ];

      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(db.query.tournamentMatches.findMany).mockResolvedValue(mockMatches as any);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123/brackets');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.brackets).toBeDefined();
      expect(data.brackets.format).toBe('single_elimination');
    });

    it('should return 404 for non-existent tournament', async () => {
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/tournaments/nonexistent-id/brackets');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /tournaments/:id/participants - Get participants', () => {
    it('should return tournament participants', async () => {
      const mockRegistrations = [
        {
          id: 'reg-1',
          teamName: 'Team A',
          seed: 1,
          status: 'registered',
          registeredAt: new Date(),
          players: [
            {
              isCaptain: true,
              ratingAtRegistration: '3.50',
              user: { id: 'user-1', username: 'player1', displayName: 'Player 1' },
            },
          ],
        },
      ];

      vi.mocked(db.query.tournamentRegistrations.findMany).mockResolvedValue(mockRegistrations as any);

      const app = createTestApp();
      const response = await app.request('/tournaments/tournament-uuid-123/participants?page=1&limit=10');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.participants).toHaveLength(1);
      expect(data.participants[0].teamName).toBe('Team A');
    });
  });
});
