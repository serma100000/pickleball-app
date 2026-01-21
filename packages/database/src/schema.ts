import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  varchar,
  date,
  time,
  inet,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const skillLevelEnum = pgEnum('skill_level', [
  'beginner',
  'intermediate',
  'advanced',
  'pro',
]);

export const gameFormatEnum = pgEnum('game_format', [
  'singles',
  'doubles',
  'mixed_doubles',
]);

export const gameTypeEnum = pgEnum('game_type', [
  'casual',
  'competitive',
  'tournament',
  'league',
  'ladder',
]);

export const gameStatusEnum = pgEnum('game_status', [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'forfeited',
]);

export const ratingTypeEnum = pgEnum('rating_type', [
  'dupr',
  'internal',
  'self_reported',
]);

export const venueTypeEnum = pgEnum('venue_type', [
  'public',
  'private',
  'club',
  'recreation_center',
  'school',
  'gym',
]);

export const surfaceTypeEnum = pgEnum('surface_type', [
  'concrete',
  'asphalt',
  'sport_court',
  'wood',
  'indoor',
  'turf',
]);

export const clubRoleEnum = pgEnum('club_role', [
  'owner',
  'admin',
  'moderator',
  'member',
]);

export const membershipStatusEnum = pgEnum('membership_status', [
  'pending',
  'active',
  'suspended',
  'expired',
  'cancelled',
]);

export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'blocked',
]);

export const tournamentFormatEnum = pgEnum('tournament_format', [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'pool_play',
  'swiss',
]);

export const tournamentStatusEnum = pgEnum('tournament_status', [
  'draft',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const bracketStatusEnum = pgEnum('bracket_status', [
  'pending',
  'in_progress',
  'completed',
]);

export const leagueStatusEnum = pgEnum('league_status', [
  'draft',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
]);

export const genderEnum = pgEnum('gender', [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
]);

export const dominantHandEnum = pgEnum('dominant_hand', [
  'left',
  'right',
  'ambidextrous',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'game_invite',
  'game_reminder',
  'game_completed',
  'friend_request',
  'friend_accepted',
  'club_invite',
  'club_approved',
  'tournament_registration',
  'tournament_reminder',
  'match_scheduled',
  'match_result',
  'rating_update',
  'achievement_earned',
  'league_update',
  'system',
]);

export const registrationStatusEnum = pgEnum('registration_status', [
  'registered',
  'waitlisted',
  'confirmed',
  'withdrawn',
  'disqualified',
]);

export const eventRegistrationStatusEnum = pgEnum('event_registration_status', [
  'registered',
  'waitlisted',
  'cancelled',
  'attended',
]);

export const participantStatusEnum = pgEnum('participant_status', [
  'active',
  'withdrawn',
  'disqualified',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'INSERT',
  'UPDATE',
  'DELETE',
]);

// ============================================================================
// CORE USERS (3 tables)
// ============================================================================

// Users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),

    // Profile information
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 100 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    bio: text('bio'),
    dateOfBirth: date('date_of_birth'),
    gender: genderEnum('gender'),

    // Location
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }).default('USA'),
    zipCode: varchar('zip_code', { length: 20 }),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),

    // Player information
    skillLevel: skillLevelEnum('skill_level'),
    playStyle: varchar('play_style', { length: 50 }),
    dominantHand: dominantHandEnum('dominant_hand'),
    paddleBrand: varchar('paddle_brand', { length: 100 }),
    yearsPlaying: integer('years_playing'),

    // Preferences (JSONB for flexibility)
    preferredPlayTimes: jsonb('preferred_play_times').notNull().default([]),
    preferredGameTypes: jsonb('preferred_game_types').notNull().default(['doubles']),
    willingToTravelMiles: integer('willing_to_travel_miles').default(25),
    notificationPreferences: jsonb('notification_preferences')
      .notNull()
      .default({ email: true, push: true, sms: false }),
    privacySettings: jsonb('privacy_settings')
      .notNull()
      .default({ profile_public: true, show_rating: true, show_stats: true }),

    // Account status
    emailVerified: boolean('email_verified').default(false),
    phone: varchar('phone', { length: 20 }),
    phoneVerified: boolean('phone_verified').default(false),
    isActive: boolean('is_active').default(true),
    isBanned: boolean('is_banned').default(false),
    banReason: text('ban_reason'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

    // Clerk integration (optional)
    clerkId: text('clerk_id').unique(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    usernameIdx: uniqueIndex('users_username_idx').on(table.username),
    clerkIdIdx: uniqueIndex('users_clerk_id_idx').on(table.clerkId),
    locationIdx: index('users_location_idx').on(table.latitude, table.longitude),
    skillLevelIdx: index('users_skill_level_idx').on(table.skillLevel),
    cityStateIdx: index('users_city_state_idx').on(table.city, table.state),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  })
);

// User ratings table (current ratings)
export const userRatings = pgTable(
  'user_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ratingType: ratingTypeEnum('rating_type').notNull(),
    gameFormat: gameFormatEnum('game_format').notNull(),

    // Rating values
    rating: decimal('rating', { precision: 4, scale: 2 }).notNull(),
    reliabilityScore: decimal('reliability_score', { precision: 3, scale: 2 }),
    gamesPlayed: integer('games_played').default(0),
    wins: integer('wins').default(0),
    losses: integer('losses').default(0),

    // DUPR-specific fields
    duprId: varchar('dupr_id', { length: 50 }),
    duprLastSync: timestamp('dupr_last_sync', { withTimezone: true }),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_ratings_user_id_idx').on(table.userId),
    ratingIdx: index('user_ratings_rating_idx').on(table.rating),
    typeFormatIdx: index('user_ratings_type_format_idx').on(
      table.ratingType,
      table.gameFormat
    ),
    uniqueUserTypeFormat: unique('user_ratings_unique').on(
      table.userId,
      table.ratingType,
      table.gameFormat
    ),
  })
);

// Rating history table
export const ratingHistory = pgTable(
  'rating_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ratingType: ratingTypeEnum('rating_type').notNull(),
    gameFormat: gameFormatEnum('game_format').notNull(),

    oldRating: decimal('old_rating', { precision: 4, scale: 2 }),
    newRating: decimal('new_rating', { precision: 4, scale: 2 }).notNull(),

    // What caused the change
    sourceType: varchar('source_type', { length: 50 }).notNull(), // 'game', 'tournament', 'league', 'manual', 'dupr_sync'
    sourceId: uuid('source_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('rating_history_user_id_idx').on(table.userId),
    createdAtIdx: index('rating_history_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// VENUES AND COURTS (3 tables)
// ============================================================================

// Venues table
export const venues = pgTable(
  'venues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    description: text('description'),
    venueType: venueTypeEnum('venue_type').notNull(),

    // Contact information
    website: varchar('website', { length: 500 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),

    // Address
    streetAddress: varchar('street_address', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }).notNull(),
    country: varchar('country', { length: 100 }).default('USA'),
    zipCode: varchar('zip_code', { length: 20 }).notNull(),
    latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),

    // Amenities (JSONB for flexibility)
    amenities: jsonb('amenities').notNull().default([]),
    // Example: ["restrooms", "water_fountain", "parking", "pro_shop", "lights", "covered"]

    // Operating hours (JSONB for flexibility)
    operatingHours: jsonb('operating_hours').notNull().default({}),
    // Example: {"monday": {"open": "06:00", "close": "22:00"}, ...}

    // Images
    coverImageUrl: varchar('cover_image_url', { length: 500 }),
    imageUrls: jsonb('image_urls').notNull().default([]),

    // Ratings
    averageRating: decimal('average_rating', { precision: 2, scale: 1 }).default('0'),
    totalReviews: integer('total_reviews').default(0),

    // Management
    ownerId: uuid('owner_id').references(() => users.id),
    isVerified: boolean('is_verified').default(false),
    isActive: boolean('is_active').default(true),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('venues_slug_idx').on(table.slug),
    locationIdx: index('venues_location_idx').on(table.latitude, table.longitude),
    cityStateIdx: index('venues_city_state_idx').on(table.city, table.state),
    venueTypeIdx: index('venues_type_idx').on(table.venueType),
  })
);

// Courts table
export const courts = pgTable(
  'courts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    courtNumber: integer('court_number'),

    // Court details
    surface: surfaceTypeEnum('surface').notNull(),
    isIndoor: boolean('is_indoor').default(false),
    hasLights: boolean('has_lights').default(false),
    isCovered: boolean('is_covered').default(false),

    // Dimensions (standard is 20x44 feet)
    widthFeet: decimal('width_feet', { precision: 5, scale: 2 }).default('20'),
    lengthFeet: decimal('length_feet', { precision: 5, scale: 2 }).default('44'),

    // Availability
    isReservable: boolean('is_reservable').default(true),
    requiresMembership: boolean('requires_membership').default(false),
    isActive: boolean('is_active').default(true),

    // Pricing (nullable for free courts)
    hourlyRate: decimal('hourly_rate', { precision: 8, scale: 2 }),
    peakHourlyRate: decimal('peak_hourly_rate', { precision: 8, scale: 2 }),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    venueIdIdx: index('courts_venue_id_idx').on(table.venueId),
    uniqueVenueCourtNumber: unique('courts_venue_court_number').on(
      table.venueId,
      table.courtNumber
    ),
  })
);

// Court reviews table
export const courtReviews = pgTable(
  'court_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courtId: uuid('court_id').references(() => courts.id, { onDelete: 'set null' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    rating: integer('rating').notNull(), // 1-5
    title: varchar('title', { length: 200 }),
    content: text('content'),

    // Detailed ratings
    surfaceQuality: integer('surface_quality'), // 1-5
    netQuality: integer('net_quality'), // 1-5
    lightingQuality: integer('lighting_quality'), // 1-5
    cleanliness: integer('cleanliness'), // 1-5

    // Moderation
    isApproved: boolean('is_approved').default(true),
    isFlagged: boolean('is_flagged').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    venueIdIdx: index('court_reviews_venue_id_idx').on(table.venueId),
    userIdIdx: index('court_reviews_user_id_idx').on(table.userId),
    uniqueVenueUser: unique('court_reviews_venue_user').on(table.venueId, table.userId),
  })
);

// ============================================================================
// GAMES (2 tables)
// ============================================================================

// Games table
export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Game classification
    gameType: gameTypeEnum('game_type').notNull().default('casual'),
    gameFormat: gameFormatEnum('game_format').notNull(),
    status: gameStatusEnum('status').notNull().default('scheduled'),

    // Location
    venueId: uuid('venue_id').references(() => venues.id),
    courtId: uuid('court_id').references(() => courts.id),
    locationNotes: text('location_notes'),

    // Scheduling
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),

    // Scoring
    winningTeam: integer('winning_team'), // 1 or 2
    isDraw: boolean('is_draw').default(false),

    // Score storage (JSONB for flexibility with different formats)
    scores: jsonb('scores').notNull().default([]),
    // Example: [{"team1": 11, "team2": 9}, {"team1": 11, "team2": 7}]

    // Game settings
    pointsToWin: integer('points_to_win').default(11),
    winBy: integer('win_by').default(2),
    bestOf: integer('best_of').default(1),

    // Rating impact
    isRated: boolean('is_rated').default(true),
    ratingProcessed: boolean('rating_processed').default(false),
    ratingProcessedAt: timestamp('rating_processed_at', { withTimezone: true }),

    // References (nullable, for linking to tournaments/leagues)
    tournamentMatchId: uuid('tournament_match_id'),
    leagueMatchId: uuid('league_match_id'),

    // Metadata
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('games_status_idx').on(table.status),
    gameTypeIdx: index('games_type_idx').on(table.gameType),
    scheduledAtIdx: index('games_scheduled_at_idx').on(table.scheduledAt),
    venueIdIdx: index('games_venue_id_idx').on(table.venueId),
    createdByIdx: index('games_created_by_idx').on(table.createdBy),
  })
);

// Game participants table
export const gameParticipants = pgTable(
  'game_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Team assignment
    team: integer('team').notNull(), // 1 or 2
    position: varchar('position', { length: 20 }), // 'left', 'right' for doubles

    // Individual stats (optional)
    pointsScored: integer('points_scored'),
    aces: integer('aces'),
    faults: integer('faults'),

    // Rating at time of game (snapshot)
    ratingAtGame: decimal('rating_at_game', { precision: 4, scale: 2 }),
    ratingChange: decimal('rating_change', { precision: 4, scale: 2 }),

    // Confirmation
    isConfirmed: boolean('is_confirmed').default(false),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    gameIdIdx: index('game_participants_game_id_idx').on(table.gameId),
    userIdIdx: index('game_participants_user_id_idx').on(table.userId),
    teamIdx: index('game_participants_team_idx').on(table.gameId, table.team),
    uniqueGameUser: unique('game_participants_game_user').on(table.gameId, table.userId),
  })
);

// ============================================================================
// CLUBS (4 tables)
// ============================================================================

// Clubs table
export const clubs = pgTable(
  'clubs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    description: text('description'),

    // Club details
    logoUrl: varchar('logo_url', { length: 500 }),
    coverImageUrl: varchar('cover_image_url', { length: 500 }),
    website: varchar('website', { length: 500 }),

    // Location
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }).default('USA'),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),

    // Home venue
    homeVenueId: uuid('home_venue_id').references(() => venues.id),

    // Membership settings
    isPublic: boolean('is_public').default(true),
    requiresApproval: boolean('requires_approval').default(false),
    maxMembers: integer('max_members'),

    // Stats (denormalized for performance)
    memberCount: integer('member_count').default(0),
    activeMemberCount: integer('active_member_count').default(0),

    // Skill range
    minSkillLevel: skillLevelEnum('min_skill_level'),
    maxSkillLevel: skillLevelEnum('max_skill_level'),
    averageRating: decimal('average_rating', { precision: 4, scale: 2 }),

    // Social
    socialLinks: jsonb('social_links').notNull().default({}),

    // Settings
    settings: jsonb('settings').notNull().default({}),

    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('clubs_slug_idx').on(table.slug),
    locationIdx: index('clubs_location_idx').on(table.latitude, table.longitude),
    cityStateIdx: index('clubs_city_state_idx').on(table.city, table.state),
  })
);

// Club memberships table
export const clubMemberships = pgTable(
  'club_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    role: clubRoleEnum('role').notNull().default('member'),
    status: membershipStatusEnum('status').notNull().default('pending'),

    // Dates
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Stats within club
    gamesPlayed: integer('games_played').default(0),
    eventsAttended: integer('events_attended').default(0),

    // Moderation
    invitedBy: uuid('invited_by').references(() => users.id),
    approvedBy: uuid('approved_by').references(() => users.id),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clubIdIdx: index('club_memberships_club_id_idx').on(table.clubId),
    userIdIdx: index('club_memberships_user_id_idx').on(table.userId),
    statusIdx: index('club_memberships_status_idx').on(table.status),
    uniqueClubUser: unique('club_memberships_club_user').on(table.clubId, table.userId),
  })
);

// Club events table
export const clubEvents = pgTable(
  'club_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),

    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'open_play', 'clinic', 'social', 'tournament', 'practice'

    // Location
    venueId: uuid('venue_id').references(() => venues.id),
    locationNotes: text('location_notes'),

    // Timing
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('America/New_York'),

    // Capacity
    maxParticipants: integer('max_participants'),
    currentParticipants: integer('current_participants').default(0),
    waitlistEnabled: boolean('waitlist_enabled').default(true),

    // Registration
    registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }),
    registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }),

    // Requirements
    minRating: decimal('min_rating', { precision: 4, scale: 2 }),
    maxRating: decimal('max_rating', { precision: 4, scale: 2 }),
    membersOnly: boolean('members_only').default(true),

    // Settings
    isRecurring: boolean('is_recurring').default(false),
    recurrenceRule: jsonb('recurrence_rule'),

    isCancelled: boolean('is_cancelled').default(false),
    cancelledReason: text('cancelled_reason'),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clubIdIdx: index('club_events_club_id_idx').on(table.clubId),
    startsAtIdx: index('club_events_starts_at_idx').on(table.startsAt),
  })
);

// Club event registrations table
export const clubEventRegistrations = pgTable(
  'club_event_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => clubEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    status: eventRegistrationStatusEnum('status').notNull().default('registered'),
    waitlistPosition: integer('waitlist_position'),

    registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    attendedAt: timestamp('attended_at', { withTimezone: true }),
  },
  (table) => ({
    eventIdIdx: index('club_event_registrations_event_id_idx').on(table.eventId),
    userIdIdx: index('club_event_registrations_user_id_idx').on(table.userId),
    uniqueEventUser: unique('club_event_registrations_event_user').on(
      table.eventId,
      table.userId
    ),
  })
);

// ============================================================================
// TOURNAMENTS (5 tables)
// ============================================================================

// Tournaments table
export const tournaments = pgTable(
  'tournaments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    description: text('description'),

    // Organizer
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => users.id),
    clubId: uuid('club_id').references(() => clubs.id),

    // Location
    venueId: uuid('venue_id').references(() => venues.id),
    locationNotes: text('location_notes'),

    // Dates
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('America/New_York'),

    // Registration
    registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }),
    registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }),
    maxParticipants: integer('max_participants'),
    currentParticipants: integer('current_participants').default(0),
    waitlistEnabled: boolean('waitlist_enabled').default(true),

    // Format
    tournamentFormat: tournamentFormatEnum('tournament_format').notNull(),
    gameFormat: gameFormatEnum('game_format').notNull(),

    // Settings
    pointsToWin: integer('points_to_win').default(11),
    winBy: integer('win_by').default(2),
    bestOf: integer('best_of').default(1),

    // Rating requirements
    isRated: boolean('is_rated').default(true),
    minRating: decimal('min_rating', { precision: 4, scale: 2 }),
    maxRating: decimal('max_rating', { precision: 4, scale: 2 }),

    // Images
    logoUrl: varchar('logo_url', { length: 500 }),
    bannerUrl: varchar('banner_url', { length: 500 }),

    // Rules
    rules: text('rules'),

    status: tournamentStatusEnum('status').notNull().default('draft'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('tournaments_slug_idx').on(table.slug),
    statusIdx: index('tournaments_status_idx').on(table.status),
    startsAtIdx: index('tournaments_starts_at_idx').on(table.startsAt),
    organizerIdIdx: index('tournaments_organizer_id_idx').on(table.organizerId),
  })
);

// Tournament divisions table
export const tournamentDivisions = pgTable(
  'tournament_divisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    gameFormat: gameFormatEnum('game_format').notNull(),

    minRating: decimal('min_rating', { precision: 4, scale: 2 }),
    maxRating: decimal('max_rating', { precision: 4, scale: 2 }),

    maxTeams: integer('max_teams'),
    currentTeams: integer('current_teams').default(0),

    sortOrder: integer('sort_order').default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentIdIdx: index('tournament_divisions_tournament_id_idx').on(table.tournamentId),
  })
);

// Tournament registrations table
export const tournamentRegistrations = pgTable(
  'tournament_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    divisionId: uuid('division_id').references(() => tournamentDivisions.id, {
      onDelete: 'cascade',
    }),

    // For doubles, this is the team registration
    teamName: varchar('team_name', { length: 100 }),
    seed: integer('seed'),

    status: registrationStatusEnum('status').notNull().default('registered'),
    waitlistPosition: integer('waitlist_position'),

    // Payment tracking (reference only, no financial data)
    paymentReference: varchar('payment_reference', { length: 100 }),
    paymentStatus: paymentStatusEnum('payment_status').default('pending'),

    registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),

    notes: text('notes'),
  },
  (table) => ({
    tournamentIdIdx: index('tournament_registrations_tournament_id_idx').on(
      table.tournamentId
    ),
    statusIdx: index('tournament_registrations_status_idx').on(table.status),
  })
);

// Tournament registration players table
export const tournamentRegistrationPlayers = pgTable(
  'tournament_registration_players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => tournamentRegistrations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    isCaptain: boolean('is_captain').default(false),
    ratingAtRegistration: decimal('rating_at_registration', { precision: 4, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('tournament_registration_players_user_id_idx').on(table.userId),
    uniqueRegistrationUser: unique('tournament_registration_players_unique').on(
      table.registrationId,
      table.userId
    ),
  })
);

// Tournament brackets table
export const tournamentBrackets = pgTable(
  'tournament_brackets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    divisionId: uuid('division_id').references(() => tournamentDivisions.id, {
      onDelete: 'cascade',
    }),

    name: varchar('name', { length: 100 }).notNull(), // 'Main', 'Consolation', 'Pool A', etc.
    bracketType: varchar('bracket_type', { length: 50 }).notNull(), // 'winners', 'losers', 'consolation', 'pool'

    status: bracketStatusEnum('status').notNull().default('pending'),

    // For pool play
    poolSize: integer('pool_size'),
    advancementCount: integer('advancement_count'),

    bracketData: jsonb('bracket_data'), // Stores bracket structure

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tournamentIdIdx: index('tournament_brackets_tournament_id_idx').on(table.tournamentId),
  })
);

// Tournament matches table
export const tournamentMatches = pgTable(
  'tournament_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id')
      .notNull()
      .references(() => tournaments.id, { onDelete: 'cascade' }),
    bracketId: uuid('bracket_id')
      .notNull()
      .references(() => tournamentBrackets.id, { onDelete: 'cascade' }),

    // Bracket position
    roundNumber: integer('round_number').notNull(),
    matchNumber: integer('match_number').notNull(),

    // Teams (registration IDs)
    team1RegistrationId: uuid('team1_registration_id').references(
      () => tournamentRegistrations.id
    ),
    team2RegistrationId: uuid('team2_registration_id').references(
      () => tournamentRegistrations.id
    ),

    // From previous matches (for bracket progression)
    team1FromMatchId: uuid('team1_from_match_id'),
    team2FromMatchId: uuid('team2_from_match_id'),
    team1FromPosition: varchar('team1_from_position', { length: 10 }), // 'winner' or 'loser'
    team2FromPosition: varchar('team2_from_position', { length: 10 }),

    // Scheduling
    courtId: uuid('court_id').references(() => courts.id),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Results
    status: gameStatusEnum('status').notNull().default('scheduled'),
    winnerRegistrationId: uuid('winner_registration_id').references(
      () => tournamentRegistrations.id
    ),

    scores: jsonb('scores').notNull().default([]),

    // Link to detailed game record
    gameId: uuid('game_id').references(() => games.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bracketIdIdx: index('tournament_matches_bracket_id_idx').on(table.bracketId),
    scheduledAtIdx: index('tournament_matches_scheduled_at_idx').on(table.scheduledAt),
    uniqueBracketRoundMatch: unique('tournament_matches_bracket_round_match').on(
      table.bracketId,
      table.roundNumber,
      table.matchNumber
    ),
  })
);

// ============================================================================
// LEAGUES (5 tables)
// ============================================================================

// Leagues table
export const leagues = pgTable(
  'leagues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    description: text('description'),

    // Organizer
    organizerId: uuid('organizer_id')
      .notNull()
      .references(() => users.id),
    clubId: uuid('club_id').references(() => clubs.id),

    // Location
    venueId: uuid('venue_id').references(() => venues.id),

    // Format
    gameFormat: gameFormatEnum('game_format').notNull(),

    // Rating requirements
    isRated: boolean('is_rated').default(true),
    minRating: decimal('min_rating', { precision: 4, scale: 2 }),
    maxRating: decimal('max_rating', { precision: 4, scale: 2 }),

    // Settings
    settings: jsonb('settings').notNull().default({}),
    rules: text('rules'),

    // Images
    logoUrl: varchar('logo_url', { length: 500 }),

    status: leagueStatusEnum('status').notNull().default('draft'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('leagues_slug_idx').on(table.slug),
    statusIdx: index('leagues_status_idx').on(table.status),
  })
);

// League seasons table
export const leagueSeasons = pgTable(
  'league_seasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }).notNull(), // 'Spring 2024', 'Season 1', etc.
    seasonNumber: integer('season_number').notNull(),

    // Dates
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

    // Registration
    registrationOpensAt: timestamp('registration_opens_at', { withTimezone: true }),
    registrationClosesAt: timestamp('registration_closes_at', { withTimezone: true }),
    maxParticipants: integer('max_participants'),

    // Schedule
    matchesPerWeek: integer('matches_per_week').default(1),
    matchDay: varchar('match_day', { length: 20 }), // 'monday', 'tuesday', etc.
    defaultMatchTime: time('default_match_time'),

    // Scoring
    pointsForWin: integer('points_for_win').default(3),
    pointsForDraw: integer('points_for_draw').default(1),
    pointsForLoss: integer('points_for_loss').default(0),

    status: leagueStatusEnum('status').notNull().default('draft'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leagueIdIdx: index('league_seasons_league_id_idx').on(table.leagueId),
    statusIdx: index('league_seasons_status_idx').on(table.status),
    uniqueLeagueSeason: unique('league_seasons_league_season').on(
      table.leagueId,
      table.seasonNumber
    ),
  })
);

// League participants table
export const leagueParticipants = pgTable(
  'league_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seasonId: uuid('season_id')
      .notNull()
      .references(() => leagueSeasons.id, { onDelete: 'cascade' }),

    teamName: varchar('team_name', { length: 100 }),

    // Standings
    matchesPlayed: integer('matches_played').default(0),
    wins: integer('wins').default(0),
    losses: integer('losses').default(0),
    draws: integer('draws').default(0),
    points: integer('points').default(0),

    // Game stats
    gamesWon: integer('games_won').default(0),
    gamesLost: integer('games_lost').default(0),
    pointsScored: integer('points_scored').default(0),
    pointsConceded: integer('points_conceded').default(0),

    // Ranking
    rank: integer('rank'),
    previousRank: integer('previous_rank'),

    status: participantStatusEnum('status').notNull().default('active'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    seasonIdIdx: index('league_participants_season_id_idx').on(table.seasonId),
    rankIdx: index('league_participants_rank_idx').on(table.rank),
  })
);

// League participant players table
export const leagueParticipantPlayers = pgTable(
  'league_participant_players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => leagueParticipants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    isCaptain: boolean('is_captain').default(false),
    ratingAtRegistration: decimal('rating_at_registration', { precision: 4, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('league_participant_players_user_id_idx').on(table.userId),
    uniqueParticipantUser: unique('league_participant_players_unique').on(
      table.participantId,
      table.userId
    ),
  })
);

// League matches table
export const leagueMatches = pgTable(
  'league_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seasonId: uuid('season_id')
      .notNull()
      .references(() => leagueSeasons.id, { onDelete: 'cascade' }),

    // Match week
    weekNumber: integer('week_number').notNull(),

    // Participants
    participant1Id: uuid('participant1_id')
      .notNull()
      .references(() => leagueParticipants.id),
    participant2Id: uuid('participant2_id')
      .notNull()
      .references(() => leagueParticipants.id),

    // Scheduling
    courtId: uuid('court_id').references(() => courts.id),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Results
    status: gameStatusEnum('status').notNull().default('scheduled'),
    winnerParticipantId: uuid('winner_participant_id').references(
      () => leagueParticipants.id
    ),

    scores: jsonb('scores').notNull().default([]),

    // Points awarded
    participant1Points: integer('participant1_points'),
    participant2Points: integer('participant2_points'),

    // Link to detailed game record
    gameId: uuid('game_id').references(() => games.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    seasonIdIdx: index('league_matches_season_id_idx').on(table.seasonId),
    weekIdx: index('league_matches_week_idx').on(table.seasonId, table.weekNumber),
    scheduledAtIdx: index('league_matches_scheduled_at_idx').on(table.scheduledAt),
  })
);

// League standings history table
export const leagueStandingsHistory = pgTable(
  'league_standings_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => leagueParticipants.id, { onDelete: 'cascade' }),

    weekNumber: integer('week_number').notNull(),
    rank: integer('rank').notNull(),
    points: integer('points').notNull(),

    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueParticipantWeek: unique('league_standings_history_unique').on(
      table.participantId,
      table.weekNumber
    ),
  })
);

// ============================================================================
// SOCIAL FEATURES (5 tables)
// ============================================================================

// User friendships table
export const userFriendships = pgTable(
  'user_friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    status: friendshipStatusEnum('status').notNull().default('pending'),

    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => ({
    requesterIdx: index('user_friendships_requester_idx').on(table.requesterId),
    addresseeIdx: index('user_friendships_addressee_idx').on(table.addresseeId),
    statusIdx: index('user_friendships_status_idx').on(table.status),
  })
);

// Achievements table
export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description').notNull(),

    // Categorization
    category: varchar('category', { length: 50 }).notNull(), // 'games', 'social', 'tournament', 'league', 'skill', 'special'
    tier: varchar('tier', { length: 20 }).default('bronze'), // 'bronze', 'silver', 'gold', 'platinum'

    // Display
    iconUrl: varchar('icon_url', { length: 500 }),
    badgeColor: varchar('badge_color', { length: 20 }),

    // Requirements (JSONB for flexibility)
    requirements: jsonb('requirements').notNull(),
    // Examples:
    // {"type": "games_played", "count": 100}
    // {"type": "win_streak", "count": 5}
    // {"type": "rating_reached", "rating": 4.0}

    // Points
    points: integer('points').default(0),

    // Rarity (calculated based on holders)
    rarityPercentage: decimal('rarity_percentage', { precision: 5, scale: 2 }),

    isActive: boolean('is_active').default(true),
    isSecret: boolean('is_secret').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex('achievements_code_idx').on(table.code),
  })
);

// User achievements table
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),

    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),

    // Progress tracking (for progressive achievements)
    progress: jsonb('progress'),

    // Reference to what triggered it
    sourceType: varchar('source_type', { length: 50 }),
    sourceId: uuid('source_id'),
  },
  (table) => ({
    userIdIdx: index('user_achievements_user_id_idx').on(table.userId),
    achievementIdIdx: index('user_achievements_achievement_id_idx').on(table.achievementId),
    uniqueUserAchievement: unique('user_achievements_unique').on(
      table.userId,
      table.achievementId
    ),
  })
);

// Activity feed events table
export const activityFeedEvents = pgTable(
  'activity_feed_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    eventType: varchar('event_type', { length: 50 }).notNull(),
    // Types: 'game_completed', 'achievement_earned', 'rating_changed',
    // 'tournament_joined', 'club_joined', 'friend_added', 'league_joined'

    // Event data
    eventData: jsonb('event_data').notNull(),

    // Reference
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),

    // Visibility
    isPublic: boolean('is_public').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('activity_feed_user_id_idx').on(table.userId),
    createdAtIdx: index('activity_feed_created_at_idx').on(table.createdAt),
    eventTypeIdx: index('activity_feed_type_idx').on(table.eventType),
  })
);

// Notifications table
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    type: notificationTypeEnum('type').notNull(),

    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),

    // Action
    actionUrl: varchar('action_url', { length: 500 }),
    actionData: jsonb('action_data'),

    // Reference
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),

    // Status
    isRead: boolean('is_read').default(false),
    readAt: timestamp('read_at', { withTimezone: true }),

    // Delivery
    emailSent: boolean('email_sent').default(false),
    pushSent: boolean('push_sent').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    unreadIdx: index('notifications_unread_idx').on(table.userId, table.isRead),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  })
);

// User availability table
export const userAvailability = pgTable(
  'user_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Recurring availability
    dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 6=Saturday
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),

    // Optional date range
    effectiveFrom: date('effective_from'),
    effectiveUntil: date('effective_until'),

    // Preferences for this slot
    preferredVenueId: uuid('preferred_venue_id').references(() => venues.id),
    preferredGameFormat: gameFormatEnum('preferred_game_format'),

    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('user_availability_user_id_idx').on(table.userId),
    dayIdx: index('user_availability_day_idx').on(table.dayOfWeek),
  })
);

// ============================================================================
// SYSTEM TABLES (2 tables)
// ============================================================================

// Audit log table
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Who made the change
    userId: uuid('user_id').references(() => users.id),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),

    // What changed
    tableName: varchar('table_name', { length: 100 }).notNull(),
    recordId: uuid('record_id').notNull(),
    action: auditActionEnum('action').notNull(),

    // Change details
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    changedFields: text('changed_fields').array(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tableNameIdx: index('audit_log_table_name_idx').on(table.tableName),
    recordIdIdx: index('audit_log_record_id_idx').on(table.recordId),
    userIdIdx: index('audit_log_user_id_idx').on(table.userId),
    createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
  })
);

// System settings table
export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
});

// ============================================================================
// RELATIONS
// ============================================================================

// Users relations
export const usersRelations = relations(users, ({ many }) => ({
  ratings: many(userRatings),
  ratingHistory: many(ratingHistory),
  venuesOwned: many(venues),
  courtReviews: many(courtReviews),
  gamesCreated: many(games),
  gameParticipations: many(gameParticipants),
  clubsCreated: many(clubs),
  clubMemberships: many(clubMemberships),
  clubEventsCreated: many(clubEvents),
  clubEventRegistrations: many(clubEventRegistrations),
  tournamentsOrganized: many(tournaments),
  tournamentRegistrationPlayers: many(tournamentRegistrationPlayers),
  leaguesOrganized: many(leagues),
  leagueParticipantPlayers: many(leagueParticipantPlayers),
  sentFriendRequests: many(userFriendships, { relationName: 'requester' }),
  receivedFriendRequests: many(userFriendships, { relationName: 'addressee' }),
  achievements: many(userAchievements),
  activityFeed: many(activityFeedEvents),
  notifications: many(notifications),
  availability: many(userAvailability),
  auditLogs: many(auditLog),
}));

// User ratings relations
export const userRatingsRelations = relations(userRatings, ({ one }) => ({
  user: one(users, {
    fields: [userRatings.userId],
    references: [users.id],
  }),
}));

// Rating history relations
export const ratingHistoryRelations = relations(ratingHistory, ({ one }) => ({
  user: one(users, {
    fields: [ratingHistory.userId],
    references: [users.id],
  }),
}));

// Venues relations
export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(users, {
    fields: [venues.ownerId],
    references: [users.id],
  }),
  courts: many(courts),
  reviews: many(courtReviews),
  games: many(games),
  clubEvents: many(clubEvents),
  tournaments: many(tournaments),
  leagues: many(leagues),
}));

// Courts relations
export const courtsRelations = relations(courts, ({ one, many }) => ({
  venue: one(venues, {
    fields: [courts.venueId],
    references: [venues.id],
  }),
  reviews: many(courtReviews),
  games: many(games),
  tournamentMatches: many(tournamentMatches),
  leagueMatches: many(leagueMatches),
}));

// Court reviews relations
export const courtReviewsRelations = relations(courtReviews, ({ one }) => ({
  court: one(courts, {
    fields: [courtReviews.courtId],
    references: [courts.id],
  }),
  venue: one(venues, {
    fields: [courtReviews.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [courtReviews.userId],
    references: [users.id],
  }),
}));

// Games relations
export const gamesRelations = relations(games, ({ one, many }) => ({
  venue: one(venues, {
    fields: [games.venueId],
    references: [venues.id],
  }),
  court: one(courts, {
    fields: [games.courtId],
    references: [courts.id],
  }),
  createdByUser: one(users, {
    fields: [games.createdBy],
    references: [users.id],
  }),
  participants: many(gameParticipants),
  tournamentMatches: many(tournamentMatches),
  leagueMatches: many(leagueMatches),
}));

// Game participants relations
export const gameParticipantsRelations = relations(gameParticipants, ({ one }) => ({
  game: one(games, {
    fields: [gameParticipants.gameId],
    references: [games.id],
  }),
  user: one(users, {
    fields: [gameParticipants.userId],
    references: [users.id],
  }),
}));

// Clubs relations
export const clubsRelations = relations(clubs, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [clubs.createdBy],
    references: [users.id],
  }),
  homeVenue: one(venues, {
    fields: [clubs.homeVenueId],
    references: [venues.id],
  }),
  memberships: many(clubMemberships),
  events: many(clubEvents),
  tournaments: many(tournaments),
  leagues: many(leagues),
}));

// Club memberships relations
export const clubMembershipsRelations = relations(clubMemberships, ({ one }) => ({
  club: one(clubs, {
    fields: [clubMemberships.clubId],
    references: [clubs.id],
  }),
  user: one(users, {
    fields: [clubMemberships.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [clubMemberships.invitedBy],
    references: [users.id],
    relationName: 'invitedBy',
  }),
  approvedByUser: one(users, {
    fields: [clubMemberships.approvedBy],
    references: [users.id],
    relationName: 'approvedBy',
  }),
}));

// Club events relations
export const clubEventsRelations = relations(clubEvents, ({ one, many }) => ({
  club: one(clubs, {
    fields: [clubEvents.clubId],
    references: [clubs.id],
  }),
  venue: one(venues, {
    fields: [clubEvents.venueId],
    references: [venues.id],
  }),
  createdByUser: one(users, {
    fields: [clubEvents.createdBy],
    references: [users.id],
  }),
  registrations: many(clubEventRegistrations),
}));

// Club event registrations relations
export const clubEventRegistrationsRelations = relations(
  clubEventRegistrations,
  ({ one }) => ({
    event: one(clubEvents, {
      fields: [clubEventRegistrations.eventId],
      references: [clubEvents.id],
    }),
    user: one(users, {
      fields: [clubEventRegistrations.userId],
      references: [users.id],
    }),
  })
);

// Tournaments relations
export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  organizer: one(users, {
    fields: [tournaments.organizerId],
    references: [users.id],
  }),
  club: one(clubs, {
    fields: [tournaments.clubId],
    references: [clubs.id],
  }),
  venue: one(venues, {
    fields: [tournaments.venueId],
    references: [venues.id],
  }),
  divisions: many(tournamentDivisions),
  registrations: many(tournamentRegistrations),
  brackets: many(tournamentBrackets),
  matches: many(tournamentMatches),
}));

// Tournament divisions relations
export const tournamentDivisionsRelations = relations(
  tournamentDivisions,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [tournamentDivisions.tournamentId],
      references: [tournaments.id],
    }),
    registrations: many(tournamentRegistrations),
    brackets: many(tournamentBrackets),
  })
);

// Tournament registrations relations
export const tournamentRegistrationsRelations = relations(
  tournamentRegistrations,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [tournamentRegistrations.tournamentId],
      references: [tournaments.id],
    }),
    division: one(tournamentDivisions, {
      fields: [tournamentRegistrations.divisionId],
      references: [tournamentDivisions.id],
    }),
    players: many(tournamentRegistrationPlayers),
    matchesAsTeam1: many(tournamentMatches, { relationName: 'team1' }),
    matchesAsTeam2: many(tournamentMatches, { relationName: 'team2' }),
    matchesWon: many(tournamentMatches, { relationName: 'winner' }),
  })
);

// Tournament registration players relations
export const tournamentRegistrationPlayersRelations = relations(
  tournamentRegistrationPlayers,
  ({ one }) => ({
    registration: one(tournamentRegistrations, {
      fields: [tournamentRegistrationPlayers.registrationId],
      references: [tournamentRegistrations.id],
    }),
    user: one(users, {
      fields: [tournamentRegistrationPlayers.userId],
      references: [users.id],
    }),
  })
);

// Tournament brackets relations
export const tournamentBracketsRelations = relations(
  tournamentBrackets,
  ({ one, many }) => ({
    tournament: one(tournaments, {
      fields: [tournamentBrackets.tournamentId],
      references: [tournaments.id],
    }),
    division: one(tournamentDivisions, {
      fields: [tournamentBrackets.divisionId],
      references: [tournamentDivisions.id],
    }),
    matches: many(tournamentMatches),
  })
);

// Tournament matches relations
export const tournamentMatchesRelations = relations(tournamentMatches, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentMatches.tournamentId],
    references: [tournaments.id],
  }),
  bracket: one(tournamentBrackets, {
    fields: [tournamentMatches.bracketId],
    references: [tournamentBrackets.id],
  }),
  team1Registration: one(tournamentRegistrations, {
    fields: [tournamentMatches.team1RegistrationId],
    references: [tournamentRegistrations.id],
    relationName: 'team1',
  }),
  team2Registration: one(tournamentRegistrations, {
    fields: [tournamentMatches.team2RegistrationId],
    references: [tournamentRegistrations.id],
    relationName: 'team2',
  }),
  winnerRegistration: one(tournamentRegistrations, {
    fields: [tournamentMatches.winnerRegistrationId],
    references: [tournamentRegistrations.id],
    relationName: 'winner',
  }),
  court: one(courts, {
    fields: [tournamentMatches.courtId],
    references: [courts.id],
  }),
  game: one(games, {
    fields: [tournamentMatches.gameId],
    references: [games.id],
  }),
}));

// Leagues relations
export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  organizer: one(users, {
    fields: [leagues.organizerId],
    references: [users.id],
  }),
  club: one(clubs, {
    fields: [leagues.clubId],
    references: [clubs.id],
  }),
  venue: one(venues, {
    fields: [leagues.venueId],
    references: [venues.id],
  }),
  seasons: many(leagueSeasons),
}));

// League seasons relations
export const leagueSeasonsRelations = relations(leagueSeasons, ({ one, many }) => ({
  league: one(leagues, {
    fields: [leagueSeasons.leagueId],
    references: [leagues.id],
  }),
  participants: many(leagueParticipants),
  matches: many(leagueMatches),
}));

// League participants relations
export const leagueParticipantsRelations = relations(
  leagueParticipants,
  ({ one, many }) => ({
    season: one(leagueSeasons, {
      fields: [leagueParticipants.seasonId],
      references: [leagueSeasons.id],
    }),
    players: many(leagueParticipantPlayers),
    matchesAsParticipant1: many(leagueMatches, { relationName: 'participant1' }),
    matchesAsParticipant2: many(leagueMatches, { relationName: 'participant2' }),
    matchesWon: many(leagueMatches, { relationName: 'winner' }),
    standingsHistory: many(leagueStandingsHistory),
  })
);

// League participant players relations
export const leagueParticipantPlayersRelations = relations(
  leagueParticipantPlayers,
  ({ one }) => ({
    participant: one(leagueParticipants, {
      fields: [leagueParticipantPlayers.participantId],
      references: [leagueParticipants.id],
    }),
    user: one(users, {
      fields: [leagueParticipantPlayers.userId],
      references: [users.id],
    }),
  })
);

// League matches relations
export const leagueMatchesRelations = relations(leagueMatches, ({ one }) => ({
  season: one(leagueSeasons, {
    fields: [leagueMatches.seasonId],
    references: [leagueSeasons.id],
  }),
  participant1: one(leagueParticipants, {
    fields: [leagueMatches.participant1Id],
    references: [leagueParticipants.id],
    relationName: 'participant1',
  }),
  participant2: one(leagueParticipants, {
    fields: [leagueMatches.participant2Id],
    references: [leagueParticipants.id],
    relationName: 'participant2',
  }),
  winner: one(leagueParticipants, {
    fields: [leagueMatches.winnerParticipantId],
    references: [leagueParticipants.id],
    relationName: 'winner',
  }),
  court: one(courts, {
    fields: [leagueMatches.courtId],
    references: [courts.id],
  }),
  game: one(games, {
    fields: [leagueMatches.gameId],
    references: [games.id],
  }),
}));

// League standings history relations
export const leagueStandingsHistoryRelations = relations(
  leagueStandingsHistory,
  ({ one }) => ({
    participant: one(leagueParticipants, {
      fields: [leagueStandingsHistory.participantId],
      references: [leagueParticipants.id],
    }),
  })
);

// User friendships relations
export const userFriendshipsRelations = relations(userFriendships, ({ one }) => ({
  requester: one(users, {
    fields: [userFriendships.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  addressee: one(users, {
    fields: [userFriendships.addresseeId],
    references: [users.id],
    relationName: 'addressee',
  }),
}));

// Achievements relations
export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

// User achievements relations
export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

// Activity feed events relations
export const activityFeedEventsRelations = relations(activityFeedEvents, ({ one }) => ({
  user: one(users, {
    fields: [activityFeedEvents.userId],
    references: [users.id],
  }),
}));

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// User availability relations
export const userAvailabilityRelations = relations(userAvailability, ({ one }) => ({
  user: one(users, {
    fields: [userAvailability.userId],
    references: [users.id],
  }),
  preferredVenue: one(venues, {
    fields: [userAvailability.preferredVenueId],
    references: [venues.id],
  }),
}));

// Audit log relations
export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

// System settings relations
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserRating = typeof userRatings.$inferSelect;
export type NewUserRating = typeof userRatings.$inferInsert;

export type RatingHistory = typeof ratingHistory.$inferSelect;
export type NewRatingHistory = typeof ratingHistory.$inferInsert;

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

export type Court = typeof courts.$inferSelect;
export type NewCourt = typeof courts.$inferInsert;

export type CourtReview = typeof courtReviews.$inferSelect;
export type NewCourtReview = typeof courtReviews.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type GameParticipant = typeof gameParticipants.$inferSelect;
export type NewGameParticipant = typeof gameParticipants.$inferInsert;

export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;

export type ClubMembership = typeof clubMemberships.$inferSelect;
export type NewClubMembership = typeof clubMemberships.$inferInsert;

export type ClubEvent = typeof clubEvents.$inferSelect;
export type NewClubEvent = typeof clubEvents.$inferInsert;

export type ClubEventRegistration = typeof clubEventRegistrations.$inferSelect;
export type NewClubEventRegistration = typeof clubEventRegistrations.$inferInsert;

export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;

export type TournamentDivision = typeof tournamentDivisions.$inferSelect;
export type NewTournamentDivision = typeof tournamentDivisions.$inferInsert;

export type TournamentRegistration = typeof tournamentRegistrations.$inferSelect;
export type NewTournamentRegistration = typeof tournamentRegistrations.$inferInsert;

export type TournamentRegistrationPlayer = typeof tournamentRegistrationPlayers.$inferSelect;
export type NewTournamentRegistrationPlayer = typeof tournamentRegistrationPlayers.$inferInsert;

export type TournamentBracket = typeof tournamentBrackets.$inferSelect;
export type NewTournamentBracket = typeof tournamentBrackets.$inferInsert;

export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type NewTournamentMatch = typeof tournamentMatches.$inferInsert;

export type League = typeof leagues.$inferSelect;
export type NewLeague = typeof leagues.$inferInsert;

export type LeagueSeason = typeof leagueSeasons.$inferSelect;
export type NewLeagueSeason = typeof leagueSeasons.$inferInsert;

export type LeagueParticipant = typeof leagueParticipants.$inferSelect;
export type NewLeagueParticipant = typeof leagueParticipants.$inferInsert;

export type LeagueParticipantPlayer = typeof leagueParticipantPlayers.$inferSelect;
export type NewLeagueParticipantPlayer = typeof leagueParticipantPlayers.$inferInsert;

export type LeagueMatch = typeof leagueMatches.$inferSelect;
export type NewLeagueMatch = typeof leagueMatches.$inferInsert;

export type LeagueStandingsHistory = typeof leagueStandingsHistory.$inferSelect;
export type NewLeagueStandingsHistory = typeof leagueStandingsHistory.$inferInsert;

export type UserFriendship = typeof userFriendships.$inferSelect;
export type NewUserFriendship = typeof userFriendships.$inferInsert;

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

export type ActivityFeedEvent = typeof activityFeedEvents.$inferSelect;
export type NewActivityFeedEvent = typeof activityFeedEvents.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type UserAvailability = typeof userAvailability.$inferSelect;
export type NewUserAvailability = typeof userAvailability.$inferInsert;

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
