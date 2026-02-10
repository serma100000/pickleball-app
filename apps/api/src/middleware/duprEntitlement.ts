import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { users, duprAccounts } = schema;

type EntitlementLevel = 'linked' | 'premium' | 'verified';

/**
 * Middleware to require a DUPR entitlement level.
 * Must be used after authMiddleware.
 *
 * - 'linked'   → user must have a linked DUPR account
 * - 'premium'  → user must have DUPR+ (PREMIUM_L1)
 * - 'verified' → user must have DUPR Verified (VERIFIED_L1)
 */
export function requireDuprEntitlement(level: EntitlementLevel) {
  return async (c: Context, next: Next) => {
    const { userId } = c.get('user');

    // Look up the internal user
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!dbUser) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    // Look up their DUPR account
    const duprAccount = await db.query.duprAccounts.findFirst({
      where: eq(duprAccounts.userId, dbUser.id),
    });

    if (!duprAccount) {
      throw new HTTPException(403, {
        message: 'A linked DUPR account is required',
        cause: { code: 'DUPR_ENTITLEMENT_REQUIRED', required: level },
      });
    }

    if (level === 'premium') {
      if (duprAccount.entitlementLevel !== 'PREMIUM_L1' && duprAccount.entitlementLevel !== 'VERIFIED_L1') {
        throw new HTTPException(403, {
          message: 'DUPR+ (Premium) membership is required',
          cause: { code: 'DUPR_ENTITLEMENT_REQUIRED', required: level, current: duprAccount.entitlementLevel },
        });
      }
    }

    if (level === 'verified') {
      if (duprAccount.entitlementLevel !== 'VERIFIED_L1') {
        throw new HTTPException(403, {
          message: 'DUPR Verified membership is required',
          cause: { code: 'DUPR_ENTITLEMENT_REQUIRED', required: level, current: duprAccount.entitlementLevel },
        });
      }
    }

    await next();
  };
}
