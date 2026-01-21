import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery, validateParams, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { userService } from '../services/userService.js';
import { notificationService } from '../services/notificationService.js';
import { cache } from '../lib/redis.js';

const { leagues, leagueParticipants, users } = schema;

const leaguesRouter = new Hono();

// Validation schemas
const createLeagueSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  season: z.string().max(50).optional(),
  gameType: z.enum(['singles', 'doubles', 'mixed_doubles']),
  skillLevelMin: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'pro']).optional(),
  skillLevelMax: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'pro']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  maxTeams: z.number().int().positive().max(100).optional(),
});

const updateLeagueSchema = createLeagueSchema.partial();

const searchLeaguesSchema = paginationSchema.extend({
  gameType: z.enum(['singles', 'doubles', 'mixed_doubles']).optional(),
  isActive: z.coerce.boolean().optional(),
});

const joinLeagueSchema = z.object({
  teamName: z.string().min(1).max(100).optional(),
});

/**
 * GET /leagues
 * List leagues
 */
leaguesRouter.get('/', validateQuery(searchLeaguesSchema), async (c) => {
  const { gameType, isActive, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [];

  if (gameType) {
    conditions.push(eq(leagues.gameType, gameType));
  }

  if (isActive !== undefined) {
    conditions.push(eq(leagues.isActive, isActive));
  }

  const results = await db
    .select()
    .from(leagues)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leagues.startDate))
    .limit(limit)
    .offset(offset);

  return c.json({
    leagues: results.map((league) => ({
      id: league.id,
      name: league.name,
      description: league.description,
      season: league.season,
      gameType: league.gameType,
      skillLevelMin: league.skillLevelMin,
      skillLevelMax: league.skillLevelMax,
      startDate: league.startDate,
      endDate: league.endDate,
      registrationDeadline: league.registrationDeadline,
      maxTeams: league.maxTeams,
      currentTeams: league.currentTeams,
      isActive: league.isActive,
      createdAt: league.createdAt,
    })),
    pagination: {
      page,
      limit,
      hasMore: results.length === limit,
    },
  });
});

/**
 * POST /leagues
 * Create a new league
 */
leaguesRouter.post('/', authMiddleware, validateBody(createLeagueSchema), async (c) => {
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

  const [league] = await db
    .insert(leagues)
    .values({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      registrationDeadline: data.registrationDeadline
        ? new Date(data.registrationDeadline)
        : undefined,
      createdById: dbUser.id,
    })
    .returning();

  await userService.logActivity(dbUser.id, 'league_created', 'league', league.id);

  return c.json(
    {
      message: 'League created successfully',
      league: {
        id: league.id,
        name: league.name,
        gameType: league.gameType,
        createdAt: league.createdAt,
      },
    },
    201
  );
});

/**
 * GET /leagues/:id
 * Get league details
 */
leaguesRouter.get('/:id', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const cacheKey = `league:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return c.json({ league: cached });
  }

  const league = await db.query.leagues.findFirst({
    where: eq(leagues.id, id),
    with: {
      createdBy: true,
    },
  });

  if (!league) {
    throw new HTTPException(404, {
      message: 'League not found',
    });
  }

  const result = {
    id: league.id,
    name: league.name,
    description: league.description,
    season: league.season,
    gameType: league.gameType,
    skillLevelMin: league.skillLevelMin,
    skillLevelMax: league.skillLevelMax,
    startDate: league.startDate,
    endDate: league.endDate,
    registrationDeadline: league.registrationDeadline,
    maxTeams: league.maxTeams,
    currentTeams: league.currentTeams,
    isActive: league.isActive,
    createdBy: {
      id: league.createdBy.id,
      username: league.createdBy.username,
      displayName: league.createdBy.displayName,
    },
    createdAt: league.createdAt,
  };

  await cache.set(cacheKey, result, 300);

  return c.json({ league: result });
});

/**
 * PATCH /leagues/:id
 * Update league
 */
leaguesRouter.patch(
  '/:id',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(updateLeagueSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const updates = c.req.valid('json');
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

    // Verify user is the creator
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });

    if (!league) {
      throw new HTTPException(404, {
        message: 'League not found',
      });
    }

    if (league.createdById !== dbUser.id) {
      throw new HTTPException(403, {
        message: 'Only the league creator can update it',
      });
    }

    const [updated] = await db
      .update(leagues)
      .set({
        ...updates,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        endDate: updates.endDate ? new Date(updates.endDate) : undefined,
        registrationDeadline: updates.registrationDeadline
          ? new Date(updates.registrationDeadline)
          : undefined,
        updatedAt: new Date(),
      })
      .where(eq(leagues.id, id))
      .returning();

    await cache.del(`league:${id}`);

    return c.json({
      message: 'League updated',
      league: updated,
    });
  }
);

/**
 * GET /leagues/:id/standings
 * Get league standings
 */
leaguesRouter.get(
  '/:id/standings',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const participants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.leagueId, id),
      with: {
        user: true,
      },
    });

    // Calculate standings
    const standings = participants
      .map((p) => ({
        rank: 0,
        user: {
          id: p.user.id,
          username: p.user.username,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
        },
        teamName: p.teamName,
        wins: p.wins,
        losses: p.losses,
        pointsFor: p.pointsFor,
        pointsAgainst: p.pointsAgainst,
        pointsDiff: (p.pointsFor || 0) - (p.pointsAgainst || 0),
        winRate: p.wins && p.losses ? ((p.wins / (p.wins + p.losses)) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => {
        // Sort by wins, then by point differential
        if (b.wins !== a.wins) return (b.wins || 0) - (a.wins || 0);
        return b.pointsDiff - a.pointsDiff;
      })
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return c.json({ standings });
  }
);

/**
 * GET /leagues/:id/schedule
 * Get league schedule
 */
leaguesRouter.get(
  '/:id/schedule',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    // In production, would have a league_matches table
    // For now, return placeholder
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });

    if (!league) {
      throw new HTTPException(404, {
        message: 'League not found',
      });
    }

    // Placeholder schedule
    return c.json({
      schedule: {
        leagueId: id,
        rounds: [],
        message: 'Schedule will be generated when the league starts',
      },
    });
  }
);

/**
 * POST /leagues/:id/join
 * Join a league
 */
leaguesRouter.post(
  '/:id/join',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(joinLeagueSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { teamName } = c.req.valid('json');
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

    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });

    if (!league) {
      throw new HTTPException(404, {
        message: 'League not found',
      });
    }

    // Check registration deadline
    if (league.registrationDeadline && new Date() > league.registrationDeadline) {
      throw new HTTPException(400, {
        message: 'Registration deadline has passed',
      });
    }

    // Check max teams
    if (league.maxTeams && league.currentTeams && league.currentTeams >= league.maxTeams) {
      throw new HTTPException(400, {
        message: 'League is full',
      });
    }

    // Check if already joined
    const existing = await db.query.leagueParticipants.findFirst({
      where: and(
        eq(leagueParticipants.leagueId, id),
        eq(leagueParticipants.userId, dbUser.id)
      ),
    });

    if (existing) {
      throw new HTTPException(409, {
        message: 'Already registered for this league',
      });
    }

    // Check skill level requirements
    if (league.skillLevelMin || league.skillLevelMax) {
      const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert', 'pro'];
      const userSkillIndex = SKILL_LEVELS.indexOf(dbUser.skillLevel || 'beginner');

      if (league.skillLevelMin) {
        const minIndex = SKILL_LEVELS.indexOf(league.skillLevelMin);
        if (userSkillIndex < minIndex) {
          throw new HTTPException(400, {
            message: `Minimum skill level required: ${league.skillLevelMin}`,
          });
        }
      }

      if (league.skillLevelMax) {
        const maxIndex = SKILL_LEVELS.indexOf(league.skillLevelMax);
        if (userSkillIndex > maxIndex) {
          throw new HTTPException(400, {
            message: `Maximum skill level allowed: ${league.skillLevelMax}`,
          });
        }
      }
    }

    // Join league
    await db.insert(leagueParticipants).values({
      leagueId: id,
      userId: dbUser.id,
      teamName,
    });

    // Update team count
    await db
      .update(leagues)
      .set({
        currentTeams: sql`${leagues.currentTeams} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(leagues.id, id));

    await cache.del(`league:${id}`);

    // Log activity
    await userService.logActivity(dbUser.id, 'league_joined', 'league', id);

    return c.json({
      message: 'Successfully joined the league',
    });
  }
);

/**
 * DELETE /leagues/:id/leave
 * Leave a league
 */
leaguesRouter.delete(
  '/:id/leave',
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

    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });

    if (!league) {
      throw new HTTPException(404, {
        message: 'League not found',
      });
    }

    // Can't leave if league has started
    if (league.startDate && new Date() > league.startDate) {
      throw new HTTPException(400, {
        message: 'Cannot leave a league that has already started',
      });
    }

    const participation = await db.query.leagueParticipants.findFirst({
      where: and(
        eq(leagueParticipants.leagueId, id),
        eq(leagueParticipants.userId, dbUser.id)
      ),
    });

    if (!participation) {
      throw new HTTPException(404, {
        message: 'Not registered for this league',
      });
    }

    // Remove participation
    await db
      .delete(leagueParticipants)
      .where(
        and(
          eq(leagueParticipants.leagueId, id),
          eq(leagueParticipants.userId, dbUser.id)
        )
      );

    // Update team count
    await db
      .update(leagues)
      .set({
        currentTeams: sql`${leagues.currentTeams} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(leagues.id, id));

    await cache.del(`league:${id}`);

    return c.json({
      message: 'Successfully left the league',
    });
  }
);

export default leaguesRouter;
