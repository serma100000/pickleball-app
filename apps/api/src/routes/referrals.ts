import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { notificationService } from '../services/notificationService.js';

const { referralCodes, referralConversions, users } = schema;

const referralsRouter = new Hono();

// Constants for referral rewards
const REWARD_MILESTONES = {
  FIRST_REFERRAL: { count: 1, reward: 'CREDIT_5', description: '$5 account credit' },
  FIVE_REFERRALS: { count: 5, reward: 'DISCOUNT_50_PERCENT', description: '50% off next entry' },
  TEN_REFERRALS: { count: 10, reward: 'FREE_ENTRY', description: 'Free event entry' },
};

/**
 * Generate a unique 8-character alphanumeric code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check and award rewards based on referral count
 */
async function checkAndAwardRewards(
  userId: string,
  referralCodeId: string,
  successfulReferrals: number
): Promise<{ rewardAwarded: boolean; reward?: string; description?: string }> {
  // Check milestones in reverse order to award the highest applicable
  const milestones = Object.values(REWARD_MILESTONES).sort((a, b) => b.count - a.count);

  for (const milestone of milestones) {
    if (successfulReferrals === milestone.count) {
      // Award the reward (in a real system, this would integrate with payment/rewards service)
      await notificationService.create({
        userId,
        type: 'achievement',
        title: 'Referral Reward Earned!',
        message: `Congratulations! You've earned ${milestone.description} for reaching ${milestone.count} successful referral${milestone.count > 1 ? 's' : ''}!`,
        data: {
          reward: milestone.reward,
          referralCount: milestone.count,
          referralCodeId
        },
      });

      return {
        rewardAwarded: true,
        reward: milestone.reward,
        description: milestone.description,
      };
    }
  }

  return { rewardAwarded: false };
}

// Validation schemas
const trackReferralSchema = z.object({
  referralCode: z.string().min(1).max(20),
  eventId: z.string().uuid().optional(),
  eventType: z.enum(['tournament', 'league', 'general']).optional(),
});

const convertReferralSchema = z.object({
  referralCode: z.string().min(1).max(20),
  conversionType: z.enum(['signup', 'registration', 'purchase']),
  eventId: z.string().uuid().optional(),
});

const referralCodeQuerySchema = z.object({
  eventType: z.enum(['tournament', 'league', 'general']).optional(),
  eventId: z.string().uuid().optional(),
});

/**
 * GET /code
 * Get or create user's referral code
 */
referralsRouter.get('/code', authMiddleware, validateQuery(referralCodeQuerySchema), async (c) => {
  const { userId } = c.get('user');
  const { eventType, eventId } = c.req.valid('query');

  // Get user from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    throw new HTTPException(401, {
      message: 'User not found',
    });
  }

  // Try to find existing referral code
  let existingCode = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.userId, dbUser.id),
      eventType ? eq(referralCodes.eventType, eventType) : eq(referralCodes.eventType, 'general'),
      eventId ? eq(referralCodes.eventId, eventId) : sql`${referralCodes.eventId} IS NULL`
    ),
  });

  if (!existingCode) {
    // Generate a unique code
    let code = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const codeExists = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, code),
      });

      if (!codeExists) break;
      code = generateReferralCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new HTTPException(500, {
        message: 'Failed to generate unique referral code',
      });
    }

    // Create new referral code
    const [newCode] = await db
      .insert(referralCodes)
      .values({
        userId: dbUser.id,
        code,
        eventType: eventType || 'general',
        eventId: eventId || null,
        usesCount: 0,
        isActive: true,
      })
      .returning();

    existingCode = newCode;
  }

  // Build shareable URL
  const baseUrl = process.env.FRONTEND_URL || 'https://paddle-up.app';
  let shareableUrl = `${baseUrl}?ref=${existingCode.code}`;

  if (eventType === 'tournament' && eventId) {
    shareableUrl = `${baseUrl}/tournaments/${eventId}?ref=${existingCode.code}`;
  } else if (eventType === 'league' && eventId) {
    shareableUrl = `${baseUrl}/leagues/${eventId}?ref=${existingCode.code}`;
  }

  return c.json({
    code: existingCode.code,
    shareableUrl,
    usesCount: existingCode.usesCount,
    isActive: existingCode.isActive,
    createdAt: existingCode.createdAt,
  });
});

/**
 * GET /stats
 * Get referral statistics for the authenticated user
 */
referralsRouter.get('/stats', authMiddleware, async (c) => {
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

  // Get all referral codes for this user
  const userCodes = await db.query.referralCodes.findMany({
    where: eq(referralCodes.userId, dbUser.id),
    with: {
      conversions: {
        with: {
          referredUser: {
            columns: {
              id: true,
              displayName: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: desc(referralConversions.createdAt),
      },
    },
  });

  // Calculate stats
  let totalViews = 0;
  let totalSignups = 0;
  let totalRegistrations = 0;
  let totalPurchases = 0;
  const recentConversions: Array<{
    type: string;
    user: { displayName: string | null; avatarUrl: string | null };
    createdAt: Date;
    eventId?: string;
  }> = [];

  for (const code of userCodes) {
    totalViews += code.usesCount;
    for (const conversion of code.conversions) {
      if (conversion.conversionType === 'signup') totalSignups++;
      else if (conversion.conversionType === 'registration') totalRegistrations++;
      else if (conversion.conversionType === 'purchase') totalPurchases++;

      recentConversions.push({
        type: conversion.conversionType,
        user: {
          displayName: conversion.referredUser.displayName,
          avatarUrl: conversion.referredUser.avatarUrl,
        },
        createdAt: conversion.createdAt,
        eventId: conversion.eventId || undefined,
      });
    }
  }

  // Sort and limit recent conversions
  recentConversions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const limitedConversions = recentConversions.slice(0, 10);

  // Calculate rewards progress
  const successfulConversions = totalSignups + totalRegistrations + totalPurchases;
  const rewards = {
    earned: [] as Array<{ reward: string; description: string; earnedAt?: string }>,
    nextMilestone: null as { count: number; reward: string; description: string; progress: number } | null,
  };

  // Determine earned rewards and next milestone
  const sortedMilestones = Object.values(REWARD_MILESTONES).sort((a, b) => a.count - b.count);
  for (const milestone of sortedMilestones) {
    if (successfulConversions >= milestone.count) {
      rewards.earned.push({
        reward: milestone.reward,
        description: milestone.description,
      });
    } else if (!rewards.nextMilestone) {
      rewards.nextMilestone = {
        count: milestone.count,
        reward: milestone.reward,
        description: milestone.description,
        progress: Math.round((successfulConversions / milestone.count) * 100),
      };
    }
  }

  return c.json({
    totalViews,
    totalSignups,
    totalRegistrations,
    totalPurchases,
    successfulConversions,
    recentConversions: limitedConversions,
    rewards,
    codes: userCodes.map((code) => ({
      code: code.code,
      eventType: code.eventType,
      eventId: code.eventId,
      usesCount: code.usesCount,
      isActive: code.isActive,
      createdAt: code.createdAt,
    })),
  });
});

/**
 * POST /track
 * Track a referral visit (anonymous, no auth required)
 */
referralsRouter.post('/track', validateBody(trackReferralSchema), async (c) => {
  const { referralCode, eventId, eventType } = c.req.valid('json');

  // Find the referral code
  const code = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.code, referralCode),
      eq(referralCodes.isActive, true)
    ),
  });

  if (!code) {
    // Don't reveal if code exists or not for security
    return c.json({ tracked: false });
  }

  // Check if max uses reached
  if (code.maxUses && code.usesCount >= code.maxUses) {
    return c.json({ tracked: false });
  }

  // Increment uses count
  await db
    .update(referralCodes)
    .set({
      usesCount: code.usesCount + 1,
    })
    .where(eq(referralCodes.id, code.id));

  return c.json({
    tracked: true,
    eventType: eventType || code.eventType,
    eventId: eventId || code.eventId,
  });
});

/**
 * POST /convert
 * Convert a referral to a registration/signup
 * Called when a referred user completes an action
 */
referralsRouter.post(
  '/convert',
  authMiddleware,
  validateBody(convertReferralSchema),
  async (c) => {
    const { referralCode, conversionType, eventId } = c.req.valid('json');
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

    // Find the referral code
    const code = await db.query.referralCodes.findFirst({
      where: and(
        eq(referralCodes.code, referralCode),
        eq(referralCodes.isActive, true)
      ),
      with: {
        user: true,
      },
    });

    if (!code) {
      throw new HTTPException(404, {
        message: 'Invalid referral code',
      });
    }

    // Prevent self-referral
    if (code.userId === dbUser.id) {
      throw new HTTPException(400, {
        message: 'Cannot use your own referral code',
      });
    }

    // Check if this user already has a conversion for this referral code
    const existingConversion = await db.query.referralConversions.findFirst({
      where: and(
        eq(referralConversions.referralCodeId, code.id),
        eq(referralConversions.referredUserId, dbUser.id)
      ),
    });

    if (existingConversion) {
      // User already converted with this code
      return c.json({
        converted: false,
        message: 'Already converted with this referral code',
      });
    }

    // Create conversion record
    const [conversion] = await db
      .insert(referralConversions)
      .values({
        referralCodeId: code.id,
        referredUserId: dbUser.id,
        conversionType,
        eventId: eventId || null,
        rewardApplied: false,
      })
      .returning();

    // Get updated conversion count for this referral code
    const [countResult] = await db
      .select({ count: count() })
      .from(referralConversions)
      .where(eq(referralConversions.referralCodeId, code.id));

    const successfulReferrals = countResult?.count || 0;

    // Check and award rewards
    const rewardResult = await checkAndAwardRewards(
      code.userId,
      code.id,
      successfulReferrals
    );

    // Notify the referrer
    await notificationService.create({
      userId: code.userId,
      type: 'system',
      title: 'Referral Conversion!',
      message: `${dbUser.displayName || 'Someone'} just ${conversionType === 'signup' ? 'signed up' : conversionType === 'registration' ? 'registered' : 'made a purchase'} using your referral link!`,
      data: {
        conversionId: conversion.id,
        conversionType,
        referredUserId: dbUser.id,
        ...rewardResult,
      },
    });

    return c.json({
      converted: true,
      conversionId: conversion.id,
      ...rewardResult,
    });
  }
);

/**
 * GET /validate/:code
 * Validate a referral code (public endpoint)
 */
referralsRouter.get('/validate/:code', async (c) => {
  const code = c.req.param('code');

  const referral = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.code, code),
      eq(referralCodes.isActive, true)
    ),
    with: {
      user: {
        columns: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!referral) {
    return c.json({ valid: false });
  }

  // Check if max uses reached
  if (referral.maxUses && referral.usesCount >= referral.maxUses) {
    return c.json({ valid: false });
  }

  return c.json({
    valid: true,
    referrer: {
      displayName: referral.user.displayName,
      avatarUrl: referral.user.avatarUrl,
    },
    eventType: referral.eventType,
    eventId: referral.eventId,
  });
});

export default referralsRouter;
