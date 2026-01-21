import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery, validateParams, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { notificationService } from '../services/notificationService.js';
import { userService } from '../services/userService.js';
import { emitToUser, SocketEvents } from '../lib/socket.js';

const { friendships, users, notifications, activityFeed } = schema;

const socialRouter = new Hono();

// Validation schemas
const friendRequestSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * GET /friends
 * List user's friends
 */
socialRouter.get('/friends', authMiddleware, validateQuery(paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const { userId } = c.get('user');
  const offset = (page - 1) * limit;

  // Get user from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    throw new HTTPException(401, {
      message: 'User not found',
    });
  }

  // Get accepted friendships where user is either requester or addressee
  const friendshipRecords = await db.query.friendships.findMany({
    where: and(
      or(
        eq(friendships.requesterId, dbUser.id),
        eq(friendships.addresseeId, dbUser.id)
      ),
      eq(friendships.status, 'accepted')
    ),
    with: {
      requester: true,
      addressee: true,
    },
    limit,
    offset,
  });

  // Extract friend data
  const friends = friendshipRecords.map((f) => {
    const friend = f.requesterId === dbUser.id ? f.addressee : f.requester;
    return {
      id: friend.id,
      username: friend.username,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl,
      skillLevel: friend.skillLevel,
      rating: friend.rating,
      lastActiveAt: friend.lastActiveAt,
      friendsSince: f.updatedAt,
    };
  });

  return c.json({
    friends,
    pagination: {
      page,
      limit,
      hasMore: friends.length === limit,
    },
  });
});

/**
 * GET /friends/requests
 * Get pending friend requests
 */
socialRouter.get('/friends/requests', authMiddleware, async (c) => {
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

  // Get pending requests where user is the addressee
  const pendingRequests = await db.query.friendships.findMany({
    where: and(
      eq(friendships.addresseeId, dbUser.id),
      eq(friendships.status, 'pending')
    ),
    with: {
      requester: true,
    },
    orderBy: desc(friendships.createdAt),
  });

  return c.json({
    requests: pendingRequests.map((r) => ({
      id: r.id,
      from: {
        id: r.requester.id,
        username: r.requester.username,
        displayName: r.requester.displayName,
        avatarUrl: r.requester.avatarUrl,
        skillLevel: r.requester.skillLevel,
      },
      createdAt: r.createdAt,
    })),
  });
});

/**
 * POST /friends/request
 * Send a friend request
 */
socialRouter.post(
  '/friends/request',
  authMiddleware,
  validateBody(friendRequestSchema),
  async (c) => {
    const { userId: targetUserId } = c.req.valid('json');
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

    // Can't friend yourself
    if (dbUser.id === targetUserId) {
      throw new HTTPException(400, {
        message: 'Cannot send friend request to yourself',
      });
    }

    // Check if target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    // Check for existing friendship or request
    const existing = await db.query.friendships.findFirst({
      where: or(
        and(
          eq(friendships.requesterId, dbUser.id),
          eq(friendships.addresseeId, targetUserId)
        ),
        and(
          eq(friendships.requesterId, targetUserId),
          eq(friendships.addresseeId, dbUser.id)
        )
      ),
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new HTTPException(409, {
          message: 'Already friends with this user',
        });
      }
      if (existing.status === 'pending') {
        throw new HTTPException(409, {
          message: 'Friend request already pending',
        });
      }
      if (existing.status === 'blocked') {
        throw new HTTPException(403, {
          message: 'Cannot send friend request to this user',
        });
      }
    }

    // Create friend request
    const [request] = await db
      .insert(friendships)
      .values({
        requesterId: dbUser.id,
        addresseeId: targetUserId,
        status: 'pending',
      })
      .returning();

    // Send notification
    await notificationService.create({
      userId: targetUserId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${dbUser.displayName} wants to be your friend`,
      data: { requestId: request.id, fromUserId: dbUser.id },
    });

    // Emit real-time event
    emitToUser(targetUserId, SocketEvents.FRIEND_REQUEST, {
      from: {
        id: dbUser.id,
        username: dbUser.username,
        displayName: dbUser.displayName,
      },
    });

    return c.json(
      {
        message: 'Friend request sent',
        requestId: request.id,
      },
      201
    );
  }
);

/**
 * POST /friends/:id/accept
 * Accept a friend request
 */
socialRouter.post(
  '/friends/:id/accept',
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

    // Find the request (id is the friendship id)
    const request = await db.query.friendships.findFirst({
      where: and(
        eq(friendships.id, id),
        eq(friendships.addresseeId, dbUser.id),
        eq(friendships.status, 'pending')
      ),
      with: {
        requester: true,
      },
    });

    if (!request) {
      throw new HTTPException(404, {
        message: 'Friend request not found',
      });
    }

    // Accept the request
    await db
      .update(friendships)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
      })
      .where(eq(friendships.id, id));

    // Notify the requester
    await notificationService.create({
      userId: request.requesterId,
      type: 'friend_request',
      title: 'Friend Request Accepted',
      message: `${dbUser.displayName} accepted your friend request`,
      data: { friendId: dbUser.id },
    });

    // Emit real-time event
    emitToUser(request.requesterId, SocketEvents.FRIEND_ACCEPTED, {
      friend: {
        id: dbUser.id,
        username: dbUser.username,
        displayName: dbUser.displayName,
      },
    });

    // Log activity
    await userService.logActivity(dbUser.id, 'friend_added', 'user', request.requesterId);

    return c.json({
      message: 'Friend request accepted',
    });
  }
);

/**
 * DELETE /friends/:id
 * Remove a friend or reject/cancel request
 */
socialRouter.delete(
  '/friends/:id',
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

    // Find the friendship (id can be friendship id or friend's user id)
    let friendship = await db.query.friendships.findFirst({
      where: eq(friendships.id, id),
    });

    // If not found by friendship id, try finding by friend's user id
    if (!friendship) {
      friendship = await db.query.friendships.findFirst({
        where: or(
          and(
            eq(friendships.requesterId, dbUser.id),
            eq(friendships.addresseeId, id)
          ),
          and(
            eq(friendships.requesterId, id),
            eq(friendships.addresseeId, dbUser.id)
          )
        ),
      });
    }

    if (!friendship) {
      throw new HTTPException(404, {
        message: 'Friendship not found',
      });
    }

    // Verify user is part of the friendship
    if (friendship.requesterId !== dbUser.id && friendship.addresseeId !== dbUser.id) {
      throw new HTTPException(403, {
        message: 'Not authorized to remove this friendship',
      });
    }

    // Delete the friendship
    await db.delete(friendships).where(eq(friendships.id, friendship.id));

    return c.json({
      message: 'Friend removed',
    });
  }
);

/**
 * GET /feed
 * Get activity feed
 */
socialRouter.get('/feed', authMiddleware, validateQuery(paginationSchema), async (c) => {
  const { page, limit } = c.req.valid('query');
  const { userId } = c.get('user');
  const offset = (page - 1) * limit;

  // Get user from database
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!dbUser) {
    throw new HTTPException(401, {
      message: 'User not found',
    });
  }

  // Get friend IDs
  const friendshipRecords = await db.query.friendships.findMany({
    where: and(
      or(
        eq(friendships.requesterId, dbUser.id),
        eq(friendships.addresseeId, dbUser.id)
      ),
      eq(friendships.status, 'accepted')
    ),
  });

  const friendIds = friendshipRecords.map((f) =>
    f.requesterId === dbUser.id ? f.addresseeId : f.requesterId
  );

  // Include user's own ID for their activities
  const relevantUserIds = [dbUser.id, ...friendIds];

  // Get activity feed
  const activities = await db.query.activityFeed.findMany({
    where: sql`${activityFeed.userId} = ANY(${relevantUserIds})`,
    with: {
      user: true,
    },
    orderBy: desc(activityFeed.createdAt),
    limit,
    offset,
  });

  return c.json({
    feed: activities.map((a) => ({
      id: a.id,
      type: a.activityType,
      entityType: a.entityType,
      entityId: a.entityId,
      data: a.data,
      user: {
        id: a.user.id,
        username: a.user.username,
        displayName: a.user.displayName,
        avatarUrl: a.user.avatarUrl,
      },
      createdAt: a.createdAt,
    })),
    pagination: {
      page,
      limit,
      hasMore: activities.length === limit,
    },
  });
});

/**
 * GET /notifications
 * Get user notifications
 */
socialRouter.get(
  '/notifications',
  authMiddleware,
  validateQuery(
    paginationSchema.extend({
      unreadOnly: z.coerce.boolean().default(false),
    })
  ),
  async (c) => {
    const { page, limit, unreadOnly } = c.req.valid('query');
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

    const result = await notificationService.getForUser(dbUser.id, page, limit, unreadOnly);

    return c.json({
      notifications: result.items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      unreadCount: await notificationService.getUnreadCount(dbUser.id),
      pagination: {
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        total: result.total,
      },
    });
  }
);

/**
 * PATCH /notifications/:id/read
 * Mark notification as read
 */
socialRouter.patch(
  '/notifications/:id/read',
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

    const notification = await notificationService.markAsRead(id, dbUser.id);

    if (!notification) {
      throw new HTTPException(404, {
        message: 'Notification not found',
      });
    }

    return c.json({
      message: 'Notification marked as read',
    });
  }
);

/**
 * POST /notifications/read-all
 * Mark all notifications as read
 */
socialRouter.post('/notifications/read-all', authMiddleware, async (c) => {
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

  await notificationService.markAllAsRead(dbUser.id);

  return c.json({
    message: 'All notifications marked as read',
  });
});

export default socialRouter;
