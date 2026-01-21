import { z } from 'zod';

// =============================================================================
// Common Schemas
// =============================================================================

export const idSchema = z.string().min(1, 'ID is required');

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
  .optional();

export const urlSchema = z.string().url('Invalid URL').optional();

export const dateSchema = z.coerce.date();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

// =============================================================================
// Geographic Schemas
// =============================================================================

export const geoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export type GeoLocationInput = z.infer<typeof geoLocationSchema>;

// =============================================================================
// User Schemas
// =============================================================================

export const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'pro']);

export type SkillLevel = z.infer<typeof skillLevelSchema>;

export const notificationSettingsSchema = z.object({
  pushEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
  gameReminders: z.boolean().default(true),
  friendRequests: z.boolean().default(true),
  clubUpdates: z.boolean().default(true),
  leagueUpdates: z.boolean().default(true),
  tournamentUpdates: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const privacySettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'friends', 'private']).default('public'),
  showRating: z.boolean().default(true),
  showLocation: z.boolean().default(true),
  showStats: z.boolean().default(true),
});

export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

export const gameFormatSchema = z.enum(['singles', 'doubles', 'mixed_doubles']);

export type GameFormat = z.infer<typeof gameFormatSchema>;

export const userPreferencesSchema = z.object({
  playStyle: z.enum(['competitive', 'recreational', 'social']).default('recreational'),
  preferredFormats: z.array(gameFormatSchema).default(['doubles']),
  notificationSettings: notificationSettingsSchema.default({}),
  privacy: privacySettingsSchema.default({}),
});

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const createUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  avatarUrl: urlSchema,
  skillLevel: skillLevelSchema.default('beginner'),
  duprRating: z.number().min(0).max(8).optional(),
  internalRating: z.number().min(0).max(8).default(3.0),
  location: geoLocationSchema.optional(),
  preferences: userPreferencesSchema.default({}),
});

export type CreateUser = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().omit({ email: true });

export type UpdateUser = z.infer<typeof updateUserSchema>;

export const userSchema = createUserSchema.extend({
  id: idSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export type User = z.infer<typeof userSchema>;

// =============================================================================
// Game Schemas
// =============================================================================

export const gameTypeSchema = z.enum(['casual', 'competitive', 'league', 'tournament']);

export type GameType = z.infer<typeof gameTypeSchema>;

export const gameStatusSchema = z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']);

export type GameStatus = z.infer<typeof gameStatusSchema>;

export const verificationStatusSchema = z.enum(['pending', 'verified', 'disputed']);

export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const gamePlayerSchema = z.object({
  id: idSchema,
  userId: idSchema,
  team: z.enum(['team1', 'team2']),
  position: z.enum(['left', 'right']).optional(),
});

export type GamePlayer = z.infer<typeof gamePlayerSchema>;

export const gameScoreSchema = z.object({
  gameNumber: z.number().int().min(1).max(5),
  team1Score: z.number().int().min(0).max(21),
  team2Score: z.number().int().min(0).max(21),
});

export type GameScore = z.infer<typeof gameScoreSchema>;

export const createGameSchema = z.object({
  format: gameFormatSchema,
  type: gameTypeSchema.default('casual'),
  courtId: idSchema.optional(),
  scheduledAt: dateSchema.optional(),
  players: z.array(gamePlayerSchema).min(2).max(4),
});

export type CreateGame = z.infer<typeof createGameSchema>;

export const updateGameSchema = z.object({
  status: gameStatusSchema.optional(),
  courtId: idSchema.optional(),
  scheduledAt: dateSchema.optional(),
  startedAt: dateSchema.optional(),
  completedAt: dateSchema.optional(),
  scores: z.array(gameScoreSchema).optional(),
  winner: z.enum(['team1', 'team2']).optional(),
  verificationStatus: verificationStatusSchema.optional(),
});

export type UpdateGame = z.infer<typeof updateGameSchema>;

export const gameSchema = createGameSchema.extend({
  id: idSchema,
  status: gameStatusSchema,
  startedAt: dateSchema.optional(),
  completedAt: dateSchema.optional(),
  scores: z.array(gameScoreSchema),
  winner: z.enum(['team1', 'team2']).optional(),
  verificationStatus: verificationStatusSchema,
  createdBy: idSchema,
  createdAt: dateSchema,
});

export type Game = z.infer<typeof gameSchema>;

// =============================================================================
// Court & Venue Schemas
// =============================================================================

export const surfaceTypeSchema = z.enum(['concrete', 'asphalt', 'sport_court', 'wood', 'other']);

export type SurfaceType = z.infer<typeof surfaceTypeSchema>;

export const courtStatusSchema = z.enum(['available', 'occupied', 'maintenance']);

export type CourtStatus = z.infer<typeof courtStatusSchema>;

export const courtSchema = z.object({
  id: idSchema,
  venueId: idSchema,
  name: z.string().min(1).max(100),
  surfaceType: surfaceTypeSchema,
  isIndoor: z.boolean().default(false),
  hasLights: z.boolean().default(false),
  status: courtStatusSchema.default('available'),
});

export type Court = z.infer<typeof courtSchema>;

export const createCourtSchema = courtSchema.omit({ id: true, venueId: true });

export type CreateCourt = z.infer<typeof createCourtSchema>;

export const operatingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  isClosed: z.boolean().default(false),
});

export type OperatingHours = z.infer<typeof operatingHoursSchema>;

export const createVenueSchema = z.object({
  name: z.string().min(1, 'Venue name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  location: geoLocationSchema,
  amenities: z.array(z.string()).default([]),
  operatingHours: z.array(operatingHoursSchema).length(7).optional(),
  isPublic: z.boolean().default(true),
  websiteUrl: urlSchema,
  phoneNumber: phoneSchema,
  imageUrls: z.array(z.string().url()).default([]),
});

export type CreateVenue = z.infer<typeof createVenueSchema>;

export const updateVenueSchema = createVenueSchema.partial();

export type UpdateVenue = z.infer<typeof updateVenueSchema>;

export const venueSchema = createVenueSchema.extend({
  id: idSchema,
  courts: z.array(courtSchema),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().min(0).default(0),
});

export type Venue = z.infer<typeof venueSchema>;

// =============================================================================
// Club Schemas
// =============================================================================

export const clubRoleSchema = z.enum(['owner', 'admin', 'moderator', 'member']);

export type ClubRole = z.infer<typeof clubRoleSchema>;

export const membershipTypeSchema = z.enum(['open', 'approval', 'invite']);

export type MembershipType = z.infer<typeof membershipTypeSchema>;

export const membershipStatusSchema = z.enum(['active', 'inactive', 'banned']);

export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const createClubSchema = z.object({
  name: z.string().min(1, 'Club name is required').max(100),
  description: z.string().max(2000).optional(),
  logoUrl: urlSchema,
  location: geoLocationSchema,
  isPublic: z.boolean().default(true),
  membershipType: membershipTypeSchema.default('open'),
});

export type CreateClub = z.infer<typeof createClubSchema>;

export const updateClubSchema = createClubSchema.partial();

export type UpdateClub = z.infer<typeof updateClubSchema>;

export const clubSchema = createClubSchema.extend({
  id: idSchema,
  memberCount: z.number().int().min(0).default(0),
  createdAt: dateSchema,
});

export type Club = z.infer<typeof clubSchema>;

export const clubMembershipSchema = z.object({
  userId: idSchema,
  clubId: idSchema,
  role: clubRoleSchema.default('member'),
  joinedAt: dateSchema,
  status: membershipStatusSchema.default('active'),
});

export type ClubMembership = z.infer<typeof clubMembershipSchema>;

export const updateMembershipSchema = z.object({
  role: clubRoleSchema.optional(),
  status: membershipStatusSchema.optional(),
});

export type UpdateMembership = z.infer<typeof updateMembershipSchema>;

// =============================================================================
// Tournament Schemas
// =============================================================================

export const tournamentFormatSchema = z.enum([
  'single_elimination',
  'double_elimination',
  'round_robin',
  'pool_play',
  'swiss',
]);

export type TournamentFormat = z.infer<typeof tournamentFormatSchema>;

export const tournamentStatusSchema = z.enum([
  'draft',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
]);

export type TournamentStatus = z.infer<typeof tournamentStatusSchema>;

export const bracketTypeSchema = z.enum(['winners', 'losers', 'finals']);

export type BracketType = z.infer<typeof bracketTypeSchema>;

export const bracketMatchSchema = z.object({
  id: idSchema,
  round: z.number().int().min(1),
  position: z.number().int().min(1),
  team1Id: idSchema.optional(),
  team2Id: idSchema.optional(),
  winnerId: idSchema.optional(),
  scheduledAt: dateSchema.optional(),
  courtId: idSchema.optional(),
  scores: z.array(gameScoreSchema),
  status: gameStatusSchema,
});

export type BracketMatch = z.infer<typeof bracketMatchSchema>;

export const bracketSchema = z.object({
  id: idSchema,
  type: bracketTypeSchema,
  matches: z.array(bracketMatchSchema),
});

export type Bracket = z.infer<typeof bracketSchema>;

export const tournamentDivisionSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  format: gameFormatSchema,
  minRating: z.number().min(0).max(8).optional(),
  maxRating: z.number().min(0).max(8).optional(),
  brackets: z.array(bracketSchema).default([]),
});

export type TournamentDivision = z.infer<typeof tournamentDivisionSchema>;

export const createTournamentDivisionSchema = tournamentDivisionSchema.omit({ id: true, brackets: true });

export type CreateTournamentDivision = z.infer<typeof createTournamentDivisionSchema>;

export const createTournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required').max(200),
  description: z.string().max(5000).optional(),
  format: tournamentFormatSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  registrationDeadline: dateSchema,
  venueId: idSchema,
  divisions: z.array(createTournamentDivisionSchema).min(1),
  maxParticipants: z.number().int().min(2).max(256),
  entryFee: z.number().min(0).optional(),
});

export type CreateTournament = z.infer<typeof createTournamentSchema>;

export const updateTournamentSchema = createTournamentSchema.partial().extend({
  status: tournamentStatusSchema.optional(),
});

export type UpdateTournament = z.infer<typeof updateTournamentSchema>;

export const tournamentSchema = createTournamentSchema.extend({
  id: idSchema,
  status: tournamentStatusSchema,
  divisions: z.array(tournamentDivisionSchema),
  currentParticipants: z.number().int().min(0).default(0),
  organizerId: idSchema,
  createdAt: dateSchema,
});

export type Tournament = z.infer<typeof tournamentSchema>;

// =============================================================================
// League Schemas
// =============================================================================

export const leagueTypeSchema = z.enum(['ladder', 'round_robin', 'flex', 'team']);

export type LeagueType = z.infer<typeof leagueTypeSchema>;

export const leagueStatusSchema = z.enum(['registration', 'active', 'completed', 'cancelled']);

export type LeagueStatus = z.infer<typeof leagueStatusSchema>;

export const leagueMatchStatusSchema = z.enum(['scheduled', 'completed', 'forfeited']);

export type LeagueMatchStatus = z.infer<typeof leagueMatchStatusSchema>;

export const leagueStandingSchema = z.object({
  rank: z.number().int().min(1),
  participantId: idSchema,
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  pointsFor: z.number().int().min(0),
  pointsAgainst: z.number().int().min(0),
  gamesPlayed: z.number().int().min(0),
});

export type LeagueStanding = z.infer<typeof leagueStandingSchema>;

export const leagueMatchSchema = z.object({
  id: idSchema,
  week: z.number().int().min(1),
  participant1Id: idSchema,
  participant2Id: idSchema,
  scheduledAt: dateSchema.optional(),
  gameId: idSchema.optional(),
  status: leagueMatchStatusSchema,
});

export type LeagueMatch = z.infer<typeof leagueMatchSchema>;

export const createLeagueSchema = z.object({
  name: z.string().min(1, 'League name is required').max(200),
  description: z.string().max(2000).optional(),
  format: gameFormatSchema,
  type: leagueTypeSchema,
  seasonStartDate: dateSchema,
  seasonEndDate: dateSchema,
  clubId: idSchema.optional(),
});

export type CreateLeague = z.infer<typeof createLeagueSchema>;

export const updateLeagueSchema = createLeagueSchema.partial().extend({
  status: leagueStatusSchema.optional(),
});

export type UpdateLeague = z.infer<typeof updateLeagueSchema>;

export const leagueSchema = createLeagueSchema.extend({
  id: idSchema,
  status: leagueStatusSchema,
  standings: z.array(leagueStandingSchema),
  schedule: z.array(leagueMatchSchema),
  createdAt: dateSchema,
});

export type League = z.infer<typeof leagueSchema>;

// =============================================================================
// Matchmaking Schemas
// =============================================================================

export const matchRequestTypeSchema = z.enum(['looking_for_game', 'looking_for_partner', 'challenge']);

export type MatchRequestType = z.infer<typeof matchRequestTypeSchema>;

export const matchRequestStatusSchema = z.enum(['active', 'matched', 'expired', 'cancelled']);

export type MatchRequestStatus = z.infer<typeof matchRequestStatusSchema>;

export const timeSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

export const ratingRangeSchema = z
  .object({
    min: z.number().min(0).max(8),
    max: z.number().min(0).max(8),
  })
  .refine((data) => data.min <= data.max, {
    message: 'Minimum rating must be less than or equal to maximum rating',
  });

export type RatingRange = z.infer<typeof ratingRangeSchema>;

export const createMatchRequestSchema = z.object({
  format: gameFormatSchema,
  type: matchRequestTypeSchema.default('looking_for_game'),
  preferredTime: timeSlotSchema.optional(),
  location: geoLocationSchema,
  maxDistance: z.number().min(1).max(100).default(25),
  ratingRange: ratingRangeSchema,
  expiresAt: dateSchema.optional(),
});

export type CreateMatchRequest = z.infer<typeof createMatchRequestSchema>;

export const matchRequestSchema = createMatchRequestSchema.extend({
  id: idSchema,
  userId: idSchema,
  status: matchRequestStatusSchema,
  createdAt: dateSchema,
});

export type MatchRequest = z.infer<typeof matchRequestSchema>;

export const matchSuggestionSchema = z.object({
  matchRequestId: idSchema,
  suggestedUserId: idSchema,
  compatibilityScore: z.number().min(0).max(100),
  distance: z.number().min(0),
  ratingDifference: z.number(),
  mutualFriends: z.number().int().min(0),
});

export type MatchSuggestion = z.infer<typeof matchSuggestionSchema>;

// =============================================================================
// Social Schemas
// =============================================================================

export const friendshipStatusSchema = z.enum(['pending', 'accepted', 'blocked']);

export type FriendshipStatus = z.infer<typeof friendshipStatusSchema>;

export const createFriendRequestSchema = z.object({
  addresseeId: idSchema,
});

export type CreateFriendRequest = z.infer<typeof createFriendRequestSchema>;

export const friendshipSchema = z.object({
  id: idSchema,
  requesterId: idSchema,
  addresseeId: idSchema,
  status: friendshipStatusSchema,
  createdAt: dateSchema,
});

export type Friendship = z.infer<typeof friendshipSchema>;

// =============================================================================
// Achievement Schemas
// =============================================================================

export const achievementCategorySchema = z.enum([
  'games',
  'social',
  'tournaments',
  'clubs',
  'improvement',
  'streaks',
  'exploration',
]);

export type AchievementCategory = z.infer<typeof achievementCategorySchema>;

export const achievementRequirementSchema = z.object({
  type: z.string(),
  threshold: z.number(),
});

export type AchievementRequirement = z.infer<typeof achievementRequirementSchema>;

export const achievementSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  iconUrl: z.string().url(),
  category: achievementCategorySchema,
  requirement: achievementRequirementSchema,
  points: z.number().int().min(0),
});

export type Achievement = z.infer<typeof achievementSchema>;

export const userAchievementSchema = z.object({
  achievementId: idSchema,
  unlockedAt: dateSchema,
  progress: z.number().min(0).max(100),
});

export type UserAchievement = z.infer<typeof userAchievementSchema>;

// =============================================================================
// Notification Schemas
// =============================================================================

export const notificationTypeSchema = z.enum([
  'game_invite',
  'game_reminder',
  'game_result',
  'friend_request',
  'friend_accepted',
  'club_invite',
  'league_update',
  'tournament_update',
  'achievement_unlocked',
  'system',
]);

export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: idSchema,
  userId: idSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().max(1000),
  data: z.record(z.unknown()).optional(),
  read: z.boolean().default(false),
  createdAt: dateSchema,
});

export type Notification = z.infer<typeof notificationSchema>;

// =============================================================================
// Challenge Schemas
// =============================================================================

export const challengeStatusSchema = z.enum([
  'pending',
  'accepted',
  'declined',
  'expired',
  'completed',
  'cancelled',
]);

export type ChallengeStatus = z.infer<typeof challengeStatusSchema>;

export const createChallengeSchema = z.object({
  challengedId: idSchema,
  format: gameFormatSchema,
  proposedTimes: z.array(timeSlotSchema).min(1).max(5),
  message: z.string().max(500).optional(),
  expiresAt: dateSchema.optional(),
});

export type CreateChallenge = z.infer<typeof createChallengeSchema>;

export const respondToChallengeSchema = z.object({
  accept: z.boolean(),
  selectedTimeSlot: timeSlotSchema.optional(),
  courtId: idSchema.optional(),
});

export type RespondToChallenge = z.infer<typeof respondToChallengeSchema>;

export const challengeSchema = createChallengeSchema.extend({
  id: idSchema,
  challengerId: idSchema,
  status: challengeStatusSchema,
  selectedTimeSlot: timeSlotSchema.optional(),
  courtId: idSchema.optional(),
  gameId: idSchema.optional(),
  createdAt: dateSchema,
});

export type Challenge = z.infer<typeof challengeSchema>;

// =============================================================================
// Review Schemas
// =============================================================================

export const createVenueReviewSchema = z.object({
  venueId: idSchema,
  rating: z.number().min(1).max(5),
  comment: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

export type CreateVenueReview = z.infer<typeof createVenueReviewSchema>;

export const updateVenueReviewSchema = createVenueReviewSchema.partial().omit({ venueId: true });

export type UpdateVenueReview = z.infer<typeof updateVenueReviewSchema>;

export const venueReviewSchema = createVenueReviewSchema.extend({
  id: idSchema,
  userId: idSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export type VenueReview = z.infer<typeof venueReviewSchema>;

// =============================================================================
// Reservation Schemas
// =============================================================================

export const reservationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed']);

export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const createReservationSchema = z.object({
  courtId: idSchema,
  startTime: dateSchema,
  endTime: dateSchema,
  gameId: idSchema.optional(),
  notes: z.string().max(500).optional(),
});

export type CreateReservation = z.infer<typeof createReservationSchema>;

export const updateReservationSchema = z.object({
  startTime: dateSchema.optional(),
  endTime: dateSchema.optional(),
  status: reservationStatusSchema.optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateReservation = z.infer<typeof updateReservationSchema>;

export const reservationSchema = createReservationSchema.extend({
  id: idSchema,
  userId: idSchema,
  status: reservationStatusSchema,
  createdAt: dateSchema,
});

export type Reservation = z.infer<typeof reservationSchema>;

// =============================================================================
// Search & Filter Schemas
// =============================================================================

export const searchPlayersSchema = z.object({
  query: z.string().optional(),
  skillLevel: skillLevelSchema.optional(),
  minRating: z.number().min(0).max(8).optional(),
  maxRating: z.number().min(0).max(8).optional(),
  location: geoLocationSchema.optional(),
  maxDistance: z.number().min(1).max(100).optional(),
  ...paginationSchema.shape,
});

export type SearchPlayers = z.infer<typeof searchPlayersSchema>;

export const searchVenuesSchema = z.object({
  query: z.string().optional(),
  location: geoLocationSchema.optional(),
  maxDistance: z.number().min(1).max(100).optional(),
  isIndoor: z.boolean().optional(),
  hasLights: z.boolean().optional(),
  surfaceType: surfaceTypeSchema.optional(),
  minRating: z.number().min(0).max(5).optional(),
  amenities: z.array(z.string()).optional(),
  ...paginationSchema.shape,
});

export type SearchVenues = z.infer<typeof searchVenuesSchema>;

export const searchGamesSchema = z.object({
  format: gameFormatSchema.optional(),
  type: gameTypeSchema.optional(),
  status: gameStatusSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  venueId: idSchema.optional(),
  playerId: idSchema.optional(),
  ...paginationSchema.shape,
});

export type SearchGames = z.infer<typeof searchGamesSchema>;

// =============================================================================
// API Response Schemas
// =============================================================================

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.array(z.string())).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const apiMetaSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  totalCount: z.number().optional(),
  totalPages: z.number().optional(),
  cursor: z.string().optional(),
  hasMore: z.boolean().optional(),
});

export type ApiMeta = z.infer<typeof apiMetaSchema>;

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: apiErrorSchema.optional(),
    meta: apiMetaSchema.optional(),
  });
}

// =============================================================================
// Auth Schemas
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// =============================================================================
// Re-export Zod
// =============================================================================

export { z };
