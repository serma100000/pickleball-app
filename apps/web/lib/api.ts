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
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, ...fetchConfig } = config;

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
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      api.get('/leagues', params),
    get: (id: string) => api.get(`/leagues/${id}`),
    create: (data: unknown) => api.post('/leagues', data),
    register: (id: string, data: unknown) =>
      api.post(`/leagues/${id}/register`, data),
    getStandings: (id: string) => api.get(`/leagues/${id}/standings`),
    getSchedule: (id: string) => api.get(`/leagues/${id}/schedule`),
  },

  // Tournaments
  tournaments: {
    list: (params?: { page?: number; limit?: number; upcoming?: boolean; managed?: boolean; status?: string }) =>
      api.get('/tournaments', params),
    get: (id: string) => api.get(`/tournaments/${id}`),
    create: (data: unknown) => api.post('/tournaments', data),
    update: (id: string, data: unknown) => api.patch(`/tournaments/${id}`, data),
    delete: (id: string) => api.delete(`/tournaments/${id}`),
    register: (id: string, data: unknown) =>
      api.post(`/tournaments/${id}/register`, data),
    unregister: (id: string, registrationId: string) =>
      api.delete(`/tournaments/${id}/registrations/${registrationId}`),
    getBracket: (id: string) => api.get(`/tournaments/${id}/bracket`),
    getEvents: (id: string) => api.get(`/tournaments/${id}/events`),
    getRegistrations: (id: string) => api.get(`/tournaments/${id}/registrations`),
    getSchedule: (id: string) => api.get(`/tournaments/${id}/schedule`),
    publishTournament: (id: string) => api.post(`/tournaments/${id}/publish`),
    closeRegistration: (id: string) => api.post(`/tournaments/${id}/close-registration`),
    checkIn: (id: string, registrationId: string) =>
      api.post(`/tournaments/${id}/registrations/${registrationId}/check-in`),
    updateSchedule: (id: string, data: unknown) =>
      api.patch(`/tournaments/${id}/schedule`, data),
  },

  // Players (for searching opponents/partners)
  players: {
    search: (params: { q: string; skillMin?: number; skillMax?: number }) =>
      api.get('/players/search', params),
    get: (id: string) => api.get(`/players/${id}`),
  },
};

export { ApiClientError };
export type { ApiError };
