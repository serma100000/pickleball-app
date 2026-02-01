import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component with all necessary providers
interface WrapperProps {
  children: React.ReactNode;
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Custom render function that includes providers
function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: createWrapper(), ...options });
}

// Mock user data factory
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    primaryEmailAddress: { emailAddress: 'test@example.com' },
    imageUrl: 'https://example.com/avatar.jpg',
    unsafeMetadata: {},
    publicMetadata: {},
    ...overrides,
  };
}

// Mock profile data factory
export function createMockProfile(overrides = {}) {
  return {
    id: 'profile-123',
    clerkId: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: 'https://example.com/avatar.jpg',
    skillLevel: 3.5,
    gamesPlayed: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Mock league data factory
export function createMockLeague(overrides = {}) {
  return {
    id: 'league-123',
    name: 'Test League',
    leagueType: 'doubles' as const,
    skillLevelMin: 3.0,
    skillLevelMax: 4.0,
    isDuprRated: false,
    maxTeams: 16,
    currentTeams: 8,
    ...overrides,
  };
}

// Mock player data factory
export function createMockPlayer(overrides = {}) {
  return {
    id: 'player-123',
    username: 'player1',
    displayName: 'Player One',
    avatarUrl: null,
    rating: 3.5,
    ratingSource: 'dupr' as const,
    ...overrides,
  };
}

// Mock waitlist status data factory
export function createMockWaitlistStatus(overrides = {}) {
  return {
    isFull: true,
    currentCount: 16,
    maxCount: 16,
    waitlistEnabled: true,
    waitlistCount: 5,
    ...overrides,
  };
}

// Mock waitlist position data factory
export function createMockWaitlistPosition(overrides = {}) {
  return {
    onWaitlist: true,
    position: 3,
    totalWaitlisted: 5,
    estimatedWaitDays: 7,
    status: 'waiting',
    spotOfferedAt: null,
    spotExpiresAt: null,
    message: null,
    ...overrides,
  };
}

// Mock API helpers
export function createMockApi() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockApiWithAuth() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
