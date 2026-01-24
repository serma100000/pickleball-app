/**
 * Tournament API Types
 *
 * Type definitions for tournament API requests and responses.
 * These types ensure consistency between the frontend wizard and backend API.
 */

// =============================================================================
// Pool Play Configuration
// =============================================================================

export type PoolCalculationMethod = 'auto' | 'manual';

export interface PoolPlayConfig {
  enabled: boolean;
  calculationMethod: PoolCalculationMethod;
  numberOfPools: number;
  gamesPerMatch: 1 | 3;
  advancementCount: number;
}

// =============================================================================
// Seeding Configuration
// =============================================================================

export type SeedingMethod = 'random' | 'skill_based' | 'manual';
export type CrossPoolSeedingMethod = 'standard' | 'reverse' | 'snake';

export interface SeedingConfig {
  method: SeedingMethod;
  crossPoolSeeding: CrossPoolSeedingMethod;
}

// =============================================================================
// Bracket Configuration
// =============================================================================

export type BracketFormat = 'single_elimination' | 'double_elimination';

export interface BracketConfig {
  format: BracketFormat;
  thirdPlaceMatch: boolean;
  consolationBracket: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

export type EventCategory = 'singles' | 'doubles' | 'mixed';
export type SkillLevel = '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0+';
export type AgeGroup = 'open' | 'junior' | 'senior_50' | 'senior_60' | 'senior_70';
export type EventFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'pool_play'
  | 'pool_to_bracket';
export type ScoringFormat = 'best_of_1' | 'best_of_3';
export type PointsTo = 11 | 15 | 21;

// =============================================================================
// Tournament Event (for creation/update)
// =============================================================================

export interface TournamentEventInput {
  id?: string;
  name?: string;
  category: EventCategory;
  skillLevel: SkillLevel;
  ageGroup: AgeGroup;
  format: EventFormat;
  maxParticipants: number;
  entryFee: number;
  prizeMoney: number;
  scoringFormat: ScoringFormat;
  pointsTo: PointsTo;
  poolPlayConfig: PoolPlayConfig;
  seedingConfig: SeedingConfig;
  bracketConfig: BracketConfig;
}

export interface TournamentEventResponse extends TournamentEventInput {
  id: string;
  tournamentId: string;
  currentParticipants: number;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Tournament Director
// =============================================================================

export interface TournamentDirectorInput {
  name: string;
  email: string;
  phone?: string;
}

// =============================================================================
// Tournament (for creation)
// =============================================================================

export interface CreateTournamentInput {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  venue: string;
  venueCoordinates?: {
    lat: number;
    lng: number;
  };
  numberOfCourts: number;
  director: TournamentDirectorInput;
  events: TournamentEventInput[];
}

export interface UpdateTournamentInput {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  venue?: string;
  venueCoordinates?: {
    lat: number;
    lng: number;
  };
  numberOfCourts?: number;
  director?: TournamentDirectorInput;
  events?: TournamentEventInput[];
  status?: string;
}

// =============================================================================
// Tournament Response
// =============================================================================

export interface TournamentResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  venue?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
  venueCoordinates?: {
    lat: number;
    lng: number;
  };
  numberOfCourts?: number;
  director?: TournamentDirectorInput;
  events: TournamentEventResponse[];
  organizerId: string;
  clubId?: string;
  currentParticipants: number;
  maxParticipants?: number;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
