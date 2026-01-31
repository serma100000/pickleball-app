import { eq, and, sql, asc, isNull, gt, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { notificationService } from './notificationService.js';

const {
  tournamentRegistrations,
  tournamentRegistrationPlayers,
  tournaments,
  leagueParticipants,
  leagueParticipantPlayers,
  leagueSeasons,
  leagues,
  users,
} = schema;

// Duration constants
const SPOT_OFFER_DURATION_HOURS = 24;
const PARTNER_INVITATION_DURATION_DAYS = 7;

export type EventType = 'tournament' | 'league';

export interface WaitlistEntry {
  id: string;
  userId: string;
  eventType: EventType;
  eventId: string;
  position: number;
  status: string;
  spotOfferedAt?: Date | null;
  spotExpiresAt?: Date | null;
  createdAt: Date;
}

export interface WaitlistPosition {
  position: number;
  totalWaitlisted: number;
  estimatedWaitDays?: number;
  status: string;
  spotOfferedAt?: Date | null;
  spotExpiresAt?: Date | null;
}

export const waitlistService = {
  /**
   * Add a user to the waitlist for an event
   */
  async addToWaitlist(
    userId: string,
    eventType: EventType,
    eventId: string,
    eventSubId?: string // divisionId for tournaments, seasonId for leagues
  ): Promise<{ registrationId: string; position: number }> {
    if (eventType === 'tournament') {
      return this.addToTournamentWaitlist(userId, eventId, eventSubId);
    } else {
      return this.addToLeagueWaitlist(userId, eventId, eventSubId);
    }
  },

  /**
   * Add user to tournament waitlist
   */
  async addToTournamentWaitlist(
    userId: string,
    tournamentId: string,
    divisionId?: string
  ): Promise<{ registrationId: string; position: number }> {
    // Get the next waitlist position
    const maxPositionResult = await db
      .select({ maxPosition: sql<number>`COALESCE(MAX(${tournamentRegistrations.waitlistPosition}), 0)` })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.status, 'waitlisted')
        )
      );

    const nextPosition = (maxPositionResult[0]?.maxPosition || 0) + 1;

    // Create the registration with waitlisted status
    const result = await db.transaction(async (tx) => {
      const [registration] = await tx
        .insert(tournamentRegistrations)
        .values({
          tournamentId,
          divisionId: divisionId || null,
          status: 'waitlisted',
          waitlistPosition: nextPosition,
        })
        .returning();

      // Add the player to the registration
      await tx.insert(tournamentRegistrationPlayers).values({
        registrationId: registration!.id,
        userId,
        isCaptain: true,
      });

      return registration!;
    });

    // Notify the user
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });

    if (tournament) {
      await notificationService.create({
        userId,
        type: 'tournament_update',
        title: "You're on the waitlist!",
        message: `You are #${nextPosition} on the waitlist for ${tournament.name}. We'll notify you when a spot opens.`,
        data: {
          tournamentId,
          waitlistPosition: nextPosition,
        },
      });
    }

    return { registrationId: result.id, position: nextPosition };
  },

  /**
   * Add user to league waitlist
   */
  async addToLeagueWaitlist(
    userId: string,
    leagueId: string,
    seasonId?: string
  ): Promise<{ registrationId: string; position: number }> {
    // Get current season if not provided
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const currentSeason = await db.query.leagueSeasons.findFirst({
        where: eq(leagueSeasons.leagueId, leagueId),
        orderBy: desc(leagueSeasons.seasonNumber),
      });
      if (!currentSeason) {
        throw new Error('No active season found for this league');
      }
      targetSeasonId = currentSeason.id;
    }

    // Get the next waitlist position (using rank field with high values for waitlist)
    // Waitlist uses negative ranks to indicate waitlist position
    const maxWaitlistResult = await db
      .select({ maxRank: sql<number>`COALESCE(MIN(${leagueParticipants.rank}), 0)` })
      .from(leagueParticipants)
      .where(
        and(
          eq(leagueParticipants.seasonId, targetSeasonId),
          sql`${leagueParticipants.rank} < 0`
        )
      );

    // Use negative values for waitlist positions: -1 is first in waitlist
    const nextPosition = Math.min((maxWaitlistResult[0]?.maxRank || 0) - 1, -1);

    // Create the participant with waitlist status
    const result = await db.transaction(async (tx) => {
      const [participant] = await tx
        .insert(leagueParticipants)
        .values({
          seasonId: targetSeasonId!,
          rank: nextPosition, // Negative rank indicates waitlist
          status: 'active', // Will track waitlist via rank
        })
        .returning();

      // Add the player
      await tx.insert(leagueParticipantPlayers).values({
        participantId: participant!.id,
        userId,
        isCaptain: true,
      });

      return participant!;
    });

    const actualPosition = Math.abs(nextPosition);

    // Notify the user
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, leagueId),
    });

    if (league) {
      await notificationService.create({
        userId,
        type: 'league_update',
        title: "You're on the waitlist!",
        message: `You are #${actualPosition} on the waitlist for ${league.name}. We'll notify you when a spot opens.`,
        data: {
          leagueId,
          waitlistPosition: actualPosition,
        },
      });
    }

    return { registrationId: result.id, position: actualPosition };
  },

  /**
   * Get a user's position on the waitlist
   */
  async getWaitlistPosition(
    userId: string,
    eventType: EventType,
    eventId: string
  ): Promise<WaitlistPosition | null> {
    if (eventType === 'tournament') {
      return this.getTournamentWaitlistPosition(userId, eventId);
    } else {
      return this.getLeagueWaitlistPosition(userId, eventId);
    }
  },

  /**
   * Get tournament waitlist position for a user
   */
  async getTournamentWaitlistPosition(
    userId: string,
    tournamentId: string
  ): Promise<WaitlistPosition | null> {
    // Find the user's registration
    const registration = await db
      .select({
        id: tournamentRegistrations.id,
        status: tournamentRegistrations.status,
        waitlistPosition: tournamentRegistrations.waitlistPosition,
        spotOfferedAt: tournamentRegistrations.spotOfferedAt,
        spotExpiresAt: tournamentRegistrations.spotExpiresAt,
      })
      .from(tournamentRegistrations)
      .innerJoin(
        tournamentRegistrationPlayers,
        eq(tournamentRegistrations.id, tournamentRegistrationPlayers.registrationId)
      )
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrationPlayers.userId, userId),
          sql`${tournamentRegistrations.status} IN ('waitlisted', 'spot_offered')`
        )
      )
      .limit(1);

    if (registration.length === 0) {
      return null;
    }

    const reg = registration[0];

    // Get total waitlisted
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          sql`${tournamentRegistrations.status} IN ('waitlisted', 'spot_offered')`
        )
      );

    // Estimate wait time based on historical data (simplified)
    const estimatedWaitDays = reg.waitlistPosition
      ? Math.ceil(reg.waitlistPosition * 3) // Rough estimate: 3 days per position
      : undefined;

    return {
      position: reg.waitlistPosition || 0,
      totalWaitlisted: Number(totalResult[0]?.count || 0),
      estimatedWaitDays,
      status: reg.status,
      spotOfferedAt: reg.spotOfferedAt,
      spotExpiresAt: reg.spotExpiresAt,
    };
  },

  /**
   * Get league waitlist position for a user
   */
  async getLeagueWaitlistPosition(
    userId: string,
    leagueId: string
  ): Promise<WaitlistPosition | null> {
    // Get current season
    const currentSeason = await db.query.leagueSeasons.findFirst({
      where: eq(leagueSeasons.leagueId, leagueId),
      orderBy: desc(leagueSeasons.seasonNumber),
    });

    if (!currentSeason) {
      return null;
    }

    // Find the user's participation
    const participation = await db
      .select({
        id: leagueParticipants.id,
        rank: leagueParticipants.rank,
        status: leagueParticipants.status,
      })
      .from(leagueParticipants)
      .innerJoin(
        leagueParticipantPlayers,
        eq(leagueParticipants.id, leagueParticipantPlayers.participantId)
      )
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          eq(leagueParticipantPlayers.userId, userId),
          sql`${leagueParticipants.rank} < 0` // Negative rank = waitlist
        )
      )
      .limit(1);

    if (participation.length === 0) {
      return null;
    }

    const position = Math.abs(participation[0].rank || 0);

    // Get total waitlisted
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(leagueParticipants)
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          sql`${leagueParticipants.rank} < 0`
        )
      );

    return {
      position,
      totalWaitlisted: Number(totalResult[0]?.count || 0),
      estimatedWaitDays: Math.ceil(position * 7), // Estimate: 1 week per position
      status: 'waitlisted',
      spotOfferedAt: null,
      spotExpiresAt: null,
    };
  },

  /**
   * Process the waitlist when a spot opens up
   * Offers the spot to the next person in line
   */
  async processWaitlist(
    eventType: EventType,
    eventId: string
  ): Promise<{ userId: string; registrationId: string } | null> {
    if (eventType === 'tournament') {
      return this.processTournamentWaitlist(eventId);
    } else {
      return this.processLeagueWaitlist(eventId);
    }
  },

  /**
   * Process tournament waitlist
   */
  async processTournamentWaitlist(
    tournamentId: string
  ): Promise<{ userId: string; registrationId: string } | null> {
    // Find the next person in line (lowest waitlist position with status 'waitlisted')
    const nextInLine = await db
      .select({
        id: tournamentRegistrations.id,
        waitlistPosition: tournamentRegistrations.waitlistPosition,
      })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.status, 'waitlisted')
        )
      )
      .orderBy(asc(tournamentRegistrations.waitlistPosition))
      .limit(1);

    if (nextInLine.length === 0) {
      return null;
    }

    const registration = nextInLine[0];

    // Get the user for this registration
    const player = await db.query.tournamentRegistrationPlayers.findFirst({
      where: eq(tournamentRegistrationPlayers.registrationId, registration.id),
      with: {
        user: true,
      },
    });

    if (!player) {
      return null;
    }

    // Calculate spot expiration (24 hours from now)
    const spotOfferedAt = new Date();
    const spotExpiresAt = new Date(spotOfferedAt.getTime() + SPOT_OFFER_DURATION_HOURS * 60 * 60 * 1000);

    // Update the registration status to spot_offered
    await db
      .update(tournamentRegistrations)
      .set({
        status: 'spot_offered',
        spotOfferedAt,
        spotExpiresAt,
      })
      .where(eq(tournamentRegistrations.id, registration.id));

    // Notify the user
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, tournamentId),
    });

    if (tournament) {
      await notificationService.create({
        userId: player.userId,
        type: 'tournament_update',
        title: 'A spot opened up!',
        message: `A spot has opened up in ${tournament.name}! You have 24 hours to accept. This offer expires on ${spotExpiresAt.toLocaleString()}.`,
        data: {
          tournamentId,
          registrationId: registration.id,
          spotExpiresAt: spotExpiresAt.toISOString(),
          action: 'accept_waitlist_spot',
        },
      });
    }

    return { userId: player.userId, registrationId: registration.id };
  },

  /**
   * Process league waitlist
   */
  async processLeagueWaitlist(
    leagueId: string
  ): Promise<{ userId: string; registrationId: string } | null> {
    // Get current season
    const currentSeason = await db.query.leagueSeasons.findFirst({
      where: eq(leagueSeasons.leagueId, leagueId),
      orderBy: desc(leagueSeasons.seasonNumber),
    });

    if (!currentSeason) {
      return null;
    }

    // Find the next person in line (highest negative rank, closest to 0)
    const nextInLine = await db
      .select({
        id: leagueParticipants.id,
        rank: leagueParticipants.rank,
      })
      .from(leagueParticipants)
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          sql`${leagueParticipants.rank} < 0`
        )
      )
      .orderBy(desc(leagueParticipants.rank)) // Higher negative = earlier in waitlist
      .limit(1);

    if (nextInLine.length === 0) {
      return null;
    }

    const participant = nextInLine[0];

    // Get the user for this participation
    const player = await db.query.leagueParticipantPlayers.findFirst({
      where: eq(leagueParticipantPlayers.participantId, participant.id),
      with: {
        user: true,
      },
    });

    if (!player) {
      return null;
    }

    // For leagues, we immediately promote them (no 24-hour window like tournaments)
    // Set rank to next positive number
    const maxRankResult = await db
      .select({ maxRank: sql<number>`COALESCE(MAX(${leagueParticipants.rank}), 0)` })
      .from(leagueParticipants)
      .where(
        and(
          eq(leagueParticipants.seasonId, currentSeason.id),
          sql`${leagueParticipants.rank} > 0`
        )
      );

    const newRank = (maxRankResult[0]?.maxRank || 0) + 1;

    await db
      .update(leagueParticipants)
      .set({
        rank: newRank,
        updatedAt: new Date(),
      })
      .where(eq(leagueParticipants.id, participant.id));

    // Notify the user
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.id, leagueId),
    });

    if (league) {
      await notificationService.create({
        userId: player.userId,
        type: 'league_update',
        title: "You're in!",
        message: `A spot has opened up in ${league.name} and you've been automatically added to the league!`,
        data: {
          leagueId,
          participantId: participant.id,
        },
      });
    }

    return { userId: player.userId, registrationId: participant.id };
  },

  /**
   * Accept an offered waitlist spot (tournament only)
   */
  async acceptWaitlistSpot(
    userId: string,
    eventType: EventType,
    eventId: string
  ): Promise<{ success: boolean; message: string }> {
    if (eventType !== 'tournament') {
      return { success: false, message: 'Accept spot is only available for tournaments' };
    }

    // Find the user's registration with spot_offered status
    const registration = await db
      .select({
        id: tournamentRegistrations.id,
        spotExpiresAt: tournamentRegistrations.spotExpiresAt,
      })
      .from(tournamentRegistrations)
      .innerJoin(
        tournamentRegistrationPlayers,
        eq(tournamentRegistrations.id, tournamentRegistrationPlayers.registrationId)
      )
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, eventId),
          eq(tournamentRegistrationPlayers.userId, userId),
          eq(tournamentRegistrations.status, 'spot_offered')
        )
      )
      .limit(1);

    if (registration.length === 0) {
      return { success: false, message: 'No spot offer found' };
    }

    const reg = registration[0];

    // Check if the offer has expired
    if (reg.spotExpiresAt && new Date() > reg.spotExpiresAt) {
      // Expire the offer and move to next person
      await db
        .update(tournamentRegistrations)
        .set({
          status: 'withdrawn',
          withdrawnAt: new Date(),
          notes: 'Spot offer expired',
        })
        .where(eq(tournamentRegistrations.id, reg.id));

      // Process waitlist to offer to next person
      await this.processTournamentWaitlist(eventId);

      return { success: false, message: 'Spot offer has expired' };
    }

    // Accept the spot - update status to pending_payment or confirmed
    await db
      .update(tournamentRegistrations)
      .set({
        status: 'pending_payment', // Will move to confirmed after payment
        waitlistPosition: null,
        spotOfferedAt: null,
        spotExpiresAt: null,
      })
      .where(eq(tournamentRegistrations.id, reg.id));

    // Update tournament participant count
    await db
      .update(tournaments)
      .set({
        currentParticipants: sql`${tournaments.currentParticipants} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(tournaments.id, eventId));

    // Reorder remaining waitlist positions
    await this.reorderWaitlistPositions('tournament', eventId);

    // Notify the user
    const tournament = await db.query.tournaments.findFirst({
      where: eq(tournaments.id, eventId),
    });

    if (tournament) {
      await notificationService.create({
        userId,
        type: 'tournament_update',
        title: "You're in!",
        message: `You've accepted your spot in ${tournament.name}. Please complete your registration payment.`,
        data: {
          tournamentId: eventId,
          registrationId: reg.id,
          action: 'complete_payment',
        },
      });
    }

    return { success: true, message: 'Spot accepted successfully' };
  },

  /**
   * Decline an offered waitlist spot
   */
  async declineWaitlistSpot(
    userId: string,
    eventType: EventType,
    eventId: string
  ): Promise<{ success: boolean; message: string }> {
    if (eventType !== 'tournament') {
      return { success: false, message: 'Decline spot is only available for tournaments' };
    }

    // Find the user's registration with spot_offered status
    const registration = await db
      .select({
        id: tournamentRegistrations.id,
      })
      .from(tournamentRegistrations)
      .innerJoin(
        tournamentRegistrationPlayers,
        eq(tournamentRegistrations.id, tournamentRegistrationPlayers.registrationId)
      )
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, eventId),
          eq(tournamentRegistrationPlayers.userId, userId),
          eq(tournamentRegistrations.status, 'spot_offered')
        )
      )
      .limit(1);

    if (registration.length === 0) {
      return { success: false, message: 'No spot offer found' };
    }

    const reg = registration[0];

    // Mark as withdrawn
    await db
      .update(tournamentRegistrations)
      .set({
        status: 'withdrawn',
        withdrawnAt: new Date(),
        waitlistPosition: null,
        spotOfferedAt: null,
        spotExpiresAt: null,
        notes: 'Spot offer declined',
      })
      .where(eq(tournamentRegistrations.id, reg.id));

    // Reorder remaining waitlist positions
    await this.reorderWaitlistPositions('tournament', eventId);

    // Process waitlist to offer to next person
    await this.processTournamentWaitlist(eventId);

    return { success: true, message: 'Spot declined. The next person in line will be notified.' };
  },

  /**
   * Reorder waitlist positions after someone leaves or accepts
   */
  async reorderWaitlistPositions(
    eventType: EventType,
    eventId: string
  ): Promise<void> {
    if (eventType === 'tournament') {
      // Get all waitlisted registrations ordered by current position
      const waitlisted = await db
        .select({
          id: tournamentRegistrations.id,
          waitlistPosition: tournamentRegistrations.waitlistPosition,
        })
        .from(tournamentRegistrations)
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, eventId),
            eq(tournamentRegistrations.status, 'waitlisted')
          )
        )
        .orderBy(asc(tournamentRegistrations.waitlistPosition));

      // Update positions to be sequential
      for (let i = 0; i < waitlisted.length; i++) {
        await db
          .update(tournamentRegistrations)
          .set({ waitlistPosition: i + 1 })
          .where(eq(tournamentRegistrations.id, waitlisted[i].id));
      }
    }
    // Leagues use negative rank, which self-orders
  },

  /**
   * Check and expire old spot offers (run periodically)
   */
  async expireOldSpotOffers(): Promise<number> {
    const now = new Date();

    // Find expired spot offers
    const expired = await db
      .select({
        id: tournamentRegistrations.id,
        tournamentId: tournamentRegistrations.tournamentId,
      })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.status, 'spot_offered'),
          sql`${tournamentRegistrations.spotExpiresAt} < ${now}`
        )
      );

    // Process each expired offer
    for (const reg of expired) {
      // Get user for notification
      const player = await db.query.tournamentRegistrationPlayers.findFirst({
        where: eq(tournamentRegistrationPlayers.registrationId, reg.id),
      });

      // Mark as withdrawn
      await db
        .update(tournamentRegistrations)
        .set({
          status: 'withdrawn',
          withdrawnAt: now,
          waitlistPosition: null,
          spotOfferedAt: null,
          spotExpiresAt: null,
          notes: 'Spot offer expired automatically',
        })
        .where(eq(tournamentRegistrations.id, reg.id));

      // Notify user
      if (player) {
        const tournament = await db.query.tournaments.findFirst({
          where: eq(tournaments.id, reg.tournamentId),
        });

        if (tournament) {
          await notificationService.create({
            userId: player.userId,
            type: 'tournament_update',
            title: 'Spot offer expired',
            message: `Your spot offer for ${tournament.name} has expired. You can re-join the waitlist if you'd still like to participate.`,
            data: {
              tournamentId: reg.tournamentId,
            },
          });
        }
      }

      // Reorder waitlist and offer to next person
      await this.reorderWaitlistPositions('tournament', reg.tournamentId);
      await this.processTournamentWaitlist(reg.tournamentId);
    }

    return expired.length;
  },

  /**
   * Get waitlist entries for an event (admin view)
   */
  async getWaitlistEntries(
    eventType: EventType,
    eventId: string
  ): Promise<Array<{
    id: string;
    position: number;
    status: string;
    user: { id: string; displayName: string | null; email: string };
    spotOfferedAt?: Date | null;
    spotExpiresAt?: Date | null;
    registeredAt: Date;
  }>> {
    if (eventType === 'tournament') {
      const entries = await db
        .select({
          id: tournamentRegistrations.id,
          position: tournamentRegistrations.waitlistPosition,
          status: tournamentRegistrations.status,
          spotOfferedAt: tournamentRegistrations.spotOfferedAt,
          spotExpiresAt: tournamentRegistrations.spotExpiresAt,
          registeredAt: tournamentRegistrations.registeredAt,
          userId: users.id,
          displayName: users.displayName,
          email: users.email,
        })
        .from(tournamentRegistrations)
        .innerJoin(
          tournamentRegistrationPlayers,
          eq(tournamentRegistrations.id, tournamentRegistrationPlayers.registrationId)
        )
        .innerJoin(users, eq(tournamentRegistrationPlayers.userId, users.id))
        .where(
          and(
            eq(tournamentRegistrations.tournamentId, eventId),
            sql`${tournamentRegistrations.status} IN ('waitlisted', 'spot_offered')`
          )
        )
        .orderBy(asc(tournamentRegistrations.waitlistPosition));

      return entries.map((e) => ({
        id: e.id,
        position: e.position || 0,
        status: e.status,
        user: { id: e.userId, displayName: e.displayName, email: e.email },
        spotOfferedAt: e.spotOfferedAt,
        spotExpiresAt: e.spotExpiresAt,
        registeredAt: e.registeredAt,
      }));
    } else {
      // Get current season
      const currentSeason = await db.query.leagueSeasons.findFirst({
        where: eq(leagueSeasons.leagueId, eventId),
        orderBy: desc(leagueSeasons.seasonNumber),
      });

      if (!currentSeason) {
        return [];
      }

      const entries = await db
        .select({
          id: leagueParticipants.id,
          rank: leagueParticipants.rank,
          status: leagueParticipants.status,
          createdAt: leagueParticipants.createdAt,
          userId: users.id,
          displayName: users.displayName,
          email: users.email,
        })
        .from(leagueParticipants)
        .innerJoin(
          leagueParticipantPlayers,
          eq(leagueParticipants.id, leagueParticipantPlayers.participantId)
        )
        .innerJoin(users, eq(leagueParticipantPlayers.userId, users.id))
        .where(
          and(
            eq(leagueParticipants.seasonId, currentSeason.id),
            sql`${leagueParticipants.rank} < 0`
          )
        )
        .orderBy(desc(leagueParticipants.rank));

      return entries.map((e) => ({
        id: e.id,
        position: Math.abs(e.rank || 0),
        status: 'waitlisted',
        user: { id: e.userId, displayName: e.displayName, email: e.email },
        spotOfferedAt: null,
        spotExpiresAt: null,
        registeredAt: e.createdAt,
      }));
    }
  },

  /**
   * Check if an event is full (helper for registration endpoints)
   */
  async isEventFull(
    eventType: EventType,
    eventId: string
  ): Promise<{ isFull: boolean; currentCount: number; maxCount: number | null }> {
    if (eventType === 'tournament') {
      const tournament = await db.query.tournaments.findFirst({
        where: eq(tournaments.id, eventId),
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      return {
        isFull: tournament.maxParticipants
          ? (tournament.currentParticipants || 0) >= tournament.maxParticipants
          : false,
        currentCount: tournament.currentParticipants || 0,
        maxCount: tournament.maxParticipants,
      };
    } else {
      const currentSeason = await db.query.leagueSeasons.findFirst({
        where: eq(leagueSeasons.leagueId, eventId),
        orderBy: desc(leagueSeasons.seasonNumber),
      });

      if (!currentSeason) {
        throw new Error('No active season found');
      }

      const participantCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(leagueParticipants)
        .where(
          and(
            eq(leagueParticipants.seasonId, currentSeason.id),
            sql`${leagueParticipants.rank} > 0` // Only count active participants, not waitlisted
          )
        );

      const currentCount = Number(participantCount[0]?.count || 0);

      return {
        isFull: currentSeason.maxParticipants
          ? currentCount >= currentSeason.maxParticipants
          : false,
        currentCount,
        maxCount: currentSeason.maxParticipants,
      };
    }
  },
};
