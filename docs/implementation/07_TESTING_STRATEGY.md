# Testing Strategy - Pickleball Web App

## Executive Summary

This document defines a comprehensive testing strategy for the pickleball web application, ensuring reliability across all critical features including matchmaking, tournament management, rating calculations, offline support, and real-time functionality.

**Coverage Targets:**
- Unit Tests: 80%+ code coverage
- Integration Tests: All API endpoints and database operations
- E2E Tests: All critical user flows
- Performance Tests: Meet defined response time budgets

---

## 1. Testing Pyramid

```
                    /\
                   /  \
                  / E2E \           10% - Critical user journeys
                 /  Tests \         (Playwright)
                /----------\
               /            \
              / Integration  \      20% - API, DB, services
             /    Tests       \     (Supertest, TestContainers)
            /------------------\
           /                    \
          /     Unit Tests       \  70% - Components, functions, hooks
         /                        \ (Jest, React Testing Library)
        /--------------------------\
```

### Test Distribution Guidelines

| Test Type | Coverage | Execution Time | Run Frequency |
|-----------|----------|----------------|---------------|
| Unit | 70% of tests | <5 min total | Every commit |
| Integration | 20% of tests | <10 min total | Every PR |
| E2E | 10% of tests | <15 min total | Pre-merge, nightly |
| Performance | As needed | 30+ min | Weekly, pre-release |

---

## 2. Unit Testing Strategy

### 2.1 Frontend Components (React Testing Library)

**Configuration: `jest.config.js`**
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Test Setup: `tests/setup.ts`**
```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});
```

**Example Component Test:**
```typescript
// tests/components/MatchCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchCard } from '@/components/MatchCard';
import { mockMatch } from '../fixtures/matches';

describe('MatchCard', () => {
  it('renders match details correctly', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText(mockMatch.location)).toBeInTheDocument();
    expect(screen.getByText(/doubles/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeEnabled();
  });

  it('shows full indicator when match is at capacity', () => {
    const fullMatch = { ...mockMatch, currentPlayers: 4, maxPlayers: 4 };
    render(<MatchCard match={fullMatch} />);

    expect(screen.getByText(/full/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeDisabled();
  });

  it('calls onJoin when join button clicked', async () => {
    const onJoin = jest.fn();
    render(<MatchCard match={mockMatch} onJoin={onJoin} />);

    fireEvent.click(screen.getByRole('button', { name: /join/i }));

    expect(onJoin).toHaveBeenCalledWith(mockMatch.id);
  });

  it('displays skill level badge', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText(`${mockMatch.skillMin}-${mockMatch.skillMax}`)).toBeInTheDocument();
  });
});
```

### 2.2 Custom Hooks Testing

```typescript
// tests/hooks/useMatchmaking.test.ts
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMatchmaking } from '@/hooks/useMatchmaking';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMatchmaking', () => {
  it('fetches nearby matches on mount', async () => {
    const { result } = renderHook(
      () => useMatchmaking({ latitude: 40.7128, longitude: -74.006, radius: 10 }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.matches).toHaveLength(3);
  });

  it('filters matches by skill level', async () => {
    const { result } = renderHook(
      () => useMatchmaking({
        latitude: 40.7128,
        longitude: -74.006,
        skillMin: 3.0,
        skillMax: 4.0
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => !result.current.isLoading);

    result.current.matches.forEach(match => {
      expect(match.skillMin).toBeGreaterThanOrEqual(3.0);
      expect(match.skillMax).toBeLessThanOrEqual(4.0);
    });
  });

  it('handles location permission denied', async () => {
    navigator.geolocation.getCurrentPosition.mockImplementation((_, error) => {
      error({ code: 1, message: 'Permission denied' });
    });

    const { result } = renderHook(
      () => useMatchmaking({}),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Location permission required');
    });
  });
});
```

### 2.3 State Management Testing (Zustand)

```typescript
// tests/stores/userStore.test.ts
import { act } from '@testing-library/react';
import { useUserStore } from '@/stores/userStore';

describe('userStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      user: null,
      isAuthenticated: false,
      preferences: {},
    });
  });

  it('sets user on login', () => {
    const mockUser = { id: '1', name: 'Test User', duprRating: 4.5 };

    act(() => {
      useUserStore.getState().login(mockUser);
    });

    expect(useUserStore.getState().user).toEqual(mockUser);
    expect(useUserStore.getState().isAuthenticated).toBe(true);
  });

  it('clears state on logout', () => {
    useUserStore.setState({
      user: { id: '1', name: 'Test' },
      isAuthenticated: true
    });

    act(() => {
      useUserStore.getState().logout();
    });

    expect(useUserStore.getState().user).toBeNull();
    expect(useUserStore.getState().isAuthenticated).toBe(false);
  });

  it('updates user preferences', () => {
    act(() => {
      useUserStore.getState().updatePreferences({
        notificationsEnabled: true,
        defaultRadius: 25
      });
    });

    expect(useUserStore.getState().preferences).toEqual({
      notificationsEnabled: true,
      defaultRadius: 25,
    });
  });
});
```

### 2.4 Utility Function Testing

```typescript
// tests/utils/ratings.test.ts
import {
  calculateDuprChange,
  predictMatchOutcome,
  getSkillLevelLabel
} from '@/utils/ratings';

describe('Rating Calculations', () => {
  describe('calculateDuprChange', () => {
    it('calculates positive change for upset win', () => {
      const result = calculateDuprChange({
        winnerRating: 3.5,
        loserRating: 4.5,
        score: { winner: 11, loser: 5 },
      });

      expect(result.winnerChange).toBeGreaterThan(0.05);
      expect(result.loserChange).toBeLessThan(-0.05);
    });

    it('calculates minimal change for expected outcome', () => {
      const result = calculateDuprChange({
        winnerRating: 4.5,
        loserRating: 3.5,
        score: { winner: 11, loser: 9 },
      });

      expect(result.winnerChange).toBeLessThan(0.03);
      expect(Math.abs(result.loserChange)).toBeLessThan(0.03);
    });

    it('accounts for margin of victory', () => {
      const blowout = calculateDuprChange({
        winnerRating: 4.0,
        loserRating: 4.0,
        score: { winner: 11, loser: 0 },
      });

      const close = calculateDuprChange({
        winnerRating: 4.0,
        loserRating: 4.0,
        score: { winner: 11, loser: 9 },
      });

      expect(blowout.winnerChange).toBeGreaterThan(close.winnerChange);
    });

    it('handles doubles matches with team ratings', () => {
      const result = calculateDuprChange({
        winnerRating: 4.0, // Team average
        loserRating: 4.2,
        score: { winner: 11, loser: 7 },
        isDoubles: true,
      });

      expect(result.winnerChange).toBeDefined();
      expect(result.loserChange).toBeDefined();
    });
  });

  describe('predictMatchOutcome', () => {
    it('predicts higher rated player wins', () => {
      const prediction = predictMatchOutcome(4.5, 3.5);

      expect(prediction.higherRatedWinProbability).toBeGreaterThan(0.7);
    });

    it('returns 50/50 for equal ratings', () => {
      const prediction = predictMatchOutcome(4.0, 4.0);

      expect(prediction.higherRatedWinProbability).toBeCloseTo(0.5, 1);
    });
  });

  describe('getSkillLevelLabel', () => {
    it.each([
      [2.0, 'Beginner'],
      [3.0, 'Intermediate'],
      [4.0, 'Advanced'],
      [5.0, 'Expert'],
      [5.5, 'Pro'],
    ])('returns %s for rating %s', (rating, expected) => {
      expect(getSkillLevelLabel(rating)).toBe(expected);
    });
  });
});
```

### 2.5 Backend Service Testing

```typescript
// tests/services/matchmakingService.test.ts
import { MatchmakingService } from '@/services/MatchmakingService';
import { prismaMock } from '../mocks/prisma';

describe('MatchmakingService', () => {
  let service: MatchmakingService;

  beforeEach(() => {
    service = new MatchmakingService(prismaMock);
  });

  describe('findMatches', () => {
    it('returns matches within radius', async () => {
      prismaMock.match.findMany.mockResolvedValue([
        { id: '1', latitude: 40.71, longitude: -74.01, distance: 2.5 },
        { id: '2', latitude: 40.72, longitude: -74.02, distance: 5.0 },
      ]);

      const matches = await service.findMatches({
        latitude: 40.7128,
        longitude: -74.006,
        radiusMiles: 10,
      });

      expect(matches).toHaveLength(2);
      expect(matches[0].distance).toBeLessThan(10);
    });

    it('filters by skill range', async () => {
      const matches = await service.findMatches({
        latitude: 40.7128,
        longitude: -74.006,
        skillMin: 3.5,
        skillMax: 4.5,
      });

      expect(prismaMock.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            skillMin: { gte: 3.5 },
            skillMax: { lte: 4.5 },
          }),
        })
      );
    });

    it('excludes full matches by default', async () => {
      await service.findMatches({
        latitude: 40.7128,
        longitude: -74.006,
      });

      expect(prismaMock.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentPlayers: { lt: expect.any(Object) },
          }),
        })
      );
    });
  });

  describe('calculateMatchScore', () => {
    it('scores matches by multiple factors', () => {
      const score = service.calculateMatchScore({
        skillDifference: 0.2,
        distance: 5,
        scheduleOverlap: 0.8,
        historicalCompatibility: 0.9,
      });

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes large skill differences', () => {
      const goodMatch = service.calculateMatchScore({
        skillDifference: 0.2,
        distance: 5,
        scheduleOverlap: 0.8,
      });

      const badMatch = service.calculateMatchScore({
        skillDifference: 1.5,
        distance: 5,
        scheduleOverlap: 0.8,
      });

      expect(goodMatch).toBeGreaterThan(badMatch);
    });
  });
});
```

---

## 3. Integration Testing

### 3.1 API Endpoint Testing (Supertest)

```typescript
// tests/integration/api/matches.test.ts
import request from 'supertest';
import { createServer } from '@/server';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import { createTestUser, createAuthToken } from '../helpers/auth';

describe('Matches API', () => {
  let app;
  let authToken: string;
  let testUser;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createServer();
    testUser = await createTestUser();
    authToken = createAuthToken(testUser);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('GET /api/v1/matches', () => {
    it('returns matches near location', async () => {
      const response = await request(app)
        .get('/api/v1/matches')
        .query({ lat: 40.7128, lng: -74.006, radius: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
    });

    it('requires authentication', async () => {
      await request(app)
        .get('/api/v1/matches')
        .query({ lat: 40.7128, lng: -74.006 })
        .expect(401);
    });

    it('validates query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/matches')
        .query({ lat: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('latitude');
    });

    it('paginates results', async () => {
      const page1 = await request(app)
        .get('/api/v1/matches')
        .query({ lat: 40.7128, lng: -74.006, page: 1, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const page2 = await request(app)
        .get('/api/v1/matches')
        .query({ lat: 40.7128, lng: -74.006, page: 2, limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page1.body.data[0].id).not.toBe(page2.body.data[0]?.id);
    });
  });

  describe('POST /api/v1/matches', () => {
    it('creates a new match', async () => {
      const matchData = {
        courtId: 'court-123',
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        format: 'doubles',
        skillMin: 3.5,
        skillMax: 4.5,
        maxPlayers: 4,
      };

      const response = await request(app)
        .post('/api/v1/matches')
        .send(matchData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.data).toMatchObject({
        format: 'doubles',
        skillMin: 3.5,
        hostId: testUser.id,
      });
    });

    it('validates match data', async () => {
      const response = await request(app)
        .post('/api/v1/matches')
        .send({ format: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('prevents double booking', async () => {
      const matchData = {
        courtId: 'court-123',
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        format: 'singles',
      };

      await request(app)
        .post('/api/v1/matches')
        .send(matchData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      await request(app)
        .post('/api/v1/matches')
        .send(matchData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });
  });

  describe('POST /api/v1/matches/:id/join', () => {
    it('allows user to join open match', async () => {
      const match = await createTestMatch({ currentPlayers: 2, maxPlayers: 4 });

      await request(app)
        .post(`/api/v1/matches/${match.id}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('rejects join for full match', async () => {
      const match = await createTestMatch({ currentPlayers: 4, maxPlayers: 4 });

      await request(app)
        .post(`/api/v1/matches/${match.id}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
```

### 3.2 Database Integration Testing

```typescript
// tests/integration/database/tournaments.test.ts
import { PrismaClient } from '@prisma/client';
import { TournamentRepository } from '@/repositories/TournamentRepository';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';

describe('TournamentRepository', () => {
  let prisma: PrismaClient;
  let repository: TournamentRepository;

  beforeAll(async () => {
    prisma = await setupTestDatabase();
    repository = new TournamentRepository(prisma);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await prisma.tournament.deleteMany();
    await prisma.bracket.deleteMany();
  });

  describe('bracket generation', () => {
    it('generates single elimination bracket correctly', async () => {
      const tournament = await repository.create({
        name: 'Test Tournament',
        format: 'single_elimination',
        maxParticipants: 8,
      });

      // Register 8 players
      const players = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          repository.registerPlayer(tournament.id, `player-${i}`)
        )
      );

      const bracket = await repository.generateBracket(tournament.id);

      expect(bracket.rounds).toHaveLength(3); // 8 players = 3 rounds
      expect(bracket.rounds[0].matches).toHaveLength(4);
      expect(bracket.rounds[1].matches).toHaveLength(2);
      expect(bracket.rounds[2].matches).toHaveLength(1);
    });

    it('generates double elimination bracket correctly', async () => {
      const tournament = await repository.create({
        name: 'Double Elim Test',
        format: 'double_elimination',
        maxParticipants: 8,
      });

      await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          repository.registerPlayer(tournament.id, `player-${i}`)
        )
      );

      const bracket = await repository.generateBracket(tournament.id);

      expect(bracket.winnersBracket).toBeDefined();
      expect(bracket.losersBracket).toBeDefined();
      expect(bracket.grandFinal).toBeDefined();
    });

    it('generates round robin schedule correctly', async () => {
      const tournament = await repository.create({
        name: 'Round Robin Test',
        format: 'round_robin',
        maxParticipants: 6,
      });

      await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          repository.registerPlayer(tournament.id, `player-${i}`)
        )
      );

      const schedule = await repository.generateBracket(tournament.id);

      // Each player plays every other player once
      const totalMatches = (6 * 5) / 2; // 15 matches
      expect(schedule.matches).toHaveLength(totalMatches);
    });

    it('seeds players by DUPR rating', async () => {
      const tournament = await repository.create({
        name: 'Seeded Tournament',
        format: 'single_elimination',
        maxParticipants: 8,
        seedingMethod: 'dupr',
      });

      // Register players with different ratings
      const ratings = [5.0, 4.5, 4.2, 4.0, 3.8, 3.5, 3.2, 3.0];
      await Promise.all(
        ratings.map((rating, i) =>
          repository.registerPlayer(tournament.id, `player-${i}`, { duprRating: rating })
        )
      );

      const bracket = await repository.generateBracket(tournament.id);

      // Top seed should not play second seed in first round
      const firstRoundMatchups = bracket.rounds[0].matches.map(m =>
        [m.player1Seed, m.player2Seed]
      );

      expect(firstRoundMatchups).not.toContainEqual([1, 2]);
    });
  });

  describe('standings calculation', () => {
    it('calculates round robin standings correctly', async () => {
      const tournament = await repository.create({
        name: 'Standings Test',
        format: 'round_robin',
        maxParticipants: 4,
      });

      // Setup matches and results
      // Player A: 3-0, Player B: 2-1, Player C: 1-2, Player D: 0-3
      await setupRoundRobinResults(tournament.id);

      const standings = await repository.calculateStandings(tournament.id);

      expect(standings[0].playerId).toBe('player-a');
      expect(standings[0].wins).toBe(3);
      expect(standings[1].playerId).toBe('player-b');
      expect(standings[3].playerId).toBe('player-d');
    });

    it('applies tiebreaker rules correctly', async () => {
      const tournament = await repository.create({
        name: 'Tiebreaker Test',
        format: 'round_robin',
        tiebreakers: ['head_to_head', 'point_differential', 'points_scored'],
      });

      // Setup tied scenario
      await setupTiedResults(tournament.id);

      const standings = await repository.calculateStandings(tournament.id);

      // Verify tiebreaker was applied
      expect(standings[0].tiebreakReason).toBeDefined();
    });
  });
});
```

### 3.3 External Service Mocking (MSW)

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // DUPR API mock
  rest.get('https://api.dupr.gg/player/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        name: 'Test Player',
        singles: 4.25,
        doubles: 4.50,
        verified: true,
      })
    );
  }),

  // Weather API mock for outdoor courts
  rest.get('https://api.weather.gov/points/:coords', (req, res, ctx) => {
    return res(
      ctx.json({
        properties: {
          forecast: 'https://api.weather.gov/forecast/123',
        },
      })
    );
  }),

  // Stripe payment mock
  rest.post('https://api.stripe.com/v1/payment_intents', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        status: 'requires_payment_method',
      })
    );
  }),

  // Geolocation mock
  rest.get('https://maps.googleapis.com/maps/api/geocode/json', (req, res, ctx) => {
    return res(
      ctx.json({
        results: [{
          formatted_address: '123 Court St, New York, NY',
          geometry: {
            location: { lat: 40.7128, lng: -74.006 },
          },
        }],
        status: 'OK',
      })
    );
  }),
];
```

### 3.4 Authentication Flow Testing

```typescript
// tests/integration/auth/authentication.test.ts
import request from 'supertest';
import { createServer } from '@/server';
import { setupTestDatabase } from '../helpers/database';

describe('Authentication Flows', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();
    app = await createServer();
  });

  describe('Registration', () => {
    it('registers new user with email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('rejects weak passwords', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test',
        })
        .expect(400);
    });

    it('prevents duplicate email registration', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          name: 'First User',
        })
        .expect(201);

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          name: 'Second User',
        })
        .expect(409);
    });
  });

  describe('Login', () => {
    beforeAll(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!',
          name: 'Login User',
        });
    });

    it('logs in with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('rejects invalid password', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('implements rate limiting', async () => {
      // Attempt 10 failed logins
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'login@example.com',
            password: 'WrongPassword',
          });
      }

      // 11th attempt should be rate limited
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!',
        })
        .expect(429);
    });
  });

  describe('Token Refresh', () => {
    it('refreshes expired access token', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'SecurePass123!',
        });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });
  });
});
```

---

## 4. End-to-End Testing (Playwright)

### 4.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4.2 Critical User Flows

```typescript
// tests/e2e/flows/registration-login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Registration and Login Flow', () => {
  test('complete registration process', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');

    // Select skill level
    await page.click('[data-testid="skill-selector"]');
    await page.click('[data-testid="skill-intermediate"]');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to onboarding or dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/);
  });

  test('login with existing account', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('displays error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'WrongPass');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      /invalid credentials/i
    );
  });
});
```

```typescript
// tests/e2e/flows/find-game.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../helpers/auth';

test.describe('Find a Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'player@example.com');
  });

  test('searches for nearby games', async ({ page }) => {
    await page.goto('/find-game');

    // Mock geolocation
    await page.context().setGeolocation({ latitude: 40.7128, longitude: -74.006 });
    await page.context().grantPermissions(['geolocation']);

    // Wait for games to load
    await expect(page.locator('[data-testid="game-card"]').first()).toBeVisible();

    // Verify game cards display required info
    const firstGame = page.locator('[data-testid="game-card"]').first();
    await expect(firstGame.locator('[data-testid="game-location"]')).toBeVisible();
    await expect(firstGame.locator('[data-testid="game-skill-level"]')).toBeVisible();
    await expect(firstGame.locator('[data-testid="game-time"]')).toBeVisible();
  });

  test('filters games by skill level', async ({ page }) => {
    await page.goto('/find-game');

    // Set skill filter
    await page.click('[data-testid="skill-filter"]');
    await page.fill('[data-testid="skill-min"]', '3.5');
    await page.fill('[data-testid="skill-max"]', '4.5');
    await page.click('[data-testid="apply-filter"]');

    // Verify all displayed games are within skill range
    const skillBadges = await page.locator('[data-testid="game-skill-level"]').all();
    for (const badge of skillBadges) {
      const text = await badge.textContent();
      const [min, max] = text.split('-').map(parseFloat);
      expect(min).toBeGreaterThanOrEqual(3.5);
      expect(max).toBeLessThanOrEqual(4.5);
    }
  });

  test('joins an open game', async ({ page }) => {
    await page.goto('/find-game');

    // Find an open game
    const openGame = page.locator('[data-testid="game-card"]:has([data-testid="spots-available"])').first();
    await openGame.locator('[data-testid="join-button"]').click();

    // Confirm join dialog
    await page.click('[data-testid="confirm-join"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText(/joined/i);
  });
});
```

```typescript
// tests/e2e/flows/log-game.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../helpers/auth';

test.describe('Log Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'player@example.com');
  });

  test('logs a doubles match', async ({ page }) => {
    await page.goto('/log-game');

    // Select format
    await page.click('[data-testid="format-doubles"]');

    // Add partners and opponents
    await page.fill('[data-testid="partner-search"]', 'Partner');
    await page.click('[data-testid="player-suggestion"]');

    await page.fill('[data-testid="opponent1-search"]', 'Opponent1');
    await page.click('[data-testid="player-suggestion"]');

    await page.fill('[data-testid="opponent2-search"]', 'Opponent2');
    await page.click('[data-testid="player-suggestion"]');

    // Enter scores
    await page.fill('[data-testid="team1-score-game1"]', '11');
    await page.fill('[data-testid="team2-score-game1"]', '8');
    await page.fill('[data-testid="team1-score-game2"]', '11');
    await page.fill('[data-testid="team2-score-game2"]', '6');

    // Select court
    await page.click('[data-testid="court-selector"]');
    await page.click('[data-testid="court-option"]');

    // Submit
    await page.click('[data-testid="submit-game"]');

    // Verify success
    await expect(page).toHaveURL('/games');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('validates score entries', async ({ page }) => {
    await page.goto('/log-game');

    await page.click('[data-testid="format-singles"]');

    // Enter invalid score (negative)
    await page.fill('[data-testid="team1-score-game1"]', '-1');
    await page.click('[data-testid="submit-game"]');

    await expect(page.locator('[data-testid="score-error"]')).toBeVisible();
  });
});
```

```typescript
// tests/e2e/flows/tournament.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsDirector } from '../helpers/auth';

test.describe('Tournament Flow', () => {
  test.describe('Player Experience', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, 'player@example.com');
    });

    test('discovers and registers for tournament', async ({ page }) => {
      await page.goto('/tournaments');

      // Browse tournaments
      await expect(page.locator('[data-testid="tournament-card"]').first()).toBeVisible();

      // Filter by location
      await page.fill('[data-testid="location-filter"]', 'New York');
      await page.press('[data-testid="location-filter"]', 'Enter');

      // Click on tournament
      await page.locator('[data-testid="tournament-card"]').first().click();

      // Verify tournament details page
      await expect(page.locator('[data-testid="tournament-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="tournament-format"]')).toBeVisible();
      await expect(page.locator('[data-testid="tournament-divisions"]')).toBeVisible();

      // Register
      await page.click('[data-testid="register-button"]');
      await page.click('[data-testid="division-select"]');
      await page.click('[data-testid="division-4.0"]');
      await page.click('[data-testid="confirm-registration"]');

      await expect(page.locator('[data-testid="registration-confirmed"]')).toBeVisible();
    });

    test('views bracket and match schedule', async ({ page }) => {
      await page.goto('/tournaments/active-tournament/bracket');

      // Verify bracket is rendered
      await expect(page.locator('[data-testid="bracket-round"]').first()).toBeVisible();

      // Find player's match
      await expect(page.locator('[data-testid="my-match"]')).toBeVisible();

      // View match details
      await page.locator('[data-testid="my-match"]').click();
      await expect(page.locator('[data-testid="match-details"]')).toBeVisible();
    });
  });

  test.describe('Tournament Director', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsDirector(page);
    });

    test('creates new tournament', async ({ page }) => {
      await page.goto('/director/tournaments/new');

      // Fill tournament details
      await page.fill('[name="name"]', 'Test Championship');
      await page.fill('[name="description"]', 'Annual test event');

      // Set dates
      await page.fill('[name="startDate"]', '2024-06-15');
      await page.fill('[name="endDate"]', '2024-06-16');

      // Select format
      await page.click('[data-testid="format-selector"]');
      await page.click('[data-testid="format-double-elimination"]');

      // Add divisions
      await page.click('[data-testid="add-division"]');
      await page.fill('[data-testid="division-name"]', '4.0 Doubles');
      await page.fill('[data-testid="division-fee"]', '50');

      // Set venue
      await page.fill('[data-testid="venue-search"]', 'Tennis Club');
      await page.click('[data-testid="venue-suggestion"]');

      // Publish
      await page.click('[data-testid="publish-tournament"]');

      await expect(page).toHaveURL(/\/director\/tournaments\/[a-z0-9-]+/);
    });

    test('manages bracket and enters scores', async ({ page }) => {
      await page.goto('/director/tournaments/test-tournament/bracket');

      // Enter match result
      await page.locator('[data-testid="match-slot"]').first().click();
      await page.fill('[data-testid="score-team1"]', '11-8, 11-6');
      await page.click('[data-testid="submit-result"]');

      // Verify bracket updated
      await expect(page.locator('[data-testid="winner-advanced"]')).toBeVisible();
    });
  });
});
```

```typescript
// tests/e2e/flows/league.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../helpers/auth';

test.describe('League Flow', () => {
  test('joins a league', async ({ page }) => {
    await loginAsUser(page, 'player@example.com');
    await page.goto('/leagues');

    // Find open league
    await page.locator('[data-testid="league-card"]:has-text("Open")').first().click();

    // View league details
    await expect(page.locator('[data-testid="league-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="league-standings"]')).toBeVisible();

    // Join league
    await page.click('[data-testid="join-league"]');
    await page.click('[data-testid="confirm-join"]');

    await expect(page.locator('[data-testid="joined-badge"]')).toBeVisible();
  });

  test('views standings and schedule', async ({ page }) => {
    await loginAsUser(page, 'league-member@example.com');
    await page.goto('/leagues/my-league');

    // Check standings
    const standings = page.locator('[data-testid="standings-table"]');
    await expect(standings).toBeVisible();

    // Verify user appears in standings
    await expect(standings.locator('text=league-member')).toBeVisible();

    // Check upcoming matches
    await page.click('[data-testid="schedule-tab"]');
    await expect(page.locator('[data-testid="upcoming-match"]').first()).toBeVisible();
  });
});
```

```typescript
// tests/e2e/flows/club-management.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsClubAdmin } from '../helpers/auth';

test.describe('Club Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClubAdmin(page);
  });

  test('manages club members', async ({ page }) => {
    await page.goto('/club/members');

    // Invite new member
    await page.click('[data-testid="invite-member"]');
    await page.fill('[data-testid="invite-email"]', 'newmember@example.com');
    await page.click('[data-testid="send-invite"]');

    await expect(page.locator('[data-testid="invite-sent"]')).toBeVisible();

    // Update member role
    await page.locator('[data-testid="member-row"]').first().click();
    await page.click('[data-testid="role-selector"]');
    await page.click('[data-testid="role-moderator"]');
    await page.click('[data-testid="save-changes"]');

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('schedules club event', async ({ page }) => {
    await page.goto('/club/events/new');

    await page.fill('[name="eventName"]', 'Weekly Open Play');
    await page.fill('[name="date"]', '2024-06-20');
    await page.fill('[name="startTime"]', '18:00');
    await page.fill('[name="endTime"]', '21:00');
    await page.fill('[name="maxParticipants"]', '24');

    await page.click('[data-testid="create-event"]');

    await expect(page).toHaveURL(/\/club\/events\/[a-z0-9-]+/);
  });
});
```

### 4.3 Mobile Viewport Testing

```typescript
// tests/e2e/mobile/responsive.spec.ts
import { test, expect, devices } from '@playwright/test';

const mobileViewports = [
  devices['iPhone 12'],
  devices['iPhone SE'],
  devices['Pixel 5'],
  devices['Galaxy S9+'],
];

for (const device of mobileViewports) {
  test.describe(`Mobile - ${device.name}`, () => {
    test.use({ ...device });

    test('navigation menu works on mobile', async ({ page }) => {
      await page.goto('/');

      // Hamburger menu should be visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

      // Desktop nav should be hidden
      await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();

      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    });

    test('find game works on mobile', async ({ page }) => {
      await page.goto('/find-game');

      // Map should be visible
      await expect(page.locator('[data-testid="games-map"]')).toBeVisible();

      // Toggle to list view
      await page.click('[data-testid="list-view-toggle"]');
      await expect(page.locator('[data-testid="games-list"]')).toBeVisible();

      // Game cards should be properly sized
      const gameCard = page.locator('[data-testid="game-card"]').first();
      const box = await gameCard.boundingBox();
      expect(box.width).toBeLessThanOrEqual(device.viewport.width);
    });

    test('forms are usable on mobile', async ({ page }) => {
      await page.goto('/login');

      // Fill form on mobile
      await page.fill('[name="email"]', 'test@example.com');
      await page.fill('[name="password"]', 'password');

      // Submit button should be reachable
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeInViewport();
    });
  });
}
```

---

## 5. Specialized Testing

### 5.1 Offline Mode Testing

```typescript
// tests/e2e/offline/offline-functionality.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsUser } from '../helpers/auth';

test.describe('Offline Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'player@example.com');
  });

  test('displays cached data when offline', async ({ page, context }) => {
    await page.goto('/dashboard');

    // Wait for data to cache
    await page.waitForSelector('[data-testid="cached-indicator"]');

    // Go offline
    await context.setOffline(true);

    // Refresh page
    await page.reload();

    // Should show cached dashboard
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
  });

  test('queues game logs while offline', async ({ page, context }) => {
    await page.goto('/log-game');

    // Go offline
    await context.setOffline(true);

    // Log a game
    await page.click('[data-testid="format-singles"]');
    await page.fill('[data-testid="opponent-search"]', 'Offline Opponent');
    await page.fill('[data-testid="team1-score"]', '11');
    await page.fill('[data-testid="team2-score"]', '8');
    await page.click('[data-testid="submit-game"]');

    // Should show pending status
    await expect(page.locator('[data-testid="pending-sync"]')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible({ timeout: 10000 });
  });

  test('shows offline court data from cache', async ({ page, context }) => {
    await page.goto('/courts');

    // Cache courts
    await page.waitForSelector('[data-testid="court-card"]');

    // Go offline
    await context.setOffline(true);

    // Navigate to specific court
    await page.locator('[data-testid="court-card"]').first().click();

    // Court details should be available
    await expect(page.locator('[data-testid="court-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="court-amenities"]')).toBeVisible();
  });

  test('syncs pending changes on reconnection', async ({ page, context }) => {
    // Create pending changes while offline
    await context.setOffline(true);
    await page.goto('/profile');

    await page.fill('[name="bio"]', 'Updated bio while offline');
    await page.click('[data-testid="save-profile"]');

    await expect(page.locator('[data-testid="pending-changes"]')).toBeVisible();

    // Reconnect
    await context.setOffline(false);

    // Wait for sync
    await page.waitForSelector('[data-testid="sync-complete"]');

    // Verify changes persisted
    await page.reload();
    await expect(page.locator('[name="bio"]')).toHaveValue('Updated bio while offline');
  });
});
```

### 5.2 Real-time Feature Testing

```typescript
// tests/e2e/realtime/live-updates.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Real-time Features', () => {
  test('receives live score updates', async ({ browser }) => {
    // Create two browser contexts (two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both users view same match
    await page1.goto('/matches/live-match-123');
    await page2.goto('/matches/live-match-123');

    // User 1 is scorer, updates score
    await page1.click('[data-testid="add-point-team1"]');

    // User 2 should see update without refresh
    await expect(page2.locator('[data-testid="team1-score"]')).toHaveText('1', {
      timeout: 5000,
    });

    await context1.close();
    await context2.close();
  });

  test('shows player joining game in real-time', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const joinContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const joinPage = await joinContext.newPage();

    // Host views their game
    await hostPage.goto('/games/open-game-123');
    const initialCount = await hostPage.locator('[data-testid="player-count"]').textContent();

    // Another player joins
    await joinPage.goto('/games/open-game-123');
    await joinPage.click('[data-testid="join-button"]');

    // Host sees player count update
    await expect(hostPage.locator('[data-testid="player-count"]')).not.toHaveText(initialCount, {
      timeout: 5000,
    });

    await hostContext.close();
    await joinContext.close();
  });

  test('tournament bracket updates live', async ({ browser }) => {
    const spectatorContext = await browser.newContext();
    const directorContext = await browser.newContext();

    const spectatorPage = await spectatorContext.newPage();
    const directorPage = await directorContext.newPage();

    // Spectator viewing bracket
    await spectatorPage.goto('/tournaments/test/bracket');

    // Director enters result
    await directorPage.goto('/director/tournaments/test/bracket');
    await directorPage.locator('[data-testid="match-slot"]').first().click();
    await directorPage.fill('[data-testid="winner-score"]', '11-5, 11-7');
    await directorPage.click('[data-testid="submit-result"]');

    // Spectator sees bracket update
    await expect(spectatorPage.locator('[data-testid="match-result"]').first()).toContainText(
      '11-5',
      { timeout: 5000 }
    );

    await spectatorContext.close();
    await directorContext.close();
  });
});
```

### 5.3 Geolocation Testing

```typescript
// tests/e2e/geolocation/location-features.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Geolocation Features', () => {
  test('requests location permission', async ({ page, context }) => {
    // Start without granting permission
    await page.goto('/find-game');

    // Should show permission prompt UI
    await expect(page.locator('[data-testid="location-permission-prompt"]')).toBeVisible();

    // Grant permission
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });

    await page.click('[data-testid="enable-location"]');

    // Should now show nearby games
    await expect(page.locator('[data-testid="nearby-games"]')).toBeVisible();
  });

  test('calculates distance to courts correctly', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });

    await page.goto('/courts');

    // Verify distance is displayed
    const distanceElement = page.locator('[data-testid="court-distance"]').first();
    await expect(distanceElement).toBeVisible();

    // Distance should be a valid number
    const distanceText = await distanceElement.textContent();
    expect(parseFloat(distanceText)).toBeGreaterThan(0);
  });

  test('handles location permission denied', async ({ page }) => {
    await page.goto('/find-game');

    // Should show manual location entry
    await expect(page.locator('[data-testid="manual-location-entry"]')).toBeVisible();

    // Enter location manually
    await page.fill('[data-testid="location-input"]', 'New York, NY');
    await page.click('[data-testid="search-location"]');

    // Should show games near searched location
    await expect(page.locator('[data-testid="games-list"]')).toBeVisible();
  });

  test('updates location when user moves', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });

    await page.goto('/find-game');
    await page.waitForSelector('[data-testid="game-card"]');

    // Change location
    await context.setGeolocation({ latitude: 40.7580, longitude: -73.9855 });

    // Trigger location update
    await page.click('[data-testid="refresh-location"]');

    // Games should update based on new location
    await expect(page.locator('[data-testid="location-updated"]')).toBeVisible();
  });
});
```

### 5.4 Push Notification Testing

```typescript
// tests/e2e/notifications/push-notifications.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Push Notifications', () => {
  test('requests notification permission', async ({ page, context }) => {
    await page.goto('/settings/notifications');

    // Should show enable button
    await expect(page.locator('[data-testid="enable-notifications"]')).toBeVisible();

    // Grant permission
    await context.grantPermissions(['notifications']);
    await page.click('[data-testid="enable-notifications"]');

    // Should show enabled state
    await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();
  });

  test('allows configuring notification preferences', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('/settings/notifications');

    // Toggle specific notification types
    await page.click('[data-testid="toggle-match-reminders"]');
    await page.click('[data-testid="toggle-league-updates"]');

    await page.click('[data-testid="save-preferences"]');

    // Verify saved
    await page.reload();
    await expect(page.locator('[data-testid="toggle-match-reminders"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="toggle-league-updates"]')).not.toBeChecked();
  });
});
```

### 5.5 PWA Installation Testing

```typescript
// tests/e2e/pwa/installation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PWA Installation', () => {
  test('shows install prompt', async ({ page }) => {
    await page.goto('/');

    // PWA install prompt should appear for eligible users
    const installBanner = page.locator('[data-testid="pwa-install-banner"]');

    // May or may not be visible depending on browser state
    if (await installBanner.isVisible()) {
      await expect(installBanner).toContainText(/install/i);
    }
  });

  test('service worker registers correctly', async ({ page }) => {
    await page.goto('/');

    // Check service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      }
      return false;
    });

    expect(swRegistered).toBe(true);
  });

  test('caches critical assets', async ({ page }) => {
    await page.goto('/');

    // Check cache storage
    const cachedAssets = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const cache = await caches.open(cacheNames[0]);
      const keys = await cache.keys();
      return keys.map(k => k.url);
    });

    // Should cache critical assets
    expect(cachedAssets.some(url => url.includes('main'))).toBe(true);
  });

  test('app shell loads from cache', async ({ page, context }) => {
    // Load page to populate cache
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Navigate should still work from cache
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });
});
```

---

## 6. Performance Testing

### 6.1 Load Testing (k6)

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const matchmakingDuration = new Trend('matchmaking_duration');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.01'],              // Error rate under 1%
    matchmaking_duration: ['p(95)<2000'], // Matchmaking under 2s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  // Login and get auth token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, {
    email: 'loadtest@example.com',
    password: 'LoadTest123!',
  });
  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  // Simulate user browsing matches
  const matchesRes = http.get(
    `${BASE_URL}/api/v1/matches?lat=40.7128&lng=-74.006&radius=10`,
    { headers }
  );

  check(matchesRes, {
    'matches status is 200': (r) => r.status === 200,
    'matches response time OK': (r) => r.timings.duration < 500,
  });

  errorRate.add(matchesRes.status !== 200);
  sleep(1);

  // Simulate matchmaking request
  const startTime = Date.now();
  const matchmakingRes = http.post(
    `${BASE_URL}/api/v1/matchmaking/find`,
    JSON.stringify({
      skillMin: 3.5,
      skillMax: 4.5,
      latitude: 40.7128,
      longitude: -74.006,
    }),
    { headers, headers: { 'Content-Type': 'application/json' } }
  );

  matchmakingDuration.add(Date.now() - startTime);

  check(matchmakingRes, {
    'matchmaking status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // Simulate viewing tournament bracket
  const bracketRes = http.get(
    `${BASE_URL}/api/v1/tournaments/test-tournament/bracket`,
    { headers }
  );

  check(bracketRes, {
    'bracket status is 200': (r) => r.status === 200,
    'bracket loads fast': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
```

### 6.2 Stress Testing

```javascript
// tests/performance/stress-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 500 },   // Ramp up
    { duration: '5m', target: 500 },   // Stay at peak
    { duration: '2m', target: 1000 },  // Push beyond normal
    { duration: '5m', target: 1000 },  // Stay at stress level
    { duration: '5m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],  // Even at stress, 99% under 2s
    http_req_failed: ['rate<0.05'],     // Allow up to 5% failure at stress
  },
};

export default function () {
  // Stress the most resource-intensive endpoints

  // Matchmaking search
  const res1 = http.get('http://localhost:3000/api/v1/matches?lat=40.7128&lng=-74.006');
  check(res1, { 'matches OK': (r) => r.status === 200 || r.status === 429 });

  // Tournament bracket generation
  const res2 = http.get('http://localhost:3000/api/v1/tournaments/stress-test/bracket');
  check(res2, { 'bracket OK': (r) => r.status === 200 || r.status === 429 });

  // Real-time connection simulation
  const res3 = http.get('http://localhost:3000/api/v1/games/live/stress-game');
  check(res3, { 'live OK': (r) => r.status === 200 || r.status === 429 });
}
```

### 6.3 API Response Time Targets

| Endpoint Category | Target (p95) | Critical Threshold |
|-------------------|--------------|-------------------|
| Authentication | <200ms | <500ms |
| Match Search | <300ms | <1000ms |
| Matchmaking | <500ms | <2000ms |
| Game Logging | <200ms | <500ms |
| Tournament Bracket | <300ms | <1000ms |
| Standings Calculation | <500ms | <2000ms |
| User Profile | <150ms | <300ms |
| Court Search | <250ms | <500ms |

### 6.4 Frontend Performance Budgets

```typescript
// tests/performance/lighthouse.spec.ts
import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Lighthouse Performance', () => {
  test('homepage meets performance budget', async ({ page }) => {
    await page.goto('/');

    const results = await playAudit({
      page,
      thresholds: {
        performance: 90,
        accessibility: 95,
        'best-practices': 90,
        seo: 90,
        pwa: 80,
      },
      port: 9222,
    });

    expect(results.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(90);
  });

  test('find-game page performance', async ({ page }) => {
    await page.goto('/find-game');

    const results = await playAudit({
      page,
      thresholds: {
        performance: 85,
        accessibility: 95,
      },
      port: 9222,
    });

    // With map rendering, slightly lower threshold
    expect(results.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(85);
  });
});
```

### 6.5 Lighthouse Score Targets

| Page | Performance | Accessibility | Best Practices | SEO | PWA |
|------|-------------|---------------|----------------|-----|-----|
| Homepage | 90+ | 95+ | 90+ | 90+ | 80+ |
| Dashboard | 85+ | 95+ | 90+ | 85+ | 80+ |
| Find Game | 85+ | 95+ | 90+ | 85+ | 80+ |
| Tournament | 85+ | 95+ | 90+ | 90+ | 80+ |
| Profile | 90+ | 95+ | 90+ | 85+ | 80+ |

### 6.6 Core Web Vitals Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| LCP (Largest Contentful Paint) | <2.5s | <4.0s |
| FID (First Input Delay) | <100ms | <300ms |
| CLS (Cumulative Layout Shift) | <0.1 | <0.25 |
| INP (Interaction to Next Paint) | <200ms | <500ms |
| TTFB (Time to First Byte) | <200ms | <600ms |

---

## 7. Data Testing

### 7.1 Rating Calculation Accuracy

```typescript
// tests/data/rating-calculations.test.ts
import { RatingCalculator } from '@/services/RatingCalculator';
import { knownMatchOutcomes } from '../fixtures/rating-test-data';

describe('Rating Calculation Accuracy', () => {
  let calculator: RatingCalculator;

  beforeEach(() => {
    calculator = new RatingCalculator();
  });

  describe('DUPR Algorithm Compliance', () => {
    it.each(knownMatchOutcomes)(
      'calculates correct rating change for match %#',
      ({ player1Rating, player2Rating, winner, score, expectedChange }) => {
        const result = calculator.calculateChange({
          player1Rating,
          player2Rating,
          winner,
          score,
        });

        expect(result.player1Change).toBeCloseTo(expectedChange.player1, 2);
        expect(result.player2Change).toBeCloseTo(expectedChange.player2, 2);
      }
    );

    it('respects 0.1 DUPR = ~1.2 points relationship', () => {
      const matchups = [
        { diff: 0.1, expectedPointAdvantage: 1.2 },
        { diff: 0.5, expectedPointAdvantage: 6.0 },
        { diff: 1.0, expectedPointAdvantage: 12.0 },
      ];

      matchups.forEach(({ diff, expectedPointAdvantage }) => {
        const advantage = calculator.calculateExpectedPointAdvantage(diff);
        expect(advantage).toBeCloseTo(expectedPointAdvantage, 1);
      });
    });

    it('weights reliability correctly', () => {
      const provisionalResult = calculator.calculateChange({
        player1Rating: 4.0,
        player1GamesPlayed: 5, // Provisional
        player2Rating: 4.0,
        player2GamesPlayed: 100, // Established
        winner: 1,
        score: { winner: 11, loser: 5 },
      });

      const establishedResult = calculator.calculateChange({
        player1Rating: 4.0,
        player1GamesPlayed: 100,
        player2Rating: 4.0,
        player2GamesPlayed: 100,
        winner: 1,
        score: { winner: 11, loser: 5 },
      });

      // Provisional player should see larger swing
      expect(Math.abs(provisionalResult.player1Change)).toBeGreaterThan(
        Math.abs(establishedResult.player1Change)
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles perfect game (11-0)', () => {
      const result = calculator.calculateChange({
        player1Rating: 4.0,
        player2Rating: 4.0,
        winner: 1,
        score: { winner: 11, loser: 0 },
      });

      expect(result.player1Change).toBeGreaterThan(0);
      expect(result.player2Change).toBeLessThan(0);
    });

    it('handles extreme rating mismatch', () => {
      const result = calculator.calculateChange({
        player1Rating: 2.5,
        player2Rating: 5.5,
        winner: 1, // Massive upset
        score: { winner: 11, loser: 9 },
      });

      // Winner should gain significant points
      expect(result.player1Change).toBeGreaterThan(0.1);
    });

    it('handles rating floor (2.0)', () => {
      const result = calculator.calculateChange({
        player1Rating: 2.0,
        player2Rating: 3.0,
        winner: 2,
        score: { winner: 11, loser: 0 },
      });

      // Should not go below 2.0
      expect(result.player1NewRating).toBeGreaterThanOrEqual(2.0);
    });
  });
});
```

### 7.2 Bracket Generation Correctness

```typescript
// tests/data/bracket-generation.test.ts
import { BracketGenerator } from '@/services/BracketGenerator';

describe('Bracket Generation Correctness', () => {
  let generator: BracketGenerator;

  beforeEach(() => {
    generator = new BracketGenerator();
  });

  describe('Single Elimination', () => {
    it.each([4, 8, 16, 32, 64])(
      'generates correct bracket for %i players',
      (playerCount) => {
        const players = Array.from({ length: playerCount }, (_, i) => ({
          id: `player-${i}`,
          seed: i + 1,
        }));

        const bracket = generator.generateSingleElimination(players);

        // Correct number of rounds
        const expectedRounds = Math.log2(playerCount);
        expect(bracket.rounds).toHaveLength(expectedRounds);

        // Correct number of matches per round
        let matchesInRound = playerCount / 2;
        bracket.rounds.forEach((round) => {
          expect(round.matches).toHaveLength(matchesInRound);
          matchesInRound /= 2;
        });
      }
    );

    it('seeds correctly to avoid early top seed matchups', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({
        id: `player-${i}`,
        seed: i + 1,
        rating: 5.0 - i * 0.2,
      }));

      const bracket = generator.generateSingleElimination(players);

      // First round: 1v8, 4v5, 2v7, 3v6
      const firstRoundMatchups = bracket.rounds[0].matches.map((m) => [
        m.player1.seed,
        m.player2.seed,
      ]);

      expect(firstRoundMatchups).toContainEqual([1, 8]);
      expect(firstRoundMatchups).toContainEqual([2, 7]);
      expect(firstRoundMatchups).not.toContainEqual([1, 2]);
    });

    it('handles bye placement for non-power-of-2 counts', () => {
      const players = Array.from({ length: 6 }, (_, i) => ({
        id: `player-${i}`,
        seed: i + 1,
      }));

      const bracket = generator.generateSingleElimination(players);

      // Top 2 seeds should get byes
      const firstRoundPlayers = bracket.rounds[0].matches.flatMap((m) => [
        m.player1?.seed,
        m.player2?.seed,
      ]);

      expect(firstRoundPlayers).not.toContain(1);
      expect(firstRoundPlayers).not.toContain(2);
    });
  });

  describe('Double Elimination', () => {
    it('generates winners and losers brackets', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({
        id: `player-${i}`,
        seed: i + 1,
      }));

      const bracket = generator.generateDoubleElimination(players);

      expect(bracket.winnersBracket).toBeDefined();
      expect(bracket.losersBracket).toBeDefined();
      expect(bracket.grandFinal).toBeDefined();
    });

    it('losers bracket feeds correctly from winners', () => {
      const players = Array.from({ length: 8 }, (_, i) => ({
        id: `player-${i}`,
        seed: i + 1,
      }));

      const bracket = generator.generateDoubleElimination(players);

      // Losers bracket first round should receive losers from winners round 1
      expect(bracket.losersBracket.rounds[0].feedsFrom).toBe('winners-round-1');
    });
  });

  describe('Round Robin', () => {
    it('generates complete schedule where everyone plays everyone', () => {
      const players = Array.from({ length: 6 }, (_, i) => ({
        id: `player-${i}`,
      }));

      const schedule = generator.generateRoundRobin(players);

      // Each player should have 5 matches (n-1)
      const matchesPerPlayer = new Map();
      schedule.matches.forEach((match) => {
        [match.player1Id, match.player2Id].forEach((id) => {
          matchesPerPlayer.set(id, (matchesPerPlayer.get(id) || 0) + 1);
        });
      });

      matchesPerPlayer.forEach((count) => {
        expect(count).toBe(5);
      });
    });

    it('balances court assignments', () => {
      const players = Array.from({ length: 6 }, (_, i) => ({
        id: `player-${i}`,
      }));
      const courts = ['Court 1', 'Court 2', 'Court 3'];

      const schedule = generator.generateRoundRobin(players, { courts });

      // Count matches per court
      const matchesPerCourt = new Map();
      schedule.matches.forEach((match) => {
        matchesPerCourt.set(
          match.court,
          (matchesPerCourt.get(match.court) || 0) + 1
        );
      });

      // Should be roughly equal
      const counts = Array.from(matchesPerCourt.values());
      const maxDiff = Math.max(...counts) - Math.min(...counts);
      expect(maxDiff).toBeLessThanOrEqual(1);
    });
  });
});
```

### 7.3 Standings Calculation

```typescript
// tests/data/standings-calculation.test.ts
import { StandingsCalculator } from '@/services/StandingsCalculator';

describe('Standings Calculation', () => {
  let calculator: StandingsCalculator;

  beforeEach(() => {
    calculator = new StandingsCalculator();
  });

  describe('League Standings', () => {
    it('ranks by wins first', () => {
      const results = [
        { playerId: 'A', wins: 5, losses: 0 },
        { playerId: 'B', wins: 3, losses: 2 },
        { playerId: 'C', wins: 2, losses: 3 },
      ];

      const standings = calculator.calculate(results);

      expect(standings[0].playerId).toBe('A');
      expect(standings[1].playerId).toBe('B');
      expect(standings[2].playerId).toBe('C');
    });

    it('applies head-to-head tiebreaker', () => {
      const results = [
        { playerId: 'A', wins: 3, losses: 2, headToHead: { B: 'win' } },
        { playerId: 'B', wins: 3, losses: 2, headToHead: { A: 'loss' } },
      ];

      const standings = calculator.calculate(results, {
        tiebreakers: ['head_to_head'],
      });

      expect(standings[0].playerId).toBe('A');
      expect(standings[0].tiebreakReason).toBe('head_to_head');
    });

    it('applies point differential tiebreaker', () => {
      const results = [
        { playerId: 'A', wins: 3, losses: 2, pointsFor: 55, pointsAgainst: 45 },
        { playerId: 'B', wins: 3, losses: 2, pointsFor: 50, pointsAgainst: 48 },
      ];

      const standings = calculator.calculate(results, {
        tiebreakers: ['point_differential'],
      });

      expect(standings[0].playerId).toBe('A'); // +10 vs +2
    });

    it('handles three-way ties correctly', () => {
      const results = [
        {
          playerId: 'A',
          wins: 3,
          losses: 2,
          headToHead: { B: 'win', C: 'loss' },
        },
        {
          playerId: 'B',
          wins: 3,
          losses: 2,
          headToHead: { A: 'loss', C: 'win' },
        },
        {
          playerId: 'C',
          wins: 3,
          losses: 2,
          headToHead: { A: 'win', B: 'loss' },
        },
      ];

      const standings = calculator.calculate(results, {
        tiebreakers: ['head_to_head', 'point_differential'],
      });

      // Three-way tie, head-to-head inconclusive, should use point diff
      expect(standings.every((s) => s.tiebreakReason !== 'head_to_head')).toBe(true);
    });
  });

  describe('Tournament Pool Play', () => {
    it('calculates pool standings correctly', () => {
      const poolResults = [
        { playerId: 'A', wins: 2, losses: 0, gamesWon: 4, gamesLost: 1 },
        { playerId: 'B', wins: 1, losses: 1, gamesWon: 2, gamesLost: 2 },
        { playerId: 'C', wins: 0, losses: 2, gamesWon: 1, gamesLost: 4 },
      ];

      const standings = calculator.calculatePoolStandings(poolResults);

      expect(standings[0].playerId).toBe('A');
      expect(standings[0].qualifies).toBe(true);
    });
  });
});
```

### 7.4 Schedule Generation

```typescript
// tests/data/schedule-generation.test.ts
import { ScheduleGenerator } from '@/services/ScheduleGenerator';

describe('Schedule Generation', () => {
  let generator: ScheduleGenerator;

  beforeEach(() => {
    generator = new ScheduleGenerator();
  });

  describe('Round Robin Scheduling', () => {
    it('generates valid schedule with no conflicts', () => {
      const participants = Array.from({ length: 8 }, (_, i) => `player-${i}`);
      const courts = ['Court 1', 'Court 2'];
      const timeSlots = ['9:00', '10:00', '11:00', '12:00'];

      const schedule = generator.generateRoundRobin({
        participants,
        courts,
        timeSlots,
      });

      // Check for player conflicts (same player at same time)
      const slotAssignments = new Map();
      schedule.matches.forEach((match) => {
        const key = `${match.time}-${match.player1Id}`;
        const key2 = `${match.time}-${match.player2Id}`;
        expect(slotAssignments.has(key)).toBe(false);
        expect(slotAssignments.has(key2)).toBe(false);
        slotAssignments.set(key, true);
        slotAssignments.set(key2, true);
      });

      // Check for court conflicts (same court at same time)
      const courtAssignments = new Map();
      schedule.matches.forEach((match) => {
        const key = `${match.time}-${match.court}`;
        expect(courtAssignments.has(key)).toBe(false);
        courtAssignments.set(key, true);
      });
    });

    it('balances rest time between matches', () => {
      const participants = Array.from({ length: 6 }, (_, i) => `player-${i}`);

      const schedule = generator.generateRoundRobin({
        participants,
        courts: ['Court 1', 'Court 2', 'Court 3'],
        timeSlots: ['9:00', '9:30', '10:00', '10:30', '11:00'],
        minRestBetweenMatches: 1, // At least 1 slot rest
      });

      // Verify each player has adequate rest
      const playerMatches = new Map();
      schedule.matches.forEach((match, index) => {
        [match.player1Id, match.player2Id].forEach((playerId) => {
          const lastMatch = playerMatches.get(playerId);
          if (lastMatch !== undefined) {
            expect(index - lastMatch).toBeGreaterThanOrEqual(1);
          }
          playerMatches.set(playerId, index);
        });
      });
    });
  });

  describe('Flex League Scheduling', () => {
    it('respects player availability windows', () => {
      const participants = [
        { id: 'A', availability: ['Mon-9:00', 'Wed-18:00'] },
        { id: 'B', availability: ['Mon-9:00', 'Tue-14:00'] },
        { id: 'C', availability: ['Wed-18:00', 'Tue-14:00'] },
      ];

      const schedule = generator.generateFlexSchedule({
        participants,
        matchDeadline: '2024-06-30',
      });

      // Verify all matches respect availability
      schedule.suggestedMatches.forEach((match) => {
        const p1 = participants.find((p) => p.id === match.player1Id);
        const p2 = participants.find((p) => p.id === match.player2Id);

        const commonSlots = p1.availability.filter((slot) =>
          p2.availability.includes(slot)
        );
        expect(commonSlots).toContain(match.suggestedSlot);
      });
    });
  });
});
```

---

## 8. Test Data Management

### 8.1 Seeding Strategy

```typescript
// tests/fixtures/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export async function seedTestData() {
  // Create test users with various skill levels
  const users = await Promise.all(
    Array.from({ length: 50 }, async (_, i) => {
      return prisma.user.create({
        data: {
          email: `testuser${i}@example.com`,
          name: faker.person.fullName(),
          passwordHash: await hashPassword('TestPass123!'),
          duprRating: faker.number.float({ min: 2.5, max: 5.5, precision: 0.01 }),
          duprSingles: faker.number.float({ min: 2.5, max: 5.5, precision: 0.01 }),
          duprDoubles: faker.number.float({ min: 2.5, max: 5.5, precision: 0.01 }),
          gamesPlayed: faker.number.int({ min: 10, max: 500 }),
          location: {
            latitude: faker.location.latitude({ min: 40.5, max: 41.0 }),
            longitude: faker.location.longitude({ min: -74.3, max: -73.7 }),
          },
        },
      });
    })
  );

  // Create test courts
  const courts = await Promise.all(
    Array.from({ length: 20 }, async () => {
      return prisma.court.create({
        data: {
          name: `${faker.company.name()} Courts`,
          address: faker.location.streetAddress(),
          latitude: faker.location.latitude({ min: 40.5, max: 41.0 }),
          longitude: faker.location.longitude({ min: -74.3, max: -73.7 }),
          courtCount: faker.number.int({ min: 2, max: 12 }),
          surface: faker.helpers.arrayElement(['concrete', 'asphalt', 'sport-court']),
          indoor: faker.datatype.boolean(),
          lights: faker.datatype.boolean(),
          amenities: faker.helpers.arrayElements(
            ['restrooms', 'water', 'parking', 'pro-shop', 'food'],
            { min: 1, max: 4 }
          ),
        },
      });
    })
  );

  // Create test clubs
  const clubs = await Promise.all(
    Array.from({ length: 5 }, async () => {
      const admin = faker.helpers.arrayElement(users);
      return prisma.club.create({
        data: {
          name: `${faker.location.city()} Pickleball Club`,
          description: faker.lorem.paragraph(),
          adminId: admin.id,
          memberCount: faker.number.int({ min: 20, max: 200 }),
          courtId: faker.helpers.arrayElement(courts).id,
        },
      });
    })
  );

  // Create test tournaments
  const tournaments = await Promise.all([
    prisma.tournament.create({
      data: {
        name: 'Weekly Singles Tournament',
        format: 'single_elimination',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        maxParticipants: 16,
        divisions: ['3.0-3.5', '4.0-4.5', '5.0+'],
        courtId: courts[0].id,
        directorId: users[0].id,
      },
    }),
    prisma.tournament.create({
      data: {
        name: 'Monthly Doubles Championship',
        format: 'double_elimination',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        maxParticipants: 32,
        divisions: ['Mixed 3.5', 'Mixed 4.0', 'Mens 4.0'],
        courtId: courts[1].id,
        directorId: users[1].id,
      },
    }),
  ]);

  // Create test matches (open games)
  await Promise.all(
    Array.from({ length: 20 }, async () => {
      const host = faker.helpers.arrayElement(users);
      return prisma.match.create({
        data: {
          hostId: host.id,
          courtId: faker.helpers.arrayElement(courts).id,
          dateTime: faker.date.soon({ days: 7 }),
          format: faker.helpers.arrayElement(['singles', 'doubles']),
          skillMin: host.duprRating - 0.3,
          skillMax: host.duprRating + 0.3,
          maxPlayers: faker.helpers.arrayElement([2, 4]),
          currentPlayers: faker.number.int({ min: 1, max: 3 }),
          status: 'open',
        },
      });
    })
  );

  // Create test league
  const league = await prisma.league.create({
    data: {
      name: 'Summer Ladder League',
      format: 'ladder',
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      clubId: clubs[0].id,
      skillMin: 3.5,
      skillMax: 4.5,
    },
  });

  // Add members to league with standings
  await Promise.all(
    users.slice(0, 20).map(async (user, index) => {
      return prisma.leagueMember.create({
        data: {
          leagueId: league.id,
          userId: user.id,
          wins: faker.number.int({ min: 0, max: 10 }),
          losses: faker.number.int({ min: 0, max: 10 }),
          points: faker.number.int({ min: 0, max: 100 }),
          rank: index + 1,
        },
      });
    })
  );

  return { users, courts, clubs, tournaments, league };
}

export async function cleanupTestData() {
  await prisma.$transaction([
    prisma.leagueMember.deleteMany(),
    prisma.league.deleteMany(),
    prisma.match.deleteMany(),
    prisma.tournament.deleteMany(),
    prisma.club.deleteMany(),
    prisma.court.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
```

### 8.2 Test Fixtures

```typescript
// tests/fixtures/index.ts
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  duprRating: 4.25,
  duprSingles: 4.1,
  duprDoubles: 4.4,
  gamesPlayed: 150,
  createdAt: new Date('2024-01-01'),
};

export const mockMatch = {
  id: 'match-123',
  hostId: 'user-456',
  courtId: 'court-789',
  dateTime: new Date(Date.now() + 86400000),
  format: 'doubles',
  skillMin: 3.5,
  skillMax: 4.5,
  maxPlayers: 4,
  currentPlayers: 2,
  status: 'open',
  location: 'Central Park Courts',
  distance: 2.5,
};

export const mockCourt = {
  id: 'court-789',
  name: 'Central Park Pickleball Courts',
  address: '123 Park Ave, New York, NY',
  latitude: 40.7812,
  longitude: -73.9665,
  courtCount: 6,
  surface: 'sport-court',
  indoor: false,
  lights: true,
  amenities: ['restrooms', 'water', 'parking'],
};

export const mockTournament = {
  id: 'tournament-123',
  name: 'Summer Championship',
  format: 'double_elimination',
  startDate: new Date('2024-06-15'),
  endDate: new Date('2024-06-16'),
  registrationDeadline: new Date('2024-06-10'),
  maxParticipants: 32,
  currentParticipants: 24,
  divisions: ['3.5-4.0', '4.0-4.5', '4.5-5.0'],
  entryFee: 50,
  prizeMoney: 1000,
  status: 'registration_open',
};

export const mockLeague = {
  id: 'league-123',
  name: 'Weekly Ladder League',
  format: 'ladder',
  startDate: new Date('2024-05-01'),
  endDate: new Date('2024-07-31'),
  skillMin: 3.5,
  skillMax: 4.5,
  memberCount: 24,
  matchesPerWeek: 2,
};

export const mockGameResult = {
  id: 'game-123',
  format: 'doubles',
  players: {
    team1: ['user-1', 'user-2'],
    team2: ['user-3', 'user-4'],
  },
  scores: [
    { team1: 11, team2: 8 },
    { team1: 9, team2: 11 },
    { team1: 11, team2: 6 },
  ],
  winner: 'team1',
  duration: 45, // minutes
  courtId: 'court-789',
  playedAt: new Date(),
  verified: true,
};
```

### 8.3 Mock Data Generators

```typescript
// tests/helpers/generators.ts
import { faker } from '@faker-js/faker';

export function generateUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    duprRating: faker.number.float({ min: 2.5, max: 5.5, precision: 0.01 }),
    gamesPlayed: faker.number.int({ min: 0, max: 500 }),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function generateMatch(overrides = {}) {
  return {
    id: faker.string.uuid(),
    hostId: faker.string.uuid(),
    courtId: faker.string.uuid(),
    dateTime: faker.date.soon({ days: 7 }),
    format: faker.helpers.arrayElement(['singles', 'doubles']),
    skillMin: faker.number.float({ min: 2.5, max: 4.5, precision: 0.1 }),
    skillMax: faker.number.float({ min: 3.0, max: 5.5, precision: 0.1 }),
    maxPlayers: faker.helpers.arrayElement([2, 4]),
    currentPlayers: faker.number.int({ min: 1, max: 3 }),
    status: 'open',
    ...overrides,
  };
}

export function generateTournament(overrides = {}) {
  const startDate = faker.date.soon({ days: 30 });
  return {
    id: faker.string.uuid(),
    name: `${faker.location.city()} ${faker.helpers.arrayElement(['Open', 'Championship', 'Classic'])}`,
    format: faker.helpers.arrayElement(['single_elimination', 'double_elimination', 'round_robin']),
    startDate,
    endDate: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000),
    registrationDeadline: new Date(startDate.getTime() - 5 * 24 * 60 * 60 * 1000),
    maxParticipants: faker.helpers.arrayElement([8, 16, 32, 64]),
    divisions: ['3.0-3.5', '4.0-4.5'],
    entryFee: faker.number.int({ min: 25, max: 100 }),
    status: 'registration_open',
    ...overrides,
  };
}

export function generateGameResult(overrides = {}) {
  const isDoubles = faker.datatype.boolean();
  return {
    id: faker.string.uuid(),
    format: isDoubles ? 'doubles' : 'singles',
    players: {
      team1: isDoubles
        ? [faker.string.uuid(), faker.string.uuid()]
        : [faker.string.uuid()],
      team2: isDoubles
        ? [faker.string.uuid(), faker.string.uuid()]
        : [faker.string.uuid()],
    },
    scores: [
      { team1: 11, team2: faker.number.int({ min: 0, max: 9 }) },
      { team1: faker.number.int({ min: 0, max: 9 }), team2: 11 },
      { team1: 11, team2: faker.number.int({ min: 0, max: 9 }) },
    ],
    winner: 'team1',
    playedAt: faker.date.recent(),
    ...overrides,
  };
}

export function generateBracket(playerCount: number, format: string) {
  const players = Array.from({ length: playerCount }, () => generateUser());

  if (format === 'single_elimination') {
    return generateSingleEliminationBracket(players);
  } else if (format === 'double_elimination') {
    return generateDoubleEliminationBracket(players);
  } else if (format === 'round_robin') {
    return generateRoundRobinSchedule(players);
  }

  throw new Error(`Unknown format: ${format}`);
}

function generateSingleEliminationBracket(players) {
  const rounds = Math.ceil(Math.log2(players.length));
  const bracket = { rounds: [] };

  let currentMatches = Math.ceil(players.length / 2);
  for (let r = 0; r < rounds; r++) {
    bracket.rounds.push({
      roundNumber: r + 1,
      matches: Array.from({ length: currentMatches }, (_, i) => ({
        id: faker.string.uuid(),
        matchNumber: i + 1,
        player1: r === 0 ? players[i * 2] : null,
        player2: r === 0 ? players[i * 2 + 1] : null,
        winner: null,
        score: null,
      })),
    });
    currentMatches = Math.ceil(currentMatches / 2);
  }

  return bracket;
}
```

### 8.4 Database Reset Approach

```typescript
// tests/helpers/database.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  // Reset database to clean state
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Match", "Court", "Tournament", "League", "Club" CASCADE`;

  // Run migrations
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Seed base data
  await seedBaseData();

  return prisma;
}

export async function teardownTestDatabase() {
  await prisma.$disconnect();
}

export async function resetDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }
  }
}

async function seedBaseData() {
  // Create admin user
  await prisma.user.create({
    data: {
      id: 'admin-user',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      passwordHash: 'hashed-password',
    },
  });

  // Create test court
  await prisma.court.create({
    data: {
      id: 'test-court',
      name: 'Test Court',
      address: '123 Test St',
      latitude: 40.7128,
      longitude: -74.006,
      courtCount: 4,
    },
  });
}

// Transaction wrapper for test isolation
export async function withTestTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await fn(tx as PrismaClient);
    throw new Error('ROLLBACK'); // Force rollback
  }).catch((error) => {
    if (error.message === 'ROLLBACK') {
      return undefined as T;
    }
    throw error;
  });
}
```

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
  REDIS_URL: redis://localhost:6379

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: |
          npx prisma migrate deploy
          npm run db:seed:test

      - name: Run integration tests
        run: npm run test:integration -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: integration

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Setup database
        run: |
          npx prisma migrate deploy
          npm run db:seed:test

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run performance tests
        run: k6 run tests/performance/load-test.js

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: k6-results/

  lighthouse:
    runs-on: ubuntu-latest
    needs: [e2e-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/find-game
            http://localhost:3000/tournaments
          uploadArtifacts: true
          configPath: ./lighthouserc.json
```

### 9.2 Test Parallelization

```yaml
# .github/workflows/parallel-tests.yml
name: Parallel Test Execution

on: pull_request

jobs:
  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4

      - name: Upload blob report
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/

  merge-reports:
    needs: test-matrix
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Download reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report/
```

### 9.3 Test Reporting

```typescript
// jest.config.js - Reporter configuration
module.exports = {
  // ...other config
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'Test Report',
        outputPath: 'test-results/report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
  ],
};
```

### 9.4 Failure Handling

```yaml
# Slack notification on failure
- name: Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    channel-id: 'C0123456789'
    slack-message: |
      :x: Tests failed on ${{ github.ref }}
      Workflow: ${{ github.workflow }}
      Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}

# Auto-create issue on repeated failures
- name: Create issue on failure
  if: failure() && github.run_attempt > 1
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: `Test failure: ${context.workflow}`,
        body: `Tests have failed multiple times.\n\nRun: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
        labels: ['bug', 'tests']
      })
```

---

## 10. Testing Tools

### 10.1 Recommended Libraries

| Category | Library | Purpose |
|----------|---------|---------|
| Unit Testing | Jest | Test runner, assertions, mocking |
| React Testing | @testing-library/react | Component testing |
| E2E Testing | Playwright | Browser automation |
| API Testing | Supertest | HTTP assertions |
| Mocking | MSW | API mocking |
| Database | @prisma/client + TestContainers | Database testing |
| Performance | k6 | Load testing |
| Accessibility | @axe-core/playwright | A11y testing |
| Visual | Percy or Chromatic | Visual regression |
| Coverage | Istanbul/nyc | Code coverage |

### 10.2 Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:perf": "k6 run tests/performance/load-test.js",
    "test:perf:stress": "k6 run tests/performance/stress-test.js",
    "test:lighthouse": "lhci autorun",
    "db:seed:test": "prisma db seed -- --environment test",
    "db:reset:test": "prisma migrate reset --force"
  }
}
```

### 10.3 Example Test Patterns

**Arrange-Act-Assert Pattern:**
```typescript
it('should update user rating after game', async () => {
  // Arrange
  const user = await createTestUser({ duprRating: 4.0 });
  const opponent = await createTestUser({ duprRating: 4.2 });
  const gameResult = { winner: user.id, score: '11-8, 11-6' };

  // Act
  await gameService.recordGame(user.id, opponent.id, gameResult);

  // Assert
  const updatedUser = await userService.getById(user.id);
  expect(updatedUser.duprRating).toBeGreaterThan(4.0);
});
```

**Test Factory Pattern:**
```typescript
// tests/factories/userFactory.ts
export const userFactory = {
  build: (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    duprRating: 4.0,
    ...overrides,
  }),

  create: async (overrides = {}) => {
    const data = userFactory.build(overrides);
    return prisma.user.create({ data });
  },

  createMany: async (count: number, overrides = {}) => {
    return Promise.all(
      Array.from({ length: count }, () => userFactory.create(overrides))
    );
  },
};
```

**Page Object Pattern (E2E):**
```typescript
// tests/e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectError(message: string) {
    await expect(this.page.locator('[data-testid="error"]')).toContainText(message);
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}

// Usage
test('login flow', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await loginPage.expectLoggedIn();
});
```

---

## Appendix A: Coverage Requirements by Module

| Module | Line Coverage | Branch Coverage | Function Coverage |
|--------|---------------|-----------------|-------------------|
| Auth | 90% | 85% | 90% |
| Matchmaking | 85% | 80% | 85% |
| Rating Calculator | 95% | 90% | 95% |
| Tournament Brackets | 90% | 85% | 90% |
| League Standings | 90% | 85% | 90% |
| Game Logging | 85% | 80% | 85% |
| User Profile | 80% | 75% | 80% |
| Court Finder | 80% | 75% | 80% |
| Notifications | 75% | 70% | 75% |
| UI Components | 80% | 75% | 80% |

## Appendix B: Test Environment Variables

```bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pickleball_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret-key
DUPR_API_KEY=test-dupr-key
STRIPE_SECRET_KEY=sk_test_xxx
GOOGLE_MAPS_API_KEY=test-maps-key

# Disable external services in tests
DISABLE_EXTERNAL_SERVICES=true
MOCK_GEOLOCATION=true
```

## Appendix C: Pre-commit Test Hook

```bash
#!/bin/sh
# .husky/pre-commit

# Run affected tests only
npm run test:affected

# Run linting
npm run lint

# Type check
npm run type-check
```

---

*This testing strategy ensures comprehensive coverage of all critical features while maintaining fast feedback loops through the testing pyramid approach. Regular execution in CI/CD pipelines catches regressions early, and specialized testing validates offline support, real-time features, and performance requirements.*
