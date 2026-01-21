import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery, validateParams, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware, optionalAuth, requireOwnership } from '../middleware/auth.js';
import { userService } from '../services/userService.js';

const users = new Hono();

// Validation schemas
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'pro']).optional(),
  preferredPlayStyle: z.string().max(50).optional().nullable(),
});

const searchUsersSchema = paginationSchema.extend({
  q: z.string().min(1).max(100).optional(),
});

/**
 * GET /users/:id
 * Get user profile by ID
 */
users.get('/:id', validateParams(idParamSchema), optionalAuth, async (c) => {
  const { id } = c.req.valid('param');

  const user = await userService.getById(id);
  if (!user) {
    throw new HTTPException(404, {
      message: 'User not found',
    });
  }

  // Get public user data
  const publicProfile = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    skillLevel: user.skillLevel,
    rating: user.rating,
    gamesPlayed: user.gamesPlayed,
    wins: user.wins,
    losses: user.losses,
    preferredPlayStyle: user.preferredPlayStyle,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };

  return c.json({ user: publicProfile });
});

/**
 * PATCH /users/:id
 * Update user profile
 */
users.patch(
  '/:id',
  authMiddleware,
  requireOwnership('id'),
  validateParams(idParamSchema),
  validateBody(updateProfileSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const updates = c.req.valid('json');

    const user = await userService.update(id, updates);
    if (!user) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    // Log activity
    await userService.logActivity(id, 'profile_updated');

    return c.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        skillLevel: user.skillLevel,
        preferredPlayStyle: user.preferredPlayStyle,
        updatedAt: user.updatedAt,
      },
    });
  }
);

/**
 * GET /users/:id/stats
 * Get user statistics
 */
users.get('/:id/stats', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const stats = await userService.getStats(id);
  if (!stats) {
    throw new HTTPException(404, {
      message: 'User not found',
    });
  }

  return c.json({ stats });
});

/**
 * GET /users/:id/games
 * Get user's game history
 */
users.get(
  '/:id/games',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');

    // Verify user exists
    const user = await userService.getById(id);
    if (!user) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    const games = await userService.getGames(id, page, limit);

    return c.json({
      games,
      pagination: {
        page,
        limit,
        hasMore: games.length === limit,
      },
    });
  }
);

/**
 * GET /users/:id/achievements
 * Get user's achievements
 */
users.get('/:id/achievements', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  // Verify user exists
  const user = await userService.getById(id);
  if (!user) {
    throw new HTTPException(404, {
      message: 'User not found',
    });
  }

  const achievements = await userService.getAchievements(id);

  return c.json({
    achievements: achievements.map((ua) => ({
      id: ua.achievement.id,
      name: ua.achievement.name,
      description: ua.achievement.description,
      iconUrl: ua.achievement.iconUrl,
      points: ua.achievement.points,
      unlockedAt: ua.earnedAt,
    })),
    totalPoints: achievements.reduce((sum, ua) => sum + (ua.achievement.points || 0), 0),
  });
});

/**
 * GET /users
 * Search users
 */
users.get('/', validateQuery(searchUsersSchema), async (c) => {
  const { q, page, limit } = c.req.valid('query');

  if (!q) {
    throw new HTTPException(400, {
      message: 'Search query is required',
    });
  }

  const results = await userService.search(q, page, limit);

  return c.json({
    users: results.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      skillLevel: user.skillLevel,
      rating: user.rating,
      isVerified: user.isVerified,
    })),
    pagination: {
      page,
      limit,
      hasMore: results.length === limit,
    },
  });
});

export default users;
