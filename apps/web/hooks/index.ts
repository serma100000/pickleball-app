// Auth hooks
export { useAuth, useAuthPermission, useProtectedAction } from './use-auth';

// API hooks
export {
  // Courts
  useCourts,
  useNearbyCourts,
  useCourt,
  useCourtReviews,
  // Games
  useGames,
  useGame,
  useRecentGames,
  useCreateGame,
  useUpdateGame,
  useDeleteGame,
  // Clubs
  useClubs,
  useClub,
  useMyClubs,
  useJoinClub,
  useLeaveClub,
  // Leagues
  useLeagues,
  useLeague,
  useLeagueStandings,
  useLeagueSchedule,
  useRegisterForLeague,
  // Tournaments
  useTournaments,
  useTournament,
  useTournamentBracket,
  useTournamentEvents,
  useTournamentRegistrations,
  useTournamentSchedule,
  useUpcomingTournaments,
  useRegisterForTournament,
  useUnregisterFromTournament,
  useCheckInRegistration,
  usePublishTournament,
  useCreateTournament,
  useDeleteTournament,
  useUpdateTournament,
  useUpdateTournamentSchedule,
  useMyTournaments,
  // Tournament Events
  useCreateTournamentEvent,
  useUpdateTournamentEvent,
  useDeleteTournamentEvent,
  // Players
  usePlayerSearch,
  usePlayer,
  // Users
  useUserStats,
} from './use-api';

// Geolocation hooks
export { useGeolocation, useDistanceFromUser } from './use-geolocation';

// Online status hooks
export { useOnlineStatus, useOfflineIndicator } from './use-online-status';

// Media query hooks
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsLargeDesktop,
  useIsTouchDevice,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  useOrientation,
  useBreakpoint,
  useWindowSize,
} from './use-media-query';

// Notifications hooks
export {
  useNotifications,
  useUnreadNotificationCount,
  notificationKeys,
} from './use-notifications';
export type {
  Notification,
  NotificationType,
  NotificationPagination,
  NotificationsResponse,
  UseNotificationsOptions,
  UseNotificationsReturn,
  UseUnreadCountReturn,
} from './use-notifications';

// PWA hooks
export { usePWAInstall, useIsStandalone } from './use-pwa-install';
