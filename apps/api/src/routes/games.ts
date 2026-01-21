import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, gte, lte, or, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateParams, validateQuery, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { gameService } from '../services/gameService.js';
import { userService } from '../services/userService.js';
import { db, schema } from '../db/index.js';

const { users, games, gameParticipants, courts, venues } = schema;

const gamesRouter = new Hono();

// Validation schemas
const createGameSchema = z.object({
  gameType: z.enum(['singles', 'doubles', 'mixed_doubles']),
  courtId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  isRanked: z.boolean().default(true),
  team1PlayerIds: z.array(z.string().uuid()).min(1).max(2),
  team2PlayerIds: z.array(z.string().uuid()).min(1).max(2),
});

const updateGameSchema = z.object({
  team1Score: z.number().int().min(0).max(99).optional(),
  team2Score: z.number().int().min(0).max(99).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().max(500).optional(),
});

const recordScoreSchema = z.object({
  team1Score: z.number().int().min(0).max(99),
  team2Score: z.number().int().min(0).max(99),
});

const disputeSchema = z.object({
  reason: z.string().min(10).max(500),
});

const listGamesQuerySchema = z.object({
  ...paginationSchema.shape,
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'forfeited']).optional(),
  gameType: z.enum(['casual', 'competitive', 'tournament', 'league', 'ladder']).optional(),
  gameFormat: z.enum(['singles', 'doubles', 'mixed_doubles']).optional(),
  userId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  upcoming: z.coerce.boolean().optional(),
  past: z.coerce.boolean().optional(),
});

/**
 * GET /games
 * List games with filters
 */
gamesRouter.get('/', validateQuery(listGamesQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const { page, limit, sortBy, sortOrder, status, gameType, gameFormat, userId, venueId, upcoming, past } = query;

  const offset = (page - 1) * limit;
  const now = new Date();

  // Build where conditions
  const conditions = [];

  if (status) {
    conditions.push(eq(games.status, status));
  }

  if (gameType) {
    conditions.push(eq(games.gameType, gameType));
  }

  if (gameFormat) {
    conditions.push(eq(games.gameFormat, gameFormat));
  }

  if (venueId) {
    conditions.push(eq(games.venueId, venueId));
  }

  if (upcoming) {
    conditions.push(gte(games.scheduledAt, now));
    conditions.push(eq(games.status, 'scheduled'));
  }

  if (past) {
    conditions.push(lte(games.scheduledAt, now));
    conditions.push(or(eq(games.status, 'completed'), eq(games.status, 'cancelled')));
  }

  // If filtering by user, need to join with participants
  if (userId) {
    const userGames = await db
      .select({ gameId: gameParticipants.gameId })
      .from(gameParticipants)
      .where(eq(gameParticipants.userId, userId));

    const gameIds = userGames.map((g) => g.gameId);

    if (gameIds.length === 0) {
      return c.json({
        games: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Filter games by IDs
    const filteredGames = await db.query.games.findMany({
      where: conditions.length > 0
        ? and(...conditions, sql`${games.id} IN (${sql.join(gameIds.map(id => sql`${id}`), sql`, `)})`)
        : sql`${games.id} IN (${sql.join(gameIds.map(id => sql`${id}`), sql`, `)})`,
      with: {
        court: true,
        venue: true,
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: sortOrder === 'asc' ? games.createdAt : desc(games.createdAt),
      limit,
      offset,
    });

    return c.json({
      games: filteredGames,
      pagination: {
        page,
        limit,
        total: gameIds.length,
        totalPages: Math.ceil(gameIds.length / limit),
      },
    });
  }

  // Standard query without user filter
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [gamesList, countResult] = await Promise.all([
    db.query.games.findMany({
      where: whereClause,
      with: {
        court: true,
        venue: true,
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: sortOrder === 'asc' ? games.createdAt : desc(games.createdAt),
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(games).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return c.json({
    games: gamesList,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /games/recent
 * Get recent completed games
 */
gamesRouter.get('/recent', async (c) => {
  const gamesList = await gameService.getRecent(10);

  return c.json({
    games: gamesList.map((g) => ({
      id: g.id,
      gameType: g.gameType,
      gameFormat: g.gameFormat,
      status: g.status,
      winningTeam: g.winningTeam,
      scores: g.scores,
      completedAt: g.completedAt,
      court: g.court
        ? {
            id: g.court.id,
            name: g.court.name,
          }
        : null,
      players: g.participants?.map((p: { user: { id: string; username: string; displayName: string | null; avatarUrl: string | null }; team: number }) => ({
        id: p.user.id,
        username: p.user.username,
        displayName: p.user.displayName,
        avatarUrl: p.user.avatarUrl,
        team: p.team,
      })) || [],
    })),
  });
});

/**
 * POST /games
 * Create a new game
 */
gamesRouter.post('/', authMiddleware, validateBody(createGameSchema), async (c) => {
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

  // Validate player counts based on game type
  if (data.gameType === 'singles') {
    if (data.team1PlayerIds.length !== 1 || data.team2PlayerIds.length !== 1) {
      throw new HTTPException(400, {
        message: 'Singles games require exactly 1 player per team',
      });
    }
  } else {
    if (data.team1PlayerIds.length !== 2 || data.team2PlayerIds.length !== 2) {
      throw new HTTPException(400, {
        message: 'Doubles games require exactly 2 players per team',
      });
    }
  }

  // Verify all player IDs are unique
  const allPlayers = [...data.team1PlayerIds, ...data.team2PlayerIds];
  if (new Set(allPlayers).size !== allPlayers.length) {
    throw new HTTPException(400, {
      message: 'Duplicate players are not allowed',
    });
  }

  // Verify creator is in the game
  if (!allPlayers.includes(dbUser.id)) {
    throw new HTTPException(400, {
      message: 'Game creator must be a participant',
    });
  }

  const game = await gameService.create({
    ...data,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    createdById: dbUser.id,
  });

  // Log activity
  await userService.logActivity(dbUser.id, 'game_created', 'game', game.id);

  return c.json(
    {
      message: 'Game created successfully',
      game: await gameService.getById(game.id),
    },
    201
  );
});

/**
 * GET /games/:id
 * Get game details
 */
gamesRouter.get('/:id', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const game = await gameService.getById(id);
  if (!game) {
    throw new HTTPException(404, {
      message: 'Game not found',
    });
  }

  return c.json({ game });
});

/**
 * PATCH /games/:id
 * Update game (score, status, etc.)
 */
gamesRouter.patch(
  '/:id',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(updateGameSchema),
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

    const game = await gameService.getById(id);
    if (!game) {
      throw new HTTPException(404, {
        message: 'Game not found',
      });
    }

    // Verify user is a participant
    const isParticipant = game.players?.some((p: { userId: string }) => p.userId === dbUser.id);
    if (!isParticipant) {
      throw new HTTPException(403, {
        message: 'Only game participants can update the game',
      });
    }

    // If recording final score, use the scoring service
    if (
      updates.team1Score !== undefined &&
      updates.team2Score !== undefined &&
      updates.status === 'completed'
    ) {
      const updatedGame = await gameService.recordScore({
        gameId: id,
        team1Score: updates.team1Score,
        team2Score: updates.team2Score,
        userId: dbUser.id,
      });

      return c.json({
        message: 'Game score recorded',
        game: await gameService.getById(updatedGame.id),
      });
    }

    // For other updates, update the game directly
    const [updatedGame] = await db
      .update(games)
      .set({
        ...(updates.status && { status: updates.status }),
        ...(updates.notes && { notes: updates.notes }),
        ...(updates.status === 'in_progress' && !game.startedAt && { startedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(games.id, id))
      .returning();

    return c.json({
      message: 'Game updated',
      game: await gameService.getById(updatedGame.id),
    });
  }
);

/**
 * POST /games/:id/join
 * Join a game (for open games)
 */
gamesRouter.post(
  '/:id/join',
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

    const game = await gameService.getById(id);
    if (!game) {
      throw new HTTPException(404, {
        message: 'Game not found',
      });
    }

    // Check if game is still open for joining
    if (game.status !== 'scheduled') {
      throw new HTTPException(400, {
        message: 'Can only join scheduled games',
      });
    }

    // Check if user is already a participant
    const isAlreadyParticipant = game.players?.some((p: { userId: string }) => p.userId === dbUser.id);
    if (isAlreadyParticipant) {
      throw new HTTPException(409, {
        message: 'You are already a participant in this game',
      });
    }

    // Determine which team needs players
    const team1Count = game.players?.filter((p: { team: number }) => p.team === 1).length || 0;
    const team2Count = game.players?.filter((p: { team: number }) => p.team === 2).length || 0;

    const maxPlayersPerTeam = game.gameFormat === 'singles' ? 1 : 2;

    let assignedTeam: number;
    if (team1Count < maxPlayersPerTeam) {
      assignedTeam = 1;
    } else if (team2Count < maxPlayersPerTeam) {
      assignedTeam = 2;
    } else {
      throw new HTTPException(400, {
        message: 'Game is already full',
      });
    }

    // Add participant
    const [participant] = await db
      .insert(gameParticipants)
      .values({
        gameId: id,
        userId: dbUser.id,
        team: assignedTeam,
        isConfirmed: true,
        confirmedAt: new Date(),
      })
      .returning();

    // Log activity
    await userService.logActivity(dbUser.id, 'game_joined', 'game', id);

    return c.json({
      message: 'Successfully joined the game',
      team: assignedTeam,
      participant,
    });
  }
);

/**
 * PATCH /games/:id/score
 * Record game score
 */
gamesRouter.patch(
  '/:id/score',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(recordScoreSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { team1Score, team2Score } = c.req.valid('json');
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

    const game = await gameService.getById(id);
    if (!game) {
      throw new HTTPException(404, {
        message: 'Game not found',
      });
    }

    // Verify user is a participant
    const isParticipant = game.players?.some((p: { userId: string }) => p.userId === dbUser.id);
    if (!isParticipant) {
      throw new HTTPException(403, {
        message: 'Only game participants can record the score',
      });
    }

    // Check game status - must be scheduled or in_progress
    if (game.status !== 'scheduled' && game.status !== 'in_progress') {
      throw new HTTPException(400, {
        message: 'Can only record score for scheduled or in-progress games',
      });
    }

    const updatedGame = await gameService.recordScore({
      gameId: id,
      team1Score,
      team2Score,
      userId: dbUser.id,
    });

    // Log activity
    await userService.logActivity(dbUser.id, 'game_score_recorded', 'game', id);

    return c.json({
      message: 'Score recorded successfully',
      game: await gameService.getById(updatedGame.id),
    });
  }
);

/**
 * POST /games/:id/verify
 * Verify game result
 */
gamesRouter.post(
  '/:id/verify',
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

    const game = await gameService.getById(id);
    if (!game) {
      throw new HTTPException(404, {
        message: 'Game not found',
      });
    }

    // Verify user is a participant
    const playerRecord = game.players?.find((p: { userId: string }) => p.userId === dbUser.id);
    if (!playerRecord) {
      throw new HTTPException(403, {
        message: 'Only game participants can verify the result',
      });
    }

    // Check if already verified
    if (playerRecord.hasVerified) {
      throw new HTTPException(409, {
        message: 'You have already verified this game',
      });
    }

    // Check if game is completed
    if (game.status !== 'completed') {
      throw new HTTPException(400, {
        message: 'Can only verify completed games',
      });
    }

    const updatedGame = await gameService.verify(id, dbUser.id);

    return c.json({
      message: 'Game verified',
      verificationCount: updatedGame.verificationCount,
      totalPlayers: game.players?.length || 0,
    });
  }
);

/**
 * POST /games/:id/dispute
 * Dispute game result
 */
gamesRouter.post(
  '/:id/dispute',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(disputeSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { reason } = c.req.valid('json');
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

    const game = await gameService.getById(id);
    if (!game) {
      throw new HTTPException(404, {
        message: 'Game not found',
      });
    }

    // Verify user is a participant
    const isParticipant = game.players?.some((p: { userId: string }) => p.userId === dbUser.id);
    if (!isParticipant) {
      throw new HTTPException(403, {
        message: 'Only game participants can dispute the result',
      });
    }

    // Check if game is completed
    if (game.status !== 'completed') {
      throw new HTTPException(400, {
        message: 'Can only dispute completed games',
      });
    }

    // Check if already disputed
    if (game.status === 'disputed') {
      throw new HTTPException(409, {
        message: 'This game is already disputed',
      });
    }

    await gameService.dispute(id, dbUser.id, reason);

    // Log activity
    await userService.logActivity(dbUser.id, 'game_disputed', 'game', id);

    return c.json({
      message: 'Game disputed. An admin will review.',
    });
  }
);

export default gamesRouter;
