'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

import { apiEndpoints } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { addToSyncQueue } from '@/lib/db';
import { useOnlineStatus } from './use-online-status';
import type {
  CreateTournamentInput,
  UpdateTournamentInput,
  TournamentResponse,
} from '@/lib/tournament-api-types';

// Courts hooks
export function useCourts(params?: {
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.courts.list(params),
    queryFn: () => apiEndpoints.courts.list(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useNearbyCourts(lat: number, lng: number, radius: number = 10) {
  return useQuery({
    queryKey: queryKeys.courts.nearby(lat, lng, radius),
    queryFn: () => apiEndpoints.courts.list({ lat, lng, radius }),
    enabled: Boolean(lat && lng),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCourt(id: string) {
  return useQuery({
    queryKey: queryKeys.courts.detail(id),
    queryFn: () => apiEndpoints.courts.get(id),
    enabled: Boolean(id),
  });
}

export function useCourtReviews(courtId: string) {
  return useQuery({
    queryKey: queryKeys.courts.reviews(courtId),
    queryFn: () => apiEndpoints.courts.getReviews(courtId),
    enabled: Boolean(courtId),
  });
}

// Games hooks
export function useGames(params?: { page?: number; limit?: number; type?: string }) {
  return useQuery({
    queryKey: queryKeys.games.list(params),
    queryFn: () => apiEndpoints.games.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: queryKeys.games.detail(id),
    queryFn: () => apiEndpoints.games.get(id),
    enabled: Boolean(id),
  });
}

export function useRecentGames() {
  return useQuery({
    queryKey: queryKeys.games.recent(),
    queryFn: () => apiEndpoints.games.list({ limit: 5 }),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Type for game logging data (casual games with named players)
interface LogGameData {
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
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async (data: unknown) => {
      if (!isOnline) {
        // Queue for later sync
        await addToSyncQueue({
          type: 'game',
          action: 'create',
          data,
        });
        return { offline: true, data };
      }
      return apiEndpoints.games.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
    },
  });
}

// Hook for logging casual games (with named players, not UUIDs)
// This is the hook that should be used by the game creation wizard
export function useLogGame() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: LogGameData) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required to log games');
      }

      if (!isOnline) {
        // Queue for later sync
        await addToSyncQueue({
          type: 'game',
          action: 'create',
          data,
        });
        return { offline: true, data };
      }
      return apiEndpoints.games.log(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
    },
  });
}

// Hook for fetching user's logged games
export function useMyGames() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.games.myGames(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { games: [], total: 0 };
      }
      return apiEndpoints.games.myGames(token);
    },
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiEndpoints.games.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.games.list() });
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiEndpoints.games.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.all });
    },
  });
}

// Clubs hooks
export function useClubs(params?: { page?: number; limit?: number; near?: string }) {
  return useQuery({
    queryKey: queryKeys.clubs.list(params),
    queryFn: () => apiEndpoints.clubs.list(params),
    staleTime: 10 * 60 * 1000,
  });
}

export function useClub(id: string) {
  return useQuery({
    queryKey: queryKeys.clubs.detail(id),
    queryFn: () => apiEndpoints.clubs.get(id),
    enabled: Boolean(id),
  });
}

export function useMyClubs() {
  return useQuery({
    queryKey: queryKeys.clubs.myClubs(),
    queryFn: () => apiEndpoints.clubs.list({ /* user's clubs filter */ }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useJoinClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clubId: string) => apiEndpoints.clubs.join(clubId),
    onSuccess: (_, clubId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.detail(clubId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.myClubs() });
    },
  });
}

export function useLeaveClub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clubId: string) => apiEndpoints.clubs.leave(clubId),
    onSuccess: (_, clubId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.detail(clubId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.myClubs() });
    },
  });
}

// Leagues hooks
export function useLeagues(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: queryKeys.leagues.list(params),
    queryFn: () => apiEndpoints.leagues.list(params),
    staleTime: 10 * 60 * 1000,
  });
}

// Helper to validate ID is a real value (not undefined/null strings)
const isValidId = (id: string | undefined | null): boolean =>
  Boolean(id) && id !== 'undefined' && id !== 'null';

export function useLeague(id: string) {
  return useQuery({
    queryKey: queryKeys.leagues.detail(id),
    queryFn: () => apiEndpoints.leagues.get(id),
    enabled: isValidId(id),
  });
}

export function useLeagueStandings(leagueId: string) {
  return useQuery({
    queryKey: queryKeys.leagues.standings(leagueId),
    queryFn: () => apiEndpoints.leagues.getStandings(leagueId),
    enabled: isValidId(leagueId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeagueSchedule(leagueId: string, params?: { week?: number; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.leagues.schedule(leagueId), params],
    queryFn: () => apiEndpoints.leagues.getSchedule(leagueId, params),
    enabled: isValidId(leagueId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRegisterForLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leagueId, data }: { leagueId: string; data: unknown }) =>
      apiEndpoints.leagues.register(leagueId, data),
    onSuccess: (_, { leagueId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(leagueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.myLeagues() });
    },
  });
}

export function useCreateLeague() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: unknown) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      // Backend returns { message, league: { id, name, slug, status, season } }
      return apiEndpoints.leagues.create(token, data) as Promise<{ league: { id: string }; id?: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
    },
  });
}

// My Leagues (leagues the user is organizing/participating in)
export function useMyLeagues(params?: { page?: number; limit?: number; status?: string }) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.leagues.myLeagues(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { leagues: [], total: 0 };
      }
      return apiEndpoints.leagues.listWithAuth(token, { ...params, myLeagues: true });
    },
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
  });
}

// Tournaments hooks
export function useTournaments(params?: { page?: number; limit?: number; upcoming?: boolean }) {
  return useQuery({
    queryKey: queryKeys.tournaments.list(params),
    queryFn: () => apiEndpoints.tournaments.list(params),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.detail(id),
    queryFn: () => apiEndpoints.tournaments.get(id),
    enabled: isValidId(id),
  });
}

export function useTournamentBracket(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.bracket(tournamentId),
    queryFn: () => apiEndpoints.tournaments.getBracket(tournamentId),
    enabled: isValidId(tournamentId),
    staleTime: 1 * 60 * 1000, // 1 minute for live brackets
  });
}

export function useUpcomingTournaments() {
  return useQuery({
    queryKey: queryKeys.tournaments.upcoming(),
    queryFn: () => apiEndpoints.tournaments.list({ upcoming: true, limit: 10 }),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useRegisterForTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tournamentId, data }: { tournamentId: string; data: unknown }) =>
      apiEndpoints.tournaments.register(tournamentId, data),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tournaments.detail(tournamentId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.myTournaments() });
    },
  });
}

// My Tournaments (tournaments the user is directing/managing)
export function useMyTournaments(params?: { page?: number; limit?: number; status?: string }) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['tournaments', 'my', params],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { tournaments: [], total: 0 };
      }
      return apiEndpoints.tournaments.listWithAuth(token, { ...params, managed: true });
    },
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ token, id }: { token: string; id: string }) =>
      apiEndpoints.tournaments.delete(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.all });
    },
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();

  return useMutation({
    mutationFn: async ({ token, data }: { token: string; data: CreateTournamentInput }) => {
      if (!isOnline) {
        // Queue for later sync
        await addToSyncQueue({
          type: 'tournament',
          action: 'create',
          data,
        });
        return { offline: true, data };
      }
      return apiEndpoints.tournaments.create(token, data) as Promise<TournamentResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.myTournaments() });
    },
  });
}

export function useUpdateTournament() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTournamentInput }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.tournaments.update(token, id, data) as Promise<TournamentResponse>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.myTournaments() });
    },
  });
}

export function useTournamentEvents(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.events(tournamentId),
    queryFn: () => apiEndpoints.tournaments.getEvents(tournamentId),
    enabled: isValidId(tournamentId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTournamentRegistrations(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.registrations(tournamentId),
    queryFn: () => apiEndpoints.tournaments.getRegistrations(tournamentId),
    enabled: isValidId(tournamentId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTournamentSchedule(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.schedule(tournamentId),
    queryFn: () => apiEndpoints.tournaments.getSchedule(tournamentId),
    enabled: isValidId(tournamentId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUnregisterFromTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tournamentId, registrationId }: { tournamentId: string; registrationId: string }) =>
      apiEndpoints.tournaments.unregister(tournamentId, registrationId),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.registrations(tournamentId) });
    },
  });
}

export function useCheckInRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tournamentId, registrationId }: { tournamentId: string; registrationId: string }) =>
      apiEndpoints.tournaments.checkIn(tournamentId, registrationId),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.registrations(tournamentId) });
    },
  });
}

export function usePublishTournament() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.tournaments.publishTournament(token, tournamentId);
    },
    onSuccess: (_, tournamentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(tournamentId) });
    },
  });
}

export function useUpdateTournamentSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tournamentId, data }: { tournamentId: string; data: unknown }) =>
      apiEndpoints.tournaments.updateSchedule(tournamentId, data),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.schedule(tournamentId) });
    },
  });
}

// Tournament Event Hooks
export function useCreateTournamentEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tournamentId,
      data,
    }: {
      tournamentId: string;
      data: {
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
      };
    }) => apiEndpoints.tournaments.createEvent(tournamentId, data),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.events(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(tournamentId) });
    },
  });
}

export function useUpdateTournamentEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tournamentId,
      eventId,
      data,
    }: {
      tournamentId: string;
      eventId: string;
      data: {
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
      };
    }) => apiEndpoints.tournaments.updateEvent(tournamentId, eventId, data),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.events(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(tournamentId) });
    },
  });
}

export function useDeleteTournamentEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tournamentId, eventId }: { tournamentId: string; eventId: string }) =>
      apiEndpoints.tournaments.deleteEvent(tournamentId, eventId),
    onSuccess: (_, { tournamentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.events(tournamentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(tournamentId) });
    },
  });
}

// Players hooks
export function usePlayerSearch(query: string, filters?: { skillMin?: number; skillMax?: number }) {
  return useQuery({
    queryKey: queryKeys.players.search(query, filters),
    queryFn: () => apiEndpoints.players.search({ q: query, ...filters }),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: queryKeys.players.detail(id),
    queryFn: () => apiEndpoints.players.get(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

// User stats hook
export function useUserStats(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.stats(userId),
    queryFn: () => apiEndpoints.users.getStats(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// REFERRALS HOOKS
// ============================================================================

/**
 * Get or create user's referral code
 */
export function useReferralCode(params?: { eventType?: string; eventId?: string }) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.referrals.code(params),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.referrals.getCode(token, params);
    },
    enabled: isSignedIn,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get referral statistics
 */
export function useReferralStats() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.referrals.stats(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.referrals.getStats(token);
    },
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Track a referral visit (no auth required)
 */
export function useTrackReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { referralCode: string; eventId?: string; eventType?: string }) =>
      apiEndpoints.referrals.track(data),
    onSuccess: () => {
      // Optionally invalidate referral stats if the user is signed in
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.stats() });
    },
  });
}

/**
 * Convert a referral (when user completes an action)
 */
export function useConvertReferral() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      referralCode: string;
      conversionType: 'signup' | 'registration' | 'purchase';
      eventId?: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.referrals.convert(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referrals.all });
    },
  });
}

/**
 * Validate a referral code
 */
export function useValidateReferralCode(code: string | null) {
  return useQuery({
    queryKey: queryKeys.referrals.validate(code || ''),
    queryFn: () => apiEndpoints.referrals.validate(code!),
    enabled: Boolean(code),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// PARTNER MARKETPLACE HOOKS
// ============================================================================

/**
 * Get partner listings for an event
 */
export function usePartnerListings(params?: {
  tournamentId?: string;
  leagueId?: string;
  eventId?: string;
  skillMin?: number;
  skillMax?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.partners.listings(params),
    queryFn: () => apiEndpoints.partners.list(params),
    enabled: Boolean(params?.tournamentId || params?.leagueId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create a partner listing
 */
export function useCreatePartnerListing() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      tournamentId?: string;
      leagueId?: string;
      eventId?: string;
      skillLevelMin?: number;
      skillLevelMax?: number;
      message?: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.partners.create(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
  });
}

/**
 * Delete a partner listing
 */
export function useDeletePartnerListing() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.partners.delete(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
    },
  });
}

/**
 * Contact a partner
 */
export function useContactPartner() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: { listingId: string; message: string }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.partners.contact(token, data.listingId, { message: data.message });
    },
  });
}

/**
 * Get current user's partner listings
 */
export function useMyPartnerListings() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.partners.myListings(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { listings: [] };
      }
      return apiEndpoints.partners.myListings(token);
    },
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// TEAM INVITE HOOKS
// ============================================================================

/**
 * Get invite details by code (public)
 */
export function useInviteDetails(code: string) {
  return useQuery({
    queryKey: queryKeys.invites.detail(code),
    queryFn: () => apiEndpoints.invites.get(code),
    enabled: Boolean(code),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create a team invite
 */
export function useCreateTeamInvite() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      tournamentId?: string;
      leagueId?: string;
      eventId?: string;
      inviteeEmail?: string;
      inviteeUserId?: string;
      teamName?: string;
      message?: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.invites.create(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.sent() });
    },
  });
}

/**
 * Accept an invite
 */
export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (code: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.invites.accept(token, code);
    },
    onSuccess: (_, code) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.detail(code) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.received() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
    },
  });
}

/**
 * Decline an invite
 */
export function useDeclineInvite() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (code: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.invites.decline(token, code);
    },
    onSuccess: (_, code) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.detail(code) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.received() });
    },
  });
}

/**
 * Cancel an invite (by inviter)
 */
export function useCancelInvite() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (code: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.invites.cancel(token, code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invites.sent() });
    },
  });
}

/**
 * Get invites sent by current user
 */
export function useSentInvites() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.invites.sent(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { invites: [] };
      }
      return apiEndpoints.invites.sent(token);
    },
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get invites received by current user
 */
export function useReceivedInvites() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: queryKeys.invites.received(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { invites: [] };
      }
      return apiEndpoints.invites.received(token);
    },
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// WAITLIST HOOKS
// ============================================================================

/**
 * Get waitlist status for an event (public)
 */
export function useWaitlistStatus(eventType: 'tournament' | 'league', eventId: string) {
  return useQuery({
    queryKey: ['waitlist', 'status', eventType, eventId],
    queryFn: () => apiEndpoints.waitlist.getStatus(eventType, eventId),
    enabled: isValidId(eventId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get current user's waitlist position
 */
export function useWaitlistPosition(eventType: 'tournament' | 'league', eventId: string) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['waitlist', 'position', eventType, eventId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { onWaitlist: false };
      }
      return apiEndpoints.waitlist.getPosition(token, eventType, eventId);
    },
    enabled: isSignedIn && isValidId(eventId),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute for spot offer countdown
  });
}

/**
 * Join a waitlist
 */
export function useJoinWaitlist() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventType,
      eventId,
      eventSubId,
    }: {
      eventType: 'tournament' | 'league';
      eventId: string;
      eventSubId?: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.waitlist.join(token, eventType, eventId, eventSubId);
    },
    onSuccess: (_, { eventType, eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'status', eventType, eventId] });
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'position', eventType, eventId] });
      if (eventType === 'tournament') {
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(eventId) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(eventId) });
      }
    },
  });
}

/**
 * Accept a waitlist spot offer
 */
export function useAcceptWaitlistSpot() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventType,
      eventId,
    }: {
      eventType: 'tournament' | 'league';
      eventId: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.waitlist.accept(token, eventType, eventId);
    },
    onSuccess: (_, { eventType, eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'status', eventType, eventId] });
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'position', eventType, eventId] });
      if (eventType === 'tournament') {
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.detail(eventId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments.registrations(eventId) });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.leagues.detail(eventId) });
      }
    },
  });
}

/**
 * Decline a waitlist spot offer
 */
export function useDeclineWaitlistSpot() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventType,
      eventId,
    }: {
      eventType: 'tournament' | 'league';
      eventId: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.waitlist.decline(token, eventType, eventId);
    },
    onSuccess: (_, { eventType, eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'status', eventType, eventId] });
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'position', eventType, eventId] });
    },
  });
}

/**
 * Get waitlist entries for an event (admin/organizer only)
 */
export function useWaitlistEntries(eventType: 'tournament' | 'league', eventId: string) {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['waitlist', 'entries', eventType, eventId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        return { entries: [], total: 0 };
      }
      return apiEndpoints.waitlist.getEntries(token, eventType, eventId);
    },
    enabled: isSignedIn && isValidId(eventId),
    staleTime: 30 * 1000,
  });
}

/**
 * Process waitlist (manually offer spot to next person)
 */
export function useProcessWaitlist() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventType,
      eventId,
    }: {
      eventType: 'tournament' | 'league';
      eventId: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      return apiEndpoints.waitlist.process(token, eventType, eventId);
    },
    onSuccess: (_, { eventType, eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'entries', eventType, eventId] });
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'status', eventType, eventId] });
    },
  });
}
