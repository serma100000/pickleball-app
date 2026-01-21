import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateParams, idParamSchema } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { matchmakingService } from '../services/matchmakingService.js';
import { db, schema } from '../db/index.js';

const { users } = schema;

const matchmaking = new Hono();

// Validation schemas
const createMatchRequestSchema = z.object({
  gameType: z.enum(['singles', 'doubles', 'mixed_doubles']),
  skillLevelMin: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'pro']).optional(),
  skillLevelMax: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'pro']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  maxDistance: z.number().positive().max(100).optional(),
  preferredTimes: z.array(z.string()).optional(),
  expiresInHours: z.number().positive().max(168).default(24), // Max 1 week
});

const acceptMatchSchema = z.object({
  matchedRequestId: z.string().uuid(),
});

/**
 * POST /matchmaking/requests
 * Create a match request
 */
matchmaking.post(
  '/requests',
  authMiddleware,
  validateBody(createMatchRequestSchema),
  async (c) => {
    const data = c.req.valid('json');
    const { userId } = c.get('user');

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      throw new HTTPException(401, {
        message: 'User not found',
      });
    }

    // Check for existing pending request
    const existingRequest = await db.query.matchRequests.findFirst({
      where: (matchRequests, { and, eq }) =>
        and(
          eq(matchRequests.userId, dbUser.id),
          eq(matchRequests.status, 'pending')
        ),
    });

    if (existingRequest) {
      throw new HTTPException(409, {
        message: 'You already have a pending match request. Cancel it first.',
      });
    }

    const request = await matchmakingService.createRequest({
      ...data,
      userId: dbUser.id,
    });

    return c.json(
      {
        message: 'Match request created',
        request: {
          id: request.id,
          gameType: request.gameType,
          status: request.status,
          expiresAt: request.expiresAt,
          createdAt: request.createdAt,
        },
      },
      201
    );
  }
);

/**
 * GET /matchmaking/requests
 * Get user's match requests
 */
matchmaking.get('/requests', authMiddleware, async (c) => {
  const { userId } = c.get('user');

  // Get user from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    throw new HTTPException(401, {
      message: 'User not found',
    });
  }

  const requests = await db.query.matchRequests.findMany({
    where: eq(schema.matchRequests.userId, dbUser.id),
    orderBy: (matchRequests, { desc }) => desc(matchRequests.createdAt),
    limit: 10,
  });

  return c.json({
    requests: requests.map((r) => ({
      id: r.id,
      gameType: r.gameType,
      status: r.status,
      skillLevelMin: r.skillLevelMin,
      skillLevelMax: r.skillLevelMax,
      maxDistance: r.maxDistance,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    })),
  });
});

/**
 * GET /matchmaking/suggestions
 * Get match suggestions based on user's pending request
 */
matchmaking.get('/suggestions', authMiddleware, async (c) => {
  const { userId } = c.get('user');

  // Get user from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    throw new HTTPException(401, {
      message: 'User not found',
    });
  }

  const suggestions = await matchmakingService.getSuggestions(dbUser.id);

  return c.json({
    suggestions: suggestions.map((s) => ({
      requestId: s.request.id,
      user: {
        id: s.user.id,
        username: s.user.username,
        displayName: s.user.displayName,
        avatarUrl: s.user.avatarUrl,
        skillLevel: s.user.skillLevel,
        rating: s.user.rating,
      },
      distance: s.distance ? Math.round(s.distance * 10) / 10 : null,
      matchScore: Math.round(s.score),
      gameType: s.request.gameType,
    })),
  });
});

/**
 * POST /matchmaking/requests/:id/accept
 * Accept a match with another user's request
 */
matchmaking.post(
  '/requests/:id/accept',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(acceptMatchSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { matchedRequestId } = c.req.valid('json');
    const { userId } = c.get('user');

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      throw new HTTPException(401, {
        message: 'User not found',
      });
    }

    // Verify the request belongs to the user
    const request = await matchmakingService.getById(id);
    if (!request || request.userId !== dbUser.id) {
      throw new HTTPException(404, {
        message: 'Match request not found',
      });
    }

    if (request.status !== 'pending') {
      throw new HTTPException(400, {
        message: 'Match request is no longer pending',
      });
    }

    // Accept the match
    const game = await matchmakingService.acceptMatch(id, matchedRequestId);

    return c.json({
      message: 'Match accepted! Game created.',
      game: {
        id: game.id,
        gameType: game.gameType,
        status: game.status,
        createdAt: game.createdAt,
      },
    });
  }
);

/**
 * DELETE /matchmaking/requests/:id
 * Cancel a match request
 */
matchmaking.delete(
  '/requests/:id',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      throw new HTTPException(401, {
        message: 'User not found',
      });
    }

    const request = await matchmakingService.cancel(id, dbUser.id);

    if (!request) {
      throw new HTTPException(404, {
        message: 'Match request not found or already cancelled',
      });
    }

    return c.json({
      message: 'Match request cancelled',
    });
  }
);

/**
 * GET /matchmaking/stats
 * Get matchmaking statistics
 */
matchmaking.get('/stats', async (c) => {
  // Get count of pending requests
  const pendingCount = await db.query.matchRequests.findMany({
    where: eq(schema.matchRequests.status, 'pending'),
  });

  // In production, would calculate more detailed stats
  return c.json({
    stats: {
      activePlayers: pendingCount.length,
      averageWaitTime: '5 minutes', // Placeholder
      matchesCreatedToday: 0, // Would calculate from games table
    },
  });
});

export default matchmaking;
