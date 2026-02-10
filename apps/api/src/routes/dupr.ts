/**
 * DUPR Integration Routes
 *
 * SSO-only account linking (no manual DUPR ID entry).
 * Authenticated routes use authMiddleware; the webhook route is unauthenticated.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { duprService } from '../services/duprService.js';

const {
  users,
  duprAccounts,
  duprMatchSubmissions,
  userRatings,
  ratingHistory,
} = schema;

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

const duprRouter = new Hono();

// --------------------------------------------------------------------------
// Validation schemas
// --------------------------------------------------------------------------

const ssoCallbackSchema = z.object({
  userToken: z.string().min(1, 'userToken is required'),
  refreshToken: z.string().optional(),
  id: z.string().optional(),
  duprId: z.string().min(1, 'duprId is required'),
  stats: z
    .object({
      singles: z.number().nullable().optional(),
      doubles: z.number().nullable().optional(),
      mixedDoubles: z.number().nullable().optional(),
    })
    .optional(),
});

const submitMatchSchema = z.object({
  gameId: z.string().uuid().optional(),
  tournamentMatchId: z.string().uuid().optional(),
  leagueMatchId: z.string().uuid().optional(),
  matchType: z.enum(['SINGLES', 'DOUBLES']),
  team1Players: z.array(z.object({ duprId: z.string() })).min(1).max(2),
  team2Players: z.array(z.object({ duprId: z.string() })).min(1).max(2),
  scores: z.array(
    z.object({
      team1Score: z.number().int().min(0),
      team2Score: z.number().int().min(0),
    })
  ).min(1),
  playedAt: z.string(),
  clubId: z.string().optional(),
  eventName: z.string().optional(),
});

const updateMatchSchema = z.object({
  scores: z
    .array(
      z.object({
        team1Score: z.number().int().min(0),
        team2Score: z.number().int().min(0),
      })
    )
    .optional(),
  playedAt: z.string().optional(),
});

// --------------------------------------------------------------------------
// Helper: look up internal user from Clerk ID
// --------------------------------------------------------------------------

async function getDbUser(clerkId: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
  if (!dbUser) throw new HTTPException(401, { message: 'User not found' });
  return dbUser;
}

// --------------------------------------------------------------------------
// GET /dupr/settings
// --------------------------------------------------------------------------

duprRouter.get('/settings', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);

  const duprAccount = await db.query.duprAccounts.findFirst({
    where: eq(duprAccounts.userId, dbUser.id),
  });

  if (!duprAccount) {
    return c.json({
      linked: false,
      duprId: null,
      ratings: { singles: null, doubles: null, mixedDoubles: null },
      entitlementLevel: 'NONE',
      lastSync: null,
      linkedAt: null,
    });
  }

  return c.json({
    linked: true,
    duprId: duprAccount.duprId,
    ratings: {
      singles: duprAccount.singlesRating,
      doubles: duprAccount.doublesRating,
      mixedDoubles: duprAccount.mixedDoublesRating,
    },
    entitlementLevel: duprAccount.entitlementLevel,
    lastSync: duprAccount.lastSyncAt?.toISOString() ?? null,
    linkedAt: duprAccount.linkedAt?.toISOString() ?? null,
  });
});

// --------------------------------------------------------------------------
// POST /dupr/sso/callback
// Processes SSO data relayed from the frontend DUPR iframe
// --------------------------------------------------------------------------

duprRouter.post('/sso/callback', authMiddleware, validateBody(ssoCallbackSchema), async (c) => {
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);
  const body = c.req.valid('json');

  // 1. Validate the user token with DUPR API
  const playerInfo = await duprService.validateSsoUser(body.userToken);
  if (!playerInfo) {
    throw new HTTPException(400, { message: 'Failed to validate DUPR SSO token. Please try again.' });
  }

  // Use DUPR ID from validated player info, falling back to body
  const duprId = String(playerInfo.duprId || body.duprId);

  // 2. Check if this DUPR ID is already linked to a different user
  const existingLink = await db.query.duprAccounts.findFirst({
    where: eq(duprAccounts.duprId, duprId),
  });

  if (existingLink && existingLink.userId !== dbUser.id) {
    throw new HTTPException(409, {
      message: 'This DUPR account is already linked to another user',
    });
  }

  // 3. Fetch entitlements
  const entitlements = await duprService.getPlayerEntitlements(body.userToken);

  // 4. Build ratings from SSO stats or player info
  const ratings = {
    singles: body.stats?.singles ?? playerInfo.ratings?.singles ?? null,
    doubles: body.stats?.doubles ?? playerInfo.ratings?.doubles ?? null,
    mixedDoubles: body.stats?.mixedDoubles ?? playerInfo.ratings?.mixedDoubles ?? null,
  };

  const now = new Date();

  // 5. Upsert dupr_accounts row
  if (existingLink) {
    // Update existing link (same user re-linking)
    await db
      .update(duprAccounts)
      .set({
        duprUserToken: body.userToken,
        duprRefreshToken: body.refreshToken ?? null,
        duprInternalId: body.id ?? playerInfo.id?.toString() ?? null,
        entitlementLevel: entitlements.entitlementLevel,
        singlesRating: ratings.singles?.toString() ?? null,
        doublesRating: ratings.doubles?.toString() ?? null,
        mixedDoublesRating: ratings.mixedDoubles?.toString() ?? null,
        lastSyncAt: now,
        updatedAt: now,
      })
      .where(eq(duprAccounts.id, existingLink.id));
  } else {
    // Create new link
    await db.insert(duprAccounts).values({
      userId: dbUser.id,
      duprId,
      duprInternalId: body.id ?? playerInfo.id?.toString() ?? null,
      duprUserToken: body.userToken,
      duprRefreshToken: body.refreshToken ?? null,
      entitlementLevel: entitlements.entitlementLevel,
      singlesRating: ratings.singles?.toString() ?? null,
      doublesRating: ratings.doubles?.toString() ?? null,
      mixedDoublesRating: ratings.mixedDoubles?.toString() ?? null,
      lastSyncAt: now,
      linkedAt: now,
    });
  }

  // 6. Also update userRatings table for compatibility
  const gameFormats: Array<'singles' | 'doubles' | 'mixed_doubles'> = [
    'singles',
    'doubles',
    'mixed_doubles',
  ];
  const ratingValues: Record<string, number | null> = {
    singles: ratings.singles,
    doubles: ratings.doubles,
    mixed_doubles: ratings.mixedDoubles,
  };

  for (const format of gameFormats) {
    const ratingVal = ratingValues[format];
    const existingRating = await db.query.userRatings.findFirst({
      where: and(
        eq(userRatings.userId, dbUser.id),
        eq(userRatings.ratingType, 'dupr'),
        eq(userRatings.gameFormat, format)
      ),
    });

    if (existingRating) {
      await db
        .update(userRatings)
        .set({
          duprId,
          rating: ratingVal?.toString() ?? existingRating.rating,
          duprLastSync: now,
          updatedAt: now,
        })
        .where(eq(userRatings.id, existingRating.id));
    } else {
      await db.insert(userRatings).values({
        userId: dbUser.id,
        ratingType: 'dupr',
        gameFormat: format,
        rating: ratingVal?.toString() ?? '0.00',
        duprId,
        duprLastSync: now,
      });
    }

    // Record in rating history
    if (ratingVal != null) {
      await db.insert(ratingHistory).values({
        userId: dbUser.id,
        ratingType: 'dupr',
        gameFormat: format,
        oldRating: existingRating?.rating ?? '0.00',
        newRating: ratingVal.toString(),
        sourceType: 'dupr_sync',
      });
    }
  }

  return c.json({
    message: 'DUPR account linked successfully',
    duprId,
    entitlementLevel: entitlements.entitlementLevel,
    ratings,
    linkedAt: now.toISOString(),
  }, 201);
});

// --------------------------------------------------------------------------
// DELETE /dupr/link — Unlink DUPR account
// --------------------------------------------------------------------------

duprRouter.delete('/link', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);

  const duprAccount = await db.query.duprAccounts.findFirst({
    where: eq(duprAccounts.userId, dbUser.id),
  });

  if (!duprAccount) {
    throw new HTTPException(404, { message: 'No DUPR account linked' });
  }

  // Remove the DUPR account link
  await db.delete(duprAccounts).where(eq(duprAccounts.id, duprAccount.id));

  // Clear DUPR IDs from userRatings
  const duprRatings = await db.query.userRatings.findMany({
    where: and(
      eq(userRatings.userId, dbUser.id),
      eq(userRatings.ratingType, 'dupr')
    ),
  });

  for (const rating of duprRatings) {
    await db
      .update(userRatings)
      .set({ duprId: null, duprLastSync: null, updatedAt: new Date() })
      .where(eq(userRatings.id, rating.id));
  }

  return c.json({ message: 'DUPR account unlinked successfully' });
});

// --------------------------------------------------------------------------
// POST /dupr/sync — Manual rating sync from DUPR
// --------------------------------------------------------------------------

duprRouter.post('/sync', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);

  const duprAccount = await db.query.duprAccounts.findFirst({
    where: eq(duprAccounts.userId, dbUser.id),
  });

  if (!duprAccount) {
    throw new HTTPException(404, {
      message: 'No DUPR account linked. Please link your DUPR account first.',
    });
  }

  // Fetch latest ratings from DUPR
  const ratings = await duprService.syncPlayerRatings(duprAccount.duprId);
  const now = new Date();

  // Update dupr_accounts with fresh ratings
  await db
    .update(duprAccounts)
    .set({
      singlesRating: ratings.singles?.toString() ?? duprAccount.singlesRating,
      doublesRating: ratings.doubles?.toString() ?? duprAccount.doublesRating,
      mixedDoublesRating: ratings.mixedDoubles?.toString() ?? duprAccount.mixedDoublesRating,
      lastSyncAt: now,
      updatedAt: now,
    })
    .where(eq(duprAccounts.id, duprAccount.id));

  // Optionally refresh entitlements if we have a stored user token
  let entitlementLevel = duprAccount.entitlementLevel;
  if (duprAccount.duprUserToken) {
    try {
      const ent = await duprService.getPlayerEntitlements(duprAccount.duprUserToken);
      entitlementLevel = ent.entitlementLevel;
      await db
        .update(duprAccounts)
        .set({ entitlementLevel })
        .where(eq(duprAccounts.id, duprAccount.id));
    } catch {
      // Token may have expired — not a fatal issue for sync
    }
  }

  // Update userRatings too
  const formats: Array<{ format: 'singles' | 'doubles' | 'mixed_doubles'; value: number | null }> = [
    { format: 'singles', value: ratings.singles },
    { format: 'doubles', value: ratings.doubles },
    { format: 'mixed_doubles', value: ratings.mixedDoubles },
  ];

  for (const { format, value } of formats) {
    if (value == null) continue;

    const existing = await db.query.userRatings.findFirst({
      where: and(
        eq(userRatings.userId, dbUser.id),
        eq(userRatings.ratingType, 'dupr'),
        eq(userRatings.gameFormat, format)
      ),
    });

    if (existing) {
      const oldRating = existing.rating;
      await db
        .update(userRatings)
        .set({
          rating: value.toString(),
          duprLastSync: now,
          updatedAt: now,
        })
        .where(eq(userRatings.id, existing.id));

      // Record history if changed
      if (oldRating !== value.toString()) {
        await db.insert(ratingHistory).values({
          userId: dbUser.id,
          ratingType: 'dupr',
          gameFormat: format,
          oldRating: oldRating ?? '0.00',
          newRating: value.toString(),
          sourceType: 'dupr_sync',
        });
      }
    }
  }

  return c.json({
    message: 'DUPR sync completed',
    lastSync: now.toISOString(),
    ratings,
    entitlementLevel,
  });
});

// --------------------------------------------------------------------------
// GET /dupr/entitlements — Check user's DUPR+/Verified status
// --------------------------------------------------------------------------

duprRouter.get('/entitlements', authMiddleware, async (c) => {
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);

  const duprAccount = await db.query.duprAccounts.findFirst({
    where: eq(duprAccounts.userId, dbUser.id),
  });

  if (!duprAccount) {
    return c.json({
      linked: false,
      isPremium: false,
      isVerified: false,
      entitlementLevel: 'NONE',
    });
  }

  const isPremium =
    duprAccount.entitlementLevel === 'PREMIUM_L1' ||
    duprAccount.entitlementLevel === 'VERIFIED_L1';
  const isVerified = duprAccount.entitlementLevel === 'VERIFIED_L1';

  return c.json({
    linked: true,
    isPremium,
    isVerified,
    entitlementLevel: duprAccount.entitlementLevel,
  });
});

// --------------------------------------------------------------------------
// Match CRUD
// --------------------------------------------------------------------------

/** POST /dupr/matches — Submit a match to DUPR */
duprRouter.post('/matches', authMiddleware, validateBody(submitMatchSchema), async (c) => {
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);
  const body = c.req.valid('json');

  // User must have DUPR linked
  const duprAccount = await db.query.duprAccounts.findFirst({
    where: eq(duprAccounts.userId, dbUser.id),
  });

  if (!duprAccount) {
    throw new HTTPException(403, {
      message: 'A linked DUPR account is required to submit matches',
      cause: { code: 'DUPR_ENTITLEMENT_REQUIRED', required: 'linked' },
    });
  }

  // Create a pending submission record
  const [submission] = await db
    .insert(duprMatchSubmissions)
    .values({
      gameId: body.gameId ?? null,
      tournamentMatchId: body.tournamentMatchId ?? null,
      leagueMatchId: body.leagueMatchId ?? null,
      status: 'pending',
      submittedBy: dbUser.id,
      payload: body,
    })
    .returning();

  try {
    // Submit to DUPR
    const result = await duprService.createMatch({
      matchType: body.matchType,
      team1Players: body.team1Players as { duprId: string }[],
      team2Players: body.team2Players as { duprId: string }[],
      scores: body.scores as { team1Score: number; team2Score: number }[],
      playedAt: body.playedAt,
      clubId: body.clubId,
      eventName: body.eventName,
    });

    // Update submission with DUPR's response
    await db
      .update(duprMatchSubmissions)
      .set({
        duprMatchId: result.matchId,
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(duprMatchSubmissions.id, submission.id));

    return c.json({
      message: 'Match submitted to DUPR successfully',
      submissionId: submission.id,
      duprMatchId: result.matchId,
      status: 'submitted',
    }, 201);
  } catch (error) {
    // Record the failure
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await db
      .update(duprMatchSubmissions)
      .set({
        status: 'failed',
        errorMessage: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(duprMatchSubmissions.id, submission.id));

    throw new HTTPException(502, {
      message: `DUPR match submission failed: ${errorMsg}`,
    });
  }
});

/** PUT /dupr/matches/:id — Update a match on DUPR */
duprRouter.put('/matches/:id', authMiddleware, validateBody(updateMatchSchema), async (c) => {
  const submissionId = c.req.param('id');
  const body = c.req.valid('json');
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);

  const submission = await db.query.duprMatchSubmissions.findFirst({
    where: eq(duprMatchSubmissions.id, submissionId),
  });

  if (!submission || submission.submittedBy !== dbUser.id) {
    throw new HTTPException(404, { message: 'Match submission not found' });
  }

  if (!submission.duprMatchId) {
    throw new HTTPException(400, { message: 'Match has not been submitted to DUPR yet' });
  }

  try {
    await duprService.updateMatch(submission.duprMatchId, {
      scores: body.scores as { team1Score: number; team2Score: number }[] | undefined,
      playedAt: body.playedAt,
    });

    await db
      .update(duprMatchSubmissions)
      .set({ updatedAt: new Date() })
      .where(eq(duprMatchSubmissions.id, submissionId));

    return c.json({ message: 'Match updated on DUPR successfully' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new HTTPException(502, { message: `DUPR match update failed: ${errorMsg}` });
  }
});

/** DELETE /dupr/matches/:id — Delete a match from DUPR */
duprRouter.delete('/matches/:id', authMiddleware, async (c) => {
  const submissionId = c.req.param('id');
  const { userId } = c.get('user');
  const dbUser = await getDbUser(userId);

  const submission = await db.query.duprMatchSubmissions.findFirst({
    where: eq(duprMatchSubmissions.id, submissionId),
  });

  if (!submission || submission.submittedBy !== dbUser.id) {
    throw new HTTPException(404, { message: 'Match submission not found' });
  }

  if (!submission.duprMatchId) {
    throw new HTTPException(400, { message: 'Match has not been submitted to DUPR yet' });
  }

  try {
    await duprService.deleteMatch(submission.duprMatchId);

    await db
      .update(duprMatchSubmissions)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(duprMatchSubmissions.id, submissionId));

    return c.json({ message: 'Match deleted from DUPR successfully' });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new HTTPException(502, { message: `DUPR match deletion failed: ${errorMsg}` });
  }
});

// --------------------------------------------------------------------------
// GET /dupr/sso-url — Return the DUPR SSO iframe URL for the frontend
// --------------------------------------------------------------------------

duprRouter.get('/sso-url', authMiddleware, async (c) => {
  if (!duprService.isConfigured()) {
    throw new HTTPException(503, { message: 'DUPR integration is not configured' });
  }

  return c.json({ url: duprService.getSsoUrl() });
});

// ============================================================================
// UNAUTHENTICATED WEBHOOK ROUTE
// ============================================================================

const duprWebhookRouter = new Hono();

/**
 * POST /dupr/webhook
 * Receives DUPR event callbacks (e.g., LOGIN).
 * Mounted without auth middleware.
 */
duprWebhookRouter.post('/webhook', async (c) => {
  const body = await c.req.json();

  // Optional: verify webhook signature if DUPR_WEBHOOK_SECRET is set
  const webhookSecret = process.env.DUPR_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = c.req.header('x-webhook-signature') || c.req.header('x-signature');
    if (!signature) {
      throw new HTTPException(401, { message: 'Missing webhook signature' });
    }
    // DUPR hasn't documented exact signature scheme; log and validate later
    console.log('DUPR webhook signature received:', signature);
  }

  console.log('DUPR webhook received:', JSON.stringify(body, null, 2));

  const { topic, data } = body;

  if (topic === 'LOGIN') {
    // A user logged in via our SSO integration
    // data.duprId, data.userId etc.
    console.log('DUPR LOGIN webhook for:', data?.duprId);
  }

  return c.json({ received: true });
});

// ============================================================================
// EXPORTS
// ============================================================================

export default duprRouter;
export { duprWebhookRouter };
