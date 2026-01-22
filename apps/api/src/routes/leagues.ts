import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, or, sql, asc, gte, lte, inArray } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import {
  validateBody,
  validateQuery,
  validateParams,
  idParamSchema,
  paginationSchema,
} from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { userService } from '../services/userService.js';

const {
  users,
  leagues,
  leagueSeasons,
  leagueParticipants,
  leagueParticipantPlayers,
  leagueMatches,
  leagueStandingsHistory,
  games,
  gameParticipants,
  venues,
  userRatings,
} = schema;

const leaguesRouter = new Hono();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const leagueTypeEnum = z.enum(['ladder', 'doubles', 'king_of_court', 'pool_play', 'hybrid']);
const playoffFormatEnum = z.enum(['single_elimination', 'double_elimination', 'best_of_3']);

const createLeagueSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  leagueType: leagueTypeEnum,
  gameFormat: z.enum(['singles', 'doubles', 'mixed_doubles']),
  clubId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  // Season configuration
  seasonName: z.string().max(100).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  numberOfWeeks: z.number().min(1).max(52).default(8),
  daysPerWeek: z.array(z.string()).min(1).optional(),
  matchDay: z.string().optional(),
  defaultMatchTime: z.string().optional(),
  // Capacity
  maxPlayers: z.number().min(4).max(128),
  minPlayers: z.number().min(2).default(4),
  // Playoffs
  hasPlayoffs: z.boolean().default(false),
  playoffFormat: playoffFormatEnum.optional(),
  playoffTeams: z.number().min(2).max(32).optional(),
  // Rating requirements
  isRated: z.boolean().default(true),
  minRating: z.number().min(1).max(7).optional(),
  maxRating: z.number().min(1).max(7).optional(),
  reportToDupr: z.boolean().default(false),
  // Scoring
  pointsForWin: z.number().default(3),
  pointsForDraw: z.number().default(1),
  pointsForLoss: z.number().default(0),
  // Location
  location: z.string().optional(),
  locationCoordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  // Rules
  rules: z.string().optional(),
});

const updateLeagueSchema = createLeagueSchema.partial().omit({ leagueType: true });

const listLeaguesQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled']).optional(),
  leagueType: leagueTypeEnum.optional(),
  gameFormat: z.enum(['singles', 'doubles', 'mixed_doubles']).optional(),
  myLeagues: z.coerce.boolean().optional(),
  clubId: z.string().uuid().optional(),
});

const joinLeagueSchema = z.object({
  partnerId: z.string().uuid().optional(),
  teamName: z.string().min(1).max(100).optional(),
});

const updatePlayerSchema = z.object({
  teamName: z.string().min(1).max(100).optional(),
  partnerId: z.string().uuid().optional(),
});

const listMatchesQuerySchema = paginationSchema.extend({
  week: z.coerce.number().int().positive().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'forfeited']).optional(),
});

const submitScoreSchema = z.object({
  scores: z.array(z.object({
    team1: z.number().int().min(0).max(99),
    team2: z.number().int().min(0).max(99),
  })).min(1),
});

const challengeSchema = z.object({
  challengedPlayerId: z.string().uuid(),
  proposedDate: z.string().datetime().optional(),
  message: z.string().max(500).optional(),
});

const weekParamSchema = z.object({
  week: z.coerce.number().int().positive(),
});

const matchIdParamSchema = z.object({
  id: z.string().min(1),
  matchId: z.string().uuid(),
});

const playerIdParamSchema = z.object({
  id: z.string().min(1),
  playerId: z.string().uuid(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getDbUser(clerkId: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!dbUser) {
    throw new HTTPException(401, { message: 'User not found' });
  }

  return dbUser;
}

async function getLeagueWithSeason(leagueId: string) {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.id, leagueId),
    with: {
      organizer: {
        columns: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      club: true,
      venue: true,
      seasons: {
        orderBy: desc(leagueSeasons.seasonNumber),
        limit: 1,
      },
    },
  });

  return league;
}

async function getCurrentSeason(leagueId: string) {
  const season = await db.query.leagueSeasons.findFirst({
    where: eq(leagueSeasons.leagueId, leagueId),
    orderBy: desc(leagueSeasons.seasonNumber),
  });

  return season;
}

async function verifyLeagueCreator(leagueId: string, userId: string) {
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.id, leagueId),
  });

  if (!league) {
    throw new HTTPException(404, { message: 'League not found' });
  }

  if (league.organizerId !== userId) {
    throw new HTTPException(403, { message: 'Only the league organizer can perform this action' });
  }

  return league;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200) + '-' + Date.now().toString(36);
}

// ============================================================================
// LEAGUE CRUD ENDPOINTS
// ============================================================================

/**
 * GET /leagues
 * List leagues with filters
 */
leaguesRouter.get('/', validateQuery(listLeaguesQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const { page, limit, status, leagueType, gameFormat, myLeagues, clubId } = query;
  const offset = (page - 1) * limit;

  // Get user if myLeagues filter is active
  let dbUserId: string | null = null;
  if (myLeagues) {
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      try {
        // Import clerk verification dynamically for optional auth
        const { verifyToken } = await import('@clerk/backend');
        const token = authHeader.replace('Bearer ', '');
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        const dbUser = await db.query.users.findFirst({
          where: eq(users.clerkId, payload.sub),
        });
        dbUserId = dbUser?.id || null;
      } catch {
        // Ignore auth errors for optional filter
      }
    }
  }

  // Build where conditions
  const conditions = [];

  if (status) {
    conditions.push(eq(leagues.status, status));
  }

  if (gameFormat) {
    conditions.push(eq(leagues.gameFormat, gameFormat));
  }

  if (clubId) {
    conditions.push(eq(leagues.clubId, clubId));
  }

  // Filter by settings.leagueType if provided
  if (leagueType) {
    conditions.push(sql`${leagues.settings}->>'leagueType' = ${leagueType}`);
  }

  // For myLeagues, get leagues where user is organizer or participant
  if (myLeagues && dbUserId) {
    // Find seasons where user is a participant
    const userParticipations = await db
      .select({ seasonId: leagueParticipantPlayers.participantId })
      .from(leagueParticipantPlayers)
      .where(eq(leagueParticipantPlayers.userId, dbUserId));

    const participantIds = userParticipations.map((p) => p.seasonId);

    // Get season IDs from participant records
    let seasonLeagueIds: string[] = [];
    if (participantIds.length > 0) {
      const participantSeasons = await db
        .select({ seasonId: leagueParticipants.seasonId })
        .from(leagueParticipants)
        .where(inArray(leagueParticipants.id, participantIds));

      const seasonIds = participantSeasons.map((s) => s.seasonId);

      if (seasonIds.length > 0) {
        const leaguesFromSeasons = await db
          .select({ leagueId: leagueSeasons.leagueId })
          .from(leagueSeasons)
          .where(inArray(leagueSeasons.id, seasonIds));

        seasonLeagueIds = leaguesFromSeasons.map((l) => l.leagueId);
      }
    }

    // Combine organizer and participant leagues
    if (seasonLeagueIds.length > 0) {
      conditions.push(
        or(
          eq(leagues.organizerId, dbUserId),
          inArray(leagues.id, seasonLeagueIds)
        )!
      );
    } else {
      conditions.push(eq(leagues.organizerId, dbUserId));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [leaguesList, countResult] = await Promise.all([
    db.query.leagues.findMany({
      where: whereClause,
      with: {
        organizer: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        venue: {
          columns: { id: true, name: true, city: true, state: true },
        },
        seasons: {
          orderBy: desc(leagueSeasons.seasonNumber),
          limit: 1,
        },
      },
      orderBy: desc(leagues.createdAt),
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(leagues).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return c.json({
    leagues: leaguesList.map((league) => ({
      id: league.id,
      name: league.name,
      slug: league.slug,
      description: league.description,
      gameFormat: league.gameFormat,
      status: league.status,
      settings: league.settings,
      organizer: league.organizer,
      venue: league.venue,
      currentSeason: league.seasons[0] || null,
      logoUrl: league.logoUrl,
      createdAt: league.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /leagues/:id
 * Get league details with players and standings
 */
leaguesRouter.get('/:id', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  const league = await getLeagueWithSeason(id);

  if (!league) {
    throw new HTTPException(404, { message: 'League not found' });
  }

  const currentSeason = league.seasons[0];
  let participants: Array<{
    id: string;
    teamName: string | null;
    rank: number | null;
    points: number;
    wins: number;
    losses: number;
    draws: number;
    players: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCaptain: boolean;
    }>;
  }> = [];

  if (currentSeason) {
    const seasonParticipants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
      with: {
        players: {
          with: {
            user: {
              columns: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: [asc(leagueParticipants.rank), desc(leagueParticipants.points)],
    });

    participants = seasonParticipants.map((p) => ({
      id: p.id,
      teamName: p.teamName,
      rank: p.rank,
      points: p.points || 0,
      wins: p.wins || 0,
      losses: p.losses || 0,
      draws: p.draws || 0,
      players: p.players.map((player) => ({
        id: player.user.id,
        username: player.user.username,
        displayName: player.user.displayName,
        avatarUrl: player.user.avatarUrl,
        isCaptain: player.isCaptain || false,
      })),
    }));
  }

  return c.json({
    league: {
      id: league.id,
      name: league.name,
      slug: league.slug,
      description: league.description,
      gameFormat: league.gameFormat,
      status: league.status,
      isRated: league.isRated,
      minRating: league.minRating,
      maxRating: league.maxRating,
      settings: league.settings,
      rules: league.rules,
      logoUrl: league.logoUrl,
      organizer: league.organizer,
      club: league.club,
      venue: league.venue,
      currentSeason: currentSeason
        ? {
            id: currentSeason.id,
            name: currentSeason.name,
            seasonNumber: currentSeason.seasonNumber,
            startsAt: currentSeason.startsAt,
            endsAt: currentSeason.endsAt,
            status: currentSeason.status,
            maxParticipants: currentSeason.maxParticipants,
            matchesPerWeek: currentSeason.matchesPerWeek,
            matchDay: currentSeason.matchDay,
          }
        : null,
      participants,
      createdAt: league.createdAt,
      updatedAt: league.updatedAt,
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

  const dbUser = await getDbUser(userId);

  // Validate rating range
  if (data.minRating && data.maxRating && data.minRating > data.maxRating) {
    throw new HTTPException(400, { message: 'Minimum rating cannot be greater than maximum rating' });
  }

  // Validate playoffs configuration
  if (data.hasPlayoffs) {
    if (!data.playoffFormat) {
      throw new HTTPException(400, { message: 'Playoff format is required when playoffs are enabled' });
    }
    if (!data.playoffTeams) {
      throw new HTTPException(400, { message: 'Number of playoff teams is required when playoffs are enabled' });
    }
  }

  const slug = generateSlug(data.name);

  // Create league in transaction
  const result = await db.transaction(async (tx) => {
    // Create the league
    const [league] = await tx
      .insert(leagues)
      .values({
        name: data.name,
        slug,
        description: data.description,
        gameFormat: data.gameFormat,
        organizerId: dbUser.id,
        clubId: data.clubId,
        venueId: data.venueId,
        isRated: data.isRated,
        minRating: data.minRating?.toString(),
        maxRating: data.maxRating?.toString(),
        status: 'draft',
        settings: {
          leagueType: data.leagueType,
          numberOfWeeks: data.numberOfWeeks,
          daysPerWeek: data.daysPerWeek,
          hasPlayoffs: data.hasPlayoffs,
          playoffFormat: data.playoffFormat,
          playoffTeams: data.playoffTeams,
          minPlayers: data.minPlayers,
          maxPlayers: data.maxPlayers,
          reportToDupr: data.reportToDupr,
          location: data.location,
          locationCoordinates: data.locationCoordinates,
        },
        rules: data.rules,
      })
      .returning();

    // Create the first season
    const [season] = await tx
      .insert(leagueSeasons)
      .values({
        leagueId: league.id,
        name: data.seasonName || 'Season 1',
        seasonNumber: 1,
        startsAt: new Date(data.startDate),
        endsAt: data.endDate ? new Date(data.endDate) : new Date(new Date(data.startDate).getTime() + data.numberOfWeeks * 7 * 24 * 60 * 60 * 1000),
        registrationOpensAt: new Date(),
        registrationClosesAt: new Date(data.startDate),
        maxParticipants: data.maxPlayers,
        matchesPerWeek: 1,
        matchDay: data.matchDay,
        defaultMatchTime: data.defaultMatchTime,
        pointsForWin: data.pointsForWin,
        pointsForDraw: data.pointsForDraw,
        pointsForLoss: data.pointsForLoss,
        status: 'draft',
      })
      .returning();

    return { league, season };
  });

  // Log activity
  await userService.logActivity(dbUser.id, 'league_created', 'league', result.league.id);

  return c.json(
    {
      message: 'League created successfully',
      league: {
        id: result.league.id,
        name: result.league.name,
        slug: result.league.slug,
        status: result.league.status,
        season: {
          id: result.season.id,
          name: result.season.name,
          startsAt: result.season.startsAt,
        },
      },
    },
    201
  );
});

/**
 * PUT /leagues/:id
 * Update league (only by creator, only if draft/registration)
 */
leaguesRouter.put(
  '/:id',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(updateLeagueSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const updates = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);
    const league = await verifyLeagueCreator(id, dbUser.id);

    // Can only update if draft or registration_open
    if (!['draft', 'registration_open'].includes(league.status)) {
      throw new HTTPException(400, {
        message: 'Can only update league during draft or registration phase',
      });
    }

    // Update league
    const [updated] = await db
      .update(leagues)
      .set({
        name: updates.name,
        description: updates.description,
        gameFormat: updates.gameFormat,
        clubId: updates.clubId,
        venueId: updates.venueId,
        isRated: updates.isRated,
        minRating: updates.minRating?.toString(),
        maxRating: updates.maxRating?.toString(),
        rules: updates.rules,
        settings: {
          ...(typeof league.settings === 'object' ? league.settings : {}),
          ...(updates.numberOfWeeks && { numberOfWeeks: updates.numberOfWeeks }),
          ...(updates.daysPerWeek && { daysPerWeek: updates.daysPerWeek }),
          ...(updates.hasPlayoffs !== undefined && { hasPlayoffs: updates.hasPlayoffs }),
          ...(updates.playoffFormat && { playoffFormat: updates.playoffFormat }),
          ...(updates.playoffTeams && { playoffTeams: updates.playoffTeams }),
          ...(updates.minPlayers && { minPlayers: updates.minPlayers }),
          ...(updates.maxPlayers && { maxPlayers: updates.maxPlayers }),
          ...(updates.reportToDupr !== undefined && { reportToDupr: updates.reportToDupr }),
          ...(updates.location && { location: updates.location }),
          ...(updates.locationCoordinates && { locationCoordinates: updates.locationCoordinates }),
        },
        updatedAt: new Date(),
      })
      .where(eq(leagues.id, id))
      .returning();

    // Update current season if date-related fields changed
    if (updates.startDate || updates.endDate || updates.seasonName) {
      const currentSeason = await getCurrentSeason(id);
      if (currentSeason) {
        await db
          .update(leagueSeasons)
          .set({
            ...(updates.seasonName && { name: updates.seasonName }),
            ...(updates.startDate && { startsAt: new Date(updates.startDate) }),
            ...(updates.endDate && { endsAt: new Date(updates.endDate) }),
            ...(updates.maxPlayers && { maxParticipants: updates.maxPlayers }),
            ...(updates.matchDay && { matchDay: updates.matchDay }),
            ...(updates.defaultMatchTime && { defaultMatchTime: updates.defaultMatchTime }),
            ...(updates.pointsForWin !== undefined && { pointsForWin: updates.pointsForWin }),
            ...(updates.pointsForDraw !== undefined && { pointsForDraw: updates.pointsForDraw }),
            ...(updates.pointsForLoss !== undefined && { pointsForLoss: updates.pointsForLoss }),
            updatedAt: new Date(),
          })
          .where(eq(leagueSeasons.id, currentSeason.id));
      }
    }

    return c.json({
      message: 'League updated successfully',
      league: updated,
    });
  }
);

/**
 * DELETE /leagues/:id
 * Delete league (only by creator, only if draft)
 */
leaguesRouter.delete(
  '/:id',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);
    const league = await verifyLeagueCreator(id, dbUser.id);

    // Can only delete if draft
    if (league.status !== 'draft') {
      throw new HTTPException(400, {
        message: 'Can only delete leagues in draft status',
      });
    }

    // Delete league (cascades to seasons, participants, matches)
    await db.delete(leagues).where(eq(leagues.id, id));

    return c.json({ message: 'League deleted successfully' }, 200);
  }
);

// ============================================================================
// LEAGUE PLAYER MANAGEMENT
// ============================================================================

/**
 * POST /leagues/:id/join
 * Join a league (with optional partnerId for doubles)
 */
leaguesRouter.post(
  '/:id/join',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(joinLeagueSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { partnerId, teamName } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const league = await getLeagueWithSeason(id);
    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }

    // Check if registration is open
    if (league.status !== 'registration_open') {
      throw new HTTPException(400, { message: 'League is not open for registration' });
    }

    const currentSeason = league.seasons[0];
    if (!currentSeason) {
      throw new HTTPException(400, { message: 'No active season found' });
    }

    // Check registration deadline
    if (currentSeason.registrationClosesAt && new Date() > currentSeason.registrationClosesAt) {
      throw new HTTPException(400, { message: 'Registration deadline has passed' });
    }

    // Check capacity
    const participantCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(leagueParticipants)
      .where(eq(leagueParticipants.seasonId, currentSeason.id));

    const settings = league.settings as { maxPlayers?: number } | null;
    const maxPlayers = currentSeason.maxParticipants || settings?.maxPlayers || 128;

    if (Number(participantCount[0]?.count || 0) >= maxPlayers) {
      throw new HTTPException(400, { message: 'League is full' });
    }

    // Check if user is already registered
    const existingParticipation = await db
      .select({ id: leagueParticipantPlayers.id })
      .from(leagueParticipantPlayers)
      .innerJoin(leagueParticipants, eq(leagueParticipantPlayers.participantId, leagueParticipants.id))
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          eq(leagueParticipantPlayers.userId, dbUser.id)
        )
      );

    if (existingParticipation.length > 0) {
      throw new HTTPException(409, { message: 'You are already registered for this league' });
    }

    // Check rating requirements
    if (league.minRating || league.maxRating) {
      const userRating = await db.query.userRatings.findFirst({
        where: and(
          eq(userRatings.userId, dbUser.id),
          eq(userRatings.gameFormat, league.gameFormat)
        ),
      });

      const rating = parseFloat(userRating?.rating || '3.00');

      if (league.minRating && rating < parseFloat(league.minRating)) {
        throw new HTTPException(400, {
          message: `Minimum rating of ${league.minRating} required. Your rating: ${rating}`,
        });
      }

      if (league.maxRating && rating > parseFloat(league.maxRating)) {
        throw new HTTPException(400, {
          message: `Maximum rating of ${league.maxRating} allowed. Your rating: ${rating}`,
        });
      }
    }

    // For doubles, validate partner
    if (league.gameFormat !== 'singles' && partnerId) {
      // Check partner exists
      const partner = await db.query.users.findFirst({
        where: eq(users.id, partnerId),
      });

      if (!partner) {
        throw new HTTPException(400, { message: 'Partner not found' });
      }

      // Check partner isn't already registered
      const partnerParticipation = await db
        .select({ id: leagueParticipantPlayers.id })
        .from(leagueParticipantPlayers)
        .innerJoin(leagueParticipants, eq(leagueParticipantPlayers.participantId, leagueParticipants.id))
        .where(
          and(
            eq(leagueParticipants.seasonId, currentSeason.id),
            eq(leagueParticipantPlayers.userId, partnerId)
          )
        );

      if (partnerParticipation.length > 0) {
        throw new HTTPException(400, { message: 'Partner is already registered for this league' });
      }
    }

    // Get user rating for snapshot
    const userRatingRecord = await db.query.userRatings.findFirst({
      where: and(
        eq(userRatings.userId, dbUser.id),
        eq(userRatings.gameFormat, league.gameFormat)
      ),
    });

    // Create participant in transaction
    const result = await db.transaction(async (tx) => {
      // Create participant entry (team)
      const [participant] = await tx
        .insert(leagueParticipants)
        .values({
          seasonId: currentSeason.id,
          teamName: teamName || dbUser.displayName || dbUser.username,
          status: 'active',
        })
        .returning();

      // Add user to participant
      await tx.insert(leagueParticipantPlayers).values({
        participantId: participant.id,
        userId: dbUser.id,
        isCaptain: true,
        ratingAtRegistration: userRatingRecord?.rating || '3.00',
      });

      // Add partner if provided
      if (partnerId && league.gameFormat !== 'singles') {
        const partnerRating = await tx.query.userRatings.findFirst({
          where: and(
            eq(userRatings.userId, partnerId),
            eq(userRatings.gameFormat, league.gameFormat)
          ),
        });

        await tx.insert(leagueParticipantPlayers).values({
          participantId: participant.id,
          userId: partnerId,
          isCaptain: false,
          ratingAtRegistration: partnerRating?.rating || '3.00',
        });
      }

      return participant;
    });

    // Log activity
    await userService.logActivity(dbUser.id, 'league_joined', 'league', id);

    return c.json({
      message: 'Successfully joined the league',
      participant: {
        id: result.id,
        teamName: result.teamName,
      },
    });
  }
);

/**
 * DELETE /leagues/:id/leave
 * Leave a league (only during registration phase)
 */
leaguesRouter.delete(
  '/:id/leave',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const league = await getLeagueWithSeason(id);
    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }

    // Can only leave during registration phase
    if (!['draft', 'registration_open', 'registration_closed'].includes(league.status)) {
      throw new HTTPException(400, {
        message: 'Cannot leave a league that has already started',
      });
    }

    const currentSeason = league.seasons[0];
    if (!currentSeason) {
      throw new HTTPException(400, { message: 'No active season found' });
    }

    // Find user's participation
    const participation = await db
      .select({
        participantId: leagueParticipants.id,
        playerId: leagueParticipantPlayers.id,
      })
      .from(leagueParticipantPlayers)
      .innerJoin(leagueParticipants, eq(leagueParticipantPlayers.participantId, leagueParticipants.id))
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          eq(leagueParticipantPlayers.userId, dbUser.id)
        )
      );

    if (participation.length === 0) {
      throw new HTTPException(404, { message: 'Not registered for this league' });
    }

    // Delete participant (cascades to players)
    await db
      .delete(leagueParticipants)
      .where(eq(leagueParticipants.id, participation[0].participantId));

    return c.json({ message: 'Successfully left the league' });
  }
);

/**
 * GET /leagues/:id/players
 * Get all players/teams in league
 */
leaguesRouter.get(
  '/:id/players',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const league = await getLeagueWithSeason(id);
    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }

    const currentSeason = league.seasons[0];
    if (!currentSeason) {
      return c.json({ players: [] });
    }

    const participants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
      with: {
        players: {
          with: {
            user: {
              columns: { id: true, username: true, displayName: true, avatarUrl: true, skillLevel: true },
            },
          },
        },
      },
      orderBy: [asc(leagueParticipants.rank), desc(leagueParticipants.points)],
    });

    return c.json({
      players: participants.map((p) => ({
        participantId: p.id,
        teamName: p.teamName,
        rank: p.rank,
        status: p.status,
        stats: {
          matchesPlayed: p.matchesPlayed || 0,
          wins: p.wins || 0,
          losses: p.losses || 0,
          draws: p.draws || 0,
          points: p.points || 0,
          gamesWon: p.gamesWon || 0,
          gamesLost: p.gamesLost || 0,
          pointsScored: p.pointsScored || 0,
          pointsConceded: p.pointsConceded || 0,
        },
        players: p.players.map((player) => ({
          id: player.user.id,
          username: player.user.username,
          displayName: player.user.displayName,
          avatarUrl: player.user.avatarUrl,
          skillLevel: player.user.skillLevel,
          isCaptain: player.isCaptain,
          ratingAtRegistration: player.ratingAtRegistration,
        })),
      })),
    });
  }
);

/**
 * PUT /leagues/:id/players/:playerId
 * Update player (teamName, partner)
 */
leaguesRouter.put(
  '/:id/players/:playerId',
  authMiddleware,
  validateParams(playerIdParamSchema),
  validateBody(updatePlayerSchema),
  async (c) => {
    const { id, playerId } = c.req.valid('param');
    const updates = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const league = await getLeagueWithSeason(id);
    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }

    // Check if user is organizer or the player themselves
    const isOrganizer = league.organizerId === dbUser.id;

    // Find the participant
    const participant = await db.query.leagueParticipants.findFirst({
      where: eq(leagueParticipants.id, playerId),
      with: {
        players: true,
      },
    });

    if (!participant) {
      throw new HTTPException(404, { message: 'Player not found' });
    }

    const isOwnTeam = participant.players.some((p) => p.userId === dbUser.id && p.isCaptain);

    if (!isOrganizer && !isOwnTeam) {
      throw new HTTPException(403, {
        message: 'Only the league organizer or team captain can update player details',
      });
    }

    // Update participant
    if (updates.teamName) {
      await db
        .update(leagueParticipants)
        .set({ teamName: updates.teamName, updatedAt: new Date() })
        .where(eq(leagueParticipants.id, playerId));
    }

    return c.json({ message: 'Player updated successfully' });
  }
);

// ============================================================================
// LEAGUE LIFECYCLE
// ============================================================================

/**
 * POST /leagues/:id/start
 * Start the league (generates initial schedule/rankings)
 */
leaguesRouter.post(
  '/:id/start',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);
    const league = await verifyLeagueCreator(id, dbUser.id);

    if (league.status !== 'registration_open' && league.status !== 'registration_closed') {
      throw new HTTPException(400, {
        message: 'League must be in registration phase to start',
      });
    }

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      throw new HTTPException(400, { message: 'No season found' });
    }

    // Check minimum players
    const participantCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(leagueParticipants)
      .where(eq(leagueParticipants.seasonId, currentSeason.id));

    const settings = league.settings as { minPlayers?: number } | null;
    const minPlayers = settings?.minPlayers || 4;

    if (Number(participantCount[0]?.count || 0) < minPlayers) {
      throw new HTTPException(400, {
        message: `Minimum ${minPlayers} participants required to start. Current: ${participantCount[0]?.count || 0}`,
      });
    }

    // Get all participants for schedule generation
    const participants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
    });

    // Generate initial rankings (random or by rating)
    await db.transaction(async (tx) => {
      // Assign initial ranks
      const shuffled = participants.sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await tx
          .update(leagueParticipants)
          .set({ rank: i + 1 })
          .where(eq(leagueParticipants.id, shuffled[i].id));
      }

      // Generate round-robin schedule
      const numberOfWeeks = (settings as { numberOfWeeks?: number } | null)?.numberOfWeeks || 8;
      const matchups = generateRoundRobinSchedule(participants.map((p) => p.id), numberOfWeeks);

      // Create matches
      for (const match of matchups) {
        await tx.insert(leagueMatches).values({
          seasonId: currentSeason.id,
          weekNumber: match.week,
          participant1Id: match.participant1Id,
          participant2Id: match.participant2Id,
          status: 'scheduled',
        });
      }

      // Update league and season status
      await tx
        .update(leagues)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(leagues.id, id));

      await tx
        .update(leagueSeasons)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(leagueSeasons.id, currentSeason.id));
    });

    return c.json({
      message: 'League started successfully',
      participantCount: participants.length,
    });
  }
);

/**
 * POST /leagues/:id/advance-week
 * Move to next week
 */
leaguesRouter.post(
  '/:id/advance-week',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);
    await verifyLeagueCreator(id, dbUser.id);

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      throw new HTTPException(400, { message: 'No season found' });
    }

    // Record current standings in history
    const participants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
    });

    // Determine current week from last recorded standings
    const lastStanding = await db.query.leagueStandingsHistory.findFirst({
      where: inArray(
        leagueStandingsHistory.participantId,
        participants.map((p) => p.id)
      ),
      orderBy: desc(leagueStandingsHistory.weekNumber),
    });

    const currentWeek = (lastStanding?.weekNumber || 0) + 1;

    // Record standings for current week
    for (const participant of participants) {
      await db.insert(leagueStandingsHistory).values({
        participantId: participant.id,
        weekNumber: currentWeek,
        rank: participant.rank || 0,
        points: participant.points || 0,
      });
    }

    return c.json({
      message: 'Advanced to next week',
      currentWeek: currentWeek + 1,
    });
  }
);

/**
 * POST /leagues/:id/start-playoffs
 * Transition to playoff phase
 */
leaguesRouter.post(
  '/:id/start-playoffs',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);
    const league = await verifyLeagueCreator(id, dbUser.id);

    if (league.status !== 'in_progress') {
      throw new HTTPException(400, { message: 'League must be in progress to start playoffs' });
    }

    const settings = league.settings as { hasPlayoffs?: boolean; playoffTeams?: number } | null;
    if (!settings?.hasPlayoffs) {
      throw new HTTPException(400, { message: 'This league does not have playoffs configured' });
    }

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      throw new HTTPException(400, { message: 'No season found' });
    }

    // Get top participants for playoffs
    const playoffTeams = settings.playoffTeams || 4;
    const topParticipants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
      orderBy: [desc(leagueParticipants.points), asc(leagueParticipants.rank)],
      limit: playoffTeams,
    });

    // Update settings to mark playoffs started
    await db
      .update(leagues)
      .set({
        settings: {
          ...settings,
          playoffsStarted: true,
          playoffParticipants: topParticipants.map((p) => p.id),
        },
        updatedAt: new Date(),
      })
      .where(eq(leagues.id, id));

    return c.json({
      message: 'Playoffs started',
      playoffParticipants: topParticipants.map((p) => ({
        id: p.id,
        teamName: p.teamName,
        rank: p.rank,
        points: p.points,
      })),
    });
  }
);

/**
 * POST /leagues/:id/complete
 * Mark league as completed
 */
leaguesRouter.post(
  '/:id/complete',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);
    await verifyLeagueCreator(id, dbUser.id);

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      throw new HTTPException(400, { message: 'No season found' });
    }

    // Update statuses
    await db.transaction(async (tx) => {
      await tx
        .update(leagues)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(leagues.id, id));

      await tx
        .update(leagueSeasons)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(leagueSeasons.id, currentSeason.id));
    });

    return c.json({ message: 'League completed' });
  }
);

// ============================================================================
// MATCH MANAGEMENT
// ============================================================================

/**
 * GET /leagues/:id/matches
 * Get matches (filter by week, status)
 */
leaguesRouter.get(
  '/:id/matches',
  validateParams(idParamSchema),
  validateQuery(listMatchesQuerySchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { week, status, page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      return c.json({ matches: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    const conditions = [eq(leagueMatches.seasonId, currentSeason.id)];

    if (week) {
      conditions.push(eq(leagueMatches.weekNumber, week));
    }

    if (status) {
      conditions.push(eq(leagueMatches.status, status));
    }

    const [matches, countResult] = await Promise.all([
      db.query.leagueMatches.findMany({
        where: and(...conditions),
        with: {
          participant1: {
            with: {
              players: {
                with: {
                  user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
                },
              },
            },
          },
          participant2: {
            with: {
              players: {
                with: {
                  user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
                },
              },
            },
          },
          court: true,
        },
        orderBy: [asc(leagueMatches.weekNumber), asc(leagueMatches.scheduledAt)],
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(leagueMatches).where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return c.json({
      matches: matches.map((m) => ({
        id: m.id,
        weekNumber: m.weekNumber,
        status: m.status,
        scheduledAt: m.scheduledAt,
        completedAt: m.completedAt,
        scores: m.scores,
        participant1: {
          id: m.participant1.id,
          teamName: m.participant1.teamName,
          players: m.participant1.players.map((p) => p.user),
        },
        participant2: {
          id: m.participant2.id,
          teamName: m.participant2.teamName,
          players: m.participant2.players.map((p) => p.user),
        },
        winner: m.winnerParticipantId,
        participant1Points: m.participant1Points,
        participant2Points: m.participant2Points,
        court: m.court,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

/**
 * GET /leagues/:id/matches/:matchId
 * Get match details
 */
leaguesRouter.get(
  '/:id/matches/:matchId',
  validateParams(matchIdParamSchema),
  async (c) => {
    const { matchId } = c.req.valid('param');

    const match = await db.query.leagueMatches.findFirst({
      where: eq(leagueMatches.id, matchId),
      with: {
        participant1: {
          with: {
            players: {
              with: {
                user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        },
        participant2: {
          with: {
            players: {
              with: {
                user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        },
        court: true,
        game: true,
      },
    });

    if (!match) {
      throw new HTTPException(404, { message: 'Match not found' });
    }

    return c.json({ match });
  }
);

/**
 * POST /leagues/:id/matches/:matchId/score
 * Submit match score
 */
leaguesRouter.post(
  '/:id/matches/:matchId/score',
  authMiddleware,
  validateParams(matchIdParamSchema),
  validateBody(submitScoreSchema),
  async (c) => {
    const { id, matchId } = c.req.valid('param');
    const { scores } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const match = await db.query.leagueMatches.findFirst({
      where: eq(leagueMatches.id, matchId),
      with: {
        participant1: {
          with: { players: true },
        },
        participant2: {
          with: { players: true },
        },
        season: {
          with: { league: true },
        },
      },
    });

    if (!match) {
      throw new HTTPException(404, { message: 'Match not found' });
    }

    // Verify user is a participant or organizer
    const isParticipant =
      match.participant1.players.some((p) => p.userId === dbUser.id) ||
      match.participant2.players.some((p) => p.userId === dbUser.id);
    const isOrganizer = match.season.league.organizerId === dbUser.id;

    if (!isParticipant && !isOrganizer) {
      throw new HTTPException(403, { message: 'Only match participants or organizer can submit scores' });
    }

    if (match.status === 'completed') {
      throw new HTTPException(400, { message: 'Match score already submitted' });
    }

    // Calculate winner
    const team1Wins = scores.filter((s) => s.team1 > s.team2).length;
    const team2Wins = scores.filter((s) => s.team2 > s.team1).length;
    const winnerId = team1Wins > team2Wins ? match.participant1Id : match.participant2Id;
    const loserId = winnerId === match.participant1Id ? match.participant2Id : match.participant1Id;

    // Get season scoring settings
    const pointsForWin = match.season.pointsForWin || 3;
    const pointsForLoss = match.season.pointsForLoss || 0;

    await db.transaction(async (tx) => {
      // Update match
      await tx
        .update(leagueMatches)
        .set({
          scores,
          status: 'completed',
          completedAt: new Date(),
          winnerParticipantId: winnerId,
          participant1Points: match.participant1Id === winnerId ? pointsForWin : pointsForLoss,
          participant2Points: match.participant2Id === winnerId ? pointsForWin : pointsForLoss,
          updatedAt: new Date(),
        })
        .where(eq(leagueMatches.id, matchId));

      // Update winner stats
      await tx
        .update(leagueParticipants)
        .set({
          matchesPlayed: sql`${leagueParticipants.matchesPlayed} + 1`,
          wins: sql`${leagueParticipants.wins} + 1`,
          points: sql`${leagueParticipants.points} + ${pointsForWin}`,
          gamesWon: sql`${leagueParticipants.gamesWon} + ${winnerId === match.participant1Id ? team1Wins : team2Wins}`,
          gamesLost: sql`${leagueParticipants.gamesLost} + ${winnerId === match.participant1Id ? team2Wins : team1Wins}`,
          pointsScored: sql`${leagueParticipants.pointsScored} + ${scores.reduce((sum, s) => sum + (winnerId === match.participant1Id ? s.team1 : s.team2), 0)}`,
          pointsConceded: sql`${leagueParticipants.pointsConceded} + ${scores.reduce((sum, s) => sum + (winnerId === match.participant1Id ? s.team2 : s.team1), 0)}`,
          updatedAt: new Date(),
        })
        .where(eq(leagueParticipants.id, winnerId));

      // Update loser stats
      await tx
        .update(leagueParticipants)
        .set({
          matchesPlayed: sql`${leagueParticipants.matchesPlayed} + 1`,
          losses: sql`${leagueParticipants.losses} + 1`,
          points: sql`${leagueParticipants.points} + ${pointsForLoss}`,
          gamesWon: sql`${leagueParticipants.gamesWon} + ${loserId === match.participant1Id ? team1Wins : team2Wins}`,
          gamesLost: sql`${leagueParticipants.gamesLost} + ${loserId === match.participant1Id ? team2Wins : team1Wins}`,
          pointsScored: sql`${leagueParticipants.pointsScored} + ${scores.reduce((sum, s) => sum + (loserId === match.participant1Id ? s.team1 : s.team2), 0)}`,
          pointsConceded: sql`${leagueParticipants.pointsConceded} + ${scores.reduce((sum, s) => sum + (loserId === match.participant1Id ? s.team2 : s.team1), 0)}`,
          updatedAt: new Date(),
        })
        .where(eq(leagueParticipants.id, loserId));

      // Update rankings
      await updateRankings(tx, match.seasonId);
    });

    // Log activity
    await userService.logActivity(dbUser.id, 'league_match_scored', 'league_match', matchId);

    return c.json({
      message: 'Score submitted successfully',
      winnerId,
    });
  }
);

/**
 * POST /leagues/:id/matches/:matchId/verify
 * Verify score (opponent)
 */
leaguesRouter.post(
  '/:id/matches/:matchId/verify',
  authMiddleware,
  validateParams(matchIdParamSchema),
  async (c) => {
    const { matchId } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const match = await db.query.leagueMatches.findFirst({
      where: eq(leagueMatches.id, matchId),
      with: {
        participant1: { with: { players: true } },
        participant2: { with: { players: true } },
        game: true,
      },
    });

    if (!match) {
      throw new HTTPException(404, { message: 'Match not found' });
    }

    // Verify user is a participant
    const isParticipant =
      match.participant1.players.some((p) => p.userId === dbUser.id) ||
      match.participant2.players.some((p) => p.userId === dbUser.id);

    if (!isParticipant) {
      throw new HTTPException(403, { message: 'Only match participants can verify scores' });
    }

    if (match.status !== 'completed') {
      throw new HTTPException(400, { message: 'Match must be completed to verify' });
    }

    // If there's a linked game, update its verification
    if (match.gameId) {
      await db
        .update(gameParticipants)
        .set({ isConfirmed: true, confirmedAt: new Date() })
        .where(
          and(
            eq(gameParticipants.gameId, match.gameId),
            eq(gameParticipants.userId, dbUser.id)
          )
        );
    }

    return c.json({ message: 'Score verified' });
  }
);

// ============================================================================
// STANDINGS & RESULTS
// ============================================================================

/**
 * GET /leagues/:id/standings
 * Get current standings
 */
leaguesRouter.get(
  '/:id/standings',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      return c.json({ standings: [] });
    }

    const participants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
      with: {
        players: {
          with: {
            user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: [desc(leagueParticipants.points), asc(leagueParticipants.rank)],
    });

    return c.json({
      standings: participants.map((p, index) => ({
        rank: p.rank || index + 1,
        previousRank: p.previousRank,
        participant: {
          id: p.id,
          teamName: p.teamName,
          players: p.players.map((player) => player.user),
        },
        stats: {
          matchesPlayed: p.matchesPlayed || 0,
          wins: p.wins || 0,
          losses: p.losses || 0,
          draws: p.draws || 0,
          points: p.points || 0,
          gamesWon: p.gamesWon || 0,
          gamesLost: p.gamesLost || 0,
          gameDifferential: (p.gamesWon || 0) - (p.gamesLost || 0),
          pointsScored: p.pointsScored || 0,
          pointsConceded: p.pointsConceded || 0,
          pointDifferential: (p.pointsScored || 0) - (p.pointsConceded || 0),
          winRate: p.matchesPlayed
            ? ((p.wins || 0) / (p.matchesPlayed || 1) * 100).toFixed(1)
            : '0.0',
        },
      })),
    });
  }
);

/**
 * GET /leagues/:id/standings/:week
 * Get standings for specific week
 */
leaguesRouter.get(
  '/:id/standings/:week',
  validateParams(idParamSchema.extend({ week: z.coerce.number().int().positive() })),
  async (c) => {
    const { id, week } = c.req.valid('param');

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      return c.json({ standings: [] });
    }

    const participants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
      with: {
        players: {
          with: {
            user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
        standingsHistory: {
          where: eq(leagueStandingsHistory.weekNumber, week),
        },
      },
    });

    // Sort by historical rank for that week
    const sorted = participants
      .map((p) => ({
        ...p,
        weekRank: p.standingsHistory[0]?.rank || 999,
        weekPoints: p.standingsHistory[0]?.points || 0,
      }))
      .sort((a, b) => a.weekRank - b.weekRank);

    return c.json({
      week,
      standings: sorted.map((p) => ({
        rank: p.weekRank,
        points: p.weekPoints,
        participant: {
          id: p.id,
          teamName: p.teamName,
          players: p.players.map((player) => player.user),
        },
      })),
    });
  }
);

/**
 * GET /leagues/:id/bracket
 * Get playoff bracket (if applicable)
 */
leaguesRouter.get(
  '/:id/bracket',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });

    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }

    const settings = league.settings as {
      hasPlayoffs?: boolean;
      playoffsStarted?: boolean;
      playoffParticipants?: string[];
      playoffFormat?: string;
    } | null;

    if (!settings?.hasPlayoffs) {
      throw new HTTPException(400, { message: 'This league does not have playoffs' });
    }

    if (!settings.playoffsStarted) {
      return c.json({
        message: 'Playoffs have not started yet',
        bracket: null,
      });
    }

    // Get playoff participants
    const playoffParticipantIds = settings.playoffParticipants || [];
    const participants = await db.query.leagueParticipants.findMany({
      where: inArray(leagueParticipants.id, playoffParticipantIds),
      with: {
        players: {
          with: {
            user: { columns: { id: true, username: true, displayName: true } },
          },
        },
      },
      orderBy: asc(leagueParticipants.rank),
    });

    // Generate bracket structure based on format
    const bracket = {
      format: settings.playoffFormat,
      teams: participants.map((p) => ({
        id: p.id,
        teamName: p.teamName,
        seed: p.rank,
        players: p.players.map((player) => player.user),
      })),
      // Placeholder for actual bracket rounds - would need tournament_brackets table
      rounds: [],
    };

    return c.json({ bracket });
  }
);

// ============================================================================
// LADDER-SPECIFIC
// ============================================================================

/**
 * POST /leagues/:id/challenge
 * Challenge a player above you (ladder leagues)
 */
leaguesRouter.post(
  '/:id/challenge',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(challengeSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { challengedPlayerId, proposedDate, message } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });

    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }

    const settings = league.settings as { leagueType?: string } | null;
    if (settings?.leagueType !== 'ladder') {
      throw new HTTPException(400, { message: 'Challenges are only available for ladder leagues' });
    }

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      throw new HTTPException(400, { message: 'No active season' });
    }

    // Find challenger's participation
    const challengerParticipation = await db
      .select({
        participantId: leagueParticipants.id,
        rank: leagueParticipants.rank,
      })
      .from(leagueParticipantPlayers)
      .innerJoin(leagueParticipants, eq(leagueParticipantPlayers.participantId, leagueParticipants.id))
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          eq(leagueParticipantPlayers.userId, dbUser.id)
        )
      );

    if (challengerParticipation.length === 0) {
      throw new HTTPException(400, { message: 'You must be in the league to challenge' });
    }

    // Find challenged player's participation
    const challengedParticipation = await db
      .select({
        participantId: leagueParticipants.id,
        rank: leagueParticipants.rank,
      })
      .from(leagueParticipantPlayers)
      .innerJoin(leagueParticipants, eq(leagueParticipantPlayers.participantId, leagueParticipants.id))
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          eq(leagueParticipantPlayers.userId, challengedPlayerId)
        )
      );

    if (challengedParticipation.length === 0) {
      throw new HTTPException(404, { message: 'Challenged player not found in this league' });
    }

    const challengerRank = challengerParticipation[0].rank || 999;
    const challengedRank = challengedParticipation[0].rank || 999;

    // Can only challenge players ranked higher (lower rank number)
    if (challengedRank >= challengerRank) {
      throw new HTTPException(400, {
        message: 'You can only challenge players ranked above you',
      });
    }

    // Typically limit challenge range (e.g., can only challenge up to 3 positions above)
    const maxChallengeRange = 3;
    if (challengerRank - challengedRank > maxChallengeRange) {
      throw new HTTPException(400, {
        message: `You can only challenge players up to ${maxChallengeRange} positions above you`,
      });
    }

    // Create a match for the challenge
    const [match] = await db
      .insert(leagueMatches)
      .values({
        seasonId: currentSeason.id,
        weekNumber: 0, // Challenge matches don't belong to a specific week
        participant1Id: challengerParticipation[0].participantId,
        participant2Id: challengedParticipation[0].participantId,
        scheduledAt: proposedDate ? new Date(proposedDate) : null,
        status: 'scheduled',
      })
      .returning();

    return c.json({
      message: 'Challenge issued successfully',
      match: {
        id: match.id,
        challengerRank,
        challengedRank,
        scheduledAt: match.scheduledAt,
      },
    });
  }
);

/**
 * GET /leagues/:id/ladder
 * Get ladder rankings
 */
leaguesRouter.get(
  '/:id/ladder',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, id),
    });

    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }

    const currentSeason = await getCurrentSeason(id);
    if (!currentSeason) {
      return c.json({ ladder: [] });
    }

    const participants = await db.query.leagueParticipants.findMany({
      where: eq(leagueParticipants.seasonId, currentSeason.id),
      with: {
        players: {
          with: {
            user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: asc(leagueParticipants.rank),
    });

    return c.json({
      ladder: participants.map((p) => ({
        rank: p.rank,
        previousRank: p.previousRank,
        participant: {
          id: p.id,
          teamName: p.teamName,
          players: p.players.map((player) => player.user),
        },
        stats: {
          matchesPlayed: p.matchesPlayed || 0,
          wins: p.wins || 0,
          losses: p.losses || 0,
        },
      })),
    });
  }
);

// ============================================================================
// HELPER: SCHEDULE GENERATION
// ============================================================================

function generateRoundRobinSchedule(
  participantIds: string[],
  weeks: number
): Array<{ week: number; participant1Id: string; participant2Id: string }> {
  const matches: Array<{ week: number; participant1Id: string; participant2Id: string }> = [];

  // Simple round-robin: each participant plays every other participant
  const n = participantIds.length;

  // If odd number of participants, add a "bye"
  const ids = [...participantIds];
  if (n % 2 !== 0) {
    ids.push('BYE');
  }

  const numRounds = ids.length - 1;
  const halfSize = ids.length / 2;

  const teams = [...ids];
  const fixed = teams.shift()!;

  let weekNum = 1;
  for (let round = 0; round < numRounds && weekNum <= weeks; round++) {
    const roundTeams = [fixed, ...teams];

    for (let i = 0; i < halfSize; i++) {
      const home = roundTeams[i];
      const away = roundTeams[roundTeams.length - 1 - i];

      if (home !== 'BYE' && away !== 'BYE') {
        matches.push({
          week: weekNum,
          participant1Id: home,
          participant2Id: away,
        });
      }
    }

    // Rotate teams
    teams.push(teams.shift()!);
    weekNum++;
  }

  return matches;
}

// ============================================================================
// HELPER: UPDATE RANKINGS
// ============================================================================

async function updateRankings(tx: typeof db, seasonId: string) {
  // Get all participants sorted by points, then game differential
  const participants = await tx.query.leagueParticipants.findMany({
    where: eq(leagueParticipants.seasonId, seasonId),
    orderBy: [
      desc(leagueParticipants.points),
      desc(sql`${leagueParticipants.gamesWon} - ${leagueParticipants.gamesLost}`),
      desc(sql`${leagueParticipants.pointsScored} - ${leagueParticipants.pointsConceded}`),
    ],
  });

  // Update ranks
  for (let i = 0; i < participants.length; i++) {
    await tx
      .update(leagueParticipants)
      .set({
        previousRank: participants[i].rank,
        rank: i + 1,
        updatedAt: new Date(),
      })
      .where(eq(leagueParticipants.id, participants[i].id));
  }
}

export default leaguesRouter;
