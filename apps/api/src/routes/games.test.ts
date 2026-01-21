/**
 * Games API Routes Tests
 *
 * TDD-driven tests for the Games API endpoints.
 * Tests cover: POST /games, GET /games, GET /games/:id, POST /games/:id/join, PATCH /games/:id/score
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Mock the database module before importing routes
vi.mock('../db/index.js', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      games: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      gameParticipants: {
        findMany: vi.fn(),
      },
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
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => [{ count: 0 }]),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => []),
          })),
        })),
      })),
    })),
    transaction: vi.fn((callback) =>
      callback({
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => [{ id: 'test-game-id' }]),
          })),
        })),
        query: {
          users: {
            findFirst: vi.fn(),
          },
          userRatings: {
            findFirst: vi.fn(),
          },
        },
      })
    ),
  },
  schema: {
    users: {},
    games: {},
    gameParticipants: {},
    courts: {},
    venues: {},
    userRatings: {},
  },
}));

// Mock auth middleware
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (c, next) => {
    c.set('user', { userId: 'clerk_test_user_123', sessionId: 'session_123' });
    await next();
  }),
}));

// Mock services
vi.mock('../services/gameService.js', () => ({
  gameService: {
    create: vi.fn(),
    getById: vi.fn(),
    listGames: vi.fn(),
    recordScore: vi.fn(),
    verify: vi.fn(),
    dispute: vi.fn(),
    getRecent: vi.fn(),
    joinGame: vi.fn(),
    updateRatings: vi.fn(),
    getScheduledForUser: vi.fn(),
  },
}));

vi.mock('../services/userService.js', () => ({
  userService: {
    logActivity: vi.fn(),
    getById: vi.fn(),
    getByClerkId: vi.fn(),
    updateRating: vi.fn(),
    incrementStats: vi.fn(),
  },
}));

vi.mock('../services/notificationService.js', () => ({
  notificationService: {
    create: vi.fn(),
  },
}));

vi.mock('../services/ratingService.js', () => ({
  ratingService: {
    calculateNewRating: vi.fn(() => 3.5),
  },
}));

vi.mock('../lib/socket.js', () => ({
  emitToGame: vi.fn(),
  SocketEvents: {
    GAME_ENDED: 'game:ended',
    GAME_VERIFIED: 'game:verified',
    GAME_DISPUTED: 'game:disputed',
  },
}));

// Import after mocking
import { db } from '../db/index.js';
import { gameService } from '../services/gameService.js';
import { userService } from '../services/userService.js';
import gamesRouter from './games.js';

// Test app setup with error handling
function createTestApp() {
  const app = new Hono();

  // Add error handler
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json(
        {
          error: err.message,
          message: err.message,
          statusCode: err.status,
        },
        err.status
      );
    }
    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message,
        statusCode: 500,
      },
      500
    );
  });

  app.route('/games', gamesRouter);
  return app;
}

// Test fixtures
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  clerkId: 'clerk_test_user_123',
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  skillLevel: 'intermediate',
  rating: '3.50',
};

const mockUser2 = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  clerkId: 'clerk_test_user_456',
  email: 'test2@example.com',
  username: 'testuser2',
  firstName: 'Test2',
  lastName: 'User2',
  displayName: 'Test User 2',
  skillLevel: 'intermediate',
  rating: '3.75',
};

const mockGame = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  gameType: 'casual',
  gameFormat: 'singles',
  status: 'scheduled',
  scheduledAt: new Date('2025-01-25T10:00:00Z'),
  createdBy: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  venueId: null,
  courtId: null,
  winningTeam: null,
  scores: [],
  isRated: true,
  participants: [
    { userId: mockUser.id, team: 1, user: mockUser, hasVerified: false },
    { userId: mockUser2.id, team: 2, user: mockUser2, hasVerified: false },
  ],
  players: [
    { userId: mockUser.id, team: 1, user: mockUser, hasVerified: false },
    { userId: mockUser2.id, team: 2, user: mockUser2, hasVerified: false },
  ],
};

const mockCourt = {
  id: '770e8400-e29b-41d4-a716-446655440000',
  name: 'Court 1',
  venueId: '880e8400-e29b-41d4-a716-446655440000',
  surface: 'sport_court',
  isIndoor: false,
  hasLights: true,
};

describe('Games API Routes', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /games - Create a new game', () => {
    it('should create a singles game successfully', async () => {
      // Arrange
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.create).mockResolvedValue(mockGame);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        players: mockGame.participants,
      });

      const requestBody = {
        gameType: 'singles',
        team1PlayerIds: [mockUser.id],
        team2PlayerIds: [mockUser2.id],
        isRanked: true,
      };

      // Act
      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      // Assert
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe('Game created successfully');
      expect(data.game).toBeDefined();
      expect(gameService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'singles',
          team1PlayerIds: [mockUser.id],
          team2PlayerIds: [mockUser2.id],
          createdById: mockUser.id,
        })
      );
    });

    it('should create a doubles game with 4 players', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.create).mockResolvedValue({
        ...mockGame,
        gameFormat: 'doubles',
      });
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        gameFormat: 'doubles',
        players: [],
      });

      const player3Id = '550e8400-e29b-41d4-a716-446655440003';
      const player4Id = '550e8400-e29b-41d4-a716-446655440004';

      const requestBody = {
        gameType: 'doubles',
        team1PlayerIds: [mockUser.id, player3Id],
        team2PlayerIds: [mockUser2.id, player4Id],
        isRanked: true,
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(201);
    });

    it('should reject singles game with wrong player count', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const requestBody = {
        gameType: 'singles',
        team1PlayerIds: [mockUser.id, '550e8400-e29b-41d4-a716-446655440003'],
        team2PlayerIds: [mockUser2.id],
        isRanked: true,
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Singles games require exactly 1 player per team');
    });

    it('should reject doubles game with wrong player count', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const requestBody = {
        gameType: 'doubles',
        team1PlayerIds: [mockUser.id],
        team2PlayerIds: [mockUser2.id],
        isRanked: true,
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Doubles games require exactly 2 players per team');
    });

    it('should reject game with duplicate players', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const requestBody = {
        gameType: 'singles',
        team1PlayerIds: [mockUser.id],
        team2PlayerIds: [mockUser.id], // Same player on both teams
        isRanked: true,
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Duplicate players are not allowed');
    });

    it('should reject game where creator is not a participant', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const player3Id = '550e8400-e29b-41d4-a716-446655440003';

      const requestBody = {
        gameType: 'singles',
        team1PlayerIds: [mockUser2.id],
        team2PlayerIds: [player3Id], // Creator (mockUser) not included
        isRanked: true,
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Game creator must be a participant');
    });

    it('should create a scheduled game with scheduledAt timestamp', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.create).mockResolvedValue(mockGame);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        players: mockGame.participants,
      });

      const scheduledTime = '2025-01-30T15:00:00Z';

      const requestBody = {
        gameType: 'singles',
        team1PlayerIds: [mockUser.id],
        team2PlayerIds: [mockUser2.id],
        scheduledAt: scheduledTime,
        isRanked: true,
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(201);
      expect(gameService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledAt: new Date(scheduledTime),
        })
      );
    });
  });

  describe('GET /games/:id - Get game details', () => {
    it('should return game details with participants', async () => {
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        players: mockGame.participants,
        court: mockCourt,
      });

      const response = await app.request(`/games/${mockGame.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.game).toBeDefined();
      expect(data.game.id).toBe(mockGame.id);
      expect(gameService.getById).toHaveBeenCalledWith(mockGame.id);
    });

    it('should return 404 when game not found', async () => {
      vi.mocked(gameService.getById).mockResolvedValue(null);

      const nonExistentId = '990e8400-e29b-41d4-a716-446655440000';

      const response = await app.request(`/games/${nonExistentId}`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Game not found');
    });

    it('should include court info when available', async () => {
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        courtId: mockCourt.id,
        court: mockCourt,
        players: mockGame.participants,
      });

      const response = await app.request(`/games/${mockGame.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.game.court).toBeDefined();
    });
  });

  describe('PATCH /games/:id - Update game / Record score', () => {
    it('should record final score and complete game', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById)
        .mockResolvedValueOnce({
          ...mockGame,
          status: 'in_progress',
          players: mockGame.participants,
        })
        .mockResolvedValueOnce({
          ...mockGame,
          status: 'completed',
          winningTeam: 1,
          scores: [{ team1: 11, team2: 7 }],
          players: mockGame.participants,
        });
      vi.mocked(gameService.recordScore).mockResolvedValue({
        ...mockGame,
        id: mockGame.id,
        status: 'completed',
        winningTeam: 1,
        scores: [{ team1: 11, team2: 7 }],
      });

      const requestBody = {
        team1Score: 11,
        team2Score: 7,
        status: 'completed',
      };

      const response = await app.request(`/games/${mockGame.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Game score recorded');
      expect(gameService.recordScore).toHaveBeenCalledWith({
        gameId: mockGame.id,
        team1Score: 11,
        team2Score: 7,
        userId: mockUser.id,
      });
    });

    it('should reject score update from non-participant', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        ...mockUser,
        id: '999e8400-e29b-41d4-a716-446655440000', // Different user
      });
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        players: mockGame.participants,
      });

      const requestBody = {
        team1Score: 11,
        team2Score: 7,
        status: 'completed',
      };

      const response = await app.request(`/games/${mockGame.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toContain('Only game participants can update the game');
    });

    it('should allow status update without score', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'scheduled',
        players: mockGame.participants,
      });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockGame, status: 'in_progress' }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const requestBody = {
        status: 'in_progress',
      };

      const response = await app.request(`/games/${mockGame.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /games/:id/verify - Verify game result', () => {
    it('should verify game result successfully', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'completed',
        players: [
          { ...mockGame.participants[0], hasVerified: false },
          { ...mockGame.participants[1], hasVerified: false },
        ],
      });
      vi.mocked(gameService.verify).mockResolvedValue({
        ...mockGame,
        verificationCount: 1,
      });

      const response = await app.request(`/games/${mockGame.id}/verify`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Game verified');
      expect(data.verificationCount).toBeDefined();
    });

    it('should reject verification from non-participant', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        ...mockUser,
        id: '999e8400-e29b-41d4-a716-446655440000',
      });
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'completed',
        players: mockGame.participants,
      });

      const response = await app.request(`/games/${mockGame.id}/verify`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_token',
        },
      });

      expect(response.status).toBe(403);
    });

    it('should reject verification of non-completed game', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'scheduled',
        players: mockGame.participants,
      });

      const response = await app.request(`/games/${mockGame.id}/verify`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Can only verify completed games');
    });

    it('should reject duplicate verification', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'completed',
        players: [
          { ...mockGame.participants[0], hasVerified: true }, // Already verified
          { ...mockGame.participants[1], hasVerified: false },
        ],
      });

      const response = await app.request(`/games/${mockGame.id}/verify`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_token',
        },
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.message).toContain('already verified');
    });
  });

  describe('POST /games/:id/dispute - Dispute game result', () => {
    it('should dispute game result successfully', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'completed',
        players: mockGame.participants,
      });
      vi.mocked(gameService.dispute).mockResolvedValue({
        ...mockGame,
        status: 'disputed' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'forfeited',
      });

      const requestBody = {
        reason: 'Score was recorded incorrectly - should be 11-9 not 11-7',
      };

      const response = await app.request(`/games/${mockGame.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('Game disputed');
    });

    it('should reject dispute with short reason', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const requestBody = {
        reason: 'Bad', // Too short (min 10 characters)
      };

      const response = await app.request(`/games/${mockGame.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
    });

    it('should reject dispute from non-participant', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        ...mockUser,
        id: '999e8400-e29b-41d4-a716-446655440000',
      });
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'completed',
        players: mockGame.participants,
      });

      const requestBody = {
        reason: 'This is a detailed reason for the dispute',
      };

      const response = await app.request(`/games/${mockGame.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(403);
    });

    it('should reject dispute of non-completed game', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'in_progress',
        players: mockGame.participants,
      });

      const requestBody = {
        reason: 'This is a detailed reason for the dispute',
      };

      const response = await app.request(`/games/${mockGame.id}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Can only dispute completed games');
    });
  });

  describe('GET /games/recent - Get recent games', () => {
    it('should return list of recent completed games', async () => {
      const recentGames = [
        {
          ...mockGame,
          status: 'completed',
          completedAt: new Date(),
          participants: mockGame.participants,
          court: mockCourt,
        },
      ];
      vi.mocked(gameService.getRecent).mockResolvedValue(recentGames);

      const response = await app.request('/games/recent', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.games).toBeDefined();
      expect(Array.isArray(data.games)).toBe(true);
    });

    it('should return empty array when no recent games', async () => {
      vi.mocked(gameService.getRecent).mockResolvedValue([]);

      const response = await app.request('/games/recent', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.games).toEqual([]);
    });
  });

  describe('POST /games/:id/join - Join a game', () => {
    it('should allow user to join an open game', async () => {
      const newUser = {
        ...mockUser,
        id: '550e8400-e29b-41d4-a716-446655440099',
        clerkId: 'clerk_test_user_123',
      };

      vi.mocked(db.query.users.findFirst).mockResolvedValue(newUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        gameFormat: 'doubles',
        status: 'scheduled',
        players: [{ userId: mockUser.id, team: 1 }], // Only one player
      });
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { gameId: mockGame.id, userId: newUser.id, team: 1 },
          ]),
        }),
      } as unknown as ReturnType<typeof db.insert>);

      const response = await app.request(`/games/${mockGame.id}/join`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('Successfully joined');
    });

    it('should reject joining a full game', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        ...mockUser,
        id: '550e8400-e29b-41d4-a716-446655440099',
      });
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        gameFormat: 'singles',
        status: 'scheduled',
        players: mockGame.participants, // Already has 2 players for singles
      });

      const response = await app.request(`/games/${mockGame.id}/join`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_token',
        },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain('Game is already full');
    });

    it('should reject joining if already a participant', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'scheduled',
        players: mockGame.participants,
      });

      const response = await app.request(`/games/${mockGame.id}/join`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_token',
        },
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.message).toContain('already a participant');
    });
  });

  describe('Game state transitions', () => {
    it('should allow transition from scheduled to in_progress', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'scheduled',
        players: mockGame.participants,
      });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockGame, status: 'in_progress' }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const requestBody = {
        status: 'in_progress',
      };

      const response = await app.request(`/games/${mockGame.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
    });

    it('should allow cancellation from scheduled status', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(gameService.getById).mockResolvedValue({
        ...mockGame,
        status: 'scheduled',
        players: mockGame.participants,
      });
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockGame, status: 'cancelled' }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const requestBody = {
        status: 'cancelled',
      };

      const response = await app.request(`/games/${mockGame.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Validation', () => {
    it('should reject invalid gameType', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const requestBody = {
        gameType: 'invalid_type',
        team1PlayerIds: [mockUser.id],
        team2PlayerIds: [mockUser2.id],
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
    });

    it('should reject invalid UUID for player IDs', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

      const requestBody = {
        gameType: 'singles',
        team1PlayerIds: ['not-a-uuid'],
        team2PlayerIds: [mockUser2.id],
      };

      const response = await app.request('/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test_token',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
    });
  });
});
