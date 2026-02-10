/**
 * DUPR RaaS API Service
 * Handles all communication with the DUPR Rating API
 * - Token management with Redis caching
 * - SSO validation
 * - Player data fetching
 * - Match CRUD
 * - Entitlement checking
 * - Webhook registration
 */

import { cache } from '../lib/redis.js';
import type {
  DuprEnvironment,
  DuprUrls,
  DuprTokenResponse,
  DuprSsoCallbackData,
  DuprPlayerInfo,
  DuprPlayerStats,
  DuprRatings,
  DuprEntitlements,
  DuprEntitlementLevel,
  DuprMatchInput,
  DuprMatchResult,
  DuprMatchUpdateInput,
  DuprClubMembership,
  DuprWebhookTopic,
} from '../types/dupr.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DUPR_TOKEN_CACHE_KEY = 'dupr:partner_token';
const DUPR_TOKEN_TTL = 3500; // slightly under 1 hour (tokens valid for 1 hour)

// In-memory fallback when Redis is unavailable
let inMemoryToken: { token: string; expiresAt: number } | null = null;

function getDuprEnvironment(): DuprEnvironment {
  return (process.env.DUPR_ENVIRONMENT as DuprEnvironment) || 'uat';
}

function getDuprUrls(env?: DuprEnvironment): DuprUrls {
  const environment = env || getDuprEnvironment();

  if (environment === 'production') {
    return {
      partnerApi: 'https://prod.mydupr.com/api',
      publicApi: 'https://api.dupr.gg',
      ssoBase: 'https://dashboard.dupr.com',
      swaggerUi: 'https://prod.mydupr.com/api/swagger-ui/index.html',
    };
  }

  return {
    partnerApi: 'https://uat.mydupr.com/api',
    publicApi: 'https://api.uat.dupr.gg',
    ssoBase: 'https://uat.dupr.gg',
    swaggerUi: 'https://uat.mydupr.com/api/swagger-ui/index.html',
  };
}

function getClientCredentials() {
  const clientId = process.env.DUPR_CLIENT_ID;
  const clientKey = process.env.DUPR_CLIENT_KEY;
  const clientSecret = process.env.DUPR_CLIENT_SECRET;

  if (!clientId || !clientKey || !clientSecret) {
    throw new Error('DUPR credentials not configured. Set DUPR_CLIENT_ID, DUPR_CLIENT_KEY, and DUPR_CLIENT_SECRET.');
  }

  return { clientId, clientKey, clientSecret };
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

async function fetchNewToken(): Promise<string> {
  const { clientKey, clientSecret } = getClientCredentials();
  const urls = getDuprUrls();

  const encoded = Buffer.from(`${clientKey}:${clientSecret}`).toString('base64');

  const response = await fetch(`${urls.partnerApi}/token`, {
    method: 'POST',
    headers: {
      'x-authorization': encoded,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`DUPR token request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as DuprTokenResponse;

  if (!data.token) {
    throw new Error('DUPR token response missing token field');
  }

  return data.token;
}

// ============================================================================
// SERVICE
// ============================================================================

export const duprService = {
  // --------------------------------------------------------------------------
  // Token Management
  // --------------------------------------------------------------------------

  /**
   * Get a valid partner bearer token.
   * Tries Redis cache first, then in-memory fallback, then fetches new.
   */
  async getPartnerToken(): Promise<string> {
    // Try Redis cache
    const cached = await cache.get<string>(DUPR_TOKEN_CACHE_KEY);
    if (cached) return cached;

    // Try in-memory fallback
    if (inMemoryToken && inMemoryToken.expiresAt > Date.now()) {
      return inMemoryToken.token;
    }

    // Fetch new token
    const token = await fetchNewToken();

    // Cache in Redis
    await cache.set(DUPR_TOKEN_CACHE_KEY, token, DUPR_TOKEN_TTL);

    // Also store in memory as fallback
    inMemoryToken = {
      token,
      expiresAt: Date.now() + DUPR_TOKEN_TTL * 1000,
    };

    return token;
  },

  /**
   * Clear cached token (e.g., on auth failure to force refresh)
   */
  async clearTokenCache(): Promise<void> {
    await cache.del(DUPR_TOKEN_CACHE_KEY);
    inMemoryToken = null;
  },

  // --------------------------------------------------------------------------
  // SSO
  // --------------------------------------------------------------------------

  /**
   * Get the SSO iframe URL for Login with DUPR
   */
  getSsoUrl(clientId?: string): string {
    const id = clientId || process.env.DUPR_CLIENT_ID;
    if (!id) throw new Error('DUPR_CLIENT_ID not configured');

    const urls = getDuprUrls();
    const encodedClientId = Buffer.from(id).toString('base64');
    return `${urls.ssoBase}/login-external-app/${encodedClientId}`;
  },

  /**
   * Validate SSO user data by fetching their profile from the DUPR public API.
   * Uses the user's own token (from SSO postMessage) for read-only access.
   */
  async validateSsoUser(userToken: string): Promise<DuprPlayerInfo | null> {
    const urls = getDuprUrls();

    try {
      const response = await fetch(`${urls.publicApi}/player/v1.0/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`DUPR SSO validation failed (${response.status})`);
        return null;
      }

      const data = await response.json();
      return data?.result || data;
    } catch (error) {
      console.error('DUPR SSO validation error:', error);
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // Player Data
  // --------------------------------------------------------------------------

  /**
   * Get player info by DUPR ID using partner token
   */
  async getPlayerByDuprId(duprId: string): Promise<DuprPlayerInfo | null> {
    const token = await this.getPartnerToken();
    const urls = getDuprUrls();

    try {
      const response = await fetch(`${urls.partnerApi}/player/v1.0/${duprId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.clearTokenCache();
        }
        return null;
      }

      const data = await response.json();
      return data?.result || data;
    } catch (error) {
      console.error('DUPR getPlayerByDuprId error:', error);
      return null;
    }
  },

  /**
   * Fetch current ratings for a player
   */
  async getPlayerStats(duprId: string): Promise<DuprPlayerStats | null> {
    const player = await this.getPlayerByDuprId(duprId);
    if (!player) return null;

    return {
      singles: player.ratings?.singles ?? null,
      doubles: player.ratings?.doubles ?? null,
      mixedDoubles: player.ratings?.mixedDoubles ?? null,
    };
  },

  /**
   * Fetch and return current ratings in a normalized format
   */
  async syncPlayerRatings(duprId: string): Promise<DuprRatings> {
    const stats = await this.getPlayerStats(duprId);

    return {
      singles: stats?.singles ?? null,
      doubles: stats?.doubles ?? null,
      mixedDoubles: stats?.mixedDoubles ?? null,
    };
  },

  // --------------------------------------------------------------------------
  // Entitlements (DUPR+ / Verified)
  // --------------------------------------------------------------------------

  /**
   * Check a player's entitlement level using their OAuth token.
   * Uses the user's own token (read-only) from SSO.
   */
  async getPlayerEntitlements(userToken: string): Promise<DuprEntitlements> {
    const urls = getDuprUrls();

    try {
      const response = await fetch(`${urls.publicApi}/player/v1.0/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return { isPremium: false, isVerified: false, entitlementLevel: 'NONE' };
      }

      const data = await response.json();
      const player = data?.result || data;

      // Check entitlements from player data
      const entitlements = player?.entitlements || player?.subscriptions || [];
      const isPremium = Array.isArray(entitlements)
        ? entitlements.some((e: string | Record<string, unknown>) =>
            typeof e === 'string' ? e === 'PREMIUM_L1' : e?.type === 'PREMIUM_L1'
          )
        : false;
      const isVerified = Array.isArray(entitlements)
        ? entitlements.some((e: string | Record<string, unknown>) =>
            typeof e === 'string' ? e === 'VERIFIED_L1' : e?.type === 'VERIFIED_L1'
          )
        : false;

      let entitlementLevel: DuprEntitlementLevel = 'NONE';
      if (isVerified) entitlementLevel = 'VERIFIED_L1';
      else if (isPremium) entitlementLevel = 'PREMIUM_L1';

      return { isPremium, isVerified, entitlementLevel };
    } catch (error) {
      console.error('DUPR entitlements check error:', error);
      return { isPremium: false, isVerified: false, entitlementLevel: 'NONE' };
    }
  },

  // --------------------------------------------------------------------------
  // Match CRUD
  // --------------------------------------------------------------------------

  /**
   * Submit a match to DUPR
   */
  async createMatch(match: DuprMatchInput): Promise<DuprMatchResult> {
    const token = await this.getPartnerToken();
    const urls = getDuprUrls();

    const response = await fetch(`${urls.partnerApi}/match/v1.0`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchType: match.matchType,
        team1: match.team1Players.map((p) => ({ duprId: p.duprId })),
        team2: match.team2Players.map((p) => ({ duprId: p.duprId })),
        games: match.scores.map((s) => ({
          team1Score: s.team1Score,
          team2Score: s.team2Score,
        })),
        playedOn: match.playedAt,
        clubId: match.clubId,
        eventName: match.eventName,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearTokenCache();
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`DUPR match creation failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      matchId: data?.result?.id || data?.id || '',
      status: 'SUCCESS',
      message: data?.message,
    };
  },

  /**
   * Update an existing match on DUPR
   */
  async updateMatch(matchId: string, update: DuprMatchUpdateInput): Promise<void> {
    const token = await this.getPartnerToken();
    const urls = getDuprUrls();

    const response = await fetch(`${urls.partnerApi}/match/v1.0/${matchId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        games: update.scores?.map((s) => ({
          team1Score: s.team1Score,
          team2Score: s.team2Score,
        })),
        playedOn: update.playedAt,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearTokenCache();
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`DUPR match update failed (${response.status}): ${errorText}`);
    }
  },

  /**
   * Delete a match from DUPR
   */
  async deleteMatch(matchId: string): Promise<void> {
    const token = await this.getPartnerToken();
    const urls = getDuprUrls();

    const response = await fetch(`${urls.partnerApi}/match/v1.0/${matchId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearTokenCache();
      }
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`DUPR match deletion failed (${response.status}): ${errorText}`);
    }
  },

  // --------------------------------------------------------------------------
  // Club Membership
  // --------------------------------------------------------------------------

  /**
   * Get a player's club memberships using the partner API
   */
  async getClubMembershipByDuprId(duprId: string): Promise<DuprClubMembership[]> {
    const token = await this.getPartnerToken();
    const urls = getDuprUrls();

    try {
      const response = await fetch(`${urls.partnerApi}/club/v1.0/membership/${duprId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.clearTokenCache();
        }
        return [];
      }

      const data = await response.json();
      const memberships = data?.result || data || [];

      return Array.isArray(memberships)
        ? memberships.map((m: Record<string, unknown>) => ({
            clubId: String(m.clubId || ''),
            clubName: String(m.clubName || ''),
            role: String(m.role || 'PLAYER') as DuprClubMembership['role'],
          }))
        : [];
    } catch (error) {
      console.error('DUPR club membership error:', error);
      return [];
    }
  },

  // --------------------------------------------------------------------------
  // Webhook
  // --------------------------------------------------------------------------

  /**
   * Register a webhook URL with DUPR for event notifications
   */
  async registerWebhook(webhookUrl: string, topics: DuprWebhookTopic[] = ['LOGIN']): Promise<void> {
    const token = await this.getPartnerToken();
    const { clientId } = getClientCredentials();
    const urls = getDuprUrls();

    const response = await fetch(`${urls.partnerApi}/api/v1.0/webhook`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        webhookUrl,
        topics,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`DUPR webhook registration failed (${response.status}): ${errorText}`);
    }
  },

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Get configured DUPR URLs for the current environment
   */
  getUrls(): DuprUrls {
    return getDuprUrls();
  },

  /**
   * Check if DUPR integration is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.DUPR_CLIENT_ID &&
      process.env.DUPR_CLIENT_KEY &&
      process.env.DUPR_CLIENT_SECRET
    );
  },
};
