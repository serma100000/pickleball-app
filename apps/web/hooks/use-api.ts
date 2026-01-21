'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiEndpoints } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { addToSyncQueue } from '@/lib/db';
import { useOnlineStatus } from './use-online-status';

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

export function useLeague(id: string) {
  return useQuery({
    queryKey: queryKeys.leagues.detail(id),
    queryFn: () => apiEndpoints.leagues.get(id),
    enabled: Boolean(id),
  });
}

export function useLeagueStandings(leagueId: string) {
  return useQuery({
    queryKey: queryKeys.leagues.standings(leagueId),
    queryFn: () => apiEndpoints.leagues.getStandings(leagueId),
    enabled: Boolean(leagueId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeagueSchedule(leagueId: string) {
  return useQuery({
    queryKey: queryKeys.leagues.schedule(leagueId),
    queryFn: () => apiEndpoints.leagues.getSchedule(leagueId),
    enabled: Boolean(leagueId),
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
    enabled: Boolean(id),
  });
}

export function useTournamentBracket(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.bracket(tournamentId),
    queryFn: () => apiEndpoints.tournaments.getBracket(tournamentId),
    enabled: Boolean(tournamentId),
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
