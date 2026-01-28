import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, gte } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery, validateParams, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { userService } from '../services/userService.js';
import { emitToTournament, SocketEvents } from '../lib/socket.js';
import { cache } from '../lib/redis.js';

const { tournaments, tournamentMatches, tournamentEvents, users } = schema;

const tournamentsRouter = new Hono();

// Helper function to generate a unique slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 180) + '-' + Date.now().toString(36);
}

// Pool play config schema
const poolPlayConfigSchema = z.object({
  enabled: z.boolean(),
  calculationMethod: z.enum(['auto', 'manual']),
  numberOfPools: z.number().int().min(2).max(16),
  gamesPerMatch: z.union([z.literal(1), z.literal(3)]),
  advancementCount: z.number().int().min(1).max(8),
});

// Seeding config schema
const seedingConfigSchema = z.object({
  method: z.enum(['random', 'skill_based', 'manual']),
  crossPoolSeeding: z.enum(['standard', 'reverse', 'snake']),
});

// Bracket config schema
const bracketConfigSchema = z.object({
  format: z.enum(['single_elimination', 'double_elimination']),
  thirdPlaceMatch: z.boolean(),
  consolationBracket: z.boolean(),
});

// Tournament event schema (for individual events within a tournament)
const tournamentEventSchema = z.object({
  id: z.string().optional(), // Client-side ID, we'll generate a new one
  name: z.string().max(200).optional(),
  category: z.enum(['singles', 'doubles', 'mixed']),
  skillLevel: z.enum(['2.5', '3.0', '3.5', '4.0', '4.5', '5.0+']),
  ageGroup: z.enum(['open', 'junior', 'senior_50', 'senior_60', 'senior_70']),
  format: z.enum(['single_elimination', 'double_elimination', 'round_robin', 'pool_play', 'pool_to_bracket']),
  maxParticipants: z.number().int().min(2).max(256),
  entryFee: z.number().min(0),
  prizeMoney: z.number().min(0),
  scoringFormat: z.enum(['best_of_1', 'best_of_3']),
  pointsTo: z.union([z.literal(11), z.literal(15), z.literal(21)]),
  poolPlayConfig: poolPlayConfigSchema,
  seedingConfig: seedingConfigSchema,
  bracketConfig: bracketConfigSchema,
});

// Enhanced tournament creation schema (matches frontend form)
const createTournamentWithEventsSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string(), // ISO date string
  endDate: z.string(), // ISO date string
  registrationDeadline: z.string(), // ISO date string
  venue: z.string().max(500),
  venueCoordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  numberOfCourts: z.number().int().min(1).max(50),
  director: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
  }),
  events: z.array(tournamentEventSchema).min(1),
});

// Legacy validation schemas (keeping for backwards compatibility)
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
  managed: z.coerce.boolean().optional(),
});

const updateMatchScoreSchema = z.object({
  player1Score: z.number().int().min(0),
  player2Score: z.number().int().min(0),
  winnerId: z.string().uuid(),
});

/**
 * GET /tournaments
 * List tournaments with optional filters
 */
tournamentsRouter.get('/', optionalAuth, validateQuery(searchTournamentsSchema), async (c) => {
  const { status, gameType, upcoming, managed, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;
  const user = c.get('user');

  const conditions = [];

  if (status) {
    conditions.push(eq(tournaments.status, status));
  }

  if (gameType) {
    conditions.push(eq(tournaments.gameFormat, gameType));
  }

  if (upcoming) {
    conditions.push(gte(tournaments.startsAt, new Date()));
  }

  // If managed=true, only show tournaments the user has created
  if (managed && user) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, user.userId),
    });
    if (dbUser) {
      conditions.push(eq(tournaments.organizerId, dbUser.id));
    }
  }

  const results = await db.query.tournaments.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(tournaments.startsAt)],
    limit,
    offset,
    with: {
      events: true,
      organizer: {
        columns: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  return c.json({
    tournaments: results.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      gameFormat: t.gameFormat,
      tournamentFormat: t.tournamentFormat,
      status: t.status,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      registrationClosesAt: t.registrationClosesAt,
      locationNotes: t.locationNotes,
      maxParticipants: t.maxParticipants,
      currentParticipants: t.currentParticipants,
      pointsToWin: t.pointsToWin,
      createdAt: t.createdAt,
      eventsCount: t.events?.length || 0,
      organizer: t.organizer ? {
        id: t.organizer.id,
        username: t.organizer.username,
        displayName: t.organizer.displayName,
      } : null,
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
 * Create a new tournament with events
 * Accepts the enhanced format from the tournament creation form
 */
tournamentsRouter.post('/', authMiddleware, validateBody(createTournamentWithEventsSchema), async (c) => {
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

  // Generate a unique slug
  const slug = generateSlug(data.name);

  // Calculate total max participants from all events
  const totalMaxParticipants = data.events.reduce((sum, event) => sum + event.maxParticipants, 0);

  // Determine the primary game format from the first event (validated to have at least 1)
  const primaryEvent = data.events[0]!;
  const gameFormat = primaryEvent.category === 'singles' ? 'singles' :
                     primaryEvent.category === 'mixed' ? 'mixed_doubles' : 'doubles';

  // Determine tournament format from primary event
  const tournamentFormat = primaryEvent.format === 'pool_to_bracket' ? 'pool_play' :
                          primaryEvent.format === 'pool_play' ? 'pool_play' :
                          primaryEvent.format === 'round_robin' ? 'round_robin' :
                          primaryEvent.format;

  // Use a transaction to create both tournament and events
  let result;
  try {
    result = await db.transaction(async (tx) => {
      // Create the tournament
      const [tournament] = await tx
        .insert(tournaments)
        .values({
          name: data.name,
          slug,
          description: data.description || null,
          organizerId: dbUser.id,
          startsAt: new Date(data.startDate),
          endsAt: new Date(data.endDate),
          registrationClosesAt: new Date(data.registrationDeadline),
          locationNotes: data.venue,
          maxParticipants: totalMaxParticipants,
          tournamentFormat: tournamentFormat as 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play' | 'swiss',
          gameFormat: gameFormat as 'singles' | 'doubles' | 'mixed_doubles',
          pointsToWin: primaryEvent.pointsTo,
          winBy: 2,
          bestOf: primaryEvent.scoringFormat === 'best_of_3' ? 3 : 1,
          status: 'draft',
        })
        .returning();

      // Create tournament events
      const createdEvents = [];
      for (let i = 0; i < data.events.length; i++) {
        const event = data.events[i]!;

        // Map category to format expected by DB
        const eventFormat = event.format === 'pool_to_bracket' ? 'pool_play' : event.format;

        const [createdEvent] = await tx
          .insert(tournamentEvents)
          .values({
            tournamentId: tournament!.id,
            name: event.name || null,
            category: event.category,
            skillLevel: event.skillLevel,
            ageGroup: event.ageGroup,
            format: eventFormat as 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play' | 'swiss',
            maxParticipants: event.maxParticipants,
            entryFee: event.entryFee.toString(),
            prizeMoney: event.prizeMoney.toString(),
            scoringFormat: event.scoringFormat,
            pointsTo: event.pointsTo,
            poolPlayConfig: event.poolPlayConfig,
            seedingConfig: event.seedingConfig,
            bracketConfig: event.bracketConfig,
            sortOrder: i,
            status: 'pending',
          })
          .returning();

        createdEvents.push(createdEvent);
      }

      return { tournament: tournament!, events: createdEvents };
    });
  } catch (dbError) {
    console.error('Tournament creation DB error:', dbError);
    throw new HTTPException(500, {
      message: `Database error: ${(dbError as Error).message}`,
    });
  }

  await userService.logActivity(dbUser.id, 'tournament_created', 'tournament', result.tournament.id);

  return c.json(
    {
      message: 'Tournament created successfully',
      tournament: {
        id: result.tournament.id,
        name: result.tournament.name,
        slug: result.tournament.slug,
        status: result.tournament.status,
        startsAt: result.tournament.startsAt,
        endsAt: result.tournament.endsAt,
        createdAt: result.tournament.createdAt,
        eventsCount: result.events.length,
      },
    },
    201
  );
});

/**
 * GET /tournaments/:idOrSlug
 * Get tournament details with events (accepts UUID or slug)
 */
tournamentsRouter.get('/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug');

  const cacheKey = `tournament:${idOrSlug}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return c.json({ tournament: cached });
  }

  // Check if it's a UUID or slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  const tournament = await db.query.tournaments.findFirst({
    where: isUUID ? eq(tournaments.id, idOrSlug) : eq(tournaments.slug, idOrSlug),
    with: {
      organizer: {
        columns: {
          id: true,
          username: true,
          displayName: true,
          email: true,
        },
      },
      venue: true,
      events: {
        orderBy: (events, { asc }) => [asc(events.sortOrder)],
      },
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
    slug: tournament.slug,
    description: tournament.description,
    gameFormat: tournament.gameFormat,
    tournamentFormat: tournament.tournamentFormat,
    status: tournament.status,
    startsAt: tournament.startsAt,
    endsAt: tournament.endsAt,
    registrationOpensAt: tournament.registrationOpensAt,
    registrationClosesAt: tournament.registrationClosesAt,
    locationNotes: tournament.locationNotes,
    maxParticipants: tournament.maxParticipants,
    currentParticipants: tournament.currentParticipants,
    pointsToWin: tournament.pointsToWin,
    winBy: tournament.winBy,
    bestOf: tournament.bestOf,
    isRated: tournament.isRated,
    minRating: tournament.minRating,
    maxRating: tournament.maxRating,
    rules: tournament.rules,
    logoUrl: tournament.logoUrl,
    bannerUrl: tournament.bannerUrl,
    venue: tournament.venue
      ? {
          id: tournament.venue.id,
          name: tournament.venue.name,
          slug: tournament.venue.slug,
          city: tournament.venue.city,
          state: tournament.venue.state,
          streetAddress: tournament.venue.streetAddress,
        }
      : null,
    organizer: tournament.organizer
      ? {
          id: tournament.organizer.id,
          username: tournament.organizer.username,
          displayName: tournament.organizer.displayName,
          email: tournament.organizer.email,
        }
      : null,
    events: tournament.events?.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      skillLevel: e.skillLevel,
      ageGroup: e.ageGroup,
      format: e.format,
      maxParticipants: e.maxParticipants,
      currentParticipants: e.currentParticipants,
      entryFee: e.entryFee,
      prizeMoney: e.prizeMoney,
      scoringFormat: e.scoringFormat,
      pointsTo: e.pointsTo,
      poolPlayConfig: e.poolPlayConfig,
      seedingConfig: e.seedingConfig,
      bracketConfig: e.bracketConfig,
      status: e.status,
      sortOrder: e.sortOrder,
    })) || [],
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
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

    if (tournament.organizerId !== dbUser.id) {
      throw new HTTPException(403, {
        message: 'Only the tournament organizer can update it',
      });
    }

    // Map legacy field names to new schema
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.description !== undefined) updateValues.description = updates.description;
    if (updates.startDate !== undefined) updateValues.startsAt = new Date(updates.startDate);
    if (updates.endDate !== undefined) updateValues.endsAt = new Date(updates.endDate);
    if (updates.registrationDeadline !== undefined) updateValues.registrationClosesAt = new Date(updates.registrationDeadline);
    if (updates.rules !== undefined) updateValues.rules = updates.rules;

    const [updated] = await db
      .update(tournaments)
      .set(updateValues)
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
 * GET /tournaments/:id/events
 * Get tournament events
 */
tournamentsRouter.get(
  '/:id/events',
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, id),
      with: {
        events: {
          orderBy: (events, { asc }) => [asc(events.sortOrder)],
        },
      },
    });

    if (!tournament) {
      throw new HTTPException(404, {
        message: 'Tournament not found',
      });
    }

    return c.json({
      events: tournament.events?.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        skillLevel: e.skillLevel,
        ageGroup: e.ageGroup,
        format: e.format,
        maxParticipants: e.maxParticipants,
        currentParticipants: e.currentParticipants,
        entryFee: e.entryFee,
        prizeMoney: e.prizeMoney,
        scoringFormat: e.scoringFormat,
        pointsTo: e.pointsTo,
        poolPlayConfig: e.poolPlayConfig,
        seedingConfig: e.seedingConfig,
        bracketConfig: e.bracketConfig,
        status: e.status,
        sortOrder: e.sortOrder,
      })) || [],
    });
  }
);

/**
 * GET /tournaments/:id/registrations
 * Get tournament registrations (alias for participants)
 */
tournamentsRouter.get(
  '/:id/registrations',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const registrations = await db.query.tournamentRegistrations.findMany({
      where: eq(schema.tournamentRegistrations.tournamentId, id),
      with: {
        players: {
          with: {
            user: true,
          },
        },
      },
      limit,
      offset,
    });

    return c.json({
      registrations: registrations.map((reg) => ({
        id: reg.id,
        teamName: reg.teamName,
        seed: reg.seed,
        status: reg.status,
        registeredAt: reg.registeredAt,
        players: reg.players?.map((p) => ({
          id: p.user?.id,
          username: p.user?.username,
          displayName: p.user?.displayName,
          avatarUrl: p.user?.avatarUrl,
          rating: p.ratingAtRegistration,
          isCaptain: p.isCaptain,
        })) || [],
      })),
      pagination: {
        page,
        limit,
        hasMore: registrations.length === limit,
      },
    });
  }
);

/**
 * GET /tournaments/:id/bracket
 * Get tournament bracket (singular - alias for brackets)
 */
tournamentsRouter.get(
  '/:id/bracket',
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
        game: true,
      },
      orderBy: [desc(tournamentMatches.roundNumber), desc(tournamentMatches.matchNumber)],
    });

    // Group by round
    const rounds: Record<number, typeof matches> = {};
    for (const match of matches) {
      const roundNum = match.roundNumber;
      if (!rounds[roundNum]) {
        rounds[roundNum] = [];
      }
      rounds[roundNum]!.push(match);
    }

    return c.json({
      bracket: {
        format: tournament.tournamentFormat,
        totalRounds: Math.ceil(Math.log2(tournament.maxParticipants || 8)),
        rounds: Object.entries(rounds).map(([round, matchList]) => ({
          round: parseInt(round),
          matches: matchList.map((m) => ({
            id: m.id,
            matchNumber: m.matchNumber,
            roundNumber: m.roundNumber,
            team1RegistrationId: m.team1RegistrationId,
            team2RegistrationId: m.team2RegistrationId,
            winnerRegistrationId: m.winnerRegistrationId,
            scheduledAt: m.scheduledAt,
            status: m.status,
            scores: m.scores,
            gameId: m.gameId,
          })),
        })),
      },
    });
  }
);

/**
 * GET /tournaments/:id/schedule
 * Get tournament match schedule
 */
tournamentsRouter.get(
  '/:id/schedule',
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

    // Get all scheduled matches
    const matches = await db.query.tournamentMatches.findMany({
      where: eq(tournamentMatches.tournamentId, id),
      with: {
        game: true,
      },
      orderBy: [desc(tournamentMatches.scheduledAt)],
    });

    return c.json({
      schedule: {
        tournamentId: id,
        matches: matches.map((m) => ({
          id: m.id,
          matchNumber: m.matchNumber,
          roundNumber: m.roundNumber,
          team1RegistrationId: m.team1RegistrationId,
          team2RegistrationId: m.team2RegistrationId,
          scheduledAt: m.scheduledAt,
          courtNumber: m.courtNumber,
          status: m.status,
        })),
      },
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
        game: true,
      },
      orderBy: [desc(tournamentMatches.roundNumber), desc(tournamentMatches.matchNumber)],
    });

    // Group by round
    const rounds: Record<number, typeof matches> = {};
    for (const match of matches) {
      const roundNum = match.roundNumber;
      if (!rounds[roundNum]) {
        rounds[roundNum] = [];
      }
      rounds[roundNum]!.push(match);
    }

    return c.json({
      brackets: {
        format: tournament.tournamentFormat,
        totalRounds: Math.ceil(Math.log2(tournament.maxParticipants || 8)),
        rounds: Object.entries(rounds).map(([round, matchList]) => ({
          round: parseInt(round),
          matches: matchList.map((m) => ({
            id: m.id,
            matchNumber: m.matchNumber,
            roundNumber: m.roundNumber,
            team1RegistrationId: m.team1RegistrationId,
            team2RegistrationId: m.team2RegistrationId,
            winnerRegistrationId: m.winnerRegistrationId,
            scheduledAt: m.scheduledAt,
            status: m.status,
            scores: m.scores,
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
 * Note: This endpoint needs to be updated to use the new registration schema
 * (tournamentRegistrations + tournamentRegistrationPlayers)
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
    if (tournament.registrationClosesAt && new Date() > tournament.registrationClosesAt) {
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

    // Check if already registered using tournamentRegistrations
    const existing = await db.query.tournamentRegistrations.findFirst({
      where: eq(schema.tournamentRegistrations.tournamentId, id),
      with: {
        players: {
          where: eq(schema.tournamentRegistrationPlayers.userId, dbUser.id),
        },
      },
    });

    if (existing?.players && existing.players.length > 0) {
      throw new HTTPException(409, {
        message: 'Already registered for this tournament',
      });
    }

    // Check skill level requirements using rating system
    if (tournament.minRating || tournament.maxRating) {
      // Skill level mapping to numeric values
      const SKILL_MAP: Record<string, number> = {
        'beginner': 2.5,
        'intermediate': 3.0,
        'advanced': 3.5,
        'expert': 4.0,
        'pro': 4.5,
      };
      const userRating = dbUser.skillLevel ? SKILL_MAP[dbUser.skillLevel] || 3.0 : 3.0;

      if (tournament.minRating) {
        const minRating = parseFloat(tournament.minRating);
        if (userRating < minRating) {
          throw new HTTPException(400, {
            message: `Minimum rating required: ${tournament.minRating}`,
          });
        }
      }

      if (tournament.maxRating) {
        const maxRating = parseFloat(tournament.maxRating);
        if (userRating > maxRating) {
          throw new HTTPException(400, {
            message: `Maximum rating allowed: ${tournament.maxRating}`,
          });
        }
      }
    }

    // Create registration
    const [registration] = await db
      .insert(schema.tournamentRegistrations)
      .values({
        tournamentId: id,
        status: 'registered',
      })
      .returning();

    // Add player to registration (use skill level mapped to numeric rating)
    const SKILL_MAP: Record<string, string> = {
      'beginner': '2.50',
      'intermediate': '3.00',
      'advanced': '3.50',
      'expert': '4.00',
      'pro': '4.50',
    };
    await db.insert(schema.tournamentRegistrationPlayers).values({
      registrationId: registration!.id,
      userId: dbUser.id,
      isCaptain: true,
      ratingAtRegistration: dbUser.skillLevel ? SKILL_MAP[dbUser.skillLevel] || null : null,
    });

    // Update participant count
    await db
      .update(tournaments)
      .set({
        currentParticipants: (tournament.currentParticipants || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, id));

    await cache.del(`tournament:${id}`);

    // Log activity
    await userService.logActivity(dbUser.id, 'tournament_registered', 'tournament', id);

    return c.json({
      message: 'Successfully registered for the tournament',
      registration: {
        id: registration!.id,
        status: registration!.status,
      },
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
    if (tournament.organizerId !== dbUser.id) {
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
        winnerRegistrationId: winnerId,
        scores: [{ team1: player1Score, team2: player2Score }],
        status: 'completed',
        completedAt: new Date(),
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
 * Get tournament participants (registrations)
 */
tournamentsRouter.get(
  '/:id/participants',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const registrations = await db.query.tournamentRegistrations.findMany({
      where: eq(schema.tournamentRegistrations.tournamentId, id),
      with: {
        players: {
          with: {
            user: true,
          },
        },
      },
      limit,
      offset,
    });

    return c.json({
      participants: registrations.map((reg) => ({
        registrationId: reg.id,
        teamName: reg.teamName,
        seed: reg.seed,
        status: reg.status,
        registeredAt: reg.registeredAt,
        players: reg.players?.map((p) => ({
          id: p.user?.id,
          username: p.user?.username,
          displayName: p.user?.displayName,
          avatarUrl: p.user?.avatarUrl,
          rating: p.ratingAtRegistration,
          isCaptain: p.isCaptain,
        })) || [],
      })),
      pagination: {
        page,
        limit,
        hasMore: registrations.length === limit,
      },
    });
  }
);

export default tournamentsRouter;
