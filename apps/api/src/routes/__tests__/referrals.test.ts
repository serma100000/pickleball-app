import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from '../../middleware/errorHandler.js';
import referralsRouter from '../referrals.js';

// Mock the database
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      referralCodes: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      referralConversions: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  },
  schema: {
    referralCodes: {
      id: 'id',
      userId: 'user_id',
      code: 'code',
      eventType: 'event_type',
      eventId: 'event_id',
      usesCount: 'uses_count',
      maxUses: 'max_uses',
      isActive: 'is_active',
      createdAt: 'created_at',
    },
    referralConversions: {
      id: 'id',
      referralCodeId: 'referral_code_id',
      referredUserId: 'referred_user_id',
      conversionType: 'conversion_type',
      eventId: 'event_id',
      rewardApplied: 'reward_applied',
      createdAt: 'created_at',
    },
    users: {
      id: 'id',
      clerkId: 'clerk_id',
      email: 'email',
      displayName: 'display_name',
      avatarUrl: 'avatar_url',
    },
  },
}));

// Mock Clerk's verifyToken for authentication
vi.mock('@clerk/backend', () => ({
  verifyToken: vi.fn(),
}));

// Mock notification service
vi.mock('../../services/notificationService.js', () => ({
  notificationService: {
    create: vi.fn().mockResolvedValue({ id: 'notification-123' }),
  },
}));

import { verifyToken } from '@clerk/backend';
import { db } from '../../db/index.js';
import { notificationService } from '../../services/notificationService.js';

// Helper to create test app with referrals routes
function createTestApp() {
  const app = new Hono();
  app.onError(errorHandler);
  app.route('/referrals', referralsRouter);
  return app;
}

// Helper to create mock user
function createMockUser(overrides = {}) {
  return {
    id: 'user-uuid-123',
    clerkId: 'clerk_abc123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Helper to create mock referral code
function createMockReferralCode(overrides = {}) {
  return {
    id: 'referral-code-uuid-123',
    userId: 'user-uuid-123',
    code: 'ABC12345',
    eventType: 'general',
    eventId: null,
    usesCount: 0,
    maxUses: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// Helper to create mock referral conversion
function createMockConversion(overrides = {}) {
  return {
    id: 'conversion-uuid-123',
    referralCodeId: 'referral-code-uuid-123',
    referredUserId: 'referred-user-uuid-456',
    conversionType: 'signup',
    eventId: null,
    rewardApplied: false,
    createdAt: new Date('2024-01-15'),
    referredUser: {
      id: 'referred-user-uuid-456',
      displayName: 'Referred User',
      avatarUrl: 'https://example.com/referred-avatar.jpg',
      createdAt: new Date('2024-01-15'),
    },
    ...overrides,
  };
}

// Helper to setup authenticated mock for a given clerkId
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

describe('Referrals Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variable
    process.env.FRONTEND_URL = 'https://paddle-up.app';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // =========================================================================
  // GET /referrals/code - Get or create referral code
  // =========================================================================
  describe('GET /referrals/code', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const app = createTestApp();

      const response = await app.request('/referrals/code', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 when user is not found in database', async () => {
      const app = createTestApp();
      setupAuthMock('clerk_abc123');

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const response = await app.request('/referrals/code', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('User not found');
    });

    it('should return existing referral code when user already has one', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const mockCode = createMockReferralCode({ usesCount: 5 });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      const response = await app.request('/referrals/code', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.code).toBe('ABC12345');
      expect(data.usesCount).toBe(5);
      expect(data.isActive).toBe(true);
      expect(data.shareableUrl).toBe('https://paddle-up.app?ref=ABC12345');
    });

    it('should create a new referral code when user does not have one', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const newCode = createMockReferralCode({ code: 'NEWCODE1' });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      // First call: check for existing code - none found
      vi.mocked(db.query.referralCodes.findFirst)
        .mockResolvedValueOnce(null) // No existing code
        .mockResolvedValueOnce(null); // Code doesn't exist (for uniqueness check)

      // Mock insert chain
      const insertMock = vi.fn().mockReturnThis();
      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newCode]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const response = await app.request('/referrals/code', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.code).toBe('NEWCODE1');
      expect(data.usesCount).toBe(0);
      expect(data.isActive).toBe(true);
    });

    it('should create tournament-specific referral code with correct URL', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const tournamentId = '550e8400-e29b-41d4-a716-446655440000';
      const newCode = createMockReferralCode({
        code: 'TOURN123',
        eventType: 'tournament',
        eventId: tournamentId,
      });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newCode]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const response = await app.request(
        `/referrals/code?eventType=tournament&eventId=${tournamentId}`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_token',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.shareableUrl).toBe(
        `https://paddle-up.app/tournaments/${tournamentId}?ref=TOURN123`
      );
    });

    it('should create league-specific referral code with correct URL', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const leagueId = '550e8400-e29b-41d4-a716-446655440001';
      const newCode = createMockReferralCode({
        code: 'LEAGUE12',
        eventType: 'league',
        eventId: leagueId,
      });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newCode]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const response = await app.request(
        `/referrals/code?eventType=league&eventId=${leagueId}`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_token',
          },
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.shareableUrl).toBe(
        `https://paddle-up.app/leagues/${leagueId}?ref=LEAGUE12`
      );
    });

    it('should handle 400 for invalid eventId format', async () => {
      const app = createTestApp();
      setupAuthMock('clerk_abc123');

      const response = await app.request(
        '/referrals/code?eventType=tournament&eventId=not-a-valid-uuid',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid_token',
          },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // GET /referrals/stats - Get referral statistics
  // =========================================================================
  describe('GET /referrals/stats', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const app = createTestApp();

      const response = await app.request('/referrals/stats', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 when user is not found in database', async () => {
      const app = createTestApp();
      setupAuthMock('clerk_abc123');

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const response = await app.request('/referrals/stats', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('User not found');
    });

    it('should return empty stats when user has no referral codes', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findMany).mockResolvedValue([]);

      const response = await app.request('/referrals/stats', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalViews).toBe(0);
      expect(data.totalSignups).toBe(0);
      expect(data.totalRegistrations).toBe(0);
      expect(data.totalPurchases).toBe(0);
      expect(data.successfulConversions).toBe(0);
      expect(data.recentConversions).toEqual([]);
      expect(data.codes).toEqual([]);
    });

    it('should calculate stats correctly from multiple codes', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();

      const mockCodes = [
        {
          ...createMockReferralCode({ usesCount: 10 }),
          conversions: [
            createMockConversion({ conversionType: 'signup' }),
            createMockConversion({
              conversionType: 'registration',
              id: 'conv-2',
              createdAt: new Date('2024-01-20'),
            }),
          ],
        },
        {
          ...createMockReferralCode({
            id: 'code-2',
            code: 'CODE2222',
            usesCount: 5,
          }),
          conversions: [
            createMockConversion({
              conversionType: 'purchase',
              id: 'conv-3',
              createdAt: new Date('2024-01-25'),
            }),
          ],
        },
      ];

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findMany).mockResolvedValue(mockCodes);

      const response = await app.request('/referrals/stats', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalViews).toBe(15); // 10 + 5
      expect(data.totalSignups).toBe(1);
      expect(data.totalRegistrations).toBe(1);
      expect(data.totalPurchases).toBe(1);
      expect(data.successfulConversions).toBe(3);
      expect(data.recentConversions).toHaveLength(3);
      expect(data.codes).toHaveLength(2);
    });

    it('should show earned rewards when milestones are reached', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();

      // Create 5 conversions to trigger FIVE_REFERRALS milestone
      const conversions = [
        createMockConversion({ conversionType: 'signup', id: 'conv-1' }),
        createMockConversion({ conversionType: 'signup', id: 'conv-2' }),
        createMockConversion({ conversionType: 'signup', id: 'conv-3' }),
        createMockConversion({ conversionType: 'signup', id: 'conv-4' }),
        createMockConversion({ conversionType: 'signup', id: 'conv-5' }),
      ];

      const mockCodes = [
        {
          ...createMockReferralCode({ usesCount: 20 }),
          conversions,
        },
      ];

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findMany).mockResolvedValue(mockCodes);

      const response = await app.request('/referrals/stats', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.successfulConversions).toBe(5);
      expect(data.rewards.earned).toHaveLength(2); // FIRST_REFERRAL and FIVE_REFERRALS
      expect(data.rewards.nextMilestone.count).toBe(10); // TEN_REFERRALS
    });

    it('should limit recent conversions to 10', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();

      // Create 15 conversions
      const conversions = Array.from({ length: 15 }, (_, i) =>
        createMockConversion({
          id: `conv-${i}`,
          conversionType: 'signup',
          createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
        })
      );

      const mockCodes = [
        {
          ...createMockReferralCode({ usesCount: 50 }),
          conversions,
        },
      ];

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findMany).mockResolvedValue(mockCodes);

      const response = await app.request('/referrals/stats', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid_token',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recentConversions).toHaveLength(10);
    });
  });

  // =========================================================================
  // POST /referrals/track - Track referral click
  // =========================================================================
  describe('POST /referrals/track', () => {
    it('should return tracked: false for invalid referral code', async () => {
      const app = createTestApp();

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(null);

      const response = await app.request('/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: 'INVALID1',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tracked).toBe(false);
    });

    it('should return tracked: false for inactive referral code', async () => {
      const app = createTestApp();

      // First query returns null because we search for active codes only
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(null);

      const response = await app.request('/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: 'INACTIVE',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tracked).toBe(false);
    });

    it('should return tracked: false when max uses is reached', async () => {
      const app = createTestApp();
      const mockCode = createMockReferralCode({
        usesCount: 10,
        maxUses: 10,
      });

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      const response = await app.request('/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tracked).toBe(false);
    });

    it('should increment uses count and return tracked: true for valid code', async () => {
      const app = createTestApp();
      const mockCode = createMockReferralCode({ usesCount: 5 });

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      // Mock update chain
      const setMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.update).mockReturnValue({
        set: setMock,
        where: whereMock,
      } as any);
      setMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tracked).toBe(true);
      expect(data.eventType).toBe('general');
      expect(db.update).toHaveBeenCalled();
    });

    it('should return eventType and eventId from request when provided', async () => {
      const app = createTestApp();
      const mockCode = createMockReferralCode();
      const eventId = '550e8400-e29b-41d4-a716-446655440000';

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      const setMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.update).mockReturnValue({
        set: setMock,
        where: whereMock,
      } as any);
      setMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          eventType: 'tournament',
          eventId,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tracked).toBe(true);
      expect(data.eventType).toBe('tournament');
      expect(data.eventId).toBe(eventId);
    });

    it('should return 400 for missing referralCode', async () => {
      const app = createTestApp();

      const response = await app.request('/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid eventType', async () => {
      const app = createTestApp();

      const response = await app.request('/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          eventType: 'invalid_type',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  // =========================================================================
  // POST /referrals/convert - Convert referral
  // =========================================================================
  describe('POST /referrals/convert', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const app = createTestApp();

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 when user is not found in database', async () => {
      const app = createTestApp();
      setupAuthMock('clerk_abc123');

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('User not found');
    });

    it('should return 404 for invalid referral code', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(null);

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'INVALID1',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe('Invalid referral code');
    });

    it('should return 400 for self-referral attempt', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const mockCode = createMockReferralCode({
        userId: 'user-uuid-123', // Same as mockUser.id
        user: mockUser,
      });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe('Cannot use your own referral code');
    });

    it('should return converted: false when user already converted with this code', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const existingConversion = createMockConversion();

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(
        existingConversion
      );

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.converted).toBe(false);
      expect(data.message).toBe('Already converted with this referral code');
    });

    it('should successfully convert and create notification for referrer', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const newConversion = createMockConversion({
        id: 'new-conversion-id',
        referredUserId: 'user-uuid-123',
      });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      // Mock insert chain for conversion
      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      // Mock select for count
      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 1 }]);
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.converted).toBe(true);
      expect(data.conversionId).toBe('new-conversion-id');
      expect(notificationService.create).toHaveBeenCalledTimes(2); // Conversion + potential reward
    });

    it('should award FIRST_REFERRAL reward on first conversion', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const newConversion = createMockConversion();

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 1 }]); // First referral
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.converted).toBe(true);
      expect(data.rewardAwarded).toBe(true);
      expect(data.reward).toBe('CREDIT_5');
      expect(data.description).toBe('$5 account credit');
    });

    it('should handle registration conversion type', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const newConversion = createMockConversion({
        conversionType: 'registration',
      });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 2 }]);
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'registration',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.converted).toBe(true);
    });

    it('should handle purchase conversion type', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const newConversion = createMockConversion({
        conversionType: 'purchase',
      });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 3 }]);
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'purchase',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.converted).toBe(true);
    });

    it('should return 400 for missing conversionType', async () => {
      const app = createTestApp();
      setupAuthMock('clerk_abc123');

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid conversionType', async () => {
      const app = createTestApp();
      setupAuthMock('clerk_abc123');

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'invalid_type',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should include eventId in conversion when provided', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const eventId = '550e8400-e29b-41d4-a716-446655440000';
      const newConversion = createMockConversion({ eventId });

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 1 }]);
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'registration',
          eventId,
        }),
      });

      expect(response.status).toBe(200);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GET /referrals/validate/:code - Validate referral code (public endpoint)
  // =========================================================================
  describe('GET /referrals/validate/:code', () => {
    it('should return valid: false for non-existent code', async () => {
      const app = createTestApp();

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(null);

      const response = await app.request('/referrals/validate/INVALID1', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
    });

    it('should return valid: false when max uses is reached', async () => {
      const app = createTestApp();
      const mockCode = createMockReferralCode({
        usesCount: 10,
        maxUses: 10,
        user: createMockUser(),
      });

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      const response = await app.request('/referrals/validate/ABC12345', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(false);
    });

    it('should return valid: true with referrer info for valid code', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const mockCode = createMockReferralCode({
        user: {
          displayName: mockUser.displayName,
          avatarUrl: mockUser.avatarUrl,
        },
      });

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      const response = await app.request('/referrals/validate/ABC12345', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.referrer.displayName).toBe('Test User');
      expect(data.referrer.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(data.eventType).toBe('general');
    });

    it('should return event info for event-specific code', async () => {
      const app = createTestApp();
      const eventId = '550e8400-e29b-41d4-a716-446655440000';
      const mockCode = createMockReferralCode({
        eventType: 'tournament',
        eventId,
        user: {
          displayName: 'Tournament Organizer',
          avatarUrl: null,
        },
      });

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      const response = await app.request('/referrals/validate/TOURN123', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.eventType).toBe('tournament');
      expect(data.eventId).toBe(eventId);
    });

    it('should not require authentication', async () => {
      const app = createTestApp();
      const mockCode = createMockReferralCode({
        user: createMockUser(),
      });

      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);

      // No Authorization header
      const response = await app.request('/referrals/validate/ABC12345', {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
    });
  });

  // =========================================================================
  // Reward Milestone Tests
  // =========================================================================
  describe('Reward Milestones', () => {
    it('should award FIVE_REFERRALS reward at 5 conversions', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const newConversion = createMockConversion();

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 5 }]); // 5th referral
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.rewardAwarded).toBe(true);
      expect(data.reward).toBe('DISCOUNT_50_PERCENT');
      expect(data.description).toBe('50% off next entry');
    });

    it('should award TEN_REFERRALS reward at 10 conversions', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const newConversion = createMockConversion();

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 10 }]); // 10th referral
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.rewardAwarded).toBe(true);
      expect(data.reward).toBe('FREE_ENTRY');
      expect(data.description).toBe('Free event entry');
    });

    it('should not award reward for non-milestone conversions', async () => {
      const app = createTestApp();
      const mockUser = createMockUser();
      const referrerUser = createMockUser({
        id: 'referrer-uuid-456',
        clerkId: 'clerk_referrer456',
      });
      const mockCode = createMockReferralCode({
        userId: 'referrer-uuid-456',
        user: referrerUser,
      });
      const newConversion = createMockConversion();

      setupAuthMock('clerk_abc123');
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
      vi.mocked(db.query.referralCodes.findFirst).mockResolvedValue(mockCode);
      vi.mocked(db.query.referralConversions.findFirst).mockResolvedValue(null);

      const valuesMock = vi.fn().mockReturnThis();
      const returningMock = vi.fn().mockResolvedValue([newConversion]);
      vi.mocked(db.insert).mockReturnValue({
        values: valuesMock,
        returning: returningMock,
      } as any);
      valuesMock.mockReturnValue({ returning: returningMock });

      const fromMock = vi.fn().mockReturnThis();
      const whereMock = vi.fn().mockResolvedValue([{ count: 3 }]); // 3rd referral (not a milestone)
      vi.mocked(db.select).mockReturnValue({
        from: fromMock,
        where: whereMock,
      } as any);
      fromMock.mockReturnValue({ where: whereMock });

      const response = await app.request('/referrals/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid_token',
        },
        body: JSON.stringify({
          referralCode: 'ABC12345',
          conversionType: 'signup',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.rewardAwarded).toBe(false);
    });
  });
});
