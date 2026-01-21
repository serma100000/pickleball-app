import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, sql, desc } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery, validateParams, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { cache } from '../lib/redis.js';

const { courts, courtReviews, users, venues } = schema;

const courtsRouter = new Hono();

// Validation schemas
const searchCourtsSchema = paginationSchema.extend({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().positive().max(100).default(25),
  city: z.string().optional(),
  isIndoor: z.coerce.boolean().optional(),
  hasLighting: z.coerce.boolean().optional(), // Maps to hasLights in schema
  surfaceType: z.string().optional(), // Maps to surface in schema
});

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * GET /courts
 * Search courts with optional geo filtering
 * Courts don't have location directly - we join with venues for geo queries
 */
courtsRouter.get('/', validateQuery(searchCourtsSchema), async (c) => {
  const { lat, lng, radius, city, isIndoor, hasLighting, surfaceType, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  try {
    // Build where conditions for courts
    const courtConditions = [];

    if (isIndoor !== undefined) {
      courtConditions.push(eq(courts.isIndoor, isIndoor));
    }

    // Map hasLighting to hasLights (schema uses hasLights)
    if (hasLighting !== undefined) {
      courtConditions.push(eq(courts.hasLights, hasLighting));
    }

    // Map surfaceType to surface (schema uses surface)
    if (surfaceType) {
      courtConditions.push(eq(courts.surface, surfaceType as 'concrete' | 'asphalt' | 'sport_court' | 'wood' | 'indoor' | 'turf'));
    }

    // Build venue conditions
    const venueConditions = [];
    if (city) {
      venueConditions.push(sql`LOWER(${venues.city}) LIKE LOWER(${'%' + city + '%'})`);
    }

    // If geo search, add distance calculation using venue location
    let results;
    if (lat !== undefined && lng !== undefined) {
      // Haversine formula for distance in km (using venue's coordinates)
      const distanceFormula = sql<number>`
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(${lat})) * cos(radians(CAST(${venues.latitude} AS DOUBLE PRECISION))) *
            cos(radians(CAST(${venues.longitude} AS DOUBLE PRECISION)) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(CAST(${venues.latitude} AS DOUBLE PRECISION)))
          ))
        )
      `;

      venueConditions.push(sql`${distanceFormula} <= ${radius}`);

      const allConditions = [...courtConditions, ...venueConditions];

      results = await db
        .select({
          court: courts,
          venue: venues,
          distance: distanceFormula,
        })
        .from(courts)
        .innerJoin(venues, eq(courts.venueId, venues.id))
        .where(allConditions.length > 0 ? and(...allConditions) : undefined)
        .orderBy(distanceFormula)
        .limit(limit)
        .offset(offset);
    } else {
      const allConditions = [...courtConditions, ...venueConditions];

      results = await db
        .select({
          court: courts,
          venue: venues,
          distance: sql<number>`null`,
        })
        .from(courts)
        .innerJoin(venues, eq(courts.venueId, venues.id))
        .where(allConditions.length > 0 ? and(...allConditions) : undefined)
        .orderBy(desc(venues.averageRating))
        .limit(limit)
        .offset(offset);
    }

    return c.json({
      courts: results.map((r) => ({
        ...r.court,
        venue: {
          id: r.venue.id,
          name: r.venue.name,
          city: r.venue.city,
          state: r.venue.state,
          latitude: r.venue.latitude,
          longitude: r.venue.longitude,
          averageRating: r.venue.averageRating,
        },
        distance: r.distance ? Math.round(r.distance * 10) / 10 : null,
      })),
      pagination: {
        page,
        limit,
        hasMore: results.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching courts:', error);
    throw new HTTPException(500, {
      message: 'Failed to fetch courts',
    });
  }
});

/**
 * GET /courts/:id
 * Get court details with venue info and reviews
 */
courtsRouter.get('/:id', validateParams(idParamSchema), async (c) => {
  const { id } = c.req.valid('param');

  try {
    // Try cache first
    const cacheKey = `court:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json({ court: cached });
    }

    // Get court with venue
    const court = await db.query.courts.findFirst({
      where: eq(courts.id, id),
      with: {
        venue: true,
      },
    });

    if (!court) {
      throw new HTTPException(404, {
        message: 'Court not found',
      });
    }

    // Get recent reviews for this court (or venue if no court-specific reviews)
    const reviews = await db.query.courtReviews.findMany({
      where: eq(courtReviews.courtId, id),
      with: {
        user: true,
      },
      orderBy: desc(courtReviews.createdAt),
      limit: 5,
    });

    const result = {
      ...court,
      venue: {
        id: court.venue.id,
        name: court.venue.name,
        slug: court.venue.slug,
        venueType: court.venue.venueType,
        streetAddress: court.venue.streetAddress,
        city: court.venue.city,
        state: court.venue.state,
        country: court.venue.country,
        zipCode: court.venue.zipCode,
        latitude: court.venue.latitude,
        longitude: court.venue.longitude,
        phone: court.venue.phone,
        website: court.venue.website,
        amenities: court.venue.amenities,
        operatingHours: court.venue.operatingHours,
        averageRating: court.venue.averageRating,
        totalReviews: court.venue.totalReviews,
      },
      recentReviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        content: r.content,
        surfaceQuality: r.surfaceQuality,
        netQuality: r.netQuality,
        lightingQuality: r.lightingQuality,
        cleanliness: r.cleanliness,
        createdAt: r.createdAt,
        user: {
          id: r.user.id,
          username: r.user.username,
          displayName: r.user.displayName,
          avatarUrl: r.user.avatarUrl,
        },
      })),
    };

    // Cache for 10 minutes
    await cache.set(cacheKey, result, 600);

    return c.json({ court: result });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error fetching court:', error);
    throw new HTTPException(500, {
      message: 'Failed to fetch court details',
    });
  }
});

/**
 * GET /courts/:id/availability
 * Get court availability for a specific date
 */
courtsRouter.get(
  '/:id/availability',
  validateParams(idParamSchema),
  validateQuery(availabilityQuerySchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { date } = c.req.valid('query');

    try {
      // Verify court exists
      const court = await db.query.courts.findFirst({
        where: eq(courts.id, id),
      });

      if (!court) {
        throw new HTTPException(404, {
          message: 'Court not found',
        });
      }

      // In a real implementation, this would check:
      // 1. Court's operating hours (from venue)
      // 2. Existing reservations
      // 3. Scheduled games
      // 4. Special closures

      // Placeholder response with realistic slots
      const slots = [];
      for (let hour = 6; hour <= 21; hour++) {
        // Determine price based on indoor status and peak hours (6-9am, 5-8pm)
        const isPeakHour = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20);
        let price = 0;
        if (court.isIndoor) {
          price = isPeakHour && court.peakHourlyRate
            ? parseFloat(court.peakHourlyRate)
            : court.hourlyRate
              ? parseFloat(court.hourlyRate)
              : 25;
        }

        slots.push({
          startTime: `${date}T${hour.toString().padStart(2, '0')}:00:00`,
          endTime: `${date}T${(hour + 1).toString().padStart(2, '0')}:00:00`,
          available: Math.random() > 0.3, // Placeholder - real impl would check reservations
          price,
        });
      }

      return c.json({
        courtId: id,
        date,
        slots,
        timezone: 'America/New_York', // Should come from venue data
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Error fetching availability:', error);
      throw new HTTPException(500, {
        message: 'Failed to fetch availability',
      });
    }
  }
);

/**
 * POST /courts/:id/reviews
 * Add a review for a court
 */
courtsRouter.post(
  '/:id/reviews',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(createReviewSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { rating, comment } = c.req.valid('json');
    const { userId } = c.get('user');

    try {
      // Get user from database
      const dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, userId),
      });

      if (!dbUser) {
        throw new HTTPException(401, {
          message: 'User not found',
        });
      }

      // Verify court exists and get venue ID
      const court = await db.query.courts.findFirst({
        where: eq(courts.id, id),
      });

      if (!court) {
        throw new HTTPException(404, {
          message: 'Court not found',
        });
      }

      // Check if user already reviewed this venue (reviews are per venue-user, not per court)
      const existingReview = await db.query.courtReviews.findFirst({
        where: and(
          eq(courtReviews.venueId, court.venueId),
          eq(courtReviews.userId, dbUser.id)
        ),
      });

      if (existingReview) {
        throw new HTTPException(409, {
          message: 'You have already reviewed this court',
        });
      }

      // Create review (must include venueId as it's required by schema)
      const [review] = await db
        .insert(courtReviews)
        .values({
          courtId: id,
          venueId: court.venueId,
          userId: dbUser.id,
          rating,
          content: comment, // Schema uses 'content' not 'comment'
        })
        .returning();

      // Update venue's average rating (ratings aggregate at venue level)
      const allReviews = await db
        .select({ rating: courtReviews.rating })
        .from(courtReviews)
        .where(eq(courtReviews.venueId, court.venueId));

      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await db
        .update(venues)
        .set({
          averageRating: avgRating.toFixed(1),
          totalReviews: allReviews.length,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, court.venueId));

      // Invalidate cache
      await cache.del(`court:${id}`);

      return c.json(
        {
          message: 'Review added successfully',
          review: {
            id: review.id,
            rating: review.rating,
            comment: review.content,
            createdAt: review.createdAt,
          },
        },
        201
      );
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error('Error creating review:', error);
      throw new HTTPException(500, {
        message: 'Failed to create review',
      });
    }
  }
);

/**
 * GET /courts/:id/reviews
 * Get all reviews for a court
 */
courtsRouter.get(
  '/:id/reviews',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    try {
      const reviews = await db.query.courtReviews.findMany({
        where: eq(courtReviews.courtId, id),
        with: {
          user: true,
        },
        orderBy: desc(courtReviews.createdAt),
        limit,
        offset,
      });

      return c.json({
        reviews: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          content: r.content,
          surfaceQuality: r.surfaceQuality,
          netQuality: r.netQuality,
          lightingQuality: r.lightingQuality,
          cleanliness: r.cleanliness,
          createdAt: r.createdAt,
          user: {
            id: r.user.id,
            username: r.user.username,
            displayName: r.user.displayName,
            avatarUrl: r.user.avatarUrl,
          },
        })),
        pagination: {
          page,
          limit,
          hasMore: reviews.length === limit,
        },
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw new HTTPException(500, {
        message: 'Failed to fetch reviews',
      });
    }
  }
);

export default courtsRouter;
