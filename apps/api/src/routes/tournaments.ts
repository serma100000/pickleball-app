import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery, validateParams, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { userService } from '../services/userService.js';
import { notificationService } from '../services/notificationService.js';
import { emitToTournament, SocketEvents } from '../lib/socket.js';
import { cache } from '../lib/redis.js';

const { tournaments, tournamentParticipants, tournamentMatches, users } = schema;

const tournamentsRouter = new Hono();

// Validation schemas
const createTournamentSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  gameType: z.enum(['singles', 'doubles', 'mixed_doubles']),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'swiss']),
  skillLevelMin: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'pro']).optional(),
  skillLevelMax: z.enum(['beginner', 'intermediate', 'advanced', 'expert', 'pro']).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime(),
  maxParticipants: z.number().int().min(4).max(256),
  entryFee: z.number().min(0).optional(),
  prizePool: z.number().min(0).optional(),
  courtId: z.string().uuid().optional(),
  rules: z.string().max(5000).optional(),
});

const updateTournamentSchema = createTournamentSchema.partial();

const searchTournamentsSchema = paginationSchema.extend({
  status: z.enum(['draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled']).optional(),
  gameType: z.enum(['singles', 'doubles', 'mixed_doubles']).optional(),
  upcoming: z.coerce.boolean().optional(),
});

const updateMatchScoreSchema = z.object({
  player1Score: z.number().int().min(0),
  player2Score: z.number().int().min(0),
  winnerId: z.string().uuid(),
});

/**
 * GET /tournaments
 * List tournaments
 */
tournamentsRouter.get('/', validateQuery(searchTournamentsSchema), async (c) => {
  const { status, gameType, upcoming, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [];

  if (status) {
    conditions.push(eq(tournaments.status, status));
  }

  if (gameType) {
    conditions.push(eq(tournaments.gameType, gameType));
  }

  if (upcoming) {
    conditions.push(gte(tournaments.startDate, new Date()));
  }

  const results = await db
    .select()
    .from(tournaments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tournaments.startDate))
    .limit(limit)
    .offset(offset);

  return c.json({
    tournaments: results.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      gameType: t.gameType,
      format: t.format,
      status: t.status,
      skillLevelMin: t.skillLevelMin,
      skillLevelMax: t.skillLevelMax,
      startDate: t.startDate,
      registrationDeadline: t.registrationDeadline,
      maxParticipants: t.maxParticipants,
      currentParticipants: t.currentParticipants,
      entryFee: t.entryFee,
      prizePool: t.prizePool,
      createdAt: t.createdAt,
    })),
    pagination: {
      page,
      limit,
      hasMore: results.length === limit,
    },
  });
});

/**
 * POST /tournaments
 * Create a new tournament
 */
tournamentsRouter.post('/', authMiddleware, validateBody(createTournamentSchema), async (c) => {
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

  const [tournament] = await db
    .insert(tournaments)
    .values({
      ...data,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      registrationDeadline: new Date(data.registrationDeadline),
      entryFee: data.entryFee?.toString(),
      prizePool: data.prizePool?.toString(),
      status: 'registration_open',
      createdById: dbUser.id,
    })
    .returning();

  await userService.logActivity(dbUser.id, 'tournament_created', 'tournament', tournament.id);

  return c.json(
    {
      message: 'Tournament created successfully',
      tournament: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        status: tournament.status,
        createdAt: tournament.createdAt,
      },
    },
    201
  );
});

/**
 * GET /tournaments/:id
 * Get tournament details
 */
tournamentsRouter.get('/:id', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const cacheKey = `tournament:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return c.json({ tournament: cached });
  }

  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, id),
    with: {
      court: true,
      createdBy: true,
    },
  });

  if (!tournament) {
    throw new HTTPException(404, {
      message: 'Tournament not found',
    });
  }

  const result = {
    id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    gameType: tournament.gameType,
    format: tournament.format,
    status: tournament.status,
    skillLevelMin: tournament.skillLevelMin,
    skillLevelMax: tournament.skillLevelMax,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    registrationDeadline: tournament.registrationDeadline,
    maxParticipants: tournament.maxParticipants,
    currentParticipants: tournament.currentParticipants,
    entryFee: tournament.entryFee,
    prizePool: tournament.prizePool,
    rules: tournament.rules,
    court: tournament.court
      ? {
          id: tournament.court.id,
          name: tournament.court.name,
          city: tournament.court.city,
          address: tournament.court.address,
        }
      : null,
    createdBy: {
      id: tournament.createdBy.id,
      username: tournament.createdBy.username,
      displayName: tournament.createdBy.displayName,
    },
    createdAt: tournament.createdAt,
  };

  await cache.set(cacheKey, result, 300);

  return c.json({ tournament: result });
});

/**
 * PATCH /tournaments/:id
 * Update tournament
 */
tournamentsRouter.patch(
  '/:id',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(updateTournamentSchema),
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

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, id),
    });

    if (!tournament) {
      throw new HTTPException(404, {
        message: 'Tournament not found',
      });
    }

    if (tournament.createdById !== dbUser.id) {
      throw new HTTPException(403, {
        message: 'Only the tournament creator can update it',
      });
    }

    const [updated] = await db
      .update(tournaments)
      .set({
        ...updates,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        endDate: updates.endDate ? new Date(updates.endDate) : undefined,
        registrationDeadline: updates.registrationDeadline
          ? new Date(updates.registrationDeadline)
          : undefined,
        entryFee: updates.entryFee?.toString(),
        prizePool: updates.prizePool?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id))
      .returning();

    await cache.del(`tournament:${id}`);

    return c.json({
      message: 'Tournament updated',
      tournament: updated,
    });
  }
);

/**
 * GET /tournaments/:id/brackets
 * Get tournament brackets
 */
tournamentsRouter.get(
  '/:id/brackets',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, id),
    });

    if (!tournament) {
      throw new HTTPException(404, {
        message: 'Tournament not found',
      });
    }

    // Get matches
    const matches = await db.query.tournamentMatches.findMany({
      where: eq(tournamentMatches.tournamentId, id),
      with: {
        player1: true,
        player2: true,
        winner: true,
        game: true,
      },
      orderBy: [tournamentMatches.round, tournamentMatches.matchNumber],
    });

    // Group by round
    const rounds: Record<number, typeof matches> = {};
    for (const match of matches) {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    }

    return c.json({
      brackets: {
        format: tournament.format,
        totalRounds: Math.ceil(Math.log2(tournament.maxParticipants || 8)),
        rounds: Object.entries(rounds).map(([round, matches]) => ({
          round: parseInt(round),
          matches: matches.map((m) => ({
            id: m.id,
            matchNumber: m.matchNumber,
            player1: m.player1
              ? {
                  id: m.player1.id,
                  username: m.player1.username,
                  displayName: m.player1.displayName,
                }
              : null,
            player2: m.player2
              ? {
                  id: m.player2.id,
                  username: m.player2.username,
                  displayName: m.player2.displayName,
                }
              : null,
            winner: m.winner
              ? {
                  id: m.winner.id,
                  username: m.winner.username,
                }
              : null,
            scheduledAt: m.scheduledAt,
            gameId: m.gameId,
          })),
        })),
      },
    });
  }
);

/**
 * POST /tournaments/:id/register
 * Register for a tournament
 */
tournamentsRouter.post(
  '/:id/register',
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

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, id),
    });

    if (!tournament) {
      throw new HTTPException(404, {
        message: 'Tournament not found',
      });
    }

    // Check registration status
    if (tournament.status !== 'registration_open') {
      throw new HTTPException(400, {
        message: 'Registration is not open for this tournament',
      });
    }

    // Check deadline
    if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
      throw new HTTPException(400, {
        message: 'Registration deadline has passed',
      });
    }

    // Check capacity
    if (tournament.currentParticipants && tournament.currentParticipants >= (tournament.maxParticipants || 0)) {
      throw new HTTPException(400, {
        message: 'Tournament is full',
      });
    }

    // Check if already registered
    const existing = await db.query.tournamentParticipants.findFirst({
      where: and(
        eq(tournamentParticipants.tournamentId, id),
        eq(tournamentParticipants.userId, dbUser.id)
      ),
    });

    if (existing) {
      throw new HTTPException(409, {
        message: 'Already registered for this tournament',
      });
    }

    // Check skill level requirements
    if (tournament.skillLevelMin || tournament.skillLevelMax) {
      const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert', 'pro'];
      const userSkillIndex = SKILL_LEVELS.indexOf(dbUser.skillLevel || 'beginner');

      if (tournament.skillLevelMin) {
        const minIndex = SKILL_LEVELS.indexOf(tournament.skillLevelMin);
        if (userSkillIndex < minIndex) {
          throw new HTTPException(400, {
            message: `Minimum skill level required: ${tournament.skillLevelMin}`,
          });
        }
      }

      if (tournament.skillLevelMax) {
        const maxIndex = SKILL_LEVELS.indexOf(tournament.skillLevelMax);
        if (userSkillIndex > maxIndex) {
          throw new HTTPException(400, {
            message: `Maximum skill level allowed: ${tournament.skillLevelMax}`,
          });
        }
      }
    }

    // Register
    await db.insert(tournamentParticipants).values({
      tournamentId: id,
      userId: dbUser.id,
    });

    // Update participant count
    await db
      .update(tournaments)
      .set({
        currentParticipants: sql`${tournaments.currentParticipants} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id));

    await cache.del(`tournament:${id}`);

    // Log activity
    await userService.logActivity(dbUser.id, 'tournament_registered', 'tournament', id);

    return c.json({
      message: 'Successfully registered for the tournament',
    });
  }
);

/**
 * PUT /tournaments/:id/matches/:matchId/score
 * Update match score
 */
tournamentsRouter.put(
  '/:id/matches/:matchId/score',
  authMiddleware,
  validateBody(updateMatchScoreSchema),
  async (c) => {
    const tournamentId = c.req.param('id');
    const matchId = c.req.param('matchId');
    const { player1Score, player2Score, winnerId } = c.req.valid('json');
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

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });

    if (!tournament) {
      throw new HTTPException(404, {
        message: 'Tournament not found',
      });
    }

    // Verify user is tournament organizer
    if (tournament.createdById !== dbUser.id) {
      throw new HTTPException(403, {
        message: 'Only the tournament organizer can update match scores',
      });
    }

    const match = await db.query.tournamentMatches.findFirst({
      where: and(
        eq(tournamentMatches.id, matchId),
        eq(tournamentMatches.tournamentId, tournamentId)
      ),
    });

    if (!match) {
      throw new HTTPException(404, {
        message: 'Match not found',
      });
    }

    // Update match
    const [updated] = await db
      .update(tournamentMatches)
      .set({
        winnerId,
        updatedAt: new Date(),
      })
      .where(eq(tournamentMatches.id, matchId))
      .returning();

    // Emit bracket update
    emitToTournament(tournamentId, SocketEvents.TOURNAMENT_MATCH_UPDATE, {
      matchId,
      player1Score,
      player2Score,
      winnerId,
    });

    // If there's a next match, update it with the winner
    // This would be handled by a bracket management service in production

    await cache.del(`tournament:${tournamentId}`);

    return c.json({
      message: 'Match score updated',
      match: updated,
    });
  }
);

/**
 * GET /tournaments/:id/participants
 * Get tournament participants
 */
tournamentsRouter.get(
  '/:id/participants',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const participants = await db.query.tournamentParticipants.findMany({
      where: eq(tournamentParticipants.tournamentId, id),
      with: {
        user: true,
      },
      limit,
      offset,
    });

    return c.json({
      participants: participants.map((p) => ({
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
        skillLevel: p.user.skillLevel,
        rating: p.user.rating,
        seed: p.seed,
        isEliminated: p.isEliminated,
        finalPlacement: p.finalPlacement,
        registeredAt: p.registeredAt,
      })),
      pagination: {
        page,
        limit,
        hasMore: participants.length === limit,
      },
    });
  }
);

export default tournamentsRouter;
