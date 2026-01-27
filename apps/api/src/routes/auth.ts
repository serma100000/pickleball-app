import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { validateBody } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { userService } from '../services/userService.js';
import { revokeAllSessions } from '../lib/clerk.js';

const auth = new Hono();

// Validation schemas
const registerSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
});

const loginSchema = z.object({
  // Login is handled by Clerk on the frontend
  // This endpoint just syncs user data
  clerkId: z.string().min(1),
});

// Sync schema for Clerk webhook or client-side sync
const syncSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * POST /auth/sync
 * Sync user from Clerk to database (upsert)
 * Called when user signs up or updates their profile in Clerk
 * Requires authentication to ensure the clerkId matches the authenticated user
 */
auth.post('/sync', authMiddleware, validateBody(syncSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const { userId: authenticatedClerkId } = c.get('user');

    // Verify the clerkId in the request matches the authenticated user
    if (data.clerkId !== authenticatedClerkId) {
      throw new HTTPException(403, {
        message: 'Cannot sync data for another user',
      });
    }

    // Check if user exists to determine if this is new or update
    const existingUser = await userService.getByClerkId(data.clerkId);
    const isNewUser = !existingUser;

    // Sync user (creates or updates)
    const user = await userService.syncFromClerk({
      clerkId: data.clerkId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
    });

    if (!user) {
      throw new HTTPException(500, {
        message: 'Failed to sync user',
      });
    }

    // Log activity for new users
    if (isNewUser) {
      await userService.logActivity(user.id, 'user_synced_from_clerk');
    }

    return c.json({
      message: isNewUser ? 'User created successfully' : 'User updated successfully',
      user: {
        id: user.id,
        clerkId: user.clerkId,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        skillLevel: user.skillLevel,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      isNewUser,
    });
  } catch (error) {
    // Re-throw HTTPExceptions as-is (e.g., 403 for wrong user)
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Error syncing user:', error);
    // Include error details in development
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to sync user'
      : `Failed to sync user: ${(error as Error).message}`;
    throw new HTTPException(500, {
      message: errorMessage,
    });
  }
});

/**
 * POST /auth/register
 * Register a new user (called after Clerk signup)
 * Requires authentication to ensure the clerkId matches the authenticated user
 */
auth.post('/register', authMiddleware, validateBody(registerSchema), async (c) => {
  const data = c.req.valid('json');
  const { userId: authenticatedClerkId } = c.get('user');

  // Verify the clerkId in the request matches the authenticated user
  if (data.clerkId !== authenticatedClerkId) {
    throw new HTTPException(403, {
      message: 'Cannot register as another user',
    });
  }

  // Check if user already exists
  const existing = await userService.getByClerkId(data.clerkId);
  if (existing) {
    throw new HTTPException(409, {
      message: 'User already registered',
    });
  }

  // Check username availability
  const usernameExists = await userService.getByUsername(data.username);
  if (usernameExists) {
    throw new HTTPException(409, {
      message: 'Username already taken',
    });
  }

  // Create user in database
  const user = await userService.create({
    clerkId: data.clerkId,
    email: data.email,
    username: data.username,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
  });

  // Log activity
  await userService.logActivity(user.id, 'user_registered');

  return c.json(
    {
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        skillLevel: user.skillLevel,
        rating: user.rating,
        createdAt: user.createdAt,
      },
    },
    201
  );
});

/**
 * POST /auth/login
 * Sync user data on login (called after Clerk login)
 * Requires authentication to ensure the clerkId matches the authenticated user
 */
auth.post('/login', authMiddleware, validateBody(loginSchema), async (c) => {
  const { clerkId } = c.req.valid('json');
  const { userId: authenticatedClerkId } = c.get('user');

  // Verify the clerkId in the request matches the authenticated user
  if (clerkId !== authenticatedClerkId) {
    throw new HTTPException(403, {
      message: 'Cannot login as another user',
    });
  }

  // Get user from database
  const user = await userService.getByClerkId(clerkId);
  if (!user) {
    throw new HTTPException(404, {
      message: 'User not found. Please register first.',
    });
  }

  // Update last active
  await userService.updateLastActive(user.id);

  // Log activity
  await userService.logActivity(user.id, 'user_login');

  return c.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      skillLevel: user.skillLevel,
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
  });
});

/**
 * POST /auth/logout
 * Logout user (revoke sessions)
 */
auth.post('/logout', authMiddleware, async (c) => {
  const { userId } = c.get('user');

  const dbUser = await userService.getByClerkId(userId);
  if (dbUser) {
    await userService.logActivity(dbUser.id, 'user_logout');
  }

  // Revoke all Clerk sessions
  await revokeAllSessions(userId);

  return c.json({
    message: 'Logged out successfully',
  });
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
auth.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user');

  const user = await userService.getByClerkId(userId);
  if (!user) {
    throw new HTTPException(404, {
      message: 'User not found',
    });
  }

  // Update last active
  await userService.updateLastActive(user.id);

  // Get additional stats
  const stats = await userService.getStats(user.id);

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      skillLevel: user.skillLevel,
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      preferredPlayStyle: user.preferredPlayStyle,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    stats,
  });
});

/**
 * GET /auth/check-username/:username
 * Check if username is available
 */
auth.get('/check-username/:username', async (c) => {
  const username = c.req.param('username');

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return c.json({
      available: false,
      message: 'Invalid username format',
    });
  }

  const existing = await userService.getByUsername(username);

  return c.json({
    available: !existing,
    message: existing ? 'Username already taken' : 'Username available',
  });
});

export default auth;
