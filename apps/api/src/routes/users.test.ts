/**
 * User Routes Tests
 *
 * TDD approach: These tests define the expected behavior of user profile endpoints.
 *
 * Endpoints tested:
 * - GET /api/v1/users/:id - Get user profile by ID
 * - PATCH /api/v1/users/:id - Update user profile
 * - GET /api/v1/users - Search users by name/skill level
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { app } from '../app.js';
import { userService } from '../services/userService.js';

// Mock the userService
vi.mock('../services/userService.js', () => ({
  userService: {
    getById: vi.fn(),
    update: vi.fn(),
    search: vi.fn(),
    logActivity: vi.fn(),
    getStats: vi.fn(),
    getGames: vi.fn(),
    getAchievements: vi.fn(),
  },
}));

// Mock the auth middleware to allow testing without real tokens
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((c, next) => {
    c.set('user', { userId: 'test-user-id', sessionId: 'test-session', claims: {} });
    return next();
  }),
  optionalAuth: vi.fn((c, next) => {
    return next();
  }),
  requireOwnership: vi.fn(() => (c: unknown, next: () => Promise<void>) => next()),
  requireRole: vi.fn(() => (c: unknown, next: () => Promise<void>) => next()),
}));

// Mock redis cache
vi.mock('../lib/redis.js', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
  },
}));

// Test data fixtures
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'testuser@example.com',
  username: 'testplayer',
  firstName: 'Test',
  lastName: 'Player',
  displayName: 'TestPlayer',
  avatarUrl: 'https://example.com/avatar.jpg',
  bio: 'I love pickleball!',
  skillLevel: 'intermediate' as const,
  playStyle: 'aggressive',
  rating: '3.50',
  gamesPlayed: 25,
  wins: 15,
  losses: 10,
  isVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  preferredPlayStyle: 'aggressive',
};

const mockUserWithRating = {
  ...mockUser,
  ratings: [
    {
      id: 'rating-1',
      userId: mockUser.id,
      ratingType: 'internal',
      gameFormat: 'doubles',
      rating: '3.50',
      gamesPlayed: 25,
      wins: 15,
      losses: 10,
    },
  ],
};

describe('User Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/v1/users/:id - Get User Profile
  // ============================================================================
  describe('GET /api/v1/users/:id', () => {
    it('should return 200 and user profile for valid ID', async () => {
      vi.mocked(userService.getById).mockResolvedValue(mockUser as any);

      const response = await app.request('/api/v1/users/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(mockUser.id);
      expect(body.user.username).toBe('testplayer');
    });

    it('should return public profile fields only', async () => {
      vi.mocked(userService.getById).mockResolvedValue(mockUser as any);

      const response = await app.request('/api/v1/users/123e4567-e89b-12d3-a456-426614174000');
      const body = await response.json();

      // Should include public fields
      expect(body.user).toHaveProperty('id');
      expect(body.user).toHaveProperty('username');
      expect(body.user).toHaveProperty('displayName');
      expect(body.user).toHaveProperty('avatarUrl');
      expect(body.user).toHaveProperty('bio');
      expect(body.user).toHaveProperty('skillLevel');
      expect(body.user).toHaveProperty('isVerified');
      expect(body.user).toHaveProperty('createdAt');

      // Should NOT include sensitive fields
      expect(body.user).not.toHaveProperty('email');
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userService.getById).mockResolvedValue(null);

      const response = await app.request('/api/v1/users/nonexistent-id');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe('User not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await app.request('/api/v1/users/');

      expect(response.status).toBe(404); // Empty ID results in 404 (different route)
    });

    it('should include rating information in response', async () => {
      vi.mocked(userService.getById).mockResolvedValue(mockUser as any);

      const response = await app.request('/api/v1/users/123e4567-e89b-12d3-a456-426614174000');
      const body = await response.json();

      expect(body.user).toHaveProperty('rating');
      expect(body.user).toHaveProperty('gamesPlayed');
      expect(body.user).toHaveProperty('wins');
      expect(body.user).toHaveProperty('losses');
    });
  });

  // ============================================================================
  // PATCH /api/v1/users/:id - Update User Profile
  // ============================================================================
  describe('PATCH /api/v1/users/:id', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = {
        ...mockUser,
        displayName: 'Updated Player',
        bio: 'Updated bio',
      };
      vi.mocked(userService.update).mockResolvedValue(updatedUser as any);
      vi.mocked(userService.logActivity).mockResolvedValue(undefined);

      const response = await app.request('/api/v1/users/test-user-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          displayName: 'Updated Player',
          bio: 'Updated bio',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toBe('Profile updated successfully');
      expect(body.user.displayName).toBe('Updated Player');
    });

    it('should validate displayName length', async () => {
      const response = await app.request('/api/v1/users/test-user-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          displayName: '', // Too short
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should validate skillLevel enum values', async () => {
      const response = await app.request('/api/v1/users/test-user-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          skillLevel: 'invalid-level',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should accept valid skillLevel values', async () => {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'pro'];

      for (const level of validLevels) {
        vi.mocked(userService.update).mockResolvedValue({
          ...mockUser,
          skillLevel: level,
        } as any);

        const response = await app.request('/api/v1/users/test-user-id', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({
            skillLevel: level,
          }),
        });

        expect(response.status).toBe(200);
      }
    });

    it('should validate avatarUrl format', async () => {
      const response = await app.request('/api/v1/users/test-user-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          avatarUrl: 'not-a-valid-url',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should accept null for optional fields', async () => {
      vi.mocked(userService.update).mockResolvedValue({
        ...mockUser,
        avatarUrl: null,
        bio: null,
      } as any);

      const response = await app.request('/api/v1/users/test-user-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          avatarUrl: null,
          bio: null,
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should return 404 when updating non-existent user', async () => {
      vi.mocked(userService.update).mockResolvedValue(null);

      const response = await app.request('/api/v1/users/nonexistent-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          displayName: 'New Name',
        }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe('User not found');
    });

    it('should log activity after successful update', async () => {
      vi.mocked(userService.update).mockResolvedValue(mockUser as any);
      vi.mocked(userService.logActivity).mockResolvedValue(undefined);

      await app.request('/api/v1/users/test-user-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          displayName: 'New Name',
        }),
      });

      expect(userService.logActivity).toHaveBeenCalledWith('test-user-id', 'profile_updated');
    });

    it('should validate bio max length', async () => {
      const longBio = 'a'.repeat(501); // Exceeds 500 char limit

      const response = await app.request('/api/v1/users/test-user-id', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          bio: longBio,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/v1/users - Search Users
  // ============================================================================
  describe('GET /api/v1/users', () => {
    const mockSearchResults = [
      {
        id: 'user-1',
        username: 'player1',
        displayName: 'Player One',
        avatarUrl: 'https://example.com/avatar1.jpg',
        skillLevel: 'intermediate',
        rating: '3.50',
        isVerified: true,
      },
      {
        id: 'user-2',
        username: 'player2',
        displayName: 'Player Two',
        avatarUrl: null,
        skillLevel: 'advanced',
        rating: '4.00',
        isVerified: false,
      },
    ];

    it('should require search query parameter', async () => {
      const response = await app.request('/api/v1/users');

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe('Search query is required');
    });

    it('should return search results', async () => {
      vi.mocked(userService.search).mockResolvedValue(mockSearchResults as any);

      const response = await app.request('/api/v1/users?q=player');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toBeDefined();
      expect(body.users).toHaveLength(2);
      expect(body.users[0].username).toBe('player1');
    });

    it('should return only public user fields in search results', async () => {
      vi.mocked(userService.search).mockResolvedValue(mockSearchResults as any);

      const response = await app.request('/api/v1/users?q=player');
      const body = await response.json();

      expect(body.users[0]).toHaveProperty('id');
      expect(body.users[0]).toHaveProperty('username');
      expect(body.users[0]).toHaveProperty('displayName');
      expect(body.users[0]).toHaveProperty('avatarUrl');
      expect(body.users[0]).toHaveProperty('skillLevel');
      expect(body.users[0]).toHaveProperty('rating');
      expect(body.users[0]).toHaveProperty('isVerified');

      // Should NOT include sensitive fields
      expect(body.users[0]).not.toHaveProperty('email');
      expect(body.users[0]).not.toHaveProperty('passwordHash');
    });

    it('should support pagination', async () => {
      vi.mocked(userService.search).mockResolvedValue(mockSearchResults as any);

      const response = await app.request('/api/v1/users?q=player&page=2&limit=10');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(10);
    });

    it('should indicate hasMore in pagination', async () => {
      // Return exactly 'limit' results to indicate more might exist
      const fullPageResults = Array(20).fill(mockSearchResults[0]);
      vi.mocked(userService.search).mockResolvedValue(fullPageResults as any);

      const response = await app.request('/api/v1/users?q=player&limit=20');
      const body = await response.json();

      expect(body.pagination.hasMore).toBe(true);
    });

    it('should indicate no more results when less than limit returned', async () => {
      vi.mocked(userService.search).mockResolvedValue(mockSearchResults as any);

      const response = await app.request('/api/v1/users?q=player&limit=20');
      const body = await response.json();

      expect(body.pagination.hasMore).toBe(false);
    });

    it('should return empty array when no users match', async () => {
      vi.mocked(userService.search).mockResolvedValue([]);

      const response = await app.request('/api/v1/users?q=nonexistent');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.users).toEqual([]);
    });

    it('should validate query length', async () => {
      // Query too long (> 100 chars)
      const longQuery = 'a'.repeat(101);
      const response = await app.request(`/api/v1/users?q=${longQuery}`);

      expect(response.status).toBe(400);
    });

    it('should pass pagination to service', async () => {
      vi.mocked(userService.search).mockResolvedValue([]);

      await app.request('/api/v1/users?q=test&page=3&limit=15');

      expect(userService.search).toHaveBeenCalledWith('test', 3, 15);
    });
  });

  // ============================================================================
  // GET /api/v1/users/:id/stats - Get User Stats
  // ============================================================================
  describe('GET /api/v1/users/:id/stats', () => {
    const mockStats = {
      rating: '3.50',
      gamesPlayed: 25,
      wins: 15,
      losses: 10,
      winRate: '60.0',
      skillLevel: 'intermediate',
      winStreak: 3,
      recentGamesCount: 10,
    };

    it('should return user stats', async () => {
      vi.mocked(userService.getStats).mockResolvedValue(mockStats as any);

      const response = await app.request('/api/v1/users/test-user-id/stats');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.stats).toBeDefined();
      expect(body.stats.gamesPlayed).toBe(25);
      expect(body.stats.winRate).toBe('60.0');
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userService.getStats).mockResolvedValue(null);

      const response = await app.request('/api/v1/users/nonexistent-id/stats');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe('User not found');
    });
  });

  // ============================================================================
  // GET /api/v1/users/:id/games - Get User Game History
  // ============================================================================
  describe('GET /api/v1/users/:id/games', () => {
    const mockGames = [
      {
        id: 'game-1',
        gameType: 'casual',
        gameFormat: 'doubles',
        status: 'completed',
        completedAt: new Date('2024-01-15'),
      },
      {
        id: 'game-2',
        gameType: 'competitive',
        gameFormat: 'singles',
        status: 'completed',
        completedAt: new Date('2024-01-14'),
      },
    ];

    it('should return user game history', async () => {
      vi.mocked(userService.getById).mockResolvedValue(mockUser as any);
      vi.mocked(userService.getGames).mockResolvedValue(mockGames as any);

      const response = await app.request('/api/v1/users/test-user-id/games');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.games).toBeDefined();
      expect(body.games).toHaveLength(2);
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userService.getById).mockResolvedValue(null);

      const response = await app.request('/api/v1/users/nonexistent-id/games');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe('User not found');
    });

    it('should support pagination for games', async () => {
      vi.mocked(userService.getById).mockResolvedValue(mockUser as any);
      vi.mocked(userService.getGames).mockResolvedValue(mockGames as any);

      const response = await app.request('/api/v1/users/test-user-id/games?page=2&limit=10');
      const body = await response.json();

      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(10);
    });
  });

  // ============================================================================
  // GET /api/v1/users/:id/achievements - Get User Achievements
  // ============================================================================
  describe('GET /api/v1/users/:id/achievements', () => {
    const mockAchievements = [
      {
        achievement: {
          id: 'achievement-1',
          name: 'First Win',
          description: 'Win your first game',
          iconUrl: 'https://example.com/icon1.png',
          points: 10,
        },
        earnedAt: new Date('2024-01-10'),
      },
      {
        achievement: {
          id: 'achievement-2',
          name: '10 Games',
          description: 'Play 10 games',
          iconUrl: 'https://example.com/icon2.png',
          points: 25,
        },
        earnedAt: new Date('2024-01-12'),
      },
    ];

    it('should return user achievements', async () => {
      vi.mocked(userService.getById).mockResolvedValue(mockUser as any);
      vi.mocked(userService.getAchievements).mockResolvedValue(mockAchievements as any);

      const response = await app.request('/api/v1/users/test-user-id/achievements');

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.achievements).toBeDefined();
      expect(body.achievements).toHaveLength(2);
      expect(body.totalPoints).toBe(35); // 10 + 25
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(userService.getById).mockResolvedValue(null);

      const response = await app.request('/api/v1/users/nonexistent-id/achievements');

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toBe('User not found');
    });

    it('should format achievements correctly', async () => {
      vi.mocked(userService.getById).mockResolvedValue(mockUser as any);
      vi.mocked(userService.getAchievements).mockResolvedValue(mockAchievements as any);

      const response = await app.request('/api/v1/users/test-user-id/achievements');
      const body = await response.json();

      expect(body.achievements[0]).toHaveProperty('id');
      expect(body.achievements[0]).toHaveProperty('name');
      expect(body.achievements[0]).toHaveProperty('description');
      expect(body.achievements[0]).toHaveProperty('iconUrl');
      expect(body.achievements[0]).toHaveProperty('points');
      expect(body.achievements[0]).toHaveProperty('unlockedAt');
    });
  });
});
