import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import {
  validateBody,
  validateParams,
} from '../middleware/validation.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { db, schema } from '../db/index.js';
import { nanoid } from 'nanoid';

const {
  users,
  teamInvites,
  tournaments,
  leagues,
  tournamentRegistrations,
  tournamentRegistrationPlayers,
  leagueParticipants,
  leagueParticipantPlayers,
  leagueSeasons,
  notifications,
  userRatings,
} = schema;

const invitesRouter = new Hono();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createInviteSchema = z.object({
  tournamentId: z.string().uuid().optional(),
  leagueId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  inviteeEmail: z.string().email().optional(),
  inviteeUserId: z.string().uuid().optional(),
  teamName: z.string().min(1).max(100).optional(),
  message: z.string().max(500).optional(),
}).refine(
  (data) => data.inviteeEmail || data.inviteeUserId,
  { message: 'Either inviteeEmail or inviteeUserId is required' }
).refine(
  (data) => data.tournamentId || data.leagueId,
  { message: 'Either tournamentId or leagueId is required' }
);

const codeParamSchema = z.object({
  code: z.string().min(6).max(50),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getDbUser(clerkId: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!dbUser) {
    throw new HTTPException(401, { message: 'User not found' });
  }

  return dbUser;
}

function generateInviteCode(): string {
  return nanoid(12);
}

// ============================================================================
// INVITE ENDPOINTS
// ============================================================================

/**
 * POST /invites
 * Create team invitation
 */
invitesRouter.post('/', authMiddleware, validateBody(createInviteSchema), async (c) => {
  const data = c.req.valid('json');
  const { userId } = c.get('user');

  const dbUser = await getDbUser(userId);

  // Find the invitee user if email provided
  let inviteeUser = null;
  if (data.inviteeUserId) {
    inviteeUser = await db.query.users.findFirst({
      where: eq(users.id, data.inviteeUserId),
    });
    if (!inviteeUser) {
      throw new HTTPException(404, { message: 'Invitee user not found' });
    }
  } else if (data.inviteeEmail) {
    inviteeUser = await db.query.users.findFirst({
      where: eq(users.email, data.inviteeEmail),
    });
    // User may not exist yet - that's okay, they can register with the invite
  }

  // Validate tournament/league exists
  let eventName = '';
  if (data.tournamentId) {
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, data.tournamentId),
    });
    if (!tournament) {
      throw new HTTPException(404, { message: 'Tournament not found' });
    }
    if (tournament.status !== 'registration_open') {
      throw new HTTPException(400, { message: 'Tournament registration is not open' });
    }
    eventName = tournament.name;
  }

  if (data.leagueId) {
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, data.leagueId),
    });
    if (!league) {
      throw new HTTPException(404, { message: 'League not found' });
    }
    if (league.status !== 'registration_open') {
      throw new HTTPException(400, { message: 'League registration is not open' });
    }
    eventName = league.name;
  }

  // Check for existing pending invite to same user/email for same event
  const existingInvite = await db.query.teamInvites.findFirst({
    where: and(
      eq(teamInvites.inviterId, dbUser.id),
      eq(teamInvites.status, 'pending'),
      data.tournamentId
        ? eq(teamInvites.tournamentId, data.tournamentId)
        : eq(teamInvites.leagueId, data.leagueId!),
      inviteeUser
        ? eq(teamInvites.inviteeUserId, inviteeUser.id)
        : eq(teamInvites.inviteeEmail, data.inviteeEmail!)
    ),
  });

  if (existingInvite) {
    throw new HTTPException(409, {
      message: 'A pending invite already exists for this user/email and event',
    });
  }

  // Generate unique invite code
  const inviteCode = generateInviteCode();

  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Create the invite
  const [invite] = await db
    .insert(teamInvites)
    .values({
      tournamentId: data.tournamentId,
      leagueId: data.leagueId,
      eventId: data.eventId,
      inviterId: dbUser.id,
      inviteeEmail: data.inviteeEmail || inviteeUser?.email,
      inviteeUserId: inviteeUser?.id,
      inviteCode,
      teamName: data.teamName,
      message: data.message,
      status: 'pending',
      expiresAt,
    })
    .returning();

  // If invitee is an existing user, send notification
  if (inviteeUser) {
    const inviterName = dbUser.displayName || dbUser.username;

    await db.insert(notifications).values({
      userId: inviteeUser.id,
      type: 'game_invite',
      title: 'Team Invitation',
      message: `${inviterName} has invited you to be their partner for ${eventName}${data.message ? `. Message: "${data.message}"` : ''}`,
      actionUrl: `/invite/${inviteCode}`,
      actionData: {
        type: 'team_invite',
        inviteId: invite.id,
        inviteCode,
        inviterName,
        eventName,
        teamName: data.teamName,
      },
      referenceType: 'team_invite',
      referenceId: invite.id,
    });
  }

  // TODO: Send email invitation if invitee doesn't have an account yet

  return c.json(
    {
      message: 'Invitation sent successfully',
      invite: {
        id: invite.id,
        inviteCode: invite.inviteCode,
        inviteUrl: `/invite/${invite.inviteCode}`,
        tournamentId: invite.tournamentId,
        leagueId: invite.leagueId,
        eventId: invite.eventId,
        inviteeEmail: invite.inviteeEmail,
        inviteeUserId: invite.inviteeUserId,
        teamName: invite.teamName,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      },
    },
    201
  );
});

/**
 * GET /invites/:code
 * Get invite details (public endpoint)
 */
invitesRouter.get('/:code', optionalAuth, validateParams(codeParamSchema), async (c) => {
  const { code } = c.req.valid('param');

  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.inviteCode, code),
    with: {
      inviter: {
        columns: {
          id: true,
          username: true,
          displayName: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          city: true,
          state: true,
          skillLevel: true,
        },
      },
      tournament: {
        columns: {
          id: true,
          name: true,
          slug: true,
          startsAt: true,
          endsAt: true,
          registrationClosesAt: true,
          gameFormat: true,
        },
        with: {
          venue: {
            columns: { id: true, name: true, city: true, state: true },
          },
        },
      },
      league: {
        columns: {
          id: true,
          name: true,
          slug: true,
          gameFormat: true,
          status: true,
        },
        with: {
          venue: {
            columns: { id: true, name: true, city: true, state: true },
          },
        },
      },
    },
  });

  if (!invite) {
    throw new HTTPException(404, { message: 'Invite not found' });
  }

  // Check if expired
  const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const effectiveStatus = isExpired && invite.status === 'pending' ? 'expired' : invite.status;

  // Get inviter's rating
  const inviterRatings = await db.query.userRatings.findMany({
    where: eq(userRatings.userId, invite.inviterId),
  });

  const doublesRating = inviterRatings.find((r) => r.gameFormat === 'doubles');
  const anyRating = inviterRatings[0];
  const rating = doublesRating || anyRating;

  return c.json({
    invite: {
      id: invite.id,
      inviteCode: invite.inviteCode,
      status: effectiveStatus,
      teamName: invite.teamName,
      message: invite.message,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      inviter: {
        ...invite.inviter,
        rating: rating?.rating ? parseFloat(rating.rating) : null,
        ratingSource: rating?.ratingType || null,
      },
      tournament: invite.tournament
        ? {
            ...invite.tournament,
            venue: invite.tournament.venue,
          }
        : null,
      league: invite.league
        ? {
            ...invite.league,
            venue: invite.league.venue,
          }
        : null,
      eventId: invite.eventId,
    },
  });
});

/**
 * POST /invites/:code/accept
 * Accept invite (requires auth)
 */
invitesRouter.post(
  '/:code/accept',
  authMiddleware,
  validateParams(codeParamSchema),
  async (c) => {
    const { code } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const invite = await db.query.teamInvites.findFirst({
      where: eq(teamInvites.inviteCode, code),
      with: {
        inviter: {
          columns: { id: true, displayName: true, username: true },
        },
        tournament: true,
        league: true,
      },
    });

    if (!invite) {
      throw new HTTPException(404, { message: 'Invite not found' });
    }

    // Check if invite is still pending
    if (invite.status !== 'pending') {
      throw new HTTPException(400, { message: `Invite has already been ${invite.status}` });
    }

    // Check expiration
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      // Update status to expired
      await db
        .update(teamInvites)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(teamInvites.id, invite.id));

      throw new HTTPException(400, { message: 'Invite has expired' });
    }

    // Cannot accept your own invite
    if (invite.inviterId === dbUser.id) {
      throw new HTTPException(400, { message: 'You cannot accept your own invite' });
    }

    // Check if user matches the invitee (if invitee was specified)
    if (invite.inviteeUserId && invite.inviteeUserId !== dbUser.id) {
      throw new HTTPException(403, { message: 'This invite is for a different user' });
    }

    if (invite.inviteeEmail && invite.inviteeEmail !== dbUser.email) {
      throw new HTTPException(403, {
        message: 'This invite is for a different email address',
      });
    }

    // Accept the invite and create registration
    await db.transaction(async (tx) => {
      // Update invite status
      await tx
        .update(teamInvites)
        .set({
          status: 'accepted',
          inviteeUserId: dbUser.id,
          updatedAt: new Date(),
        })
        .where(eq(teamInvites.id, invite.id));

      // Create registration for tournament or league
      if (invite.tournamentId) {
        // Create tournament registration for the team
        const [registration] = await tx
          .insert(tournamentRegistrations)
          .values({
            tournamentId: invite.tournamentId,
            teamName: invite.teamName || `${invite.inviter.displayName || invite.inviter.username} & ${dbUser.displayName || dbUser.username}`,
            status: 'registered',
          })
          .returning();

        // Get inviter's rating
        const inviterRating = await tx.query.userRatings.findFirst({
          where: and(
            eq(userRatings.userId, invite.inviterId),
            eq(userRatings.gameFormat, invite.tournament?.gameFormat || 'doubles')
          ),
        });

        // Get accepter's rating
        const accepterRating = await tx.query.userRatings.findFirst({
          where: and(
            eq(userRatings.userId, dbUser.id),
            eq(userRatings.gameFormat, invite.tournament?.gameFormat || 'doubles')
          ),
        });

        // Add both players to the registration
        await tx.insert(tournamentRegistrationPlayers).values([
          {
            registrationId: registration.id,
            userId: invite.inviterId,
            isCaptain: true,
            ratingAtRegistration: inviterRating?.rating || '3.00',
          },
          {
            registrationId: registration.id,
            userId: dbUser.id,
            isCaptain: false,
            ratingAtRegistration: accepterRating?.rating || '3.00',
          },
        ]);

        // Update tournament participant count
        await tx
          .update(tournaments)
          .set({
            currentParticipants: sql`${tournaments.currentParticipants} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(tournaments.id, invite.tournamentId));
      }

      if (invite.leagueId) {
        // Find current season
        const currentSeason = await tx.query.leagueSeasons.findFirst({
          where: eq(leagueSeasons.leagueId, invite.leagueId),
          orderBy: desc(leagueSeasons.seasonNumber),
        });

        if (!currentSeason) {
          throw new HTTPException(400, { message: 'No active season found for this league' });
        }

        // Create league participant for the team
        const [participant] = await tx
          .insert(leagueParticipants)
          .values({
            seasonId: currentSeason.id,
            teamName: invite.teamName || `${invite.inviter.displayName || invite.inviter.username} & ${dbUser.displayName || dbUser.username}`,
            status: 'active',
          })
          .returning();

        // Get inviter's rating
        const inviterRating = await tx.query.userRatings.findFirst({
          where: and(
            eq(userRatings.userId, invite.inviterId),
            eq(userRatings.gameFormat, invite.league?.gameFormat || 'doubles')
          ),
        });

        // Get accepter's rating
        const accepterRating = await tx.query.userRatings.findFirst({
          where: and(
            eq(userRatings.userId, dbUser.id),
            eq(userRatings.gameFormat, invite.league?.gameFormat || 'doubles')
          ),
        });

        // Add both players to the participant
        await tx.insert(leagueParticipantPlayers).values([
          {
            participantId: participant.id,
            userId: invite.inviterId,
            isCaptain: true,
            ratingAtRegistration: inviterRating?.rating || '3.00',
          },
          {
            participantId: participant.id,
            userId: dbUser.id,
            isCaptain: false,
            ratingAtRegistration: accepterRating?.rating || '3.00',
          },
        ]);
      }
    });

    // Notify the inviter
    const accepterName = dbUser.displayName || dbUser.username;
    const eventName = invite.tournament?.name || invite.league?.name || 'the event';

    await db.insert(notifications).values({
      userId: invite.inviterId,
      type: 'game_invite',
      title: 'Invitation Accepted',
      message: `${accepterName} has accepted your partner invitation for ${eventName}. Your team is now registered!`,
      actionUrl: invite.tournamentId
        ? `/tournaments/${invite.tournamentId}`
        : `/leagues/${invite.leagueId}`,
      actionData: {
        type: 'invite_accepted',
        inviteId: invite.id,
        accepterName,
        eventName,
      },
      referenceType: 'team_invite',
      referenceId: invite.id,
    });

    return c.json({
      message: 'Invitation accepted successfully. You are now registered as a team!',
      registration: {
        tournamentId: invite.tournamentId,
        leagueId: invite.leagueId,
        teamName: invite.teamName,
      },
    });
  }
);

/**
 * POST /invites/:code/decline
 * Decline invite
 */
invitesRouter.post(
  '/:code/decline',
  authMiddleware,
  validateParams(codeParamSchema),
  async (c) => {
    const { code } = c.req.valid('param');
    const { userId } = c.get('user');

    const dbUser = await getDbUser(userId);

    const invite = await db.query.teamInvites.findFirst({
      where: eq(teamInvites.inviteCode, code),
      with: {
        inviter: {
          columns: { id: true, displayName: true, username: true },
        },
        tournament: {
          columns: { name: true },
        },
        league: {
          columns: { name: true },
        },
      },
    });

    if (!invite) {
      throw new HTTPException(404, { message: 'Invite not found' });
    }

    // Check if invite is still pending
    if (invite.status !== 'pending') {
      throw new HTTPException(400, { message: `Invite has already been ${invite.status}` });
    }

    // Cannot decline your own invite (you can cancel it instead)
    if (invite.inviterId === dbUser.id) {
      throw new HTTPException(400, { message: 'Use cancel to remove your own invite' });
    }

    // Update invite status
    await db
      .update(teamInvites)
      .set({
        status: 'declined',
        inviteeUserId: dbUser.id,
        updatedAt: new Date(),
      })
      .where(eq(teamInvites.id, invite.id));

    // Notify the inviter
    const declinerName = dbUser.displayName || dbUser.username;
    const eventName = invite.tournament?.name || invite.league?.name || 'the event';

    await db.insert(notifications).values({
      userId: invite.inviterId,
      type: 'game_invite',
      title: 'Invitation Declined',
      message: `${declinerName} has declined your partner invitation for ${eventName}.`,
      actionUrl: invite.tournamentId
        ? `/tournaments/${invite.tournamentId}`
        : `/leagues/${invite.leagueId}`,
      actionData: {
        type: 'invite_declined',
        inviteId: invite.id,
        declinerName,
        eventName,
      },
      referenceType: 'team_invite',
      referenceId: invite.id,
    });

    return c.json({
      message: 'Invitation declined',
    });
  }
);

/**
 * GET /invites/my/sent
 * Get invites sent by current user
 */
invitesRouter.get('/my/sent', authMiddleware, async (c) => {
  const { userId } = c.get('user');

  const dbUser = await getDbUser(userId);

  const invites = await db.query.teamInvites.findMany({
    where: eq(teamInvites.inviterId, dbUser.id),
    with: {
      invitee: {
        columns: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      tournament: {
        columns: { id: true, name: true, slug: true },
      },
      league: {
        columns: { id: true, name: true, slug: true },
      },
    },
    orderBy: desc(teamInvites.createdAt),
  });

  return c.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      inviteCode: invite.inviteCode,
      inviteeEmail: invite.inviteeEmail,
      invitee: invite.invitee,
      tournament: invite.tournament,
      league: invite.league,
      eventId: invite.eventId,
      teamName: invite.teamName,
      message: invite.message,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    })),
  });
});

/**
 * GET /invites/my/received
 * Get invites received by current user
 */
invitesRouter.get('/my/received', authMiddleware, async (c) => {
  const { userId } = c.get('user');

  const dbUser = await getDbUser(userId);

  const invites = await db.query.teamInvites.findMany({
    where: or(
      eq(teamInvites.inviteeUserId, dbUser.id),
      eq(teamInvites.inviteeEmail, dbUser.email)
    ),
    with: {
      inviter: {
        columns: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      tournament: {
        columns: { id: true, name: true, slug: true },
      },
      league: {
        columns: { id: true, name: true, slug: true },
      },
    },
    orderBy: desc(teamInvites.createdAt),
  });

  return c.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      inviteCode: invite.inviteCode,
      inviter: invite.inviter,
      tournament: invite.tournament,
      league: invite.league,
      eventId: invite.eventId,
      teamName: invite.teamName,
      message: invite.message,
      status: invite.status,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    })),
  });
});

/**
 * DELETE /invites/:code
 * Cancel a sent invite (only by inviter)
 */
invitesRouter.delete('/:code', authMiddleware, validateParams(codeParamSchema), async (c) => {
  const { code } = c.req.valid('param');
  const { userId } = c.get('user');

  const dbUser = await getDbUser(userId);

  const invite = await db.query.teamInvites.findFirst({
    where: eq(teamInvites.inviteCode, code),
  });

  if (!invite) {
    throw new HTTPException(404, { message: 'Invite not found' });
  }

  // Only inviter can cancel
  if (invite.inviterId !== dbUser.id) {
    throw new HTTPException(403, { message: 'Only the inviter can cancel this invite' });
  }

  // Can only cancel pending invites
  if (invite.status !== 'pending') {
    throw new HTTPException(400, { message: `Cannot cancel an invite that has been ${invite.status}` });
  }

  // Delete the invite
  await db.delete(teamInvites).where(eq(teamInvites.id, invite.id));

  return c.json({ message: 'Invite cancelled successfully' });
});

export default invitesRouter;
