// =============================================================================
// User Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  skillLevel: SkillLevel;
  duprRating?: number;
  internalRating: number;
  location?: GeoLocation;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

export interface UserPreferences {
  playStyle: 'competitive' | 'recreational' | 'social';
  preferredFormats: GameFormat[];
  notificationSettings: NotificationSettings;
  privacy: PrivacySettings;
}

// =============================================================================
// Game Types
// =============================================================================

export type GameFormat = 'singles' | 'doubles' | 'mixed_doubles';
export type GameType = 'casual' | 'competitive' | 'league' | 'tournament';
export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Game {
  id: string;
  format: GameFormat;
  type: GameType;
  status: GameStatus;
  courtId?: string;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  players: GamePlayer[];
  scores: GameScore[];
  winner?: 'team1' | 'team2';
  verificationStatus: VerificationStatus;
  createdBy: string;
  createdAt: Date;
}

export interface GamePlayer {
  id: string;
  userId: string;
  team: 'team1' | 'team2';
  position?: 'left' | 'right';
}

export interface GameScore {
  gameNumber: number;
  team1Score: number;
  team2Score: number;
}

export type VerificationStatus = 'pending' | 'verified' | 'disputed';

// =============================================================================
// Court Types
// =============================================================================

export interface Court {
  id: string;
  venueId: string;
  name: string;
  surfaceType: SurfaceType;
  isIndoor: boolean;
  hasLights: boolean;
  status: 'available' | 'occupied' | 'maintenance';
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  location: GeoLocation;
  courts: Court[];
  amenities: string[];
  operatingHours: OperatingHours[];
  rating: number;
  reviewCount: number;
  imageUrls: string[];
  isPublic: boolean;
  websiteUrl?: string;
  phoneNumber?: string;
}

export type SurfaceType = 'concrete' | 'asphalt' | 'sport_court' | 'wood' | 'other';

// =============================================================================
// Club Types
// =============================================================================

export interface Club {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  location: GeoLocation;
  memberCount: number;
  isPublic: boolean;
  membershipType: 'open' | 'approval' | 'invite';
  createdAt: Date;
}

export interface ClubMembership {
  userId: string;
  clubId: string;
  role: ClubRole;
  joinedAt: Date;
  status: 'active' | 'inactive' | 'banned';
}

export type ClubRole = 'owner' | 'admin' | 'moderator' | 'member';

// =============================================================================
// Tournament Types
// =============================================================================

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  venueId: string;
  divisions: TournamentDivision[];
  maxParticipants: number;
  currentParticipants: number;
  entryFee?: number;
  organizerId: string;
  createdAt: Date;
}

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'pool_play'
  | 'swiss';
export type TournamentStatus =
  | 'draft'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TournamentDivision {
  id: string;
  name: string;
  format: GameFormat;
  minRating?: number;
  maxRating?: number;
  brackets: Bracket[];
}

export interface Bracket {
  id: string;
  type: 'winners' | 'losers' | 'finals';
  matches: BracketMatch[];
}

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  scheduledAt?: Date;
  courtId?: string;
  scores: GameScore[];
  status: GameStatus;
}

// =============================================================================
// League Types
// =============================================================================

export interface League {
  id: string;
  name: string;
  description?: string;
  format: GameFormat;
  type: LeagueType;
  status: LeagueStatus;
  seasonStartDate: Date;
  seasonEndDate: Date;
  clubId?: string;
  standings: LeagueStanding[];
  schedule: LeagueMatch[];
  createdAt: Date;
}

export type LeagueType = 'ladder' | 'round_robin' | 'flex' | 'team';
export type LeagueStatus = 'registration' | 'active' | 'completed' | 'cancelled';

export interface LeagueStanding {
  rank: number;
  participantId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
}

export interface LeagueMatch {
  id: string;
  week: number;
  participant1Id: string;
  participant2Id: string;
  scheduledAt?: Date;
  gameId?: string;
  status: 'scheduled' | 'completed' | 'forfeited';
}

// =============================================================================
// Social Types
// =============================================================================

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: AchievementCategory;
  requirement: AchievementRequirement;
  points: number;
}

export type AchievementCategory =
  | 'games'
  | 'social'
  | 'tournaments'
  | 'clubs'
  | 'improvement'
  | 'streaks'
  | 'exploration';

export interface AchievementRequirement {
  type: string;
  threshold: number;
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress: number;
}

// =============================================================================
// Notification Types
// =============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export type NotificationType =
  | 'game_invite'
  | 'game_reminder'
  | 'game_result'
  | 'friend_request'
  | 'friend_accepted'
  | 'club_invite'
  | 'league_update'
  | 'tournament_update'
  | 'achievement_unlocked'
  | 'system';

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  gameReminders: boolean;
  friendRequests: boolean;
  clubUpdates: boolean;
  leagueUpdates: boolean;
  tournamentUpdates: boolean;
  marketingEmails: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showRating: boolean;
  showLocation: boolean;
  showStats: boolean;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  cursor?: string;
  hasMore?: boolean;
}

// =============================================================================
// Matchmaking Types
// =============================================================================

export interface MatchRequest {
  id: string;
  userId: string;
  format: GameFormat;
  type: 'looking_for_game' | 'looking_for_partner' | 'challenge';
  preferredTime?: TimeSlot;
  location: GeoLocation;
  maxDistance: number;
  ratingRange: { min: number; max: number };
  status: 'active' | 'matched' | 'expired' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface MatchSuggestion {
  matchRequestId: string;
  suggestedUserId: string;
  compatibilityScore: number;
  distance: number;
  ratingDifference: number;
  mutualFriends: number;
}

// =============================================================================
// Operating Hours
// =============================================================================

export interface OperatingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  openTime: string; // HH:mm
  closeTime: string;
  isClosed: boolean;
}

// =============================================================================
// Reservation Types
// =============================================================================

export interface Reservation {
  id: string;
  courtId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  gameId?: string;
  notes?: string;
  createdAt: Date;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

// =============================================================================
// Statistics Types
// =============================================================================

export interface PlayerStats {
  userId: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  longestWinStreak: number;
  averagePointsFor: number;
  averagePointsAgainst: number;
  ratingHistory: RatingHistoryEntry[];
  formatStats: Record<GameFormat, FormatStats>;
}

export interface RatingHistoryEntry {
  date: Date;
  rating: number;
  gameId: string;
  change: number;
}

export interface FormatStats {
  games: number;
  wins: number;
  losses: number;
  winRate: number;
}

// =============================================================================
// Challenge Types
// =============================================================================

export interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  format: GameFormat;
  proposedTimes: TimeSlot[];
  message?: string;
  status: ChallengeStatus;
  selectedTimeSlot?: TimeSlot;
  courtId?: string;
  gameId?: string;
  createdAt: Date;
  expiresAt: Date;
}

export type ChallengeStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'completed'
  | 'cancelled';

// =============================================================================
// Review Types
// =============================================================================

export interface VenueReview {
  id: string;
  venueId: string;
  userId: string;
  rating: number;
  comment?: string;
  photos?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Event Types (for activity feeds)
// =============================================================================

export interface ActivityEvent {
  id: string;
  userId: string;
  type: ActivityEventType;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export type ActivityEventType =
  | 'game_completed'
  | 'achievement_unlocked'
  | 'joined_club'
  | 'tournament_win'
  | 'league_promotion'
  | 'new_rating'
  | 'friend_added';

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

/** @deprecated Use SkillLevel type instead */
export enum SkillLevelEnum {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  PRO = 'PRO',
}

/** @deprecated Use SurfaceType type instead */
export enum SurfaceTypeEnum {
  CONCRETE = 'CONCRETE',
  ASPHALT = 'ASPHALT',
  SPORT_COURT = 'SPORT_COURT',
  WOOD = 'WOOD',
}

/** @deprecated Use appropriate status type instead */
export enum CourtStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE',
  CLOSED = 'CLOSED',
}

/** @deprecated Use ReservationStatus type instead */
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/** @deprecated Use GameFormat type instead */
export enum GameTypeEnum {
  SINGLES = 'SINGLES',
  DOUBLES = 'DOUBLES',
  MIXED_DOUBLES = 'MIXED_DOUBLES',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

/** @deprecated Use GameStatus type instead */
export enum GameStatusEnum {
  OPEN = 'OPEN',
  FULL = 'FULL',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// =============================================================================
// Pagination Types (for backward compatibility)
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
