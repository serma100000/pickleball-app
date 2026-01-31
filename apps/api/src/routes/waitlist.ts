import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateParams, validateQuery, idParamSchema } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { waitlistService } from '../services/waitlistService.js';

const { users } = schema;

const waitlistRouter = new Hono();

// Validation schemas
const eventTypeSchema = z.enum(['tournament', 'league']);

const addToWaitlistSchema = z.object({
  eventType: eventTypeSchema,
  eventId: z.string().uuid(),
  eventSubId: z.string().uuid().optional(), // divisionId for tournaments, seasonId for leagues
});

const waitlistActionSchema = z.object({
  eventType: eventTypeSchema,
  eventId: z.string().uuid(),
});

const getWaitlistPositionSchema = z.object({
  eventType: eventTypeSchema,
  eventId: z.string().uuid(),
});

const getWaitlistEntriesSchema = z.object({
  eventType: eventTypeSchema,
  eventId: z.string().uuid(),
});

// Helper to get DB user
async function getDbUser(clerkId: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!dbUser) {
    throw new HTTPException(401, { message: 'User not found' });
  }

  return dbUser;
}

/**
 * POST /waitlist
 * Add the current user to a waitlist
 */
waitlistRouter.post(
  '/',
  authMiddleware,
  validateBody(addToWaitlistSchema),
  async (c) => {
    const { eventType, eventId, eventSubId } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    try {
      const result = await waitlistService.addToWaitlist(
        dbUser.id,
        eventType,
        eventId,
        eventSubId
      );

      return c.json({
        message: 'Successfully added to waitlist',
        registrationId: result.registrationId,
        position: result.position,
      });
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : 'Failed to add to waitlist',
      });
    }
  }
);

/**
 * GET /waitlist/position
 * Get the current user's position on a waitlist
 */
waitlistRouter.get(
  '/position',
  authMiddleware,
  validateQuery(getWaitlistPositionSchema),
  async (c) => {
    const { eventType, eventId } = c.req.valid('query');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const position = await waitlistService.getWaitlistPosition(
      dbUser.id,
      eventType,
      eventId
    );

    if (!position) {
      return c.json({
        onWaitlist: false,
        message: 'You are not on the waitlist for this event',
      });
    }

    return c.json({
      onWaitlist: true,
      position: position.position,
      totalWaitlisted: position.totalWaitlisted,
      estimatedWaitDays: position.estimatedWaitDays,
      status: position.status,
      spotOfferedAt: position.spotOfferedAt,
      spotExpiresAt: position.spotExpiresAt,
    });
  }
);

/**
 * POST /waitlist/accept
 * Accept an offered waitlist spot
 */
waitlistRouter.post(
  '/accept',
  authMiddleware,
  validateBody(waitlistActionSchema),
  async (c) => {
    const { eventType, eventId } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const result = await waitlistService.acceptWaitlistSpot(
      dbUser.id,
      eventType,
      eventId
    );

    if (!result.success) {
      throw new HTTPException(400, { message: result.message });
    }

    return c.json({
      message: result.message,
      success: true,
    });
  }
);

/**
 * POST /waitlist/decline
 * Decline an offered waitlist spot
 */
waitlistRouter.post(
  '/decline',
  authMiddleware,
  validateBody(waitlistActionSchema),
  async (c) => {
    const { eventType, eventId } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const result = await waitlistService.declineWaitlistSpot(
      dbUser.id,
      eventType,
      eventId
    );

    if (!result.success) {
      throw new HTTPException(400, { message: result.message });
    }

    return c.json({
      message: result.message,
      success: true,
    });
  }
);

/**
 * GET /waitlist/entries
 * Get all waitlist entries for an event (admin/organizer only)
 */
waitlistRouter.get(
  '/entries',
  authMiddleware,
  validateQuery(getWaitlistEntriesSchema),
  async (c) => {
    const { eventType, eventId } = c.req.valid('query');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    // Verify the user is the organizer
    if (eventType === 'tournament') {
      const tournament = await db.query.tournaments.findFirst({
        where: eq(schema.tournaments.id, eventId),
      });

      if (!tournament) {
        throw new HTTPException(404, { message: 'Tournament not found' });
      }

      if (tournament.organizerId !== dbUser.id) {
        throw new HTTPException(403, {
          message: 'Only the tournament organizer can view waitlist entries',
        });
      }
    } else {
      const league = await db.query.leagues.findFirst({
        where: eq(schema.leagues.id, eventId),
      });

      if (!league) {
        throw new HTTPException(404, { message: 'League not found' });
      }

      if (league.organizerId !== dbUser.id) {
        throw new HTTPException(403, {
          message: 'Only the league organizer can view waitlist entries',
        });
      }
    }

    const entries = await waitlistService.getWaitlistEntries(eventType, eventId);

    return c.json({
      entries,
      total: entries.length,
    });
  }
);

/**
 * POST /waitlist/process
 * Manually trigger waitlist processing (admin/organizer only)
 * Used when someone withdraws and a spot needs to be offered
 */
waitlistRouter.post(
  '/process',
  authMiddleware,
  validateBody(waitlistActionSchema),
  async (c) => {
    const { eventType, eventId } = c.req.valid('json');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    // Verify the user is the organizer
    if (eventType === 'tournament') {
      const tournament = await db.query.tournaments.findFirst({
        where: eq(schema.tournaments.id, eventId),
      });

      if (!tournament) {
        throw new HTTPException(404, { message: 'Tournament not found' });
      }

      if (tournament.organizerId !== dbUser.id) {
        throw new HTTPException(403, {
          message: 'Only the tournament organizer can process the waitlist',
        });
      }
    } else {
      const league = await db.query.leagues.findFirst({
        where: eq(schema.leagues.id, eventId),
      });

      if (!league) {
        throw new HTTPException(404, { message: 'League not found' });
      }

      if (league.organizerId !== dbUser.id) {
        throw new HTTPException(403, {
          message: 'Only the league organizer can process the waitlist',
        });
      }
    }

    const result = await waitlistService.processWaitlist(eventType, eventId);

    if (!result) {
      return c.json({
        message: 'No one on the waitlist to offer a spot to',
        processed: false,
      });
    }

    return c.json({
      message: 'Spot offered to next person in line',
      processed: true,
      userId: result.userId,
      registrationId: result.registrationId,
    });
  }
);

/**
 * GET /waitlist/status
 * Check if an event is full and get waitlist info
 */
waitlistRouter.get(
  '/status',
  validateQuery(getWaitlistEntriesSchema),
  async (c) => {
    const { eventType, eventId } = c.req.valid('query');

    try {
      const { isFull, currentCount, maxCount } = await waitlistService.isEventFull(
        eventType,
        eventId
      );

      // Get waitlist count
      const entries = await waitlistService.getWaitlistEntries(eventType, eventId);

      return c.json({
        isFull,
        currentCount,
        maxCount,
        waitlistEnabled: true,
        waitlistCount: entries.length,
      });
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : 'Failed to get event status',
      });
    }
  }
);

export default waitlistRouter;
