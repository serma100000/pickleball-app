import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';

const { users, userRatings } = schema;

const duprRouter = new Hono();

// Validation schemas
const linkDuprSchema = z.object({
  duprId: z
    .string()
    .min(1, 'DUPR ID is required')
    .max(50, 'DUPR ID is too long')
    .regex(/^[a-zA-Z0-9-]+$/, 'Invalid DUPR ID format'),
});

// Response types
interface DuprSettings {
  duprId: string | null;
  lastSync: string | null;
  linkedAt: string | null;
  ratings: {
    singles: string | null | undefined;
    doubles: string | null | undefined;
    mixedDoubles: string | null | undefined;
  };
}

/**
 * GET /dupr/settings
 * Get user's DUPR settings and linked ratings
 */
duprRouter.get('/settings', authMiddleware, async (c) => {
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

  // Get all DUPR ratings for this user
  const duprRatings = await db.query.userRatings.findMany({
    where: and(
      eq(userRatings.userId, dbUser.id),
      eq(userRatings.ratingType, 'dupr')
    ),
  });

  // Extract DUPR settings from ratings
  const linkedRating = duprRatings.find((r) => r.duprId);
  const duprId = linkedRating?.duprId || null;
  const lastSync = linkedRating?.duprLastSync?.toISOString() || null;

  // Build ratings by format
  const ratingsMap: Record<string, string | null> = {
    singles: null,
    doubles: null,
    mixed_doubles: null,
  };

  for (const rating of duprRatings) {
    ratingsMap[rating.gameFormat] = rating.rating;
  }

  const settings: DuprSettings = {
    duprId,
    lastSync,
    linkedAt: linkedRating?.createdAt?.toISOString() || null,
    ratings: {
      singles: ratingsMap.singles,
      doubles: ratingsMap.doubles,
      mixedDoubles: ratingsMap.mixed_doubles,
    },
  };

  return c.json({
    settings,
  });
});

/**
 * POST /dupr/link
 * Link a DUPR ID to the user's account
 */
duprRouter.post('/link', authMiddleware, validateBody(linkDuprSchema), async (c) => {
  const { duprId } = c.req.valid('json');
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

  // Check if DUPR ID is already linked to another user
  const existingLink = await db.query.userRatings.findFirst({
    where: eq(userRatings.duprId, duprId),
  });

  if (existingLink && existingLink.userId !== dbUser.id) {
    throw new HTTPException(409, {
      message: 'This DUPR ID is already linked to another account',
    });
  }

  // Check if user already has a DUPR account linked
  const userDuprRating = await db.query.userRatings.findFirst({
    where: and(
      eq(userRatings.userId, dbUser.id),
      eq(userRatings.ratingType, 'dupr')
    ),
  });

  if (userDuprRating?.duprId) {
    throw new HTTPException(409, {
      message: 'You already have a DUPR account linked. Unlink it first to link a different account.',
    });
  }

  const now = new Date();
  const gameFormats: Array<'singles' | 'doubles' | 'mixed_doubles'> = ['singles', 'doubles', 'mixed_doubles'];

  // Create or update DUPR ratings for all game formats
  for (const format of gameFormats) {
    const existingRating = await db.query.userRatings.findFirst({
      where: and(
        eq(userRatings.userId, dbUser.id),
        eq(userRatings.ratingType, 'dupr'),
        eq(userRatings.gameFormat, format)
      ),
    });

    if (existingRating) {
      // Update existing rating with DUPR ID
      await db
        .update(userRatings)
        .set({
          duprId,
          duprLastSync: now,
          updatedAt: now,
        })
        .where(eq(userRatings.id, existingRating.id));
    } else {
      // Create new DUPR rating entry
      await db.insert(userRatings).values({
        userId: dbUser.id,
        ratingType: 'dupr',
        gameFormat: format,
        rating: '0.00', // Will be updated on sync
        duprId,
        duprLastSync: now,
      });
    }
  }

  return c.json(
    {
      message: 'DUPR account linked successfully',
      duprId,
      linkedAt: now.toISOString(),
    },
    201
  );
});

/**
 * DELETE /dupr/link
 * Unlink DUPR account from user
 */
duprRouter.delete('/link', authMiddleware, async (c) => {
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

  // Get all DUPR ratings for this user
  const duprRatings = await db.query.userRatings.findMany({
    where: and(
      eq(userRatings.userId, dbUser.id),
      eq(userRatings.ratingType, 'dupr')
    ),
  });

  if (!duprRatings.length || !duprRatings.some((r) => r.duprId)) {
    throw new HTTPException(404, {
      message: 'No DUPR account linked',
    });
  }

  // Clear DUPR ID from all user's DUPR ratings
  const now = new Date();
  for (const rating of duprRatings) {
    await db
      .update(userRatings)
      .set({
        duprId: null,
        duprLastSync: null,
        updatedAt: now,
      })
      .where(eq(userRatings.id, rating.id));
  }

  return c.json({
    message: 'DUPR account unlinked successfully',
  });
});

/**
 * POST /dupr/sync
 * Trigger a sync with DUPR to update ratings
 * (Placeholder implementation - just updates lastSync timestamp)
 */
duprRouter.post('/sync', authMiddleware, async (c) => {
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

  // Get all DUPR ratings for this user
  const duprRatings = await db.query.userRatings.findMany({
    where: and(
      eq(userRatings.userId, dbUser.id),
      eq(userRatings.ratingType, 'dupr')
    ),
  });

  if (!duprRatings.length || !duprRatings.some((r) => r.duprId)) {
    throw new HTTPException(404, {
      message: 'No DUPR account linked. Please link your DUPR account first.',
    });
  }

  const now = new Date();

  // TODO: In a real implementation, this would:
  // 1. Call the DUPR API to fetch the latest ratings
  // 2. Update the userRatings table with the new values
  // 3. Create rating history entries
  // For now, we just update the lastSync timestamp

  // Update lastSync timestamp for all DUPR ratings
  for (const rating of duprRatings) {
    if (rating.duprId) {
      await db
        .update(userRatings)
        .set({
          duprLastSync: now,
          updatedAt: now,
        })
        .where(eq(userRatings.id, rating.id));
    }
  }

  // Get updated ratings
  const updatedRatings = await db.query.userRatings.findMany({
    where: and(
      eq(userRatings.userId, dbUser.id),
      eq(userRatings.ratingType, 'dupr')
    ),
  });

  // Build ratings response
  const ratingsMap: Record<string, string | null> = {
    singles: null,
    doubles: null,
    mixed_doubles: null,
  };

  for (const rating of updatedRatings) {
    ratingsMap[rating.gameFormat] = rating.rating;
  }

  return c.json({
    message: 'DUPR sync completed',
    lastSync: now.toISOString(),
    ratings: {
      singles: ratingsMap.singles,
      doubles: ratingsMap.doubles,
      mixedDoubles: ratingsMap.mixed_doubles,
    },
    note: 'This is a placeholder sync. Real DUPR API integration coming soon.',
  });
});

export default duprRouter;
