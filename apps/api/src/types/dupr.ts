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
// MATCH SUBMISSION (DUPR Partner API /match/v1.0)
// ============================================================================

/** Team structure for DUPR ExternalMatchRequest */
export interface DuprMatchTeam {
  player1: string;       // DUPR ID (required)
  player2?: string;      // DUPR ID (doubles only)
  game1: number;         // required
  game2?: number;
  game3?: number;
  game4?: number;
  game5?: number;
}

/** POST /match/v1.0/create - ExternalMatchRequest */
export interface DuprMatchInput {
  format: 'SINGLES' | 'DOUBLES';       // required
  matchDate: string;                    // yyyy-MM-dd (required)
  event: string;                        // event name (required)
  identifier: string;                   // unique match identifier (required)
  teamA: DuprMatchTeam;                 // required
  teamB: DuprMatchTeam;                 // required
  matchSource?: 'PARTNER';             // optional
  matchType?: 'RALLY' | 'SIDEOUT';    // scoring type (optional)
  location?: string;                    // e.g. "City, ST" (optional)
  clubId?: number;                      // DUPR club ID (optional)
  bracket?: string;                     // bracket name (optional)
}

/** Response from match create/update */
export interface DuprMatchResult {
  matchId: string;
  matchCode: string;    // used for delete operations
  status: 'SUCCESS' | 'FAILURE';
  message?: string;
}

/** POST /match/v1.0/update - same as create but with matchId required */
export interface DuprMatchUpdateInput extends DuprMatchInput {
  matchId: number;      // required for updates
}

/** DELETE /match/v1.0/delete */
export interface DuprMatchDeleteInput {
  matchCode: string;    // returned from create response (required)
  identifier: string;   // unique match identifier (required)
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
