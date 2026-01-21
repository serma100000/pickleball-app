import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyToken } from '@clerk/backend';

export interface AuthUser {
  userId: string;
  sessionId: string;
  claims: Record<string, unknown>;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

/**
 * Authentication middleware using Clerk JWT verification
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, {
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!verifiedToken) {
      throw new HTTPException(401, {
        message: 'Invalid token',
      });
    }

    const user: AuthUser = {
      userId: verifiedToken.sub,
      sessionId: verifiedToken.sid || '',
      claims: verifiedToken as unknown as Record<string, unknown>,
    };

    c.set('user', user);
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(401, {
      message: 'Token verification failed',
    });
  }
}

/**
 * Optional authentication - sets user if token present, continues otherwise
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (verifiedToken) {
      const user: AuthUser = {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid || '',
        claims: verifiedToken as unknown as Record<string, unknown>,
      };
      c.set('user', user);
    }
  } catch {
    // Token invalid, continue without user
  }

  await next();
}

/**
 * Require specific roles/permissions
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      });
    }

    const userRoles = (user.claims.roles as string[]) || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions',
      });
    }

    await next();
  };
}

/**
 * Ensure user can only access their own resources
 */
export function requireOwnership(paramName: string = 'id') {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const resourceId = c.req.param(paramName);

    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      });
    }

    if (user.userId !== resourceId) {
      // Check if user is admin
      const userRoles = (user.claims.roles as string[]) || [];
      if (!userRoles.includes('admin')) {
        throw new HTTPException(403, {
          message: 'You can only access your own resources',
        });
      }
    }

    await next();
  };
}
