/**
 * Tournament Management System - Type Definitions
 *
 * Comprehensive type system for tournament management supporting:
 * - Up to 1000 participants per tournament
 * - Multiple events (singles, doubles, mixed doubles)
 * - Skill levels: 2.5, 3.0, 3.5, 4.0, 4.5, 5.0+
 * - Age divisions: Open, Junior, Senior 50+, 60+, 70+
 * - Formats: Single/Double Elimination, Round Robin, Pool Play, Pool-to-Bracket
 */

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Tournament format types
 */
export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  POOL_PLAY = 'pool_play',
  POOL_TO_BRACKET = 'pool_to_bracket',
}

/**
 * Event category (game format + gender)
 */
export enum EventCategory {
  MENS_SINGLES = 'mens_singles',
  WOMENS_SINGLES = 'womens_singles',
  MENS_DOUBLES = 'mens_doubles',
  WOMENS_DOUBLES = 'womens_doubles',
  MIXED_DOUBLES = 'mixed_doubles',
  OPEN_SINGLES = 'open_singles',
  OPEN_DOUBLES = 'open_doubles',
}

/**
 * Official DUPR/USAPA skill levels
 */
export enum SkillLevel {
  LEVEL_2_5 = '2.5',
  LEVEL_3_0 = '3.0',
  LEVEL_3_5 = '3.5',
  LEVEL_4_0 = '4.0',
  LEVEL_4_5 = '4.5',
  LEVEL_5_0 = '5.0',
  LEVEL_5_0_PLUS = '5.0+',
  LEVEL_5_5 = '5.5',
  LEVEL_6_0 = '6.0',
  LEVEL_PRO = 'pro',
}

/**
 * Age group divisions
 */
export enum AgeGroup {
  OPEN = 'open',
  JUNIOR_8 = 'junior_8',
  JUNIOR_11 = 'junior_11',
  JUNIOR_14 = 'junior_14',
  JUNIOR_18 = 'junior_18',
  ADULT_19_PLUS = 'adult_19_plus',
  SENIOR_35 = 'senior_35',
  SENIOR_50 = 'senior_50',
  SENIOR_55 = 'senior_55',
  SENIOR_60 = 'senior_60',
  SENIOR_65 = 'senior_65',
  SENIOR_70 = 'senior_70',
  SENIOR_75 = 'senior_75',
  SENIOR_80 = 'senior_80',
}

/**
 * Tournament status lifecycle
 */
export enum TournamentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  CHECK_IN_OPEN = 'check_in_open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Event status within a tournament
 */
export enum EventStatus {
  PENDING = 'pending',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  SEEDING = 'seeding',
  POOLS_IN_PROGRESS = 'pools_in_progress',
  BRACKET_IN_PROGRESS = 'bracket_in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Registration status for participants
 */
export enum RegistrationStatus {
  REGISTERED = 'registered',
  CONFIRMED = 'confirmed',
  WAITLISTED = 'waitlisted',
  WITHDRAWN = 'withdrawn',
  DISQUALIFIED = 'disqualified',
}

/**
 * Match status
 */
export enum MatchStatus {
  NOT_STARTED = 'not_started',
  SCHEDULED = 'scheduled',
  CALLED_TO_COURT = 'called_to_court',
  WARMUP = 'warmup',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FORFEITED = 'forfeited',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

/**
 * Bracket type within a tournament
 */
export enum BracketType {
  WINNERS = 'winners',
  LOSERS = 'losers',
  CONSOLATION = 'consolation',
  FINALS = 'finals',
  GOLD = 'gold',
  BRONZE = 'bronze',
}

/**
 * Seeding method
 */
export enum SeedingMethod {
  RANDOM = 'random',
  RATING = 'rating',
  MANUAL = 'manual',
  SNAKE = 'snake',
  HYBRID = 'hybrid',
}

/**
 * Pool standing tiebreaker rules
 */
export enum TiebreakerRule {
  HEAD_TO_HEAD = 'head_to_head',
  POINT_DIFFERENTIAL = 'point_differential',
  POINTS_FOR = 'points_for',
  POINTS_AGAINST = 'points_against',
  GAMES_WON = 'games_won',
  RATING = 'rating',
}

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Score for a single game within a match
 */
export interface GameScore {
  gameNumber: number;
  team1Score: number;
  team2Score: number;
  /** Optional serve indicator for tracking */
  servingTeam?: 1 | 2;
  /** Timestamp when game completed */
  completedAt?: string;
}

/**
 * Match score with multiple games
 */
export interface MatchScore {
  games: GameScore[];
  /** Total games won by team 1 */
  team1GamesWon: number;
  /** Total games won by team 2 */
  team2GamesWon: number;
  /** Total points scored by team 1 across all games */
  team1TotalPoints: number;
  /** Total points scored by team 2 across all games */
  team2TotalPoints: number;
  /** Winner: 1 or 2, null if not determined */
  winner: 1 | 2 | null;
}

/**
 * Venue information for tournament location
 */
export interface TournamentVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  courtCount: number;
  amenities?: string[];
  imageUrl?: string;
}

/**
 * Court assignment for matches
 */
export interface CourtAssignment {
  courtId: string;
  courtName: string;
  courtNumber: number;
  venueId: string;
}

// =============================================================================
// PLAYER & TEAM TYPES
// =============================================================================

/**
 * Player information for tournament context
 */
export interface TournamentPlayer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  /** Player's rating at time of registration */
  rating: number;
  /** Rating type (DUPR, internal, etc.) */
  ratingType: 'dupr' | 'internal' | 'self_reported';
  /** DUPR ID if available */
  duprId?: string;
  /** Player's age group eligibility */
  dateOfBirth?: string;
  /** Home city/state */
  location?: string;
  /** Contact email */
  email: string;
  /** Contact phone */
  phone?: string;
  /** Player's club affiliation */
  clubId?: string;
  clubName?: string;
}

/**
 * Team for doubles events
 */
export interface TournamentTeam {
  id: string;
  /** Team name (optional, can be auto-generated) */
  name?: string;
  /** Player 1 (typically the registering player / captain) */
  player1: TournamentPlayer;
  /** Player 2 */
  player2: TournamentPlayer;
  /** Combined team rating */
  combinedRating: number;
  /** Average of both players' ratings */
  averageRating: number;
  /** Seed number if assigned */
  seed?: number;
  /** Registration status */
  status: RegistrationStatus;
  /** Check-in status */
  checkedIn: boolean;
  /** Check-in timestamp */
  checkedInAt?: string;
}

/**
 * Participant - union type for singles player or doubles team
 */
export type TournamentParticipant =
  | { type: 'singles'; player: TournamentPlayer; seed?: number; status: RegistrationStatus }
  | { type: 'doubles'; team: TournamentTeam; seed?: number; status: RegistrationStatus };

// =============================================================================
// REGISTRATION TYPES
// =============================================================================

/**
 * Registration entry for an event
 */
export interface EventRegistration {
  id: string;
  eventId: string;
  /** Participant type and data */
  participant: TournamentParticipant;
  /** Seed number if assigned */
  seed?: number;
  /** Registration status */
  status: RegistrationStatus;
  /** Waitlist position if waitlisted */
  waitlistPosition?: number;
  /** Registration timestamp */
  registeredAt: string;
  /** Confirmation timestamp */
  confirmedAt?: string;
  /** Check-in timestamp */
  checkedInAt?: string;
  /** Withdrawal timestamp */
  withdrawnAt?: string;
  /** Payment status */
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'waived';
  /** Payment reference ID */
  paymentReference?: string;
  /** Notes from organizer */
  organizerNotes?: string;
}

// =============================================================================
// POOL TYPES
// =============================================================================

/**
 * Pool standing entry for a participant
 */
export interface PoolStanding {
  participantId: string;
  participant: TournamentParticipant;
  /** Rank within the pool */
  rank: number;
  /** Matches played */
  matchesPlayed: number;
  /** Matches won */
  matchesWon: number;
  /** Matches lost */
  matchesLost: number;
  /** Games won across all matches */
  gamesWon: number;
  /** Games lost across all matches */
  gamesLost: number;
  /** Total points scored */
  pointsFor: number;
  /** Total points against */
  pointsAgainst: number;
  /** Point differential */
  pointDifferential: number;
  /** Win percentage (0-1) */
  winPercentage: number;
  /** Whether this participant advances to bracket */
  advances: boolean;
}

/**
 * Pool for pool play format
 */
export interface Pool {
  id: string;
  eventId: string;
  /** Pool name (A, B, C, etc.) */
  name: string;
  /** Pool number for ordering */
  poolNumber: number;
  /** Participants in this pool */
  participants: TournamentParticipant[];
  /** All matches in this pool */
  matches: PoolMatch[];
  /** Current standings */
  standings: PoolStanding[];
  /** Number of participants that advance to bracket */
  advancementCount: number;
  /** Pool completion status */
  isComplete: boolean;
  /** Number of completed matches */
  completedMatches: number;
  /** Total matches in pool */
  totalMatches: number;
}

/**
 * Match within a pool
 */
export interface PoolMatch {
  id: string;
  poolId: string;
  /** Round number within pool (1, 2, 3...) */
  round: number;
  /** Match number within round */
  matchNumber: number;
  /** Participant 1 */
  participant1: TournamentParticipant;
  /** Participant 2 */
  participant2: TournamentParticipant;
  /** Match status */
  status: MatchStatus;
  /** Score data */
  score?: MatchScore;
  /** Winner participant ID */
  winnerId?: string;
  /** Court assignment */
  court?: CourtAssignment;
  /** Scheduled time */
  scheduledAt?: string;
  /** Actual start time */
  startedAt?: string;
  /** Completion time */
  completedAt?: string;
  /** Reference to detailed game record */
  gameId?: string;
}

// =============================================================================
// BRACKET TYPES
// =============================================================================

/**
 * Match within a bracket
 */
export interface BracketMatch {
  id: string;
  bracketId: string;
  /** Round number (1 = first round, increases toward finals) */
  round: number;
  /** Position within the round (0-indexed) */
  position: number;
  /** Match identifier for display (e.g., "W1", "L3", "SF1") */
  matchIdentifier: string;
  /** Participant 1 (null if TBD) */
  participant1?: TournamentParticipant | null;
  /** Participant 2 (null if TBD) */
  participant2?: TournamentParticipant | null;
  /** Seed of participant 1 */
  participant1Seed?: number;
  /** Seed of participant 2 */
  participant2Seed?: number;
  /** Where participant 1 comes from (previous match or pool) */
  participant1Source?: {
    type: 'seed' | 'match' | 'pool';
    sourceId: string;
    position: 'winner' | 'loser' | 'rank';
    rank?: number;
  };
  /** Where participant 2 comes from */
  participant2Source?: {
    type: 'seed' | 'match' | 'pool';
    sourceId: string;
    position: 'winner' | 'loser' | 'rank';
    rank?: number;
  };
  /** Match status */
  status: MatchStatus;
  /** Score data */
  score?: MatchScore;
  /** Winner (1, 2, or null if not determined) */
  winner?: 1 | 2 | null;
  /** Winner participant ID */
  winnerId?: string;
  /** Loser participant ID (for double elim losers bracket) */
  loserId?: string;
  /** Where winner goes next */
  winnerGoesTo?: {
    matchId: string;
    position: 1 | 2;
  };
  /** Where loser goes (for double elimination) */
  loserGoesTo?: {
    matchId: string;
    position: 1 | 2;
  };
  /** Court assignment */
  court?: CourtAssignment;
  /** Scheduled time */
  scheduledAt?: string;
  /** Estimated time based on bracket flow */
  estimatedStartTime?: string;
  /** Actual start time */
  startedAt?: string;
  /** Completion time */
  completedAt?: string;
  /** Is this match a bye? */
  isBye: boolean;
  /** Reference to detailed game record */
  gameId?: string;
}

/**
 * Round within a bracket
 */
export interface BracketRound {
  roundNumber: number;
  /** Display name (e.g., "Round of 16", "Quarterfinals", "Semifinals", "Finals") */
  name: string;
  matches: BracketMatch[];
  /** Are all matches in this round complete? */
  isComplete: boolean;
  /** Best of X games for this round (can vary by round) */
  bestOf: number;
}

/**
 * Bracket structure for elimination formats
 */
export interface Bracket {
  id: string;
  eventId: string;
  /** Bracket type */
  type: BracketType;
  /** Display name */
  name: string;
  /** Total number of rounds */
  totalRounds: number;
  /** Rounds in this bracket */
  rounds: BracketRound[];
  /** All matches in flat array for easy lookup */
  matches: BracketMatch[];
  /** Is bracket complete? */
  isComplete: boolean;
  /** Champion (winner of finals) */
  champion?: TournamentParticipant;
  /** Runner-up */
  runnerUp?: TournamentParticipant;
  /** Third place (if bronze match played) */
  thirdPlace?: TournamentParticipant;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Scoring settings for an event
 */
export interface EventScoringSettings {
  /** Points needed to win a game */
  pointsToWin: number;
  /** Must win by this margin */
  winBy: number;
  /** Maximum points per game (cap) */
  maxPoints?: number;
  /** Best of X games */
  bestOf: number;
  /** Different settings for finals */
  finalsBestOf?: number;
  /** Enable rally scoring */
  rallyScoring: boolean;
  /** Report to DUPR */
  reportToDupr: boolean;
}

/**
 * Pool play settings
 */
export interface PoolPlaySettings {
  /** Number of pools */
  numberOfPools: number;
  /** Target size for each pool (actual may vary) */
  targetPoolSize: number;
  /** Number of participants advancing from each pool */
  advancementCount: number;
  /** Tiebreaker rules in priority order */
  tiebreakers: TiebreakerRule[];
  /** Seeding method for pool assignment */
  seedingMethod: SeedingMethod;
}

/**
 * Bracket settings
 */
export interface BracketSettings {
  /** Format for bracket phase */
  format: TournamentFormat.SINGLE_ELIMINATION | TournamentFormat.DOUBLE_ELIMINATION;
  /** Include consolation bracket */
  hasConsolation: boolean;
  /** Include bronze medal match */
  hasBronzeMatch: boolean;
  /** Seeding method */
  seedingMethod: SeedingMethod;
}

/**
 * Tournament Event - a specific competition within a tournament
 */
export interface TournamentEvent {
  id: string;
  tournamentId: string;
  /** Event name (can be auto-generated or custom) */
  name: string;
  /** Event category */
  category: EventCategory;
  /** Skill level for this event */
  skillLevel: SkillLevel;
  /** Age group for this event */
  ageGroup: AgeGroup;
  /** Event format */
  format: TournamentFormat;
  /** Event status */
  status: EventStatus;
  /** Scoring settings */
  scoring: EventScoringSettings;
  /** Pool play settings (if format includes pools) */
  poolSettings?: PoolPlaySettings;
  /** Bracket settings */
  bracketSettings?: BracketSettings;
  /** Maximum participants/teams */
  maxParticipants: number;
  /** Current participant count */
  currentParticipants: number;
  /** Waitlist enabled */
  waitlistEnabled: boolean;
  /** Current waitlist count */
  waitlistCount: number;
  /** Entry fee for this event */
  entryFee: number;
  /** Currency */
  currency: string;
  /** Registration deadline */
  registrationDeadline?: string;
  /** Event start time */
  startTime?: string;
  /** Estimated end time */
  estimatedEndTime?: string;
  /** Actual end time */
  actualEndTime?: string;
  /** All registrations */
  registrations: EventRegistration[];
  /** Pools (if pool play format) */
  pools: Pool[];
  /** Brackets */
  brackets: Bracket[];
  /** Event-specific rules/notes */
  rules?: string;
  /** Sort order for display */
  sortOrder: number;
}

// =============================================================================
// TOURNAMENT TYPES
// =============================================================================

/**
 * Tournament director/organizer
 */
export interface TournamentDirector {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'director' | 'assistant' | 'referee' | 'volunteer';
}

/**
 * Tournament contact information
 */
export interface TournamentContact {
  name: string;
  email: string;
  phone?: string;
  role: string;
}

/**
 * Tournament settings
 */
export interface TournamentSettings {
  /** Allow self-service registration */
  selfRegistration: boolean;
  /** Require payment at registration */
  requirePaymentUpfront: boolean;
  /** Allow partner search */
  allowPartnerSearch: boolean;
  /** Check-in required */
  checkInRequired: boolean;
  /** Check-in window in minutes before event */
  checkInWindowMinutes: number;
  /** Send reminder emails */
  sendReminders: boolean;
  /** Default match format */
  defaultBestOf: number;
  /** Default points to win */
  defaultPointsToWin: number;
  /** Time between matches (minutes) */
  matchBufferMinutes: number;
  /** Estimated match duration (minutes) */
  estimatedMatchDuration: number;
}

/**
 * Main Tournament entity
 */
export interface Tournament {
  id: string;
  /** Tournament name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Description */
  description?: string;
  /** Tournament status */
  status: TournamentStatus;
  /** Venue information */
  venue: TournamentVenue;
  /** Start date */
  startDate: string;
  /** End date */
  endDate: string;
  /** Timezone */
  timezone: string;
  /** Registration opens */
  registrationOpensAt?: string;
  /** Registration closes */
  registrationClosesAt?: string;
  /** All events in this tournament */
  events: TournamentEvent[];
  /** Tournament directors/staff */
  directors: TournamentDirector[];
  /** Contact information */
  contacts: TournamentContact[];
  /** Settings */
  settings: TournamentSettings;
  /** Logo URL */
  logoUrl?: string;
  /** Banner image URL */
  bannerUrl?: string;
  /** Is this a sanctioned tournament */
  isSanctioned: boolean;
  /** Sanctioning body */
  sanctioningBody?: string;
  /** Report to DUPR */
  reportToDupr: boolean;
  /** Club hosting the tournament */
  clubId?: string;
  /** Created by user ID */
  createdBy: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** Published timestamp */
  publishedAt?: string;
  /** Total capacity across all events */
  totalCapacity: number;
  /** Total registrations */
  totalRegistrations: number;
  /** Website URL */
  websiteUrl?: string;
  /** Additional rules */
  rules?: string;
  /** Refund policy */
  refundPolicy?: string;
}

// =============================================================================
// REAL-TIME UPDATE TYPES
// =============================================================================

/**
 * Match update event for real-time subscriptions
 */
export interface MatchUpdateEvent {
  type: 'match_update';
  tournamentId: string;
  eventId: string;
  matchId: string;
  matchType: 'pool' | 'bracket';
  match: PoolMatch | BracketMatch;
  timestamp: string;
}

/**
 * Score update event
 */
export interface ScoreUpdateEvent {
  type: 'score_update';
  tournamentId: string;
  eventId: string;
  matchId: string;
  score: MatchScore;
  timestamp: string;
}

/**
 * Bracket update event
 */
export interface BracketUpdateEvent {
  type: 'bracket_update';
  tournamentId: string;
  eventId: string;
  bracketId: string;
  bracket: Bracket;
  timestamp: string;
}

/**
 * Pool update event
 */
export interface PoolUpdateEvent {
  type: 'pool_update';
  tournamentId: string;
  eventId: string;
  poolId: string;
  pool: Pool;
  timestamp: string;
}

/**
 * Union type for all tournament events
 */
export type TournamentUpdateEvent =
  | MatchUpdateEvent
  | ScoreUpdateEvent
  | BracketUpdateEvent
  | PoolUpdateEvent;

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Format display information
 */
export interface FormatInfo {
  format: TournamentFormat;
  displayName: string;
  shortName: string;
  description: string;
  minParticipants: number;
  optimalParticipants: number[];
  supportsDoubleElim: boolean;
  supportsPools: boolean;
}

/**
 * Skill level display information
 */
export interface SkillLevelInfo {
  level: SkillLevel;
  displayName: string;
  minRating: number;
  maxRating: number;
  description: string;
}

/**
 * Age group display information
 */
export interface AgeGroupInfo {
  ageGroup: AgeGroup;
  displayName: string;
  minAge?: number;
  maxAge?: number;
  description: string;
}

/**
 * Event category display information
 */
export interface EventCategoryInfo {
  category: EventCategory;
  displayName: string;
  shortName: string;
  gameFormat: 'singles' | 'doubles' | 'mixed_doubles';
  gender: 'mens' | 'womens' | 'mixed' | 'open';
}

// =============================================================================
// LOOKUP TABLES
// =============================================================================

export const FORMAT_INFO: Record<TournamentFormat, FormatInfo> = {
  [TournamentFormat.SINGLE_ELIMINATION]: {
    format: TournamentFormat.SINGLE_ELIMINATION,
    displayName: 'Single Elimination',
    shortName: 'SE',
    description: 'Lose once and you are out',
    minParticipants: 2,
    optimalParticipants: [4, 8, 16, 32, 64, 128],
    supportsDoubleElim: false,
    supportsPools: false,
  },
  [TournamentFormat.DOUBLE_ELIMINATION]: {
    format: TournamentFormat.DOUBLE_ELIMINATION,
    displayName: 'Double Elimination',
    shortName: 'DE',
    description: 'Must lose twice to be eliminated',
    minParticipants: 4,
    optimalParticipants: [4, 8, 16, 32, 64],
    supportsDoubleElim: true,
    supportsPools: false,
  },
  [TournamentFormat.ROUND_ROBIN]: {
    format: TournamentFormat.ROUND_ROBIN,
    displayName: 'Round Robin',
    shortName: 'RR',
    description: 'Everyone plays everyone',
    minParticipants: 3,
    optimalParticipants: [4, 5, 6, 7, 8],
    supportsDoubleElim: false,
    supportsPools: false,
  },
  [TournamentFormat.POOL_PLAY]: {
    format: TournamentFormat.POOL_PLAY,
    displayName: 'Pool Play',
    shortName: 'PP',
    description: 'Divided into pools with round robin',
    minParticipants: 6,
    optimalParticipants: [8, 12, 16, 20, 24, 32],
    supportsDoubleElim: false,
    supportsPools: true,
  },
  [TournamentFormat.POOL_TO_BRACKET]: {
    format: TournamentFormat.POOL_TO_BRACKET,
    displayName: 'Pool Play + Bracket',
    shortName: 'P2B',
    description: 'Pool play followed by elimination bracket',
    minParticipants: 8,
    optimalParticipants: [8, 12, 16, 24, 32, 48, 64],
    supportsDoubleElim: true,
    supportsPools: true,
  },
};

export const SKILL_LEVEL_INFO: Record<SkillLevel, SkillLevelInfo> = {
  [SkillLevel.LEVEL_2_5]: {
    level: SkillLevel.LEVEL_2_5,
    displayName: '2.5',
    minRating: 2.0,
    maxRating: 2.99,
    description: 'Beginner - learning basic strokes',
  },
  [SkillLevel.LEVEL_3_0]: {
    level: SkillLevel.LEVEL_3_0,
    displayName: '3.0',
    minRating: 3.0,
    maxRating: 3.49,
    description: 'Beginner-Intermediate - consistent on basic shots',
  },
  [SkillLevel.LEVEL_3_5]: {
    level: SkillLevel.LEVEL_3_5,
    displayName: '3.5',
    minRating: 3.5,
    maxRating: 3.99,
    description: 'Intermediate - developing strategy',
  },
  [SkillLevel.LEVEL_4_0]: {
    level: SkillLevel.LEVEL_4_0,
    displayName: '4.0',
    minRating: 4.0,
    maxRating: 4.49,
    description: 'Intermediate-Advanced - solid all-court player',
  },
  [SkillLevel.LEVEL_4_5]: {
    level: SkillLevel.LEVEL_4_5,
    displayName: '4.5',
    minRating: 4.5,
    maxRating: 4.99,
    description: 'Advanced - mastering power and control',
  },
  [SkillLevel.LEVEL_5_0]: {
    level: SkillLevel.LEVEL_5_0,
    displayName: '5.0',
    minRating: 5.0,
    maxRating: 5.49,
    description: 'Expert - tournament competitor',
  },
  [SkillLevel.LEVEL_5_0_PLUS]: {
    level: SkillLevel.LEVEL_5_0_PLUS,
    displayName: '5.0+',
    minRating: 5.0,
    maxRating: 5.99,
    description: 'Expert and above',
  },
  [SkillLevel.LEVEL_5_5]: {
    level: SkillLevel.LEVEL_5_5,
    displayName: '5.5',
    minRating: 5.5,
    maxRating: 5.99,
    description: 'Elite - high-level competitor',
  },
  [SkillLevel.LEVEL_6_0]: {
    level: SkillLevel.LEVEL_6_0,
    displayName: '6.0',
    minRating: 6.0,
    maxRating: 7.0,
    description: 'Professional level',
  },
  [SkillLevel.LEVEL_PRO]: {
    level: SkillLevel.LEVEL_PRO,
    displayName: 'Pro',
    minRating: 6.0,
    maxRating: 10.0,
    description: 'Professional player',
  },
};

export const AGE_GROUP_INFO: Record<AgeGroup, AgeGroupInfo> = {
  [AgeGroup.OPEN]: {
    ageGroup: AgeGroup.OPEN,
    displayName: 'Open',
    description: 'No age restriction',
  },
  [AgeGroup.JUNIOR_8]: {
    ageGroup: AgeGroup.JUNIOR_8,
    displayName: 'Junior 8 & Under',
    maxAge: 8,
    description: 'Ages 8 and under',
  },
  [AgeGroup.JUNIOR_11]: {
    ageGroup: AgeGroup.JUNIOR_11,
    displayName: 'Junior 11 & Under',
    maxAge: 11,
    description: 'Ages 11 and under',
  },
  [AgeGroup.JUNIOR_14]: {
    ageGroup: AgeGroup.JUNIOR_14,
    displayName: 'Junior 14 & Under',
    maxAge: 14,
    description: 'Ages 14 and under',
  },
  [AgeGroup.JUNIOR_18]: {
    ageGroup: AgeGroup.JUNIOR_18,
    displayName: 'Junior 18 & Under',
    maxAge: 18,
    description: 'Ages 18 and under',
  },
  [AgeGroup.ADULT_19_PLUS]: {
    ageGroup: AgeGroup.ADULT_19_PLUS,
    displayName: 'Adult 19+',
    minAge: 19,
    description: 'Ages 19 and over',
  },
  [AgeGroup.SENIOR_35]: {
    ageGroup: AgeGroup.SENIOR_35,
    displayName: 'Senior 35+',
    minAge: 35,
    description: 'Ages 35 and over',
  },
  [AgeGroup.SENIOR_50]: {
    ageGroup: AgeGroup.SENIOR_50,
    displayName: 'Senior 50+',
    minAge: 50,
    description: 'Ages 50 and over',
  },
  [AgeGroup.SENIOR_55]: {
    ageGroup: AgeGroup.SENIOR_55,
    displayName: 'Senior 55+',
    minAge: 55,
    description: 'Ages 55 and over',
  },
  [AgeGroup.SENIOR_60]: {
    ageGroup: AgeGroup.SENIOR_60,
    displayName: 'Senior 60+',
    minAge: 60,
    description: 'Ages 60 and over',
  },
  [AgeGroup.SENIOR_65]: {
    ageGroup: AgeGroup.SENIOR_65,
    displayName: 'Senior 65+',
    minAge: 65,
    description: 'Ages 65 and over',
  },
  [AgeGroup.SENIOR_70]: {
    ageGroup: AgeGroup.SENIOR_70,
    displayName: 'Senior 70+',
    minAge: 70,
    description: 'Ages 70 and over',
  },
  [AgeGroup.SENIOR_75]: {
    ageGroup: AgeGroup.SENIOR_75,
    displayName: 'Senior 75+',
    minAge: 75,
    description: 'Ages 75 and over',
  },
  [AgeGroup.SENIOR_80]: {
    ageGroup: AgeGroup.SENIOR_80,
    displayName: 'Senior 80+',
    minAge: 80,
    description: 'Ages 80 and over',
  },
};

export const EVENT_CATEGORY_INFO: Record<EventCategory, EventCategoryInfo> = {
  [EventCategory.MENS_SINGLES]: {
    category: EventCategory.MENS_SINGLES,
    displayName: "Men's Singles",
    shortName: 'MS',
    gameFormat: 'singles',
    gender: 'mens',
  },
  [EventCategory.WOMENS_SINGLES]: {
    category: EventCategory.WOMENS_SINGLES,
    displayName: "Women's Singles",
    shortName: 'WS',
    gameFormat: 'singles',
    gender: 'womens',
  },
  [EventCategory.MENS_DOUBLES]: {
    category: EventCategory.MENS_DOUBLES,
    displayName: "Men's Doubles",
    shortName: 'MD',
    gameFormat: 'doubles',
    gender: 'mens',
  },
  [EventCategory.WOMENS_DOUBLES]: {
    category: EventCategory.WOMENS_DOUBLES,
    displayName: "Women's Doubles",
    shortName: 'WD',
    gameFormat: 'doubles',
    gender: 'womens',
  },
  [EventCategory.MIXED_DOUBLES]: {
    category: EventCategory.MIXED_DOUBLES,
    displayName: 'Mixed Doubles',
    shortName: 'XD',
    gameFormat: 'mixed_doubles',
    gender: 'mixed',
  },
  [EventCategory.OPEN_SINGLES]: {
    category: EventCategory.OPEN_SINGLES,
    displayName: 'Open Singles',
    shortName: 'OS',
    gameFormat: 'singles',
    gender: 'open',
  },
  [EventCategory.OPEN_DOUBLES]: {
    category: EventCategory.OPEN_DOUBLES,
    displayName: 'Open Doubles',
    shortName: 'OD',
    gameFormat: 'doubles',
    gender: 'open',
  },
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard for singles participant
 */
export function isSinglesParticipant(
  participant: TournamentParticipant
): participant is Extract<TournamentParticipant, { type: 'singles' }> {
  return participant.type === 'singles';
}

/**
 * Type guard for doubles participant
 */
export function isDoublesParticipant(
  participant: TournamentParticipant
): participant is Extract<TournamentParticipant, { type: 'doubles' }> {
  return participant.type === 'doubles';
}

/**
 * Get display name for a participant
 */
export function getParticipantDisplayName(participant: TournamentParticipant): string {
  if (isSinglesParticipant(participant)) {
    return participant.player.displayName ||
      `${participant.player.firstName} ${participant.player.lastName}`;
  } else {
    if (participant.team.name) {
      return participant.team.name;
    }
    const p1Name = participant.team.player1.displayName ||
      `${participant.team.player1.firstName} ${participant.team.player1.lastName[0]}.`;
    const p2Name = participant.team.player2.displayName ||
      `${participant.team.player2.firstName} ${participant.team.player2.lastName[0]}.`;
    return `${p1Name} / ${p2Name}`;
  }
}

/**
 * Get participant ID
 */
export function getParticipantId(participant: TournamentParticipant): string {
  if (isSinglesParticipant(participant)) {
    return participant.player.id;
  } else {
    return participant.team.id;
  }
}

/**
 * Get participant rating
 */
export function getParticipantRating(participant: TournamentParticipant): number {
  if (isSinglesParticipant(participant)) {
    return participant.player.rating;
  } else {
    return participant.team.averageRating;
  }
}
