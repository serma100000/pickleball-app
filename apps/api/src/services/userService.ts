import { eq, and, or, like, desc, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { cache } from '../lib/redis.js';
import { nanoid } from 'nanoid';

const { users, gameParticipants, userAchievements, achievements, activityFeedEvents } = schema;

export interface CreateUserInput {
  clerkId: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'pro';
  preferredPlayStyle?: string;
}

export interface SyncUserInput {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export const userService = {
  /**
   * Create a new user
   */
  async create(input: CreateUserInput) {
    const [user] = await db
      .insert(users)
      .values({
        clerkId: input.clerkId,
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
      })
      .returning();

    return user;
  },

  /**
   * Get user by ID
   */
  async getById(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (user) {
      await cache.set(cacheKey, user, 300); // Cache for 5 minutes
    }

    return user;
  },

  /**
   * Get user by Clerk ID
   */
  async getByClerkId(clerkId: string) {
    return db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
  },

  /**
   * Get user by username
   */
  async getByUsername(username: string) {
    return db.query.users.findFirst({
      where: eq(users.username, username),
    });
  },

  /**
   * Get user by email
   */
  async getByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  },

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput) {
    const [user] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    // Invalidate cache
    await cache.del(`user:${id}`);

    return user;
  },

  /**
   * Get user stats
   */
  async getStats(userId: string) {
    const user = await this.getById(userId);
    if (!user) return null;

    // Get recent game stats
    const recentGames = await db
      .select()
      .from(gameParticipants)
      .where(eq(gameParticipants.userId, userId))
      .limit(10);

    // Calculate win streak
    let winStreak = 0;
    // Simplified - in production, calculate from game results

    return {
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      winRate: user.gamesPlayed ? ((user.wins || 0) / user.gamesPlayed * 100).toFixed(1) : '0',
      skillLevel: user.skillLevel,
      winStreak,
      recentGamesCount: recentGames.length,
    };
  },

  /**
   * Get user's game history
   */
  async getGames(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const gamesWithDetails = await db.query.gameParticipants.findMany({
      where: eq(gameParticipants.userId, userId),
      with: {
        game: {
          with: {
            court: true,
            participants: {
              with: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: desc(gameParticipants.createdAt),
      limit,
      offset,
    });

    return gamesWithDetails.map((gp) => gp.game);
  },

  /**
   * Get user's achievements
   */
  async getAchievements(userId: string) {
    return db.query.userAchievements.findMany({
      where: eq(userAchievements.userId, userId),
      with: {
        achievement: true,
      },
      orderBy: desc(userAchievements.unlockedAt),
    });
  },

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(userId: string) {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  },

  /**
   * Update rating after a game
   */
  async updateRating(userId: string, newRating: number) {
    const [user] = await db
      .update(users)
      .set({
        rating: newRating.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    await cache.del(`user:${userId}`);
    return user;
  },

  /**
   * Increment games played/won/lost
   */
  async incrementStats(userId: string, won: boolean) {
    await db
      .update(users)
      .set({
        gamesPlayed: sql`${users.gamesPlayed} + 1`,
        wins: won ? sql`${users.wins} + 1` : users.wins,
        losses: won ? users.losses : sql`${users.losses} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await cache.del(`user:${userId}`);
  },

  /**
   * Search users
   */
  async search(query: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    return db
      .select()
      .from(users)
      .where(
        or(
          like(users.username, searchPattern),
          like(users.displayName, searchPattern)
        )
      )
      .limit(limit)
      .offset(offset);
  },

  /**
   * Log activity
   */
  async logActivity(
    userId: string,
    activityType: string,
    entityType?: string,
    entityId?: string,
    data?: Record<string, unknown>
  ) {
    await db.insert(activityFeedEvents).values({
      userId,
      eventType: activityType,
      referenceType: entityType,
      referenceId: entityId,
      eventData: data || {},
    });
  },

  /**
   * Sync user from Clerk (upsert)
   * Creates a new user if they don't exist, or updates if they do
   */
  async syncFromClerk(input: SyncUserInput) {
    try {
      const existingUser = await this.getByClerkId(input.clerkId);

      if (existingUser) {
        // Update existing user with new data from Clerk
        const [updatedUser] = await db
          .update(users)
          .set({
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            displayName: input.displayName || `${input.firstName} ${input.lastName}`,
            avatarUrl: input.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.clerkId, input.clerkId))
          .returning();

        // Invalidate cache
        await cache.del(`user:${updatedUser.id}`);

        return updatedUser;
      }

      // Check if email already exists (different clerk account)
      const existingEmail = await this.getByEmail(input.email);
      if (existingEmail) {
        // Link the existing account to Clerk
        const [linkedUser] = await db
          .update(users)
          .set({
            clerkId: input.clerkId,
            firstName: input.firstName,
            lastName: input.lastName,
            displayName: input.displayName || `${input.firstName} ${input.lastName}`,
            avatarUrl: input.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, input.email))
          .returning();

        await cache.del(`user:${linkedUser.id}`);
        return linkedUser;
      }

      // Create new user
      // Generate username from email or name if not provided
      const username = input.username || this.generateUsername(input.email, input.firstName, input.lastName);
      const displayName = input.displayName || `${input.firstName} ${input.lastName}`;

      const [newUser] = await db
        .insert(users)
        .values({
          clerkId: input.clerkId,
          email: input.email,
          username,
          firstName: input.firstName,
          lastName: input.lastName,
          displayName,
          avatarUrl: input.avatarUrl,
          // Use a placeholder for password hash since Clerk handles auth
          passwordHash: `clerk_managed_${nanoid()}`,
        })
        .returning();

      return newUser;
    } catch (error) {
      console.error('syncFromClerk error:', error);
      throw error;
    }
  },

  /**
   * Generate a unique username from email or name
   */
  generateUsername(email: string, firstName: string, lastName: string): string {
    // Try email prefix first
    const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');

    if (emailPrefix.length >= 3) {
      return `${emailPrefix}_${nanoid(4)}`;
    }

    // Fall back to first + last name
    const nameBase = `${firstName}${lastName}`.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');

    if (nameBase.length >= 3) {
      return `${nameBase}_${nanoid(4)}`;
    }

    // Final fallback
    return `user_${nanoid(8)}`;
  },
};
