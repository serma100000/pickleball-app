import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, or, sql, gte, lte } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import {
  validateBody,
  validateQuery,
  validateParams,
  idParamSchema,
  paginationSchema,
} from '../middleware/validation.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';

const { users, partnerListings, userRatings, tournaments, leagues, notifications } = schema;

const partnersRouter = new Hono();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const listPartnerListingsSchema = paginationSchema.extend({
  tournamentId: z.string().uuid().optional(),
  leagueId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  skillMin: z.coerce.number().min(1).max(7).optional(),
  skillMax: z.coerce.number().min(1).max(7).optional(),
});

const createPartnerListingSchema = z.object({
  tournamentId: z.string().uuid().optional(),
  leagueId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  skillLevelMin: z.number().min(1).max(7).optional(),
  skillLevelMax: z.number().min(1).max(7).optional(),
  message: z.string().max(500).optional(),
});

const contactPartnerSchema = z.object({
  message: z.string().min(1).max(1000),
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

// ============================================================================
// PARTNER LISTINGS ENDPOINTS
// ============================================================================

/**
 * GET /partners/listings
 * Get partner marketplace listings for an event
 */
partnersRouter.get(
  '/listings',
  optionalAuth,
  validateQuery(listPartnerListingsSchema),
  async (c) => {
    const query = c.req.valid('query');
    const { page, limit, tournamentId, leagueId, eventId, skillMin, skillMax } = query;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(partnerListings.status, 'active')];

    if (tournamentId) {
      conditions.push(eq(partnerListings.tournamentId, tournamentId));
    }

    if (leagueId) {
      conditions.push(eq(partnerListings.leagueId, leagueId));
    }

    if (eventId) {
      conditions.push(eq(partnerListings.eventId, eventId));
    }

    // For skill filtering, we need to check if the seeker's preferences overlap with the filter
    // If skillMin is specified, we want listings where skillLevelMax >= skillMin (or is null)
    // If skillMax is specified, we want listings where skillLevelMin <= skillMax (or is null)
    if (skillMin !== undefined) {
      conditions.push(
        or(
          gte(partnerListings.skillLevelMax, skillMin.toString()),
          sql`${partnerListings.skillLevelMax} IS NULL`
        )!
      );
    }

    if (skillMax !== undefined) {
      conditions.push(
        or(
          lte(partnerListings.skillLevelMin, skillMax.toString()),
          sql`${partnerListings.skillLevelMin} IS NULL`
        )!
      );
    }

    const whereClause = and(...conditions);

    const [listings, countResult] = await Promise.all([
      db.query.partnerListings.findMany({
        where: whereClause,
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              displayName: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              city: true,
              state: true,
              skillLevel: true,
            },
          },
          tournament: {
            columns: { id: true, name: true, slug: true },
          },
          league: {
            columns: { id: true, name: true, slug: true },
          },
        },
        orderBy: desc(partnerListings.createdAt),
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(partnerListings).where(whereClause),
    ]);

    // Get user ratings for each listing
    const userIds = listings.map((l) => l.userId);
    const ratings = userIds.length > 0
      ? await db.query.userRatings.findMany({
          where: and(
            sql`${userRatings.userId} IN ${userIds}`,
            eq(userRatings.ratingType, 'internal')
          ),
        })
      : [];

    const ratingsByUser = ratings.reduce((acc, r) => {
      if (!acc[r.userId]) acc[r.userId] = [];
      acc[r.userId].push(r);
      return acc;
    }, {} as Record<string, typeof ratings>);

    const total = Number(countResult[0]?.count || 0);

    return c.json({
      listings: listings.map((listing) => {
        const userRatingsList = ratingsByUser[listing.userId] || [];
        // Get doubles rating first, fallback to any rating
        const doublesRating = userRatingsList.find((r) => r.gameFormat === 'doubles');
        const anyRating = userRatingsList[0];
        const rating = doublesRating || anyRating;

        return {
          id: listing.id,
          user: {
            ...listing.user,
            rating: rating?.rating ? parseFloat(rating.rating) : null,
            ratingSource: rating?.ratingType || null,
          },
          tournament: listing.tournament,
          league: listing.league,
          eventId: listing.eventId,
          skillLevelMin: listing.skillLevelMin ? parseFloat(listing.skillLevelMin) : null,
          skillLevelMax: listing.skillLevelMax ? parseFloat(listing.skillLevelMax) : null,
          message: listing.message,
          status: listing.status,
          createdAt: listing.createdAt,
        };
      }),
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
 * POST /partners/listings
 * Create a "looking for partner" listing
 */
partnersRouter.post(
  '/listings',
  authMiddleware,
  validateBody(createPartnerListingSchema),
  async (c) => {
    const data = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    // Validate that at least one event reference is provided
    if (!data.tournamentId && !data.leagueId) {
      throw new HTTPException(400, {
        message: 'Either tournamentId or leagueId is required',
      });
    }

    // Check if user already has an active listing for this event
    const existingListing = await db.query.partnerListings.findFirst({
      where: and(
        eq(partnerListings.userId, dbUser.id),
        eq(partnerListings.status, 'active'),
        data.tournamentId
          ? eq(partnerListings.tournamentId, data.tournamentId)
          : eq(partnerListings.leagueId, data.leagueId!),
        data.eventId ? eq(partnerListings.eventId, data.eventId) : sql`TRUE`
      ),
    });

    if (existingListing) {
      throw new HTTPException(409, {
        message: 'You already have an active partner listing for this event',
      });
    }

    // Validate tournament/league exists
    if (data.tournamentId) {
      const tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, data.tournamentId),
      });
      if (!tournament) {
        throw new HTTPException(404, { message: 'Tournament not found' });
      }
    }

    if (data.leagueId) {
      const league = await db.query.leagues.findFirst({
        where: eq(leagues.id, data.leagueId),
      });
      if (!league) {
        throw new HTTPException(404, { message: 'League not found' });
      }
    }

    // Create the listing
    const [listing] = await db
      .insert(partnerListings)
      .values({
        userId: dbUser.id,
        tournamentId: data.tournamentId,
        leagueId: data.leagueId,
        eventId: data.eventId,
        skillLevelMin: data.skillLevelMin?.toString(),
        skillLevelMax: data.skillLevelMax?.toString(),
        message: data.message,
        status: 'active',
      })
      .returning();

    return c.json(
      {
        message: 'Partner listing created successfully',
        listing: {
          id: listing.id,
          tournamentId: listing.tournamentId,
          leagueId: listing.leagueId,
          eventId: listing.eventId,
          skillLevelMin: listing.skillLevelMin ? parseFloat(listing.skillLevelMin) : null,
          skillLevelMax: listing.skillLevelMax ? parseFloat(listing.skillLevelMax) : null,
          message: listing.message,
          status: listing.status,
          createdAt: listing.createdAt,
        },
      },
      201
    );
  }
);

/**
 * DELETE /partners/listings/:id
 * Remove your listing
 */
partnersRouter.delete(
  '/listings/:id',
  authMiddleware,
  validateParams(idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    // Find the listing
    const listing = await db.query.partnerListings.findFirst({
      where: eq(partnerListings.id, id),
    });

    if (!listing) {
      throw new HTTPException(404, { message: 'Listing not found' });
    }

    // Verify ownership
    if (listing.userId !== dbUser.id) {
      throw new HTTPException(403, { message: 'You can only delete your own listings' });
    }

    // Delete the listing
    await db.delete(partnerListings).where(eq(partnerListings.id, id));

    return c.json({ message: 'Listing deleted successfully' });
  }
);

/**
 * POST /partners/listings/:id/contact
 * Express interest in partnering with someone
 */
partnersRouter.post(
  '/listings/:id/contact',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(contactPartnerSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { message } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    // Find the listing
    const listing = await db.query.partnerListings.findFirst({
      where: and(eq(partnerListings.id, id), eq(partnerListings.status, 'active')),
      with: {
        user: {
          columns: { id: true, displayName: true, username: true },
        },
        tournament: {
          columns: { id: true, name: true },
        },
        league: {
          columns: { id: true, name: true },
        },
      },
    });

    if (!listing) {
      throw new HTTPException(404, { message: 'Listing not found or no longer active' });
    }

    // Cannot contact your own listing
    if (listing.userId === dbUser.id) {
      throw new HTTPException(400, { message: 'You cannot contact your own listing' });
    }

    // Create a notification for the listing owner
    const eventName = listing.tournament?.name || listing.league?.name || 'an event';
    const contactingUserName = dbUser.displayName || dbUser.username;

    await db.insert(notifications).values({
      userId: listing.userId,
      type: 'game_invite', // Using existing type that fits the purpose
      title: 'Partner Interest',
      message: `${contactingUserName} is interested in partnering with you for ${eventName}. Message: "${message}"`,
      actionUrl: `/profile/${dbUser.id}`,
      actionData: {
        type: 'partner_contact',
        listingId: id,
        contactUserId: dbUser.id,
        contactUsername: dbUser.username,
        contactMessage: message,
        eventName,
      },
      referenceType: 'partner_listing',
      referenceId: id,
    });

    return c.json({
      message: 'Contact request sent successfully',
      contacted: {
        userId: listing.userId,
        displayName: listing.user.displayName || listing.user.username,
      },
    });
  }
);

/**
 * GET /partners/listings/my
 * Get current user's partner listings
 */
partnersRouter.get('/listings/my', authMiddleware, async (c) => {
  const { userId } = c.get('user');

  const dbUser = await getDbUser(userId);

  const listings = await db.query.partnerListings.findMany({
    where: eq(partnerListings.userId, dbUser.id),
    with: {
      tournament: {
        columns: { id: true, name: true, slug: true },
      },
      league: {
        columns: { id: true, name: true, slug: true },
      },
    },
    orderBy: desc(partnerListings.createdAt),
  });

  return c.json({
    listings: listings.map((listing) => ({
      id: listing.id,
      tournament: listing.tournament,
      league: listing.league,
      eventId: listing.eventId,
      skillLevelMin: listing.skillLevelMin ? parseFloat(listing.skillLevelMin) : null,
      skillLevelMax: listing.skillLevelMax ? parseFloat(listing.skillLevelMax) : null,
      message: listing.message,
      status: listing.status,
      createdAt: listing.createdAt,
    })),
  });
});

export default partnersRouter;
