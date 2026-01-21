import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

// Mock the database module - must be before imports
vi.mock('../db/index.js', () => {
  // Test data must be inside the mock factory to avoid hoisting issues
  const mockVenues = [
    {
      id: 'venue-1',
      name: 'Central Park Courts',
      slug: 'central-park-courts',
      venueType: 'public',
      streetAddress: '123 Park Ave',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      zipCode: '10001',
      latitude: '40.7829',
      longitude: '-73.9654',
      amenities: ['restrooms', 'parking'],
      operatingHours: { monday: { open: '06:00', close: '22:00' } },
      phone: '555-1234',
      website: 'https://example.com',
      averageRating: '4.5',
      totalReviews: 10,
      isVerified: true,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'venue-2',
      name: 'Brooklyn Sports Center',
      slug: 'brooklyn-sports-center',
      venueType: 'club',
      streetAddress: '456 Court St',
      city: 'Brooklyn',
      state: 'NY',
      country: 'USA',
      zipCode: '11201',
      latitude: '40.6892',
      longitude: '-73.9857',
      amenities: ['restrooms', 'pro_shop'],
      operatingHours: {},
      phone: '555-5678',
      website: null,
      averageRating: '4.2',
      totalReviews: 5,
      isVerified: true,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockCourts = [
    {
      id: 'court-1',
      venueId: 'venue-1',
      name: 'Court A',
      courtNumber: 1,
      surface: 'sport_court',
      isIndoor: false,
      hasLights: true,
      isCovered: false,
      widthFeet: '20',
      lengthFeet: '44',
      isReservable: true,
      requiresMembership: false,
      isActive: true,
      hourlyRate: null,
      peakHourlyRate: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'court-2',
      venueId: 'venue-1',
      name: 'Court B',
      courtNumber: 2,
      surface: 'concrete',
      isIndoor: false,
      hasLights: true,
      isCovered: false,
      widthFeet: '20',
      lengthFeet: '44',
      isReservable: true,
      requiresMembership: false,
      isActive: true,
      hourlyRate: null,
      peakHourlyRate: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'court-3',
      venueId: 'venue-2',
      name: 'Indoor Court 1',
      courtNumber: 1,
      surface: 'indoor',
      isIndoor: true,
      hasLights: true,
      isCovered: true,
      widthFeet: '20',
      lengthFeet: '44',
      isReservable: true,
      requiresMembership: true,
      isActive: true,
      hourlyRate: '25.00',
      peakHourlyRate: '35.00',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockUsers = [
    {
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      clerkId: 'clerk-user-1',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockReviews = [
    {
      id: 'review-1',
      courtId: 'court-1',
      venueId: 'venue-1',
      userId: 'user-1',
      rating: 5,
      title: 'Great court!',
      content: 'Well maintained and great surface.',
      surfaceQuality: 5,
      netQuality: 4,
      lightingQuality: 5,
      cleanliness: 5,
      isApproved: true,
      isFlagged: false,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      user: mockUsers[0],
    },
  ];

  // Create chainable mock for select queries
  const createSelectMock = (results: unknown[]) => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => void) => Promise.resolve(results).then(resolve),
    };
    return chain;
  };

  const mockDb = {
    select: vi.fn().mockImplementation(() => {
      // Return courts with venues joined
      const results = mockCourts.map((court, index) => ({
        court,
        venue: mockVenues.find(v => v.id === court.venueId) || mockVenues[0],
        distance: index * 0.5,
      }));
      return createSelectMock(results);
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 'new-review-1',
          rating: 5,
          content: 'Great court!',
          createdAt: new Date(),
        }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    query: {
      courts: {
        findFirst: vi.fn().mockImplementation(({ with: withRelations } = {}) => {
          const court = { ...mockCourts[0] };
          if (withRelations?.venue) {
            (court as Record<string, unknown>).venue = mockVenues[0];
          }
          return Promise.resolve(court);
        }),
        findMany: vi.fn().mockResolvedValue(mockCourts),
      },
      courtReviews: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue(mockReviews),
      },
      users: {
        findFirst: vi.fn().mockResolvedValue(mockUsers[0]),
      },
      venues: {
        findFirst: vi.fn().mockResolvedValue(mockVenues[0]),
        findMany: vi.fn().mockResolvedValue(mockVenues),
      },
    },
    // Export mock data for test access
    __mockData: {
      mockCourts,
      mockVenues,
      mockUsers,
      mockReviews,
    },
  };

  return {
    db: mockDb,
    schema: {
      courts: {
        id: 'id',
        venueId: 'venue_id',
        isIndoor: 'is_indoor',
        hasLights: 'has_lights',
        surface: 'surface',
      },
      venues: {
        id: 'id',
        city: 'city',
        latitude: 'latitude',
        longitude: 'longitude',
        averageRating: 'average_rating',
      },
      courtReviews: {
        id: 'id',
        courtId: 'court_id',
        venueId: 'venue_id',
        userId: 'user_id',
        rating: 'rating',
      },
      users: {
        id: 'id',
        clerkId: 'clerk_id',
      },
    },
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join('?'),
      values,
    }),
  };
});

// Mock Redis cache
vi.mock('../lib/redis.js', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(true),
  },
}));

// Mock auth middleware
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (c, next) => {
    c.set('user', { userId: 'clerk-user-1', sessionId: 'session-1', claims: {} });
    await next();
  }),
}));

// Import after mocks are set up
import courtsRouter from './courts.js';

// Get mock data for reference in tests
const getMockData = async () => {
  const { db } = await import('../db/index.js');
  return (db as unknown as { __mockData: Record<string, unknown> }).__mockData;
};

describe('Courts API Routes', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/courts', courtsRouter);
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mocks to default behavior
    const { db } = await import('../db/index.js');
    const { cache } = await import('../lib/redis.js');
    const mockData = await getMockData();

    vi.mocked(cache.get).mockResolvedValue(null);
    vi.mocked(cache.set).mockResolvedValue(true);
    vi.mocked(cache.del).mockResolvedValue(true);

    const mockCourts = mockData.mockCourts as Array<Record<string, unknown>>;
    const mockVenues = mockData.mockVenues as Array<Record<string, unknown>>;
    const mockUsers = mockData.mockUsers as Array<Record<string, unknown>>;
    const mockReviews = mockData.mockReviews as Array<Record<string, unknown>>;

    vi.mocked(db.query.courts.findFirst).mockImplementation(({ with: withRelations } = {}) => {
      const court = { ...mockCourts[0] };
      if (withRelations?.venue) {
        court.venue = mockVenues[0];
      }
      return Promise.resolve(court);
    });
    vi.mocked(db.query.courtReviews.findFirst).mockResolvedValue(null);
    vi.mocked(db.query.courtReviews.findMany).mockResolvedValue(mockReviews);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUsers[0]);
  });

  describe('GET /courts - List all courts with pagination', () => {
    it('should return a paginated list of courts', async () => {
      const res = await app.request('/courts');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courts');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should support custom page and limit parameters', async () => {
      const res = await app.request('/courts?page=2&limit=10');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
    });

    it('should filter courts by city', async () => {
      const res = await app.request('/courts?city=New%20York');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courts');
    });

    it('should filter by isIndoor parameter', async () => {
      const res = await app.request('/courts?isIndoor=true');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courts');
    });

    it('should filter by hasLighting parameter', async () => {
      const res = await app.request('/courts?hasLighting=true');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courts');
    });

    it('should filter by surfaceType parameter', async () => {
      const res = await app.request('/courts?surfaceType=sport_court');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courts');
    });

    it('should reject invalid pagination parameters', async () => {
      const res = await app.request('/courts?page=-1');
      expect(res.status).toBe(400);
    });

    it('should reject limit exceeding maximum', async () => {
      const res = await app.request('/courts?limit=200');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /courts/:id - Get court details', () => {
    it('should return court details with venue information', async () => {
      const res = await app.request('/courts/court-1');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('court');
      expect(data.court).toHaveProperty('id');
      expect(data.court).toHaveProperty('name');
      expect(data.court).toHaveProperty('venue');
    });

    it('should include recent reviews in court details', async () => {
      const res = await app.request('/courts/court-1');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.court).toHaveProperty('recentReviews');
      expect(Array.isArray(data.court.recentReviews)).toBe(true);
    });

    it('should return 404 for non-existent court', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.query.courts.findFirst).mockResolvedValueOnce(null);

      const res = await app.request('/courts/non-existent-id');
      expect(res.status).toBe(404);
    });

    it('should use cache when available', async () => {
      const { cache } = await import('../lib/redis.js');
      const mockData = await getMockData();
      const mockVenues = mockData.mockVenues as Array<Record<string, unknown>>;

      const cachedCourt = {
        id: 'court-1',
        name: 'Cached Court',
        venueId: 'venue-1',
        venue: mockVenues[0],
        recentReviews: [],
      };
      vi.mocked(cache.get).mockResolvedValueOnce(cachedCourt);

      const res = await app.request('/courts/court-1');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.court.name).toBe('Cached Court');
    });
  });

  describe('GET /courts - Nearby search (geo filtering)', () => {
    it('should find courts within default radius', async () => {
      const res = await app.request('/courts?lat=40.7829&lng=-73.9654');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courts');
      expect(Array.isArray(data.courts)).toBe(true);
    });

    it('should respect custom radius parameter', async () => {
      const res = await app.request('/courts?lat=40.7829&lng=-73.9654&radius=10');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courts');
    });

    it('should include distance in court results when searching by location', async () => {
      const res = await app.request('/courts?lat=40.7829&lng=-73.9654');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.courts).toBeDefined();
      if (data.courts.length > 0) {
        expect(data.courts[0]).toHaveProperty('distance');
      }
    });

    it('should reject invalid latitude', async () => {
      const res = await app.request('/courts?lat=100&lng=-73.9654');
      expect(res.status).toBe(400);
    });

    it('should reject invalid longitude', async () => {
      const res = await app.request('/courts?lat=40.7829&lng=200');
      expect(res.status).toBe(400);
    });

    it('should reject radius exceeding maximum', async () => {
      const res = await app.request('/courts?lat=40.7829&lng=-73.9654&radius=200');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /courts/:id/reviews - Add a review', () => {
    beforeEach(async () => {
      const { db } = await import('../db/index.js');
      const mockData = await getMockData();
      const mockCourts = mockData.mockCourts as Array<Record<string, unknown>>;
      const mockUsers = mockData.mockUsers as Array<Record<string, unknown>>;

      vi.mocked(db.query.courts.findFirst).mockResolvedValue(mockCourts[0]);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUsers[0]);
      vi.mocked(db.query.courtReviews.findFirst).mockResolvedValue(null);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'new-review-1',
            rating: 5,
            content: 'Great court!',
            createdAt: new Date(),
          }]),
        }),
      } as unknown as ReturnType<typeof db.insert>);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ rating: 5 }, { rating: 4 }]),
        }),
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof db.update>);
    });

    it('should create a review with valid data', async () => {
      const res = await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Great court!',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty('message', 'Review added successfully');
      expect(data).toHaveProperty('review');
    });

    it('should validate rating is between 1 and 5', async () => {
      const res = await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 6,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject rating below 1', async () => {
      const res = await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 0,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should reject non-integer rating', async () => {
      const res = await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 4.5,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent court', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.query.courts.findFirst).mockResolvedValueOnce(null);

      const res = await app.request('/courts/non-existent/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 5,
        }),
      });

      expect(res.status).toBe(404);
    });

    it('should prevent duplicate reviews from same user', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.query.courtReviews.findFirst).mockResolvedValueOnce({
        id: 'existing-review',
        courtId: 'court-1',
        venueId: 'venue-1',
        userId: 'user-1',
        rating: 4,
        title: 'Previous review',
        content: 'Already reviewed',
        surfaceQuality: null,
        netQuality: null,
        lightingQuality: null,
        cleanliness: null,
        isApproved: true,
        isFlagged: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 5,
        }),
      });

      expect(res.status).toBe(409);
    });

    it('should accept optional comment field', async () => {
      const res = await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 5,
        }),
      });

      expect(res.status).toBe(201);
    });

    it('should validate comment max length', async () => {
      const longComment = 'a'.repeat(1001);

      const res = await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 5,
          comment: longComment,
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should invalidate cache when adding a review', async () => {
      const { cache } = await import('../lib/redis.js');

      await app.request('/courts/court-1/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Test review',
        }),
      });

      expect(cache.del).toHaveBeenCalledWith('court:court-1');
    });
  });

  describe('GET /courts/:id/reviews - Get all reviews for a court', () => {
    it('should return paginated reviews for a court', async () => {
      const res = await app.request('/courts/court-1/reviews');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('reviews');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.reviews)).toBe(true);
    });

    it('should include user info in reviews', async () => {
      const res = await app.request('/courts/court-1/reviews');
      expect(res.status).toBe(200);

      const data = await res.json();
      if (data.reviews.length > 0) {
        expect(data.reviews[0]).toHaveProperty('user');
        expect(data.reviews[0].user).toHaveProperty('id');
        expect(data.reviews[0].user).toHaveProperty('username');
        expect(data.reviews[0].user).toHaveProperty('displayName');
      }
    });

    it('should support pagination parameters', async () => {
      const res = await app.request('/courts/court-1/reviews?page=1&limit=5');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(5);
    });
  });

  describe('GET /courts/:id/availability - Get court availability', () => {
    it('should return availability slots for a date', async () => {
      const res = await app.request('/courts/court-1/availability?date=2024-06-15');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('courtId', 'court-1');
      expect(data).toHaveProperty('date', '2024-06-15');
      expect(data).toHaveProperty('slots');
      expect(Array.isArray(data.slots)).toBe(true);
    });

    it('should return slots with availability status and pricing', async () => {
      const res = await app.request('/courts/court-1/availability?date=2024-06-15');
      expect(res.status).toBe(200);

      const data = await res.json();
      if (data.slots.length > 0) {
        expect(data.slots[0]).toHaveProperty('startTime');
        expect(data.slots[0]).toHaveProperty('endTime');
        expect(data.slots[0]).toHaveProperty('available');
        expect(data.slots[0]).toHaveProperty('price');
      }
    });

    it('should reject invalid date format', async () => {
      const res = await app.request('/courts/court-1/availability?date=06-15-2024');
      expect(res.status).toBe(400);
    });

    it('should require date parameter', async () => {
      const res = await app.request('/courts/court-1/availability');
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent court', async () => {
      const { db } = await import('../db/index.js');
      vi.mocked(db.query.courts.findFirst).mockResolvedValueOnce(null);

      const res = await app.request('/courts/non-existent/availability?date=2024-06-15');
      expect(res.status).toBe(404);
    });
  });
});

describe('Courts API - Error Handling', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route('/courts', courtsRouter);
  });

  it('should handle database errors gracefully on GET /courts/:id', async () => {
    const { db } = await import('../db/index.js');
    const { cache } = await import('../lib/redis.js');

    vi.mocked(cache.get).mockResolvedValue(null);
    vi.mocked(db.query.courts.findFirst).mockRejectedValueOnce(new Error('Database error'));

    const res = await app.request('/courts/court-1');
    expect(res.status).toBe(500);
  });
});
