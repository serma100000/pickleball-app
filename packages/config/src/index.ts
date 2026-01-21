import { z } from 'zod';

// =============================================================================
// Environment Variable Validation
// =============================================================================

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),

  // App settings
  APP_NAME: z.string().default('Pickle Play'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // Database
  DATABASE_URL: z.string().optional(),

  // Authentication
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // OAuth providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),

  // External services
  DUPR_API_KEY: z.string().optional(),
  DUPR_API_URL: z.string().url().default('https://api.dupr.gg'),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'cloudinary']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email
  EMAIL_PROVIDER: z.enum(['smtp', 'sendgrid', 'ses', 'resend']).default('smtp'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@pickleplay.app'),

  // Push notifications
  FCM_PROJECT_ID: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  APNS_KEY_ID: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_BUNDLE_ID: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Feature flags (can also be managed by a service)
  FF_MATCHMAKING: z.coerce.boolean().default(true),
  FF_TOURNAMENTS: z.coerce.boolean().default(true),
  FF_LEAGUES: z.coerce.boolean().default(true),
  FF_CLUBS: z.coerce.boolean().default(true),
  FF_ACHIEVEMENTS: z.coerce.boolean().default(true),
  FF_CHAT: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * @throws {ZodError} if validation fails
 */
export function validateEnv(env: Record<string, unknown> = process.env): Env {
  return envSchema.parse(env);
}

/**
 * Get validated environment variables (safe version that returns partial)
 */
export function getEnv(): Partial<Env> {
  try {
    return validateEnv();
  } catch {
    return envSchema.partial().parse(process.env);
  }
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// =============================================================================
// Feature Flags
// =============================================================================

export interface FeatureFlags {
  matchmaking: boolean;
  tournaments: boolean;
  leagues: boolean;
  clubs: boolean;
  achievements: boolean;
  chat: boolean;
  duprIntegration: boolean;
  socialSharing: boolean;
  darkMode: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  courtBooking: boolean;
  premiumFeatures: boolean;
}

export const defaultFeatureFlags: FeatureFlags = {
  matchmaking: true,
  tournaments: true,
  leagues: true,
  clubs: true,
  achievements: true,
  chat: false,
  duprIntegration: true,
  socialSharing: true,
  darkMode: true,
  pushNotifications: true,
  emailNotifications: true,
  courtBooking: true,
  premiumFeatures: false,
};

/**
 * Get feature flags from environment or defaults
 */
export function getFeatureFlags(): FeatureFlags {
  const env = getEnv();
  return {
    ...defaultFeatureFlags,
    matchmaking: env.FF_MATCHMAKING ?? defaultFeatureFlags.matchmaking,
    tournaments: env.FF_TOURNAMENTS ?? defaultFeatureFlags.tournaments,
    leagues: env.FF_LEAGUES ?? defaultFeatureFlags.leagues,
    clubs: env.FF_CLUBS ?? defaultFeatureFlags.clubs,
    achievements: env.FF_ACHIEVEMENTS ?? defaultFeatureFlags.achievements,
    chat: env.FF_CHAT ?? defaultFeatureFlags.chat,
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] ?? false;
}

// =============================================================================
// API Endpoints
// =============================================================================

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    oauth: {
      google: '/auth/oauth/google',
      apple: '/auth/oauth/apple',
    },
  },

  // Users
  users: {
    base: '/users',
    me: '/users/me',
    byId: (id: string) => `/users/${id}`,
    stats: (id: string) => `/users/${id}/stats`,
    games: (id: string) => `/users/${id}/games`,
    achievements: (id: string) => `/users/${id}/achievements`,
    friends: (id: string) => `/users/${id}/friends`,
    search: '/users/search',
  },

  // Games
  games: {
    base: '/games',
    byId: (id: string) => `/games/${id}`,
    verify: (id: string) => `/games/${id}/verify`,
    dispute: (id: string) => `/games/${id}/dispute`,
  },

  // Courts & Venues
  venues: {
    base: '/venues',
    byId: (id: string) => `/venues/${id}`,
    search: '/venues/search',
    nearby: '/venues/nearby',
    reviews: (id: string) => `/venues/${id}/reviews`,
    courts: (id: string) => `/venues/${id}/courts`,
  },

  // Clubs
  clubs: {
    base: '/clubs',
    byId: (id: string) => `/clubs/${id}`,
    members: (id: string) => `/clubs/${id}/members`,
    join: (id: string) => `/clubs/${id}/join`,
    leave: (id: string) => `/clubs/${id}/leave`,
    games: (id: string) => `/clubs/${id}/games`,
  },

  // Tournaments
  tournaments: {
    base: '/tournaments',
    byId: (id: string) => `/tournaments/${id}`,
    register: (id: string) => `/tournaments/${id}/register`,
    withdraw: (id: string) => `/tournaments/${id}/withdraw`,
    brackets: (id: string) => `/tournaments/${id}/brackets`,
    results: (id: string) => `/tournaments/${id}/results`,
  },

  // Leagues
  leagues: {
    base: '/leagues',
    byId: (id: string) => `/leagues/${id}`,
    join: (id: string) => `/leagues/${id}/join`,
    standings: (id: string) => `/leagues/${id}/standings`,
    schedule: (id: string) => `/leagues/${id}/schedule`,
  },

  // Matchmaking
  matchmaking: {
    requests: '/matchmaking/requests',
    requestById: (id: string) => `/matchmaking/requests/${id}`,
    suggestions: '/matchmaking/suggestions',
    accept: (id: string) => `/matchmaking/suggestions/${id}/accept`,
    decline: (id: string) => `/matchmaking/suggestions/${id}/decline`,
  },

  // Social
  friends: {
    base: '/friends',
    request: '/friends/request',
    accept: (id: string) => `/friends/${id}/accept`,
    decline: (id: string) => `/friends/${id}/decline`,
    remove: (id: string) => `/friends/${id}`,
    block: (id: string) => `/friends/${id}/block`,
  },

  // Challenges
  challenges: {
    base: '/challenges',
    byId: (id: string) => `/challenges/${id}`,
    respond: (id: string) => `/challenges/${id}/respond`,
  },

  // Notifications
  notifications: {
    base: '/notifications',
    byId: (id: string) => `/notifications/${id}`,
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    settings: '/notifications/settings',
  },

  // Reservations
  reservations: {
    base: '/reservations',
    byId: (id: string) => `/reservations/${id}`,
    byCourt: (courtId: string) => `/courts/${courtId}/reservations`,
  },

  // Achievements
  achievements: {
    base: '/achievements',
    byId: (id: string) => `/achievements/${id}`,
  },

  // DUPR Integration
  dupr: {
    sync: '/dupr/sync',
    profile: '/dupr/profile',
    games: '/dupr/games',
  },

  // Upload
  upload: {
    image: '/upload/image',
    avatar: '/upload/avatar',
  },
} as const;

// =============================================================================
// Rating Constants
// =============================================================================

export const RATING_CONSTANTS = {
  // DUPR rating ranges
  DUPR: {
    MIN: 0.0,
    MAX: 8.0,
    BEGINNER_MAX: 2.99,
    INTERMEDIATE_MIN: 3.0,
    INTERMEDIATE_MAX: 3.99,
    ADVANCED_MIN: 4.0,
    ADVANCED_MAX: 4.99,
    PRO_MIN: 5.0,
    PRO_MAX: 8.0,
  },

  // Internal rating system
  INTERNAL: {
    MIN: 0.0,
    MAX: 8.0,
    DEFAULT: 3.0,
    K_FACTOR: 32, // ELO-style K factor for rating changes
    WIN_PROBABILITY_BASE: 10,
    WIN_PROBABILITY_DIVISOR: 400,
  },

  // Rating change limits
  CHANGE: {
    MIN_GAME_CHANGE: -0.5,
    MAX_GAME_CHANGE: 0.5,
    VERIFIED_MULTIPLIER: 1.0,
    UNVERIFIED_MULTIPLIER: 0.5,
  },

  // Skill level thresholds
  SKILL_LEVELS: {
    BEGINNER: { min: 0.0, max: 2.99, label: 'Beginner' },
    INTERMEDIATE: { min: 3.0, max: 3.99, label: 'Intermediate' },
    ADVANCED: { min: 4.0, max: 4.99, label: 'Advanced' },
    PRO: { min: 5.0, max: 8.0, label: 'Pro' },
  },
} as const;

// =============================================================================
// Pagination Defaults
// =============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CURSOR_BASED_DEFAULT_LIMIT: 20,
} as const;

// =============================================================================
// File Upload Limits
// =============================================================================

export const FILE_UPLOAD = {
  // Maximum file sizes in bytes
  MAX_SIZE: {
    AVATAR: 5 * 1024 * 1024, // 5MB
    IMAGE: 10 * 1024 * 1024, // 10MB
    DOCUMENT: 25 * 1024 * 1024, // 25MB
  },

  // Allowed MIME types
  ALLOWED_TYPES: {
    AVATAR: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'],
    DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },

  // Image dimensions
  DIMENSIONS: {
    AVATAR: {
      MIN_WIDTH: 100,
      MIN_HEIGHT: 100,
      MAX_WIDTH: 2000,
      MAX_HEIGHT: 2000,
      RECOMMENDED_SIZE: 400,
    },
    THUMBNAIL: {
      WIDTH: 150,
      HEIGHT: 150,
    },
    COVER: {
      WIDTH: 1200,
      HEIGHT: 400,
    },
  },

  // Upload limits per user
  LIMITS: {
    MAX_VENUE_IMAGES: 10,
    MAX_REVIEW_IMAGES: 5,
    MAX_CLUB_IMAGES: 5,
  },
} as const;

// =============================================================================
// Game Constants
// =============================================================================

export const GAME_CONSTANTS = {
  // Points
  WINNING_SCORE: 11,
  WIN_BY: 2,
  MAX_SCORE: 21,

  // Players
  SINGLES_PLAYERS: 2,
  DOUBLES_PLAYERS: 4,

  // Games per match
  GAMES_TO_WIN: 2,
  MAX_GAMES: 3,

  // Time limits (in minutes)
  GAME_TIME_LIMIT: 25,
  MATCH_TIME_LIMIT: 75,

  // Verification
  VERIFICATION_WINDOW_HOURS: 48,
  DISPUTE_WINDOW_HOURS: 72,
} as const;

// =============================================================================
// Tournament Constants
// =============================================================================

export const TOURNAMENT_CONSTANTS = {
  // Bracket sizes (must be powers of 2)
  BRACKET_SIZES: [4, 8, 16, 32, 64, 128, 256],

  // Pool play
  MIN_POOL_SIZE: 3,
  MAX_POOL_SIZE: 8,
  DEFAULT_POOL_SIZE: 4,

  // Registration
  MIN_REGISTRATION_DAYS: 1,
  DEFAULT_REGISTRATION_DAYS: 14,

  // Divisions
  MIN_DIVISIONS: 1,
  MAX_DIVISIONS: 16,
} as const;

// =============================================================================
// League Constants
// =============================================================================

export const LEAGUE_CONSTANTS = {
  // Season length
  MIN_SEASON_WEEKS: 4,
  MAX_SEASON_WEEKS: 26,
  DEFAULT_SEASON_WEEKS: 8,

  // Participants
  MIN_PARTICIPANTS: 4,
  MAX_PARTICIPANTS: 64,

  // Matches per week
  DEFAULT_MATCHES_PER_WEEK: 1,
  MAX_MATCHES_PER_WEEK: 3,

  // Forfeit rules
  FORFEIT_DEADLINE_HOURS: 24,
  MAX_FORFEITS_BEFORE_REMOVAL: 3,
} as const;

// =============================================================================
// Matchmaking Constants
// =============================================================================

export const MATCHMAKING_CONSTANTS = {
  // Request expiration
  DEFAULT_EXPIRATION_HOURS: 24,
  MAX_EXPIRATION_HOURS: 168, // 1 week

  // Distance
  DEFAULT_MAX_DISTANCE_MILES: 25,
  MAX_DISTANCE_MILES: 100,

  // Rating range
  DEFAULT_RATING_RANGE: 0.5,
  MAX_RATING_RANGE: 2.0,

  // Suggestions
  MAX_SUGGESTIONS: 10,
  MIN_COMPATIBILITY_SCORE: 50,
} as const;

// =============================================================================
// Social Constants
// =============================================================================

export const SOCIAL_CONSTANTS = {
  // Friends
  MAX_FRIENDS: 1000,
  MAX_PENDING_REQUESTS: 100,

  // Clubs
  MAX_CLUBS_PER_USER: 10,
  MIN_CLUB_NAME_LENGTH: 3,
  MAX_CLUB_NAME_LENGTH: 100,
  MAX_CLUB_DESCRIPTION_LENGTH: 2000,

  // Messages (future feature)
  MAX_MESSAGE_LENGTH: 1000,
  MAX_GROUP_SIZE: 50,
} as const;

// =============================================================================
// Notification Constants
// =============================================================================

export const NOTIFICATION_CONSTANTS = {
  // Retention
  MAX_NOTIFICATIONS: 100,
  RETENTION_DAYS: 30,

  // Batching
  BATCH_SIZE: 10,
  BATCH_INTERVAL_MS: 60000, // 1 minute

  // Reminders
  GAME_REMINDER_HOURS: [24, 2], // 24 hours and 2 hours before
  TOURNAMENT_REMINDER_HOURS: [72, 24], // 3 days and 1 day before
} as const;

// =============================================================================
// Cache TTL (in seconds)
// =============================================================================

export const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  USER_STATS: 600, // 10 minutes
  VENUE_LIST: 1800, // 30 minutes
  VENUE_DETAILS: 900, // 15 minutes
  TOURNAMENT_LIST: 300, // 5 minutes
  LEAGUE_STANDINGS: 60, // 1 minute
  LEADERBOARD: 300, // 5 minutes
  NEARBY_VENUES: 600, // 10 minutes
  SEARCH_RESULTS: 180, // 3 minutes
} as const;

// =============================================================================
// Export env schema for custom validation
// =============================================================================

export { envSchema };
