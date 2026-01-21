import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { validateBody, validateQuery, validateParams, idParamSchema, paginationSchema } from '../middleware/validation.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { notificationService } from '../services/notificationService.js';
import { userService } from '../services/userService.js';
import { emitToClub, SocketEvents } from '../lib/socket.js';
import { cache } from '../lib/redis.js';

const { clubs, clubMembers, clubEvents, users } = schema;

const clubsRouter = new Hono();

// Validation schemas
const createClubSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().int().positive().max(10000).optional(),
});

const updateClubSchema = createClubSchema.partial();

const searchClubsSchema = paginationSchema.extend({
  q: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
});

const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  courtId: z.string().uuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  maxParticipants: z.number().int().positive().max(1000).optional(),
});

/**
 * GET /clubs
 * List clubs with optional search
 */
clubsRouter.get('/', validateQuery(searchClubsSchema), async (c) => {
  const { q, city, page, limit } = c.req.valid('query');
  const offset = (page - 1) * limit;

  const conditions = [];

  if (q) {
    conditions.push(like(clubs.name, `%${q}%`));
  }

  if (city) {
    conditions.push(like(clubs.city, `%${city}%`));
  }

  const results = await db
    .select()
    .from(clubs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clubs.memberCount))
    .limit(limit)
    .offset(offset);

  return c.json({
    clubs: results.map((club) => ({
      id: club.id,
      name: club.name,
      description: club.description,
      logoUrl: club.logoUrl,
      city: club.city,
      state: club.state,
      country: club.country,
      isPrivate: club.isPrivate,
      memberCount: club.memberCount,
      createdAt: club.createdAt,
    })),
    pagination: {
      page,
      limit,
      hasMore: results.length === limit,
    },
  });
});

/**
 * POST /clubs
 * Create a new club
 */
clubsRouter.post('/', authMiddleware, validateBody(createClubSchema), async (c) => {
  const data = c.req.valid('json');
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

  // Create club
  const [club] = await db
    .insert(clubs)
    .values({
      ...data,
      memberCount: 1,
      createdById: dbUser.id,
    })
    .returning();

  // Add creator as owner
  await db.insert(clubMembers).values({
    clubId: club.id,
    userId: dbUser.id,
    role: 'owner',
  });

  // Log activity
  await userService.logActivity(dbUser.id, 'club_created', 'club', club.id);

  return c.json(
    {
      message: 'Club created successfully',
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        isPrivate: club.isPrivate,
        createdAt: club.createdAt,
      },
    },
    201
  );
});

/**
 * GET /clubs/:id
 * Get club details
 */
clubsRouter.get('/:id', validateParams(idParamSchema), optionalAuth, async (c) => {
  const { id } = c.req.valid('param');

  const cacheKey = `club:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return c.json({ club: cached });
  }

  const club = await db.query.clubs.findFirst({
    where: eq(clubs.id, id),
    with: {
      createdBy: true,
    },
  });

  if (!club) {
    throw new HTTPException(404, {
      message: 'Club not found',
    });
  }

  const result = {
    id: club.id,
    name: club.name,
    description: club.description,
    logoUrl: club.logoUrl,
    coverImageUrl: club.coverImageUrl,
    city: club.city,
    state: club.state,
    country: club.country,
    isPrivate: club.isPrivate,
    memberCount: club.memberCount,
    maxMembers: club.maxMembers,
    createdBy: {
      id: club.createdBy.id,
      username: club.createdBy.username,
      displayName: club.createdBy.displayName,
      avatarUrl: club.createdBy.avatarUrl,
    },
    createdAt: club.createdAt,
  };

  await cache.set(cacheKey, result, 300);

  return c.json({ club: result });
});

/**
 * PATCH /clubs/:id
 * Update club
 */
clubsRouter.patch(
  '/:id',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(updateClubSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const updates = c.req.valid('json');
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

    // Check if user is admin/owner
    const membership = await db.query.clubMembers.findFirst({
      where: and(
        eq(clubMembers.clubId, id),
        eq(clubMembers.userId, dbUser.id)
      ),
    });

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      throw new HTTPException(403, {
        message: 'Only club admins can update the club',
      });
    }

    const [club] = await db
      .update(clubs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(clubs.id, id))
      .returning();

    await cache.del(`club:${id}`);

    return c.json({
      message: 'Club updated',
      club,
    });
  }
);

/**
 * POST /clubs/:id/join
 * Join a club
 */
clubsRouter.post(
  '/:id/join',
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

    const club = await db.query.clubs.findFirst({
      where: eq(clubs.id, id),
    });

    if (!club) {
      throw new HTTPException(404, {
        message: 'Club not found',
      });
    }

    // Check if already a member
    const existingMembership = await db.query.clubMembers.findFirst({
      where: and(
        eq(clubMembers.clubId, id),
        eq(clubMembers.userId, dbUser.id)
      ),
    });

    if (existingMembership) {
      throw new HTTPException(409, {
        message: 'Already a member of this club',
      });
    }

    // Check max members
    if (club.maxMembers && club.memberCount && club.memberCount >= club.maxMembers) {
      throw new HTTPException(400, {
        message: 'Club is full',
      });
    }

    // If private, would need invitation system
    if (club.isPrivate) {
      throw new HTTPException(403, {
        message: 'This is a private club. Request an invitation.',
      });
    }

    // Add member
    await db.insert(clubMembers).values({
      clubId: id,
      userId: dbUser.id,
      role: 'member',
    });

    // Update member count
    await db
      .update(clubs)
      .set({
        memberCount: sql`${clubs.memberCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(clubs.id, id));

    // Emit event
    emitToClub(id, SocketEvents.CLUB_MEMBER_JOINED, {
      userId: dbUser.id,
      username: dbUser.username,
    });

    await cache.del(`club:${id}`);

    // Log activity
    await userService.logActivity(dbUser.id, 'club_joined', 'club', id);

    return c.json({
      message: 'Joined club successfully',
    });
  }
);

/**
 * DELETE /clubs/:id/leave
 * Leave a club
 */
clubsRouter.delete(
  '/:id/leave',
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

    const membership = await db.query.clubMembers.findFirst({
      where: and(
        eq(clubMembers.clubId, id),
        eq(clubMembers.userId, dbUser.id)
      ),
    });

    if (!membership) {
      throw new HTTPException(404, {
        message: 'Not a member of this club',
      });
    }

    // Owners can't leave (must transfer ownership first)
    if (membership.role === 'owner') {
      throw new HTTPException(400, {
        message: 'Owners cannot leave. Transfer ownership first.',
      });
    }

    // Remove membership
    await db
      .delete(clubMembers)
      .where(
        and(
          eq(clubMembers.clubId, id),
          eq(clubMembers.userId, dbUser.id)
        )
      );

    // Update member count
    await db
      .update(clubs)
      .set({
        memberCount: sql`${clubs.memberCount} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(clubs.id, id));

    // Emit event
    emitToClub(id, SocketEvents.CLUB_MEMBER_LEFT, {
      userId: dbUser.id,
    });

    await cache.del(`club:${id}`);

    return c.json({
      message: 'Left club successfully',
    });
  }
);

/**
 * GET /clubs/:id/members
 * List club members
 */
clubsRouter.get(
  '/:id/members',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const members = await db.query.clubMembers.findMany({
      where: eq(clubMembers.clubId, id),
      with: {
        user: true,
      },
      limit,
      offset,
    });

    return c.json({
      members: members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        skillLevel: m.user.skillLevel,
        rating: m.user.rating,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      pagination: {
        page,
        limit,
        hasMore: members.length === limit,
      },
    });
  }
);

/**
 * GET /clubs/:id/events
 * List club events
 */
clubsRouter.get(
  '/:id/events',
  validateParams(idParamSchema),
  validateQuery(paginationSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const { page, limit } = c.req.valid('query');
    const offset = (page - 1) * limit;

    const events = await db.query.clubEvents.findMany({
      where: eq(clubEvents.clubId, id),
      with: {
        createdBy: true,
        court: true,
      },
      orderBy: desc(clubEvents.startTime),
      limit,
      offset,
    });

    return c.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: e.startTime,
        endTime: e.endTime,
        maxParticipants: e.maxParticipants,
        currentParticipants: e.currentParticipants,
        court: e.court
          ? {
              id: e.court.id,
              name: e.court.name,
              city: e.court.city,
            }
          : null,
        createdBy: {
          id: e.createdBy.id,
          username: e.createdBy.username,
          displayName: e.createdBy.displayName,
        },
        createdAt: e.createdAt,
      })),
      pagination: {
        page,
        limit,
        hasMore: events.length === limit,
      },
    });
  }
);

/**
 * POST /clubs/:id/events
 * Create a club event
 */
clubsRouter.post(
  '/:id/events',
  authMiddleware,
  validateParams(idParamSchema),
  validateBody(createEventSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
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

    // Check if user is a member
    const membership = await db.query.clubMembers.findFirst({
      where: and(
        eq(clubMembers.clubId, id),
        eq(clubMembers.userId, dbUser.id)
      ),
    });

    if (!membership) {
      throw new HTTPException(403, {
        message: 'Only club members can create events',
      });
    }

    const [event] = await db
      .insert(clubEvents)
      .values({
        clubId: id,
        title: data.title,
        description: data.description,
        courtId: data.courtId,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        maxParticipants: data.maxParticipants,
        createdById: dbUser.id,
      })
      .returning();

    // Emit event notification
    emitToClub(id, SocketEvents.CLUB_EVENT_CREATED, {
      eventId: event.id,
      title: event.title,
    });

    return c.json(
      {
        message: 'Event created',
        event: {
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          createdAt: event.createdAt,
        },
      },
      201
    );
  }
);

export default clubsRouter;
