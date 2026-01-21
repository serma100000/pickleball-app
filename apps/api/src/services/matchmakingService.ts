import { eq, and, or, gte, lte, ne, desc, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { gameService } from './gameService.js';
import { notificationService } from './notificationService.js';
import { emitToUser, emitMatchmakingUpdate, SocketEvents } from '../lib/socket.js';
import { addHours } from 'date-fns';

const { matchRequests, users } = schema;

export interface CreateMatchRequestInput {
  userId: string;
  gameType: 'singles' | 'doubles' | 'mixed_doubles';
  skillLevelMin?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'pro';
  skillLevelMax?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'pro';
  latitude?: number;
  longitude?: number;
  maxDistance?: number;
  preferredTimes?: string[];
  expiresInHours?: number;
}

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert', 'pro'];

export const matchmakingService = {
  /**
   * Create a match request
   */
  async createRequest(input: CreateMatchRequestInput) {
    const expiresAt = addHours(new Date(), input.expiresInHours || 24);

    const [request] = await db
      .insert(matchRequests)
      .values({
        userId: input.userId,
        gameType: input.gameType,
        skillLevelMin: input.skillLevelMin,
        skillLevelMax: input.skillLevelMax,
        latitude: input.latitude?.toString(),
        longitude: input.longitude?.toString(),
        maxDistance: input.maxDistance,
        preferredTimes: input.preferredTimes,
        expiresAt,
      })
      .returning();

    // Try to find matches
    await this.findMatches(request.id);

    return request;
  },

  /**
   * Get match request by ID
   */
  async getById(id: string) {
    return db.query.matchRequests.findFirst({
      where: eq(matchRequests.id, id),
    });
  },

  /**
   * Cancel match request
   */
  async cancel(id: string, userId: string) {
    const [request] = await db
      .update(matchRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(matchRequests.id, id),
          eq(matchRequests.userId, userId)
        )
      )
      .returning();

    return request;
  },

  /**
   * Find potential matches for a request
   */
  async findMatches(requestId: string) {
    const request = await this.getById(requestId);
    if (!request || request.status !== 'pending') return [];

    const user = await db.query.users.findFirst({
      where: eq(users.id, request.userId),
    });
    if (!user) return [];

    // Find compatible pending requests
    const potentialMatches = await db.query.matchRequests.findMany({
      where: and(
        eq(matchRequests.status, 'pending'),
        eq(matchRequests.gameType, request.gameType),
        ne(matchRequests.userId, request.userId),
        gte(matchRequests.expiresAt, new Date())
      ),
    });

    // Filter by skill level compatibility
    const compatibleMatches = [];
    for (const match of potentialMatches) {
      const matchUser = await db.query.users.findFirst({
        where: eq(users.id, match.userId),
      });
      if (!matchUser) continue;

      // Check skill level compatibility
      if (request.skillLevelMin || request.skillLevelMax) {
        const matchSkillIndex = SKILL_LEVELS.indexOf(matchUser.skillLevel || 'beginner');
        const minIndex = request.skillLevelMin
          ? SKILL_LEVELS.indexOf(request.skillLevelMin)
          : 0;
        const maxIndex = request.skillLevelMax
          ? SKILL_LEVELS.indexOf(request.skillLevelMax)
          : SKILL_LEVELS.length - 1;

        if (matchSkillIndex < minIndex || matchSkillIndex > maxIndex) {
          continue;
        }
      }

      // Check reverse skill compatibility
      if (match.skillLevelMin || match.skillLevelMax) {
        const userSkillIndex = SKILL_LEVELS.indexOf(user.skillLevel || 'beginner');
        const minIndex = match.skillLevelMin
          ? SKILL_LEVELS.indexOf(match.skillLevelMin)
          : 0;
        const maxIndex = match.skillLevelMax
          ? SKILL_LEVELS.indexOf(match.skillLevelMax)
          : SKILL_LEVELS.length - 1;

        if (userSkillIndex < minIndex || userSkillIndex > maxIndex) {
          continue;
        }
      }

      // Calculate distance if location provided
      let distance = null;
      if (request.latitude && request.longitude && match.latitude && match.longitude) {
        distance = this.calculateDistance(
          parseFloat(request.latitude),
          parseFloat(request.longitude),
          parseFloat(match.latitude),
          parseFloat(match.longitude)
        );

        // Check max distance
        if (request.maxDistance && distance > request.maxDistance) continue;
        if (match.maxDistance && distance > match.maxDistance) continue;
      }

      compatibleMatches.push({
        request: match,
        user: matchUser,
        distance,
        score: this.calculateMatchScore(user, matchUser, distance),
      });
    }

    // Sort by match score
    compatibleMatches.sort((a, b) => b.score - a.score);

    return compatibleMatches;
  },

  /**
   * Get match suggestions for user
   */
  async getSuggestions(userId: string, limit = 10) {
    // Get user's pending request
    const userRequest = await db.query.matchRequests.findFirst({
      where: and(
        eq(matchRequests.userId, userId),
        eq(matchRequests.status, 'pending')
      ),
    });

    if (!userRequest) {
      return [];
    }

    const matches = await this.findMatches(userRequest.id);
    return matches.slice(0, limit);
  },

  /**
   * Accept a match
   */
  async acceptMatch(requestId: string, matchedRequestId: string) {
    const request = await this.getById(requestId);
    const matchedRequest = await this.getById(matchedRequestId);

    if (!request || !matchedRequest) {
      throw new Error('Request not found');
    }

    // Create a game
    const game = await gameService.create({
      gameType: request.gameType,
      team1PlayerIds: [request.userId],
      team2PlayerIds: [matchedRequest.userId],
      createdById: request.userId,
    });

    // Update both requests
    await db
      .update(matchRequests)
      .set({
        status: 'matched',
        matchedGameId: game.id,
        updatedAt: new Date(),
      })
      .where(
        or(
          eq(matchRequests.id, requestId),
          eq(matchRequests.id, matchedRequestId)
        )
      );

    // Notify users
    emitToUser(request.userId, SocketEvents.MATCH_FOUND, { gameId: game.id });
    emitToUser(matchedRequest.userId, SocketEvents.MATCH_FOUND, { gameId: game.id });

    await notificationService.create({
      userId: request.userId,
      type: 'game_invite',
      title: 'Match Found!',
      message: 'A match has been found for your request',
      data: { gameId: game.id },
    });

    await notificationService.create({
      userId: matchedRequest.userId,
      type: 'game_invite',
      title: 'Match Found!',
      message: 'A match has been found for your request',
      data: { gameId: game.id },
    });

    return game;
  },

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(deg: number): number {
    return deg * (Math.PI / 180);
  },

  /**
   * Calculate match compatibility score
   */
  calculateMatchScore(
    user1: { rating?: string | null; skillLevel?: string | null },
    user2: { rating?: string | null; skillLevel?: string | null },
    distance: number | null
  ): number {
    let score = 100;

    // Rating difference (lower is better)
    const rating1 = parseFloat(user1.rating || '1500');
    const rating2 = parseFloat(user2.rating || '1500');
    const ratingDiff = Math.abs(rating1 - rating2);
    score -= Math.min(ratingDiff / 10, 30); // Max 30 point penalty

    // Skill level difference
    const skill1Index = SKILL_LEVELS.indexOf(user1.skillLevel || 'beginner');
    const skill2Index = SKILL_LEVELS.indexOf(user2.skillLevel || 'beginner');
    const skillDiff = Math.abs(skill1Index - skill2Index);
    score -= skillDiff * 10; // 10 points per skill level difference

    // Distance penalty
    if (distance !== null) {
      score -= Math.min(distance / 2, 20); // Max 20 point penalty for distance
    }

    return Math.max(score, 0);
  },

  /**
   * Expire old match requests
   */
  async expireOldRequests() {
    const expired = await db
      .update(matchRequests)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(matchRequests.status, 'pending'),
          lte(matchRequests.expiresAt, new Date())
        )
      )
      .returning();

    // Notify users of expired requests
    for (const request of expired) {
      emitToUser(request.userId, SocketEvents.MATCH_EXPIRED, {
        requestId: request.id,
      });
    }

    return expired.length;
  },
};

// TODO: Enable when matchRequests table is added to schema
// Run expiration check every minute
// setInterval(() => {
//   matchmakingService.expireOldRequests().catch(console.error);
// }, 60000);
