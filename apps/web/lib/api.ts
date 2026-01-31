/**
 * API Client for Pickle Play
 * Provides a type-safe fetch wrapper for communicating with the backend
 */

// API base URL - uses environment variable with fallback to localhost
// Note: The /api/v1 path is included in the base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiError {
  message: string;
  code?: string;
  status: number;
}

class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
  }
}

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string; // Bearer token for authorization
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, token, ...fetchConfig } = config;

  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Default headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchConfig.headers,
  };

  // Add authorization header if token provided
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      headers,
      credentials: 'include', // Include cookies for auth
    });

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'An unexpected error occurred',
      }));

      throw new ApiClientError({
        message: errorData.message || `HTTP error ${response.status}`,
        code: errorData.code,
        status: response.status,
      });
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Network errors
    throw new ApiClientError({
      message: error instanceof Error ? error.message : 'Network error',
      status: 0,
    });
  }
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string, params?: RequestConfig['params']) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// Authenticated HTTP method helpers (requires auth token)
export const apiWithAuth = {
  get: <T>(endpoint: string, token: string, params?: RequestConfig['params']) =>
    request<T>(endpoint, { method: 'GET', params, token }),

  post: <T>(endpoint: string, token: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      token,
    }),

  put: <T>(endpoint: string, token: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      token,
    }),

  patch: <T>(endpoint: string, token: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      token,
    }),

  delete: <T>(endpoint: string, token: string) =>
    request<T>(endpoint, { method: 'DELETE', token }),
};

// Typed API endpoints
export const apiEndpoints = {
  // Auth
  auth: {
    me: () => api.get('/auth/me'),
    syncUser: (data: { clerkId: string }) => api.post('/auth/sync', data),
  },

  // Users
  users: {
    get: (id: string) => api.get(`/users/${id}`),
    update: (id: string, data: unknown) => api.patch(`/users/${id}`, data),
    getStats: (id: string) => api.get(`/users/${id}/stats`),
    getGames: (id: string, params?: { page?: number; limit?: number }) =>
      api.get(`/users/${id}/games`, params),
  },

  // Courts
  courts: {
    list: (params?: {
      lat?: number;
      lng?: number;
      radius?: number;
      page?: number;
      limit?: number;
    }) => api.get('/courts', params),
    get: (id: string) => api.get(`/courts/${id}`),
    create: (data: unknown) => api.post('/courts', data),
    update: (id: string, data: unknown) => api.patch(`/courts/${id}`, data),
    getReviews: (id: string) => api.get(`/courts/${id}/reviews`),
    addReview: (id: string, data: unknown) =>
      api.post(`/courts/${id}/reviews`, data),
  },

  // Games
  games: {
    list: (params?: { page?: number; limit?: number; type?: string }) =>
      api.get('/games', params),
    get: (id: string) => api.get(`/games/${id}`),
    create: (data: unknown) => api.post('/games', data),
    update: (id: string, data: unknown) => api.patch(`/games/${id}`, data),
    delete: (id: string) => api.delete(`/games/${id}`),
    // Log casual game - requires authentication
    log: (token: string, data: {
      gameMode: 'single-match' | 'round-robin' | 'set-partner-round-robin';
      reportToDupr?: boolean;
      location?: string;
      locationCoordinates?: { lat: number; lng: number };
      notes?: string;
      timestamp?: string;
      matchType?: 'singles' | 'doubles';
      scores?: Array<{ team1: number; team2: number }>;
      partner?: string;
      opponents?: string[];
      players?: Array<{ id: string; name: string; hasDuprLinked?: boolean }>;
      teams?: Array<{
        id: string;
        player1: { id: string; name: string; hasDuprLinked?: boolean };
        player2: { id: string; name: string; hasDuprLinked?: boolean };
      }>;
      matches?: Array<{
        id: string;
        round: number;
        court?: number;
        player1?: { id: string; name: string };
        player2?: { id: string; name: string };
        team1?: {
          id: string;
          player1: { id: string; name: string };
          player2: { id: string; name: string };
        };
        team2?: {
          id: string;
          player1: { id: string; name: string };
          player2: { id: string; name: string };
        };
        score: { team1: number; team2: number };
        completed?: boolean;
        reportToDupr?: boolean;
      }>;
    }) => apiWithAuth.post('/games/log', token, data),
    // Get user's logged games - requires authentication
    myGames: (token: string) => apiWithAuth.get('/games/my-games', token),
  },

  // Clubs
  clubs: {
    list: (params?: { page?: number; limit?: number; near?: string }) =>
      api.get('/clubs', params),
    get: (id: string) => api.get(`/clubs/${id}`),
    create: (data: unknown) => api.post('/clubs', data),
    join: (id: string) => api.post(`/clubs/${id}/join`),
    leave: (id: string) => api.post(`/clubs/${id}/leave`),
    getMembers: (id: string) => api.get(`/clubs/${id}/members`),
    getEvents: (id: string) => api.get(`/clubs/${id}/events`),
  },

  // Leagues
  leagues: {
    list: (params?: { page?: number; limit?: number; status?: string; myLeagues?: boolean }) =>
      api.get('/leagues', params),
    listWithAuth: (token: string, params?: { page?: number; limit?: number; status?: string; myLeagues?: boolean }) =>
      apiWithAuth.get('/leagues', token, params),
    get: (id: string) => api.get(`/leagues/${id}`),
    create: (token: string, data: unknown) => apiWithAuth.post('/leagues', token, data),
    // Note: Backend uses /join endpoint for registration
    register: (id: string, data: unknown) =>
      api.post(`/leagues/${id}/join`, data),
    getStandings: (id: string) => api.get(`/leagues/${id}/standings`),
    // Note: Backend uses /matches endpoint for schedule
    getSchedule: (id: string, params?: { week?: number; status?: string }) =>
      api.get(`/leagues/${id}/matches`, params),
  },

  // Tournaments
  tournaments: {
    list: (params?: { page?: number; limit?: number; upcoming?: boolean; managed?: boolean; status?: string }) =>
      api.get('/tournaments', params),
    listWithAuth: (token: string, params?: { page?: number; limit?: number; upcoming?: boolean; managed?: boolean; status?: string }) =>
      apiWithAuth.get('/tournaments', token, params),
    get: (id: string) => api.get(`/tournaments/${id}`),
    create: (token: string, data: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      registrationDeadline: string;
      venue: string;
      venueCoordinates?: { lat: number; lng: number };
      numberOfCourts: number;
      director: { name: string; email: string; phone?: string };
      events: Array<{
        id?: string;
        name?: string;
        category: string;
        skillLevel: string;
        ageGroup: string;
        format: string;
        maxParticipants: number;
        entryFee: number;
        prizeMoney: number;
        scoringFormat: string;
        pointsTo: number;
        poolPlayConfig: {
          enabled: boolean;
          calculationMethod: string;
          numberOfPools: number;
          gamesPerMatch: number;
          advancementCount: number;
        };
        seedingConfig: {
          method: string;
          crossPoolSeeding: string;
        };
        bracketConfig: {
          format: string;
          thirdPlaceMatch: boolean;
          consolationBracket: boolean;
        };
      }>;
    }) => apiWithAuth.post('/tournaments', token, data),
    update: (token: string, id: string, data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      registrationDeadline?: string;
      venue?: string;
      venueCoordinates?: { lat: number; lng: number };
      numberOfCourts?: number;
      director?: { name: string; email: string; phone?: string };
      events?: Array<{
        id?: string;
        name?: string;
        category: string;
        skillLevel: string;
        ageGroup: string;
        format: string;
        maxParticipants: number;
        entryFee: number;
        prizeMoney: number;
        scoringFormat: string;
        pointsTo: number;
        poolPlayConfig: {
          enabled: boolean;
          calculationMethod: string;
          numberOfPools: number;
          gamesPerMatch: number;
          advancementCount: number;
        };
        seedingConfig: {
          method: string;
          crossPoolSeeding: string;
        };
        bracketConfig: {
          format: string;
          thirdPlaceMatch: boolean;
          consolationBracket: boolean;
        };
      }>;
      status?: string;
    }) => apiWithAuth.patch(`/tournaments/${id}`, token, data),
    delete: (token: string, id: string) => apiWithAuth.delete(`/tournaments/${id}`, token),
    register: (id: string, data: unknown) =>
      api.post(`/tournaments/${id}/register`, data),
    unregister: (id: string, registrationId: string) =>
      api.delete(`/tournaments/${id}/registrations/${registrationId}`),
    getBracket: (id: string) => api.get(`/tournaments/${id}/bracket`),
    getEvents: (id: string) => api.get(`/tournaments/${id}/events`),
    getRegistrations: (id: string) => api.get(`/tournaments/${id}/registrations`),
    getSchedule: (id: string) => api.get(`/tournaments/${id}/schedule`),
    publishTournament: (token: string, id: string) => apiWithAuth.post(`/tournaments/${id}/publish`, token),
    closeRegistration: (id: string) => api.post(`/tournaments/${id}/close-registration`),
    checkIn: (id: string, registrationId: string) =>
      api.post(`/tournaments/${id}/registrations/${registrationId}/check-in`),
    updateSchedule: (id: string, data: unknown) =>
      api.patch(`/tournaments/${id}/schedule`, data),
    createEvent: (tournamentId: string, data: {
      name?: string;
      category: string;
      skillLevel: string;
      ageGroup: string;
      format: string;
      maxParticipants: number;
      entryFee: number;
      prizeMoney: number;
      scoringFormat: string;
      pointsTo: number;
      poolPlayConfig: {
        enabled: boolean;
        calculationMethod: string;
        numberOfPools: number;
        gamesPerMatch: number;
        advancementCount: number;
      };
      seedingConfig: {
        method: string;
        crossPoolSeeding: string;
      };
      bracketConfig: {
        format: string;
        thirdPlaceMatch: boolean;
        consolationBracket: boolean;
      };
    }) => api.post(`/tournaments/${tournamentId}/events`, data),
    updateEvent: (tournamentId: string, eventId: string, data: {
      name?: string;
      category?: string;
      skillLevel?: string;
      ageGroup?: string;
      format?: string;
      maxParticipants?: number;
      entryFee?: number;
      prizeMoney?: number;
      scoringFormat?: string;
      pointsTo?: number;
      poolPlayConfig?: {
        enabled: boolean;
        calculationMethod: string;
        numberOfPools: number;
        gamesPerMatch: number;
        advancementCount: number;
      };
      seedingConfig?: {
        method: string;
        crossPoolSeeding: string;
      };
      bracketConfig?: {
        format: string;
        thirdPlaceMatch: boolean;
        consolationBracket: boolean;
      };
    }) => api.patch(`/tournaments/${tournamentId}/events/${eventId}`, data),
    deleteEvent: (tournamentId: string, eventId: string) =>
      api.delete(`/tournaments/${tournamentId}/events/${eventId}`),
  },

  // Players (for searching opponents/partners)
  players: {
    search: (params: { q: string; skillMin?: number; skillMax?: number }) =>
      api.get('/players/search', params),
    get: (id: string) => api.get(`/players/${id}`),
  },

  // Referrals
  referrals: {
    // Get or create user's referral code
    getCode: (token: string, params?: { eventType?: string; eventId?: string }) =>
      apiWithAuth.get<{
        code: string;
        shareableUrl: string;
        usesCount: number;
        isActive: boolean;
        createdAt: string;
      }>('/referrals/code', token, params),

    // Get referral statistics
    getStats: (token: string) =>
      apiWithAuth.get<{
        totalViews: number;
        totalSignups: number;
        totalRegistrations: number;
        totalPurchases: number;
        successfulConversions: number;
        recentConversions: Array<{
          type: string;
          user: { displayName: string | null; avatarUrl: string | null };
          createdAt: string;
          eventId?: string;
        }>;
        rewards: {
          earned: Array<{ reward: string; description: string; earnedAt?: string }>;
          nextMilestone: {
            count: number;
            reward: string;
            description: string;
            progress: number;
          } | null;
        };
        codes: Array<{
          code: string;
          eventType: string | null;
          eventId: string | null;
          usesCount: number;
          isActive: boolean;
          createdAt: string;
        }>;
      }>('/referrals/stats', token),

    // Track a referral visit (no auth required)
    track: (data: { referralCode: string; eventId?: string; eventType?: string }) =>
      api.post<{ tracked: boolean; eventType?: string; eventId?: string }>(
        '/referrals/track',
        data
      ),

    // Convert a referral
    convert: (
      token: string,
      data: { referralCode: string; conversionType: 'signup' | 'registration' | 'purchase'; eventId?: string }
    ) =>
      apiWithAuth.post<{
        converted: boolean;
        conversionId?: string;
        message?: string;
        rewardAwarded?: boolean;
        reward?: string;
        description?: string;
      }>('/referrals/convert', token, data),

    // Validate a referral code
    validate: (code: string) =>
      api.get<{
        valid: boolean;
        referrer?: { displayName: string | null; avatarUrl: string | null };
        eventType?: string;
        eventId?: string;
      }>(`/referrals/validate/${code}`),
  },

  // Partners
  partners: {
    // Get partner listings
    list: (params?: {
      tournamentId?: string;
      leagueId?: string;
      eventId?: string;
      skillMin?: number;
      skillMax?: number;
      page?: number;
      limit?: number;
    }) => api.get('/partners/listings', params),

    // Create a partner listing
    create: (token: string, data: {
      tournamentId?: string;
      leagueId?: string;
      eventId?: string;
      skillLevelMin?: number;
      skillLevelMax?: number;
      message?: string;
    }) => apiWithAuth.post('/partners/listings', token, data),

    // Delete a partner listing
    delete: (token: string, id: string) =>
      apiWithAuth.delete(`/partners/listings/${id}`, token),

    // Contact a partner
    contact: (token: string, id: string, data: { message: string }) =>
      apiWithAuth.post(`/partners/listings/${id}/contact`, token, data),

    // Get my listings
    myListings: (token: string) =>
      apiWithAuth.get('/partners/listings/my', token),
  },

  // Invites
  invites: {
    // Create a team invite
    create: (token: string, data: {
      tournamentId?: string;
      leagueId?: string;
      eventId?: string;
      inviteeEmail?: string;
      inviteeUserId?: string;
      teamName?: string;
      message?: string;
    }) => apiWithAuth.post('/invites', token, data),

    // Get invite details (public)
    get: (code: string) => api.get(`/invites/${code}`),

    // Accept invite
    accept: (token: string, code: string) =>
      apiWithAuth.post(`/invites/${code}/accept`, token),

    // Decline invite
    decline: (token: string, code: string) =>
      apiWithAuth.post(`/invites/${code}/decline`, token),

    // Cancel invite (by inviter)
    cancel: (token: string, code: string) =>
      apiWithAuth.delete(`/invites/${code}`, token),

    // Get sent invites
    sent: (token: string) => apiWithAuth.get('/invites/my/sent', token),

    // Get received invites
    received: (token: string) => apiWithAuth.get('/invites/my/received', token),
  },

  // Waitlist
  waitlist: {
    // Get waitlist status for an event (public)
    getStatus: (eventType: 'tournament' | 'league', eventId: string) =>
      api.get<{
        isFull: boolean;
        currentCount: number;
        maxCount: number | null;
        waitlistEnabled: boolean;
        waitlistCount: number;
      }>('/waitlist/status', { eventType, eventId }),

    // Get user's position on waitlist
    getPosition: (token: string, eventType: 'tournament' | 'league', eventId: string) =>
      apiWithAuth.get<{
        onWaitlist: boolean;
        position?: number;
        totalWaitlisted?: number;
        estimatedWaitDays?: number;
        status?: string;
        spotOfferedAt?: string | null;
        spotExpiresAt?: string | null;
        message?: string;
      }>('/waitlist/position', token, { eventType, eventId }),

    // Add user to waitlist
    join: (token: string, eventType: 'tournament' | 'league', eventId: string, eventSubId?: string) =>
      apiWithAuth.post<{
        message: string;
        registrationId: string;
        position: number;
      }>('/waitlist', token, { eventType, eventId, eventSubId }),

    // Accept a waitlist spot offer
    accept: (token: string, eventType: 'tournament' | 'league', eventId: string) =>
      apiWithAuth.post<{
        message: string;
        success: boolean;
      }>('/waitlist/accept', token, { eventType, eventId }),

    // Decline a waitlist spot offer
    decline: (token: string, eventType: 'tournament' | 'league', eventId: string) =>
      apiWithAuth.post<{
        message: string;
        success: boolean;
      }>('/waitlist/decline', token, { eventType, eventId }),

    // Get waitlist entries (admin/organizer only)
    getEntries: (token: string, eventType: 'tournament' | 'league', eventId: string) =>
      apiWithAuth.get<{
        entries: Array<{
          id: string;
          position: number;
          status: string;
          user: { id: string; displayName: string | null; email: string };
          spotOfferedAt?: string | null;
          spotExpiresAt?: string | null;
          registeredAt: string;
        }>;
        total: number;
      }>('/waitlist/entries', token, { eventType, eventId }),

    // Manually process waitlist (admin/organizer only)
    process: (token: string, eventType: 'tournament' | 'league', eventId: string) =>
      apiWithAuth.post<{
        message: string;
        processed: boolean;
        userId?: string;
        registrationId?: string;
      }>('/waitlist/process', token, { eventType, eventId }),
  },
};

export { ApiClientError };
export type { ApiError };
