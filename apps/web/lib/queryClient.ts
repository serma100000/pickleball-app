import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Extract a user-friendly error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle common API error structures
    const apiError = error as Error & { response?: { data?: { message?: string } } };
    if (apiError.response?.data?.message) {
      return apiError.response.data.message;
    }
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// Create a client
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show error toasts for queries that have already been cached
      // This prevents showing errors on first load
      if (query.state.data !== undefined) {
        console.error('Query error:', error);
        toast.error({
          title: 'Error loading data',
          description: getErrorMessage(error),
        });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('Mutation error:', error);
      toast.error({
        title: 'Action failed',
        description: getErrorMessage(error),
      });
    },
  }),
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh (5 minutes)
      staleTime: 5 * 60 * 1000,

      // Cache time: how long inactive data stays in cache (30 minutes)
      gcTime: 30 * 60 * 1000,

      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,

      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on network errors
      retry: 1,
    },
  },
});

// Query key factory for consistent key management
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
    stats: (id: string) => [...queryKeys.users.all, id, 'stats'] as const,
    games: (id: string, filters?: Record<string, unknown>) =>
      [...queryKeys.users.all, id, 'games', filters] as const,
  },

  // Courts
  courts: {
    all: ['courts'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.courts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.courts.all, id] as const,
    reviews: (id: string) => [...queryKeys.courts.all, id, 'reviews'] as const,
    nearby: (lat: number, lng: number, radius: number) =>
      [...queryKeys.courts.all, 'nearby', { lat, lng, radius }] as const,
  },

  // Games
  games: {
    all: ['games'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.games.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.games.all, id] as const,
    recent: () => [...queryKeys.games.all, 'recent'] as const,
    myGames: () => [...queryKeys.games.all, 'my'] as const,
  },

  // Clubs
  clubs: {
    all: ['clubs'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.clubs.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.clubs.all, id] as const,
    members: (id: string) => [...queryKeys.clubs.all, id, 'members'] as const,
    events: (id: string) => [...queryKeys.clubs.all, id, 'events'] as const,
    myClubs: () => [...queryKeys.clubs.all, 'my'] as const,
  },

  // Leagues
  leagues: {
    all: ['leagues'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.leagues.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.leagues.all, id] as const,
    standings: (id: string) => [...queryKeys.leagues.all, id, 'standings'] as const,
    schedule: (id: string) => [...queryKeys.leagues.all, id, 'schedule'] as const,
    myLeagues: () => [...queryKeys.leagues.all, 'my'] as const,
  },

  // Tournaments
  tournaments: {
    all: ['tournaments'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.tournaments.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.tournaments.all, id] as const,
    bracket: (id: string) => [...queryKeys.tournaments.all, id, 'bracket'] as const,
    events: (id: string) => [...queryKeys.tournaments.all, id, 'events'] as const,
    registrations: (id: string) => [...queryKeys.tournaments.all, id, 'registrations'] as const,
    schedule: (id: string) => [...queryKeys.tournaments.all, id, 'schedule'] as const,
    upcoming: () => [...queryKeys.tournaments.all, 'upcoming'] as const,
    myTournaments: () => [...queryKeys.tournaments.all, 'my'] as const,
  },

  // Players
  players: {
    all: ['players'] as const,
    search: (query: string, filters?: Record<string, unknown>) =>
      [...queryKeys.players.all, 'search', query, filters] as const,
    detail: (id: string) => [...queryKeys.players.all, id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
      [...queryKeys.notifications.all, 'list', filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },

  // Referrals
  referrals: {
    all: ['referrals'] as const,
    code: (params?: { eventType?: string; eventId?: string }) =>
      [...queryKeys.referrals.all, 'code', params] as const,
    stats: () => [...queryKeys.referrals.all, 'stats'] as const,
    validate: (code: string) => [...queryKeys.referrals.all, 'validate', code] as const,
  },

  // Partners
  partners: {
    all: ['partners'] as const,
    listings: (filters?: Record<string, unknown>) =>
      [...queryKeys.partners.all, 'listings', filters] as const,
    myListings: () => [...queryKeys.partners.all, 'my'] as const,
  },

  // Invites
  invites: {
    all: ['invites'] as const,
    detail: (code: string) => [...queryKeys.invites.all, code] as const,
    sent: () => [...queryKeys.invites.all, 'sent'] as const,
    received: () => [...queryKeys.invites.all, 'received'] as const,
  },
};
