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

// Enhanced game creation schema supporting round robins
const createGameEnhancedSchema = z.object({
  // Game type: 'single_match' or 'round_robin'
  type: z.enum(['single_match', 'round_robin']).default('single_match'),

  // Game format (singles, doubles, mixed_doubles)
  gameFormat: z.enum(['singles', 'doubles', 'mixed_doubles']),

  // Game classification
  gameType: z.enum(['casual', 'competitive', 'tournament', 'league', 'ladder']).default('casual'),

  // Location
  courtId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  locationNotes: z.string().max(500).optional(),

  // Scheduling
  scheduledAt: z.string().datetime().optional(),

  // Participants - for single match (team-based)
  team1PlayerIds: z.array(z.string().uuid()).min(1).max(2).optional(),
  team2PlayerIds: z.array(z.string().uuid()).min(1).max(2).optional(),

  // Participants - for round robin (pool of players)
  participantIds: z.array(z.string().uuid()).min(3).max(32).optional(),

  // Scores - for single match (can be provided at creation for completed games)
  scores: z.array(z.object({
    team1: z.number().int().min(0).max(99),
    team2: z.number().int().min(0).max(99),
  })).optional(),

  // Game settings
  isRated: z.boolean().default(true),
  pointsToWin: z.number().int().min(1).max(21).default(11),
  winBy: z.number().int().min(1).max(5).default(2),
  bestOf: z.number().int().min(1).max(7).default(1),

  // DUPR reporting
  reportToDupr: z.boolean().default(false),

  // Notes
  notes: z.string().max(1000).optional(),
});

// Schema for adding matches to a round robin
const addMatchesSchema = z.object({
  matches: z.array(z.object({
    team1PlayerIds: z.array(z.string().uuid()).min(1).max(2),
    team2PlayerIds: z.array(z.string().uuid()).min(1).max(2),
    scores: z.array(z.object({
      team1: z.number().int().min(0).max(99),
      team2: z.number().int().min(0).max(99),
    })).optional(),
    scheduledAt: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  })).min(1).max(100),
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

// DUPR submission status type (stored in game notes as JSON prefix)
type DuprSubmissionStatus = 'pending' | 'verified' | 'submitting' | 'submitted' | 'failed';

// Helper to extract DUPR status from game notes
function extractDuprStatus(notes: string | null): { duprStatus: DuprSubmissionStatus | null; duprSubmittedAt: Date | null; cleanNotes: string | null } {
  if (!notes) return { duprStatus: null, duprSubmittedAt: null, cleanNotes: null };

  const duprMatch = notes.match(/^\[DUPR:(\w+)(?::(\d+))?\]/);
  if (duprMatch) {
    const status = duprMatch[1] as DuprSubmissionStatus;
    const timestamp = duprMatch[2] ? new Date(parseInt(duprMatch[2])) : null;
    const cleanNotes = notes.replace(/^\[DUPR:\w+(?::\d+)?\]\s*/, '') || null;
    return { duprStatus: status, duprSubmittedAt: timestamp, cleanNotes };
  }

  return { duprStatus: null, duprSubmittedAt: null, cleanNotes: notes };
}

// Helper to encode DUPR status into notes
function encodeDuprStatus(status: DuprSubmissionStatus, existingNotes: string | null, submittedAt?: Date): string {
  const { cleanNotes } = extractDuprStatus(existingNotes);
  const timestamp = submittedAt ? `:${submittedAt.getTime()}` : '';
  const prefix = `[DUPR:${status}${timestamp}]`;
  return cleanNotes ? `${prefix} ${cleanNotes}` : prefix;
}

// Interface for verification status response
interface VerificationStatus {
  gameId: string;
  team1Verifications: Array<{
    playerId: string;
    username: string;
    displayName: string | null;
    isConfirmed: boolean;
    confirmedAt: Date | null;
  }>;
  team2Verifications: Array<{
    playerId: string;
    username: string;
    displayName: string | null;
    isConfirmed: boolean;
    confirmedAt: Date | null;
  }>;
  team1Verified: boolean;
  team2Verified: boolean;
  fullyVerified: boolean;
  duprSubmissionStatus: DuprSubmissionStatus | null;
  duprSubmittedAt: Date | null;
  scores: unknown;
}

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
    if (playerRecord.isConfirmed) {
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

/**
 * GET /games/:id/verification-status
 * Get verification status for a game including DUPR submission status
 */
gamesRouter.get(
  '/:id/verification-status',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const game = await gameService.getById(id);
    if (!game) {
      throw new HTTPException(404, {
        message: 'Game not found',
      });
    }

    // Get all participants with their verification status
    const participants = game.players || [];

    const team1Players = participants.filter((p: { team: number }) => p.team === 1);
    const team2Players = participants.filter((p: { team: number }) => p.team === 2);

    // Check if at least one player from each team has verified
    const team1Verified = team1Players.some((p: { isConfirmed: boolean | null }) => p.isConfirmed === true);
    const team2Verified = team2Players.some((p: { isConfirmed: boolean | null }) => p.isConfirmed === true);
    const fullyVerified = team1Verified && team2Verified;

    // Extract DUPR status from notes
    const { duprStatus, duprSubmittedAt } = extractDuprStatus(game.notes);

    const response: VerificationStatus = {
      gameId: id,
      team1Verifications: team1Players.map((p: { userId: string; user: { username: string; displayName: string | null }; isConfirmed: boolean | null; confirmedAt: Date | null }) => ({
        playerId: p.userId,
        username: p.user.username,
        displayName: p.user.displayName,
        isConfirmed: p.isConfirmed === true,
        confirmedAt: p.confirmedAt,
      })),
      team2Verifications: team2Players.map((p: { userId: string; user: { username: string; displayName: string | null }; isConfirmed: boolean | null; confirmedAt: Date | null }) => ({
        playerId: p.userId,
        username: p.user.username,
        displayName: p.user.displayName,
        isConfirmed: p.isConfirmed === true,
        confirmedAt: p.confirmedAt,
      })),
      team1Verified,
      team2Verified,
      fullyVerified,
      duprSubmissionStatus: duprStatus,
      duprSubmittedAt,
      scores: game.scores,
    };

    return c.json(response);
  }
);

/**
 * POST /games/:id/verify-score
 * Verify/confirm scores for a game (enhanced verification with DUPR status update)
 */
gamesRouter.post(
  '/:id/verify-score',
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
        message: 'Only game participants can verify scores',
      });
    }

    // Check if game is completed
    if (game.status !== 'completed') {
      throw new HTTPException(400, {
        message: 'Can only verify completed games',
      });
    }

    // Check if already verified by this user
    if (playerRecord.isConfirmed) {
      throw new HTTPException(409, {
        message: 'You have already verified this game',
      });
    }

    // Update the participant's confirmation status
    await db
      .update(gameParticipants)
      .set({
        isConfirmed: true,
        confirmedAt: new Date(),
      })
      .where(
        and(
          eq(gameParticipants.gameId, id),
          eq(gameParticipants.userId, dbUser.id)
        )
      );

    // Re-fetch participants to check verification status
    const updatedGame = await gameService.getById(id);
    const participants = updatedGame?.players || [];

    const team1Players = participants.filter((p: { team: number }) => p.team === 1);
    const team2Players = participants.filter((p: { team: number }) => p.team === 2);

    const team1Verified = team1Players.some((p: { isConfirmed: boolean | null }) => p.isConfirmed === true);
    const team2Verified = team2Players.some((p: { isConfirmed: boolean | null }) => p.isConfirmed === true);
    const fullyVerified = team1Verified && team2Verified;

    // Extract current DUPR status
    const { duprStatus: currentDuprStatus } = extractDuprStatus(game.notes);

    // If both teams have verified and DUPR reporting was requested, update status to 'verified'
    if (fullyVerified && (currentDuprStatus === 'pending' || game.notes?.includes('[DUPR:pending]'))) {
      const newNotes = encodeDuprStatus('verified', game.notes);
      await db
        .update(games)
        .set({
          notes: newNotes,
          updatedAt: new Date(),
        })
        .where(eq(games.id, id));
    }

    // Log activity
    await userService.logActivity(dbUser.id, 'game_score_verified', 'game', id);

    return c.json({
      message: 'Score verified successfully',
      verification: {
        team1Verified,
        team2Verified,
        fullyVerified,
        duprSubmissionStatus: fullyVerified && currentDuprStatus ? 'verified' : currentDuprStatus,
      },
    });
  }
);

/**
 * POST /games/:id/submit-dupr
 * Trigger DUPR submission (placeholder implementation)
 */
gamesRouter.post(
  '/:id/submit-dupr',
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
    const isParticipant = game.players?.some((p: { userId: string }) => p.userId === dbUser.id);
    if (!isParticipant) {
      throw new HTTPException(403, {
        message: 'Only game participants can submit to DUPR',
      });
    }

    // Check if game is completed
    if (game.status !== 'completed') {
      throw new HTTPException(400, {
        message: 'Can only submit completed games to DUPR',
      });
    }

    // Extract current DUPR status
    const { duprStatus } = extractDuprStatus(game.notes);

    // Check if DUPR submission was requested for this game
    if (!duprStatus) {
      throw new HTTPException(400, {
        message: 'DUPR reporting was not enabled for this game',
      });
    }

    // Only allow submission if status is 'verified'
    if (duprStatus !== 'verified') {
      if (duprStatus === 'submitted') {
        throw new HTTPException(409, {
          message: 'This game has already been submitted to DUPR',
        });
      }
      if (duprStatus === 'submitting') {
        throw new HTTPException(409, {
          message: 'This game is currently being submitted to DUPR',
        });
      }
      if (duprStatus === 'pending') {
        throw new HTTPException(400, {
          message: 'Game scores must be verified by both teams before DUPR submission',
        });
      }
      throw new HTTPException(400, {
        message: `Cannot submit to DUPR with status: ${duprStatus}`,
      });
    }

    // Update status to 'submitting'
    let newNotes = encodeDuprStatus('submitting', game.notes);
    await db
      .update(games)
      .set({
        notes: newNotes,
        updatedAt: new Date(),
      })
      .where(eq(games.id, id));

    // PLACEHOLDER: In production, this would call the actual DUPR API
    // For now, we simulate a successful submission
    // await duprService.submitGame(game);

    // Update status to 'submitted' with timestamp
    const submittedAt = new Date();
    newNotes = encodeDuprStatus('submitted', game.notes, submittedAt);
    await db
      .update(games)
      .set({
        notes: newNotes,
        updatedAt: new Date(),
      })
      .where(eq(games.id, id));

    // Log activity
    await userService.logActivity(dbUser.id, 'game_submitted_to_dupr', 'game', id);

    return c.json({
      message: 'Game successfully submitted to DUPR',
      duprSubmissionStatus: 'submitted',
      duprSubmittedAt: submittedAt,
    });
  }
);

/**
 * Helper function to validate DUPR eligibility for players
 */
async function validateDuprEligibility(playerIds: string[]): Promise<{ valid: boolean; missingDuprIds: Array<{ playerId: string; username: string }> }> {
  const missingDuprIds: Array<{ playerId: string; username: string }> = [];

  for (const playerId of playerIds) {
    // Check if user has a DUPR ID linked
    const userRating = await db.query.userRatings.findFirst({
      where: and(
        eq(schema.userRatings.userId, playerId),
        eq(schema.userRatings.ratingType, 'dupr')
      ),
      with: {
        user: {
          columns: {
            username: true,
          },
        },
      },
    });

    // If no DUPR rating record exists or no DUPR ID is set
    if (!userRating?.duprId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, playerId),
        columns: { username: true },
      });

      missingDuprIds.push({
        playerId,
        username: user?.username || 'Unknown',
      });
    }
  }

  return {
    valid: missingDuprIds.length === 0,
    missingDuprIds,
  };
}

/**
 * POST /games/create
 * Enhanced game creation supporting single matches and round robins
 */
gamesRouter.post('/create', authMiddleware, validateBody(createGameEnhancedSchema), async (c) => {
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

  // Validate based on type
  if (data.type === 'single_match') {
    // Single match requires team players
    if (!data.team1PlayerIds || !data.team2PlayerIds) {
      throw new HTTPException(400, {
        message: 'Single match requires team1PlayerIds and team2PlayerIds',
      });
    }

    // Validate player counts based on game format
    if (data.gameFormat === 'singles') {
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

    // Validate DUPR eligibility if reportToDupr is enabled
    if (data.reportToDupr) {
      const duprValidation = await validateDuprEligibility(allPlayers);
      if (!duprValidation.valid) {
        throw new HTTPException(400, {
          message: 'All players must have linked DUPR accounts to report game to DUPR',
          // @ts-expect-error - extending HTTPException response
          playersWithoutDupr: duprValidation.missingDuprIds,
        });
      }
    }

    // Determine status and winning team
    const hasScores = data.scores && data.scores.length > 0;
    const initialStatus = hasScores ? 'completed' : data.scheduledAt ? 'scheduled' : 'in_progress';

    let winningTeam: number | undefined;
    if (hasScores && data.scores) {
      // Calculate winning team from scores
      const team1Wins = data.scores.filter((s) => s.team1 > s.team2).length;
      const team2Wins = data.scores.filter((s) => s.team2 > s.team1).length;
      winningTeam = team1Wins > team2Wins ? 1 : 2;
    }

    // Prepare notes with DUPR status if reportToDupr is enabled
    let gameNotes = data.notes || null;
    if (data.reportToDupr) {
      // Set initial DUPR status to 'pending' - requires verification before submission
      gameNotes = encodeDuprStatus('pending', gameNotes);
    }

    // Create game in transaction
    const result = await db.transaction(async (tx) => {
      // Create the game
      const [game] = await tx
        .insert(games)
        .values({
          gameFormat: data.gameFormat,
          gameType: data.gameType,
          status: initialStatus,
          courtId: data.courtId,
          venueId: data.venueId,
          locationNotes: data.locationNotes,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          completedAt: initialStatus === 'completed' ? new Date() : undefined,
          isRated: data.isRated,
          pointsToWin: data.pointsToWin,
          winBy: data.winBy,
          bestOf: data.bestOf,
          scores: data.scores || [],
          winningTeam,
          notes: gameNotes,
          createdBy: dbUser.id,
        })
        .returning();

      // Get user ratings for snapshot
      const getUserRating = async (playerId: string) => {
        const rating = await tx.query.userRatings.findFirst({
          where: and(
            eq(schema.userRatings.userId, playerId),
            eq(schema.userRatings.gameFormat, data.gameFormat)
          ),
        });
        return rating?.rating || '3.00';
      };

      // Add team 1 players
      for (const playerId of data.team1PlayerIds!) {
        const ratingAtGame = await getUserRating(playerId);
        await tx.insert(gameParticipants).values({
          gameId: game.id,
          userId: playerId,
          team: 1,
          ratingAtGame,
          isConfirmed: playerId === dbUser.id,
          confirmedAt: playerId === dbUser.id ? new Date() : undefined,
        });
      }

      // Add team 2 players
      for (const playerId of data.team2PlayerIds!) {
        const ratingAtGame = await getUserRating(playerId);
        await tx.insert(gameParticipants).values({
          gameId: game.id,
          userId: playerId,
          team: 2,
          ratingAtGame,
          isConfirmed: false,
        });
      }

      return game;
    });

    // Log activity
    await userService.logActivity(dbUser.id, 'game_created', 'game', result.id);

    // Get full game details
    const fullGame = await gameService.getById(result.id);

    return c.json(
      {
        message: 'Game created successfully',
        game: fullGame,
        reportToDupr: data.reportToDupr,
      },
      201
    );
  } else if (data.type === 'round_robin') {
    // Round robin requires participant pool
    if (!data.participantIds || data.participantIds.length < 3) {
      throw new HTTPException(400, {
        message: 'Round robin requires at least 3 participants',
      });
    }

    // Verify creator is in participants
    if (!data.participantIds.includes(dbUser.id)) {
      throw new HTTPException(400, {
        message: 'Round robin creator must be a participant',
      });
    }

    // Validate DUPR eligibility if reportToDupr is enabled
    if (data.reportToDupr) {
      const duprValidation = await validateDuprEligibility(data.participantIds);
      if (!duprValidation.valid) {
        throw new HTTPException(400, {
          message: 'All players must have linked DUPR accounts to report games to DUPR',
          // @ts-expect-error - extending HTTPException response
          playersWithoutDupr: duprValidation.missingDuprIds,
        });
      }
    }

    // Prepare notes with DUPR and round robin markers
    let roundRobinNotes = data.notes ? `[ROUND ROBIN] ${data.notes}` : '[ROUND ROBIN]';
    if (data.reportToDupr) {
      roundRobinNotes = encodeDuprStatus('pending', roundRobinNotes);
    }

    // Create a "parent" game to represent the round robin event
    const result = await db.transaction(async (tx) => {
      const [parentGame] = await tx
        .insert(games)
        .values({
          gameFormat: data.gameFormat,
          gameType: data.gameType,
          status: 'scheduled',
          courtId: data.courtId,
          venueId: data.venueId,
          locationNotes: data.locationNotes,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
          isRated: data.isRated,
          pointsToWin: data.pointsToWin,
          winBy: data.winBy,
          bestOf: data.bestOf,
          notes: roundRobinNotes,
          createdBy: dbUser.id,
        })
        .returning();

      // Add all participants to the parent game (team 0 for round robin pool)
      for (const playerId of data.participantIds!) {
        const rating = await tx.query.userRatings.findFirst({
          where: and(
            eq(schema.userRatings.userId, playerId),
            eq(schema.userRatings.gameFormat, data.gameFormat)
          ),
        });

        await tx.insert(gameParticipants).values({
          gameId: parentGame.id,
          userId: playerId,
          team: 0, // Team 0 indicates round robin pool member
          ratingAtGame: rating?.rating || '3.00',
          isConfirmed: playerId === dbUser.id,
          confirmedAt: playerId === dbUser.id ? new Date() : undefined,
        });
      }

      return parentGame;
    });

    // Log activity
    await userService.logActivity(dbUser.id, 'round_robin_created', 'game', result.id);

    // Get full game details
    const fullGame = await gameService.getById(result.id);

    return c.json(
      {
        message: 'Round robin event created successfully',
        game: fullGame,
        participantCount: data.participantIds.length,
        reportToDupr: data.reportToDupr,
        note: 'Add matches using POST /games/:id/matches',
      },
      201
    );
  }

  throw new HTTPException(400, {
    message: 'Invalid game type',
  });
});

/**
 * POST /games/:id/matches
 * Add matches to a round robin event
 */
gamesRouter.post(
  '/:id/matches',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(addMatchesSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { matches } = c.req.valid('json');
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

    // Get parent game
    const parentGame = await gameService.getById(id);
    if (!parentGame) {
      throw new HTTPException(404, {
        message: 'Game not found',
      });
    }

    // Verify this is a round robin event
    if (!parentGame.notes?.includes('[ROUND ROBIN]')) {
      throw new HTTPException(400, {
        message: 'Matches can only be added to round robin events',
      });
    }

    // Verify user is a participant
    const isParticipant = parentGame.players?.some((p: { userId: string }) => p.userId === dbUser.id);
    if (!isParticipant) {
      throw new HTTPException(403, {
        message: 'Only event participants can add matches',
      });
    }

    // Get list of valid participant IDs
    const validParticipantIds = new Set(
      parentGame.players?.map((p: { userId: string }) => p.userId) || []
    );

    // Validate all match players are event participants
    for (const match of matches) {
      const allMatchPlayers = [...match.team1PlayerIds, ...match.team2PlayerIds];
      for (const playerId of allMatchPlayers) {
        if (!validParticipantIds.has(playerId)) {
          throw new HTTPException(400, {
            message: `Player ${playerId} is not a participant in this round robin`,
          });
        }
      }

      // Check for duplicate players in match
      if (new Set(allMatchPlayers).size !== allMatchPlayers.length) {
        throw new HTTPException(400, {
          message: 'Duplicate players in a match are not allowed',
        });
      }
    }

    // Create matches
    const createdMatches = [];
    for (const match of matches) {
      const hasScores = match.scores && match.scores.length > 0;
      const matchStatus = hasScores ? 'completed' : match.scheduledAt ? 'scheduled' : 'in_progress';

      let winningTeam: number | undefined;
      if (hasScores && match.scores) {
        const team1Wins = match.scores.filter((s) => s.team1 > s.team2).length;
        const team2Wins = match.scores.filter((s) => s.team2 > s.team1).length;
        winningTeam = team1Wins > team2Wins ? 1 : 2;
      }

      const result = await db.transaction(async (tx) => {
        // Create the match game
        const [matchGame] = await tx
          .insert(games)
          .values({
            gameFormat: parentGame.gameFormat,
            gameType: parentGame.gameType,
            status: matchStatus,
            courtId: parentGame.courtId,
            venueId: parentGame.venueId,
            scheduledAt: match.scheduledAt ? new Date(match.scheduledAt) : parentGame.scheduledAt,
            completedAt: matchStatus === 'completed' ? new Date() : undefined,
            isRated: parentGame.isRated,
            pointsToWin: parentGame.pointsToWin,
            winBy: parentGame.winBy,
            bestOf: parentGame.bestOf,
            scores: match.scores || [],
            winningTeam,
            notes: match.notes ? `[RR:${id}] ${match.notes}` : `[RR:${id}]`,
            createdBy: dbUser.id,
          })
          .returning();

        // Get user ratings for snapshot
        const getUserRating = async (playerId: string) => {
          const rating = await tx.query.userRatings.findFirst({
            where: and(
              eq(schema.userRatings.userId, playerId),
              eq(schema.userRatings.gameFormat, parentGame.gameFormat)
            ),
          });
          return rating?.rating || '3.00';
        };

        // Add team 1 players
        for (const playerId of match.team1PlayerIds) {
          const ratingAtGame = await getUserRating(playerId);
          await tx.insert(gameParticipants).values({
            gameId: matchGame.id,
            userId: playerId,
            team: 1,
            ratingAtGame,
            isConfirmed: true,
            confirmedAt: new Date(),
          });
        }

        // Add team 2 players
        for (const playerId of match.team2PlayerIds) {
          const ratingAtGame = await getUserRating(playerId);
          await tx.insert(gameParticipants).values({
            gameId: matchGame.id,
            userId: playerId,
            team: 2,
            ratingAtGame,
            isConfirmed: true,
            confirmedAt: new Date(),
          });
        }

        return matchGame;
      });

      createdMatches.push(result);
    }

    // Update parent game status if all matches are completed
    const allMatchesCompleted = createdMatches.every((m) => m.status === 'completed');
    if (allMatchesCompleted && createdMatches.length > 0) {
      await db
        .update(games)
        .set({
          status: 'in_progress',
          updatedAt: new Date(),
        })
        .where(eq(games.id, id));
    }

    // Get match details
    const matchDetails = await Promise.all(
      createdMatches.map((m) => gameService.getById(m.id))
    );

    return c.json(
      {
        message: `${createdMatches.length} match(es) added to round robin`,
        matches: matchDetails,
        roundRobinId: id,
      },
      201
    );
  }
);

/**
 * GET /games/:id/matches
 * Get all matches for a round robin event
 */
gamesRouter.get('/:id/matches', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  // Get parent game
  const parentGame = await gameService.getById(id);
  if (!parentGame) {
    throw new HTTPException(404, {
      message: 'Game not found',
    });
  }

  // Verify this is a round robin event
  if (!parentGame.notes?.includes('[ROUND ROBIN]')) {
    throw new HTTPException(400, {
      message: 'This endpoint is only for round robin events',
    });
  }

  // Find all matches that reference this round robin
  const roundRobinMarker = `[RR:${id}]`;
  const matchesList = await db.query.games.findMany({
    where: sql`${games.notes} LIKE ${`%${roundRobinMarker}%`}`,
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
    orderBy: desc(games.createdAt),
  });

  // Calculate standings
  const standings: Record<string, {
    played: number;
    won: number;
    lost: number;
    pointsFor: number;
    pointsAgainst: number;
  }> = {};

  // Initialize standings for all participants
  for (const player of parentGame.players || []) {
    standings[player.userId] = {
      played: 0,
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };
  }

  // Calculate from completed matches
  for (const match of matchesList) {
    if (match.status !== 'completed') continue;

    const team1Players = match.participants.filter((p) => p.team === 1);
    const team2Players = match.participants.filter((p) => p.team === 2);

    // Sum scores
    const scores = match.scores as Array<{ team1: number; team2: number }> || [];
    const team1Points = scores.reduce((sum, s) => sum + s.team1, 0);
    const team2Points = scores.reduce((sum, s) => sum + s.team2, 0);

    for (const player of team1Players) {
      if (standings[player.userId]) {
        standings[player.userId].played++;
        standings[player.userId].pointsFor += team1Points;
        standings[player.userId].pointsAgainst += team2Points;
        if (match.winningTeam === 1) {
          standings[player.userId].won++;
        } else {
          standings[player.userId].lost++;
        }
      }
    }

    for (const player of team2Players) {
      if (standings[player.userId]) {
        standings[player.userId].played++;
        standings[player.userId].pointsFor += team2Points;
        standings[player.userId].pointsAgainst += team1Points;
        if (match.winningTeam === 2) {
          standings[player.userId].won++;
        } else {
          standings[player.userId].lost++;
        }
      }
    }
  }

  // Sort standings by wins, then point differential
  const sortedStandings = Object.entries(standings)
    .map(([playerId, stats]) => ({
      playerId,
      player: parentGame.players?.find((p: { userId: string }) => p.userId === playerId)?.user,
      ...stats,
      pointDifferential: stats.pointsFor - stats.pointsAgainst,
    }))
    .sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      return b.pointDifferential - a.pointDifferential;
    });

  return c.json({
    roundRobin: {
      id: parentGame.id,
      gameFormat: parentGame.gameFormat,
      status: parentGame.status,
      participants: parentGame.players,
    },
    matches: matchesList.map((m) => ({
      id: m.id,
      status: m.status,
      scores: m.scores,
      winningTeam: m.winningTeam,
      scheduledAt: m.scheduledAt,
      completedAt: m.completedAt,
      players: m.participants,
    })),
    standings: sortedStandings,
    totalMatches: matchesList.length,
    completedMatches: matchesList.filter((m) => m.status === 'completed').length,
  });
});

export default gamesRouter;
