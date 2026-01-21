import { eq, and, or, desc, gte, lte, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { ratingService } from './ratingService.js';
import { userService } from './userService.js';
import { notificationService } from './notificationService.js';
import { emitToGame, SocketEvents } from '../lib/socket.js';

const { games, gameParticipants, users, userRatings } = schema;

export interface CreateGameInput {
  gameType: 'singles' | 'doubles' | 'mixed_doubles';
  courtId?: string;
  scheduledAt?: Date;
  isRanked?: boolean;
  team1PlayerIds: string[];
  team2PlayerIds: string[];
  createdById: string;
}

export interface RecordScoreInput {
  gameId: string;
  team1Score: number;
  team2Score: number;
  userId: string;
}

export interface ListGamesOptions {
  status?: string;
  gameType?: string;
  gameFormat?: string;
  userId?: string;
  venueId?: string;
  upcoming?: boolean;
  past?: boolean;
  page?: number;
  limit?: number;
}

export const gameService = {
  /**
   * Create a new game with participants
   */
  async create(input: CreateGameInput) {
    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Determine initial status based on scheduling
      const initialStatus = input.scheduledAt ? 'scheduled' : 'in_progress';

      // Map game type to game format
      const gameFormat = input.gameType;

      // Create game
      const [game] = await tx
        .insert(games)
        .values({
          gameFormat,
          gameType: 'casual', // Default to casual, can be updated
          courtId: input.courtId,
          scheduledAt: input.scheduledAt,
          isRated: input.isRanked ?? true,
          status: initialStatus,
          createdBy: input.createdById,
        })
        .returning();

      // Get user ratings for snapshot
      const getUserRating = async (userId: string) => {
        const rating = await tx.query.userRatings.findFirst({
          where: and(
            eq(userRatings.userId, userId),
            eq(userRatings.gameFormat, gameFormat)
          ),
        });
        return rating?.rating || '3.00'; // Default rating
      };

      // Add team 1 players
      for (const playerId of input.team1PlayerIds) {
        const ratingAtGame = await getUserRating(playerId);
        await tx.insert(gameParticipants).values({
          gameId: game.id,
          userId: playerId,
          team: 1,
          ratingAtGame,
          isConfirmed: playerId === input.createdById, // Auto-confirm creator
          confirmedAt: playerId === input.createdById ? new Date() : undefined,
        });
      }

      // Add team 2 players
      for (const playerId of input.team2PlayerIds) {
        const ratingAtGame = await getUserRating(playerId);
        await tx.insert(gameParticipants).values({
          gameId: game.id,
          userId: playerId,
          team: 2,
          ratingAtGame,
          isConfirmed: false,
        });
      }

      return game;
    });

    // Notify players (outside transaction)
    const allPlayerIds = [...input.team1PlayerIds, ...input.team2PlayerIds];
    for (const playerId of allPlayerIds) {
      if (playerId !== input.createdById) {
        await notificationService.create({
          userId: playerId,
          type: 'game_invite',
          title: 'Game Invitation',
          message: 'You have been invited to a game',
          data: { gameId: result.id },
        });
      }
    }

    return result;
  },

  /**
   * Get game by ID with all details including participants
   */
  async getById(id: string) {
    const game = await db.query.games.findFirst({
      where: eq(games.id, id),
      with: {
        court: true,
        venue: true,
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                skillLevel: true,
              },
            },
          },
        },
      },
    });

    if (!game) return null;

    // Transform participants to players for backward compatibility
    return {
      ...game,
      players: game.participants,
    };
  },

  /**
   * List games with filters and pagination
   */
  async listGames(options: ListGamesOptions) {
    const {
      status,
      gameType,
      gameFormat,
      userId,
      venueId,
      upcoming,
      past,
      page = 1,
      limit = 20,
    } = options;

    const offset = (page - 1) * limit;
    const now = new Date();
    const conditions = [];

    if (status) {
      conditions.push(eq(games.status, status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'forfeited'));
    }

    if (gameType) {
      conditions.push(eq(games.gameType, gameType as 'casual' | 'competitive' | 'tournament' | 'league' | 'ladder'));
    }

    if (gameFormat) {
      conditions.push(eq(games.gameFormat, gameFormat as 'singles' | 'doubles' | 'mixed_doubles'));
    }

    if (venueId) {
      conditions.push(eq(games.venueId, venueId));
    }

    if (upcoming) {
      conditions.push(gte(games.scheduledAt, now));
      conditions.push(eq(games.status, 'scheduled'));
    }

    if (past) {
      conditions.push(lte(games.scheduledAt, now));
    }

    // If filtering by user, get their game IDs first
    if (userId) {
      const userGameIds = await db
        .select({ gameId: gameParticipants.gameId })
        .from(gameParticipants)
        .where(eq(gameParticipants.userId, userId));

      const gameIds = userGameIds.map((g) => g.gameId);
      if (gameIds.length === 0) {
        return { games: [], total: 0 };
      }

      // Add game ID filter
      conditions.push(sql`${games.id} IN (${sql.join(gameIds.map(id => sql`${id}`), sql`, `)})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [gamesList, countResult] = await Promise.all([
      db.query.games.findMany({
        where: whereClause,
        with: {
          court: true,
          venue: true,
          participants: {
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: desc(games.createdAt),
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(games).where(whereClause),
    ]);

    return {
      games: gamesList,
      total: Number(countResult[0]?.count || 0),
    };
  },

  /**
   * Record game score and complete the game
   */
  async recordScore(input: RecordScoreInput) {
    const game = await this.getById(input.gameId);
    if (!game) throw new Error('Game not found');

    const winningTeam = input.team1Score > input.team2Score ? 1 : 2;

    // Update game with score
    const [updatedGame] = await db
      .update(games)
      .set({
        scores: [{ team1: input.team1Score, team2: input.team2Score }],
        winningTeam,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(games.id, input.gameId))
      .returning();

    // Calculate and update ratings if ranked
    if (game.isRated) {
      await this.updateRatings(input.gameId, winningTeam);
    }

    // Emit real-time update
    emitToGame(input.gameId, SocketEvents.GAME_ENDED, {
      gameId: input.gameId,
      team1Score: input.team1Score,
      team2Score: input.team2Score,
      winningTeam,
    });

    return updatedGame;
  },

  /**
   * Update player ratings after game completion
   */
  async updateRatings(gameId: string, winningTeam: number) {
    const participants = await db.query.gameParticipants.findMany({
      where: eq(gameParticipants.gameId, gameId),
      with: {
        user: true,
      },
    });

    const team1Players = participants.filter((p) => p.team === 1);
    const team2Players = participants.filter((p) => p.team === 2);

    // Calculate average ratings for each team
    const getTeamAvgRating = (players: typeof participants) => {
      const total = players.reduce(
        (sum, p) => sum + parseFloat(p.ratingAtGame || '3.00'),
        0
      );
      return total / players.length;
    };

    const team1Avg = getTeamAvgRating(team1Players);
    const team2Avg = getTeamAvgRating(team2Players);

    // Update ratings for all participants
    for (const participant of participants) {
      const currentRating = parseFloat(participant.ratingAtGame || '3.00');
      const opponentAvg = participant.team === 1 ? team2Avg : team1Avg;
      const won = participant.team === winningTeam;

      const newRating = ratingService.calculateNewRating(
        currentRating,
        opponentAvg,
        won
      );

      // Update participant's rating change
      await db
        .update(gameParticipants)
        .set({
          ratingChange: (newRating - currentRating).toFixed(2),
        })
        .where(eq(gameParticipants.id, participant.id));

      // Update user's rating through userService
      await userService.updateRating(participant.userId, newRating);
      await userService.incrementStats(participant.userId, won);
    }
  },

  /**
   * Verify game result
   */
  async verify(gameId: string, userId: string) {
    // Mark participant as verified
    await db
      .update(gameParticipants)
      .set({ isConfirmed: true, confirmedAt: new Date() })
      .where(
        and(
          eq(gameParticipants.gameId, gameId),
          eq(gameParticipants.userId, userId)
        )
      );

    // Count verifications
    const verifiedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(gameParticipants)
      .where(
        and(
          eq(gameParticipants.gameId, gameId),
          eq(gameParticipants.isConfirmed, true)
        )
      );

    const [game] = await db
      .update(games)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId))
      .returning();

    // Emit verification update
    emitToGame(gameId, SocketEvents.GAME_VERIFIED, {
      gameId,
      userId,
      verificationCount: Number(verifiedCount[0]?.count || 0),
    });

    return {
      ...game,
      verificationCount: Number(verifiedCount[0]?.count || 0),
    };
  },

  /**
   * Dispute game result
   */
  async dispute(gameId: string, userId: string, reason: string) {
    const [game] = await db
      .update(games)
      .set({
        status: 'cancelled', // Set to cancelled as disputed isn't in enum
        notes: `DISPUTED by user ${userId}: ${reason}`,
        updatedAt: new Date(),
      })
      .where(eq(games.id, gameId))
      .returning();

    // Notify all participants
    const participants = await db.query.gameParticipants.findMany({
      where: eq(gameParticipants.gameId, gameId),
    });

    for (const participant of participants) {
      await notificationService.create({
        userId: participant.userId,
        type: 'match_result',
        title: 'Game Disputed',
        message: `A game result has been disputed: ${reason}`,
        data: { gameId },
      });
    }

    // Emit dispute event
    emitToGame(gameId, SocketEvents.GAME_DISPUTED, {
      gameId,
      disputedBy: userId,
      reason,
    });

    return game;
  },

  /**
   * Get recent completed games
   */
  async getRecent(limit = 10) {
    return db.query.games.findMany({
      where: eq(games.status, 'completed'),
      with: {
        court: true,
        venue: true,
        participants: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: desc(games.completedAt),
      limit,
    });
  },

  /**
   * Get scheduled games for a user
   */
  async getScheduledForUser(userId: string) {
    const participantGames = await db.query.gameParticipants.findMany({
      where: eq(gameParticipants.userId, userId),
      with: {
        game: {
          with: {
            court: true,
            venue: true,
            participants: {
              with: {
                user: {
                  columns: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return participantGames
      .map((pg) => pg.game)
      .filter(
        (g) =>
          g.status === 'scheduled' &&
          g.scheduledAt &&
          new Date(g.scheduledAt) > new Date()
      );
  },

  /**
   * Join an existing game
   */
  async joinGame(gameId: string, userId: string, team: number) {
    // Add participant to game
    const [participant] = await db
      .insert(gameParticipants)
      .values({
        gameId,
        userId,
        team,
        isConfirmed: true,
        confirmedAt: new Date(),
      })
      .returning();

    return participant;
  },
};
