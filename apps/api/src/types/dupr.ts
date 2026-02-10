/**
 * DUPR RaaS API TypeScript interfaces
 * Covers SSO, matches, entitlements, and club membership
 */

// ============================================================================
// ENVIRONMENT & CONFIGURATION
// ============================================================================

export type DuprEnvironment = 'uat' | 'production';

export interface DuprUrls {
  partnerApi: string;
  publicApi: string;
  ssoBase: string;
  swaggerUi: string;
}

// ============================================================================
// AUTHENTICATION & TOKEN
// ============================================================================

export interface DuprTokenResponse {
  token: string;
  expiresIn?: number;
}

// ============================================================================
// SSO (Login with DUPR)
// ============================================================================

/** Data received from DUPR SSO iframe via postMessage */
export interface DuprSsoCallbackData {
  userToken: string;
  refreshToken: string;
  id: string;       // DUPR internal user ID
  duprId: string;   // DUPR player ID (public-facing)
  stats?: DuprPlayerStats;
}

/** Result of processing SSO callback */
export interface DuprSsoResult {
  duprId: string;
  duprInternalId: string;
  entitlementLevel: DuprEntitlementLevel;
  ratings: DuprRatings;
  linkedAt: string;
}

// ============================================================================
// PLAYER & RATINGS
// ============================================================================

export interface DuprRatings {
  singles: number | null;
  doubles: number | null;
  mixedDoubles: number | null;
}

export interface DuprPlayerStats {
  singles?: number | null;
  doubles?: number | null;
  mixedDoubles?: number | null;
  singlesReliability?: number | null;
  doublesReliability?: number | null;
}

export interface DuprPlayerInfo {
  id: string;
  duprId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  ratings?: DuprRatings;
  stats?: DuprPlayerStats;
}

// ============================================================================
// ENTITLEMENTS (DUPR+ / Verified)
// ============================================================================

export type DuprEntitlementLevel = 'NONE' | 'PREMIUM_L1' | 'VERIFIED_L1';

export interface DuprEntitlements {
  isPremium: boolean;    // PREMIUM_L1 (DUPR+)
  isVerified: boolean;   // VERIFIED_L1 (DUPR Verified)
  entitlementLevel: DuprEntitlementLevel;
}

// ============================================================================
// MATCH SUBMISSION
// ============================================================================

export interface DuprMatchPlayer {
  duprId: string;
}

export interface DuprMatchScore {
  team1Score: number;
  team2Score: number;
}

export interface DuprMatchInput {
  matchType: 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES';
  team1Players: DuprMatchPlayer[];
  team2Players: DuprMatchPlayer[];
  scores: DuprMatchScore[];
  playedAt: string;     // ISO 8601 date string
  clubId?: string;      // DUPR club ID if applicable
  eventName?: string;
  isVerified?: boolean;
}

export interface DuprMatchResult {
  matchId: string;
  status: 'SUCCESS' | 'FAILURE';
  message?: string;
}

export interface DuprMatchUpdateInput {
  scores?: DuprMatchScore[];
  playedAt?: string;
}

// ============================================================================
// CLUB MEMBERSHIP
// ============================================================================

export type DuprClubRole = 'PLAYER' | 'ORGANIZER' | 'DIRECTOR';

export interface DuprClubMembership {
  clubId: string;
  clubName: string;
  role: DuprClubRole;
}

// ============================================================================
// WEBHOOK
// ============================================================================

export type DuprWebhookTopic = 'LOGIN';

export interface DuprWebhookRegistration {
  clientId: string;
  webhookUrl: string;
  topics: DuprWebhookTopic[];
}

export interface DuprWebhookPayload {
  topic: DuprWebhookTopic;
  data: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// MATCH SUBMISSION STATUS (internal tracking)
// ============================================================================

export type DuprSubmissionStatus = 'pending' | 'submitted' | 'confirmed' | 'failed' | 'deleted';
