import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from '../../middleware/errorHandler.js';
import invites from '../invites.js';

// Mock the database
vi.mock('../../db/index.js', () => ({
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
      teamInvites: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      tournaments: {
        findFirst: vi.fn(),
      },
      leagues: {
        findFirst: vi.fn(),
      },
      leagueSeasons: {
        findFirst: vi.fn(),
      },
      userRatings: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      tournamentRegistrations: {
        findFirst: vi.fn(),
      },
      leagueParticipants: {
        findFirst: vi.fn(),
      },
    },
  },
  schema: {
    users: { id: 'id', clerkId: 'clerk_id', email: 'email' },
    teamInvites: {
      id: 'id',
      inviteCode: 'invite_code',
      inviterId: 'inviter_id',
      inviteeUserId: 'invitee_user_id',
      inviteeEmail: 'invitee_email',
      tournamentId: 'tournament_id',
      leagueId: 'league_id',
      status: 'status',
    },
    tournaments: { id: 'id', name: 'name', status: 'status', currentParticipants: 'current_participants' },
    leagues: { id: 'id', name: 'name', status: 'status' },
    leagueSeasons: { id: 'id', leagueId: 'league_id' },
    tournamentRegistrations: { id: 'id', tournamentId: 'tournament_id' },
    tournamentRegistrationPlayers: { registrationId: 'registration_id', userId: 'user_id' },
    leagueParticipants: { id: 'id', seasonId: 'season_id' },
    leagueParticipantPlayers: { participantId: 'participant_id', userId: 'user_id' },
    notifications: { id: 'id', userId: 'user_id' },
    userRatings: { userId: 'user_id', gameFormat: 'game_format' },
  },
}));

vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-invite-code'),
}));

import { verifyToken } from '@clerk/backend';
import { db } from '../../db/index.js';

function createTestApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.route('/invites', invites);
  return app;
}

// Valid UUID constants for testing
const USER_UUID = '11111111-1111-1111-1111-111111111111';
const INVITEE_UUID = '22222222-2222-2222-2222-222222222222';
const TOURNAMENT_UUID = '33333333-3333-3333-3333-333333333333';
const LEAGUE_UUID = '44444444-4444-4444-4444-444444444444';
const INVITE_UUID = '55555555-5555-5555-5555-555555555555';
const OTHER_USER_UUID = '66666666-6666-6666-6666-666666666666';
const SEASON_UUID = '77777777-7777-7777-7777-777777777777';

function createMockUser(overrides = {}) {
  return {
    id: USER_UUID,
    clerkId: 'clerk_abc123',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    skillLevel: 'intermediate',
    ...overrides,
  };
}

function createMockInvitee(overrides = {}) {
  return {
    id: INVITEE_UUID,
    clerkId: 'clerk_def456',
    email: 'invitee@example.com',
    username: 'inviteeuser',
    displayName: 'Invitee User',
    skillLevel: 'intermediate',
    ...overrides,
  };
}

function createMockTournament(overrides = {}) {
  return {
    id: TOURNAMENT_UUID,
    name: 'Test Tournament',
    slug: 'test-tournament',
    status: 'registration_open',
    gameFormat: 'doubles',
    startsAt: new Date('2025-06-01'),
    endsAt: new Date('2025-06-02'),
    registrationClosesAt: new Date('2025-05-25'),
    ...overrides,
  };
}

function createMockLeague(overrides = {}) {
  return {
    id: LEAGUE_UUID,
    name: 'Test League',
    slug: 'test-league',
    status: 'registration_open',
    gameFormat: 'doubles',
    ...overrides,
  };
}

function createMockInvite(overrides = {}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    id: INVITE_UUID,
    inviteCode: 'test-invite-code',
    tournamentId: TOURNAMENT_UUID,
    leagueId: null,
    eventId: null,
    inviterId: USER_UUID,
    inviteeUserId: INVITEE_UUID,
    inviteeEmail: 'invitee@example.com',
    teamName: 'Test Team',
    message: 'Please join my team!',
    status: 'pending',
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
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

describe('Team Invite API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // POST /invites - Create invitation
  // ============================================================================
  describe('POST /invites - Create invitation', () => {
    it('should create an invitation to an existing user by userId', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockTournament = createMockTournament();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any) // inviter lookup
        .mockResolvedValueOnce(mockInvitee as any); // invitee lookup

      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(null); // no existing invite

      const mockInsertedInvite = createMockInvite({ inviteeUserId: mockInvitee.id });
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInsertedInvite]),
        }),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: mockTournament.id,
          inviteeUserId: mockInvitee.id,
          teamName: 'Test Team',
          message: 'Please join my team!',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe('Invitation sent successfully');
      expect(data.invite.inviteCode).toBeDefined();
      expect(data.invite.status).toBe('pending');
    });

    it('should create an invitation by email to a non-existing user', async () => {
      const mockUser = createMockUser();
      const mockTournament = createMockTournament();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any) // inviter lookup
        .mockResolvedValueOnce(null); // invitee not found by email

      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(null);

      const mockInsertedInvite = createMockInvite({
        inviteeUserId: null,
        inviteeEmail: 'newuser@example.com',
      });
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInsertedInvite]),
        }),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: mockTournament.id,
          inviteeEmail: 'newuser@example.com',
          teamName: 'Test Team',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe('Invitation sent successfully');
    });

    it('should create a league invitation', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockLeague = createMockLeague();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);

      vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(null);

      const mockInsertedInvite = createMockInvite({
        tournamentId: null,
        leagueId: mockLeague.id,
      });
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockInsertedInvite]),
        }),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          leagueId: mockLeague.id,
          inviteeUserId: mockInvitee.id,
          teamName: 'League Team',
        }),
      });

      expect(response.status).toBe(201);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: 'tournament-uuid-123',
          inviteeEmail: 'test@example.com',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 when neither inviteeEmail nor inviteeUserId provided', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: TOURNAMENT_UUID,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when neither tournamentId nor leagueId provided', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          inviteeEmail: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 when invitee user not found by userId', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any) // inviter lookup
        .mockResolvedValueOnce(null); // invitee lookup fails

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: TOURNAMENT_UUID,
          inviteeUserId: '99999999-9999-9999-9999-999999999999',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Invitee user not found');
    });

    it('should return 404 when tournament not found', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: '99999999-9999-9999-9999-999999999999',
          inviteeUserId: mockInvitee.id,
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Tournament not found');
    });

    it('should return 400 when tournament registration is not open', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockTournament = createMockTournament({ status: 'in_progress' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: mockTournament.id,
          inviteeUserId: mockInvitee.id,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('Tournament registration is not open');
    });

    it('should return 404 when league not found', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);
      vi.mocked(db.query.leagues.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          leagueId: '99999999-9999-9999-9999-999999999999',
          inviteeUserId: mockInvitee.id,
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('League not found');
    });

    it('should return 400 when league registration is not open', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockLeague = createMockLeague({ status: 'active' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);
      vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          leagueId: mockLeague.id,
          inviteeUserId: mockInvitee.id,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('League registration is not open');
    });

    it('should return 409 when pending invite already exists', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockTournament = createMockTournament();
      const existingInvite = createMockInvite();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(existingInvite as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: mockTournament.id,
          inviteeUserId: mockInvitee.id,
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.message).toContain('pending invite already exists');
    });
  });

  // ============================================================================
  // GET /invites/:code - Get invite details (public endpoint)
  // ============================================================================
  describe('GET /invites/:code - Get invite details', () => {
    it('should return invite details without authentication', async () => {
      const mockInvite = createMockInvite();
      const mockInviter = createMockUser();
      const mockTournament = createMockTournament();

      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: { ...mockTournament, venue: { id: 'v1', name: 'Test Venue', city: 'Test City', state: 'CA' } },
        league: null,
      } as any);

      vi.mocked(db.query.userRatings.findMany).mockResolvedValue([
        { userId: mockInviter.id, gameFormat: 'doubles', rating: '4.0', ratingType: 'dupr' },
      ] as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invite.inviteCode).toBe('test-invite-code');
      expect(data.invite.inviter.id).toBe(mockInviter.id);
      expect(data.invite.status).toBe('pending');
    });

    it('should return invite details with authentication', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      const mockInvite = createMockInvite();
      const mockInviter = createMockUser();

      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: createMockTournament(),
        league: null,
      } as any);

      vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
    });

    it('should return expired status for expired invites', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      const mockInvite = createMockInvite({ expiresAt: expiredDate, status: 'pending' });
      const mockInviter = createMockUser();

      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: createMockTournament(),
        league: null,
      } as any);

      vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invite.status).toBe('expired');
    });

    it('should return league invite details', async () => {
      const mockInvite = createMockInvite({ tournamentId: null, leagueId: 'league-uuid-123' });
      const mockInviter = createMockUser();
      const mockLeague = createMockLeague();

      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: null,
        league: { ...mockLeague, venue: { id: 'v1', name: 'Test Venue', city: 'Test City', state: 'CA' } },
      } as any);

      vi.mocked(db.query.userRatings.findMany).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invite.league).toBeDefined();
      expect(data.invite.tournament).toBeNull();
    });

    it('should return 404 for non-existent invite', async () => {
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/invites/nonexistent-code');

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Invite not found');
    });
  });

  // ============================================================================
  // POST /invites/:code/accept - Accept invite
  // ============================================================================
  describe('POST /invites/:code/accept - Accept invite', () => {
    it('should accept a tournament invite successfully', async () => {
      const mockInviter = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockTournament = createMockTournament();
      const mockInvite = createMockInvite({
        inviterId: mockInviter.id,
        inviteeUserId: mockInvitee.id,
      });
      setupAuthMock(mockInvitee.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockInvitee as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: mockTournament,
        league: null,
      } as any);

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'registration-123' }]),
            }),
          }),
          query: {
            userRatings: {
              findFirst: vi.fn().mockResolvedValue({ rating: '3.50' }),
            },
          },
        };
        return callback(mockTx);
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('accepted successfully');
      expect(data.registration.tournamentId).toBe(mockTournament.id);
    });

    it('should accept a league invite successfully', async () => {
      const mockInviter = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockLeague = createMockLeague();
      const mockSeason = { id: 'season-123', leagueId: mockLeague.id, seasonNumber: 1 };
      const mockInvite = createMockInvite({
        inviterId: mockInviter.id,
        inviteeUserId: mockInvitee.id,
        tournamentId: null,
        leagueId: mockLeague.id,
      });
      setupAuthMock(mockInvitee.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockInvitee as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: null,
        league: mockLeague,
      } as any);

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'participant-123' }]),
            }),
          }),
          query: {
            leagueSeasons: {
              findFirst: vi.fn().mockResolvedValue(mockSeason),
            },
            userRatings: {
              findFirst: vi.fn().mockResolvedValue({ rating: '3.50' }),
            },
          },
        };
        return callback(mockTx);
      });

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.registration.leagueId).toBe(mockLeague.id);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent invite', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/invites/nonexistent-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Invite not found');
    });

    it('should return 400 when invite is already accepted', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ status: 'accepted', inviterId: OTHER_USER_UUID });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: createMockUser({ id: OTHER_USER_UUID }),
        tournament: createMockTournament(),
        league: null,
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('already been accepted');
    });

    it('should return 400 when invite is already declined', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ status: 'declined', inviterId: OTHER_USER_UUID });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: createMockUser({ id: OTHER_USER_UUID }),
        tournament: createMockTournament(),
        league: null,
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('already been declined');
    });

    it('should return 400 when invite is expired', async () => {
      const mockInvitee = createMockInvitee();
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      const mockInvite = createMockInvite({ expiresAt: expiredDate });
      setupAuthMock(mockInvitee.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockInvitee as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: createMockUser(),
        tournament: createMockTournament(),
        league: null,
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('expired');
    });

    it('should return 400 when trying to accept own invite', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ inviterId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockUser,
        tournament: createMockTournament(),
        league: null,
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('You cannot accept your own invite');
    });

    it('should return 403 when invite is for a different user', async () => {
      const mockUser = createMockUser();
      const differentUser = createMockInvitee({ id: '88888888-8888-8888-8888-888888888888' });
      const mockInvite = createMockInvite({
        inviterId: OTHER_USER_UUID,
        inviteeUserId: differentUser.id,
      });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: createMockUser({ id: OTHER_USER_UUID }),
        tournament: createMockTournament(),
        league: null,
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toBe('This invite is for a different user');
    });

    it('should return 403 when invite is for a different email', async () => {
      const mockUser = createMockUser({ email: 'myemail@example.com' });
      const mockInvite = createMockInvite({
        inviterId: OTHER_USER_UUID,
        inviteeUserId: null,
        inviteeEmail: 'different@example.com',
      });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: createMockUser({ id: OTHER_USER_UUID }),
        tournament: createMockTournament(),
        league: null,
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toBe('This invite is for a different email address');
    });

    it('should return 400 when no active league season exists', async () => {
      const mockInviter = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockLeague = createMockLeague();
      const mockInvite = createMockInvite({
        inviterId: mockInviter.id,
        inviteeUserId: mockInvitee.id,
        tournamentId: null,
        leagueId: mockLeague.id,
      });
      setupAuthMock(mockInvitee.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockInvitee as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: null,
        league: mockLeague,
      } as any);

      vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          query: {
            leagueSeasons: {
              findFirst: vi.fn().mockResolvedValue(null), // No season
            },
          },
        };
        return callback(mockTx);
      });

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/accept', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('No active season found for this league');
    });
  });

  // ============================================================================
  // POST /invites/:code/decline - Decline invite
  // ============================================================================
  describe('POST /invites/:code/decline - Decline invite', () => {
    it('should decline an invite successfully', async () => {
      const mockInviter = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockTournament = createMockTournament();
      const mockInvite = createMockInvite({
        inviterId: mockInviter.id,
        inviteeUserId: mockInvitee.id,
      });
      setupAuthMock(mockInvitee.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockInvitee as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockInviter,
        tournament: mockTournament,
        league: null,
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/decline', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Invitation declined');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/decline', {
        method: 'POST',
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent invite', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/invites/nonexistent-code/decline', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Invite not found');
    });

    it('should return 400 when invite is already accepted', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({
        status: 'accepted',
        inviterId: OTHER_USER_UUID,
      });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: createMockUser({ id: OTHER_USER_UUID }),
        tournament: createMockTournament(),
        league: null,
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/decline', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('already been accepted');
    });

    it('should return 400 when trying to decline own invite (should use cancel)', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ inviterId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue({
        ...mockInvite,
        inviter: mockUser,
        tournament: createMockTournament(),
        league: null,
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code/decline', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('Use cancel to remove your own invite');
    });
  });

  // ============================================================================
  // DELETE /invites/:code - Cancel invite (by inviter only)
  // ============================================================================
  describe('DELETE /invites/:code - Cancel invite', () => {
    it('should cancel a pending invite successfully', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ inviterId: mockUser.id });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(mockInvite as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      } as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Invite cancelled successfully');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code', {
        method: 'DELETE',
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent invite', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/invites/nonexistent-code', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Invite not found');
    });

    it('should return 403 when trying to cancel someone else\'s invite', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ inviterId: OTHER_USER_UUID });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(mockInvite as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toBe('Only the inviter can cancel this invite');
    });

    it('should return 400 when trying to cancel an already accepted invite', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ inviterId: mockUser.id, status: 'accepted' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(mockInvite as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Cannot cancel an invite that has been accepted');
    });

    it('should return 400 when trying to cancel an already declined invite', async () => {
      const mockUser = createMockUser();
      const mockInvite = createMockInvite({ inviterId: mockUser.id, status: 'declined' });
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findFirst).mockResolvedValue(mockInvite as any);

      const app = createTestApp();
      const response = await app.request('/invites/test-invite-code', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Cannot cancel an invite that has been declined');
    });
  });

  // ============================================================================
  // GET /invites/my/sent - Get sent invites
  // ============================================================================
  describe('GET /invites/my/sent - Get sent invites', () => {
    it('should return sent invites for authenticated user', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      const mockInvites = [
        {
          ...createMockInvite(),
          invitee: createMockInvitee(),
          tournament: createMockTournament(),
          league: null,
        },
        {
          ...createMockInvite({ id: 'invite-2', inviteCode: 'code-2' }),
          invitee: null,
          tournament: null,
          league: createMockLeague(),
        },
      ];

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findMany).mockResolvedValue(mockInvites as any);

      const app = createTestApp();
      const response = await app.request('/invites/my/sent', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toHaveLength(2);
      expect(data.invites[0].inviteCode).toBeDefined();
      expect(data.invites[0].invitee).toBeDefined();
    });

    it('should return empty array when no sent invites', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findMany).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request('/invites/my/sent', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toHaveLength(0);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/invites/my/sent');

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // GET /invites/my/received - Get received invites
  // ============================================================================
  describe('GET /invites/my/received - Get received invites', () => {
    it('should return received invites for authenticated user (by userId)', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      const mockInvites = [
        {
          ...createMockInvite({ inviteeUserId: mockUser.id }),
          inviter: createMockUser({ id: OTHER_USER_UUID }),
          tournament: createMockTournament(),
          league: null,
        },
      ];

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findMany).mockResolvedValue(mockInvites as any);

      const app = createTestApp();
      const response = await app.request('/invites/my/received', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toHaveLength(1);
      expect(data.invites[0].inviter).toBeDefined();
    });

    it('should return received invites for authenticated user (by email)', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      const mockInvites = [
        {
          ...createMockInvite({ inviteeUserId: null, inviteeEmail: mockUser.email }),
          inviter: createMockUser({ id: OTHER_USER_UUID }),
          tournament: createMockTournament(),
          league: null,
        },
      ];

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findMany).mockResolvedValue(mockInvites as any);

      const app = createTestApp();
      const response = await app.request('/invites/my/received', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toHaveLength(1);
    });

    it('should return empty array when no received invites', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(db.query.teamInvites.findMany).mockResolvedValue([]);

      const app = createTestApp();
      const response = await app.request('/invites/my/received', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toHaveLength(0);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'));

      const app = createTestApp();
      const response = await app.request('/invites/my/received');

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // Edge Cases and Validation
  // ============================================================================
  describe('Edge Cases and Validation', () => {
    it('should reject invalid email format in inviteeEmail', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: TOURNAMENT_UUID,
          inviteeEmail: 'invalid-email',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid UUID format for tournamentId', async () => {
      const mockUser = createMockUser();
      setupAuthMock(mockUser.clerkId);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: 'not-a-valid-uuid',
          inviteeEmail: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invite code that is too short', async () => {
      const app = createTestApp();
      const response = await app.request('/invites/abc');

      expect(response.status).toBe(400);
    });

    it('should reject teamName that exceeds max length', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockTournament = createMockTournament();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: mockTournament.id,
          inviteeUserId: mockInvitee.id,
          teamName: 'a'.repeat(101), // Exceeds 100 char limit
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject message that exceeds max length', async () => {
      const mockUser = createMockUser();
      const mockInvitee = createMockInvitee();
      const mockTournament = createMockTournament();
      setupAuthMock(mockUser.clerkId);

      vi.mocked(db.query.users.findFirst)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitee as any);
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const app = createTestApp();
      const response = await app.request('/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          tournamentId: mockTournament.id,
          inviteeUserId: mockInvitee.id,
          message: 'a'.repeat(501), // Exceeds 500 char limit
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle user not found in database during auth', async () => {
      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const response = await app.request('/invites/my/sent', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('User not found');
    });
  });
});
