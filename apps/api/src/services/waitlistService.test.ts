import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
      tournaments: {
        findFirst: vi.fn(),
      },
      tournamentRegistrations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      tournamentRegistrationPlayers: {
        findFirst: vi.fn(),
      },
      leagues: {
        findFirst: vi.fn(),
      },
      leagueSeasons: {
        findFirst: vi.fn(),
      },
      leagueParticipants: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      leagueParticipantPlayers: {
        findFirst: vi.fn(),
      },
    },
  },
  schema: {
    users: { id: 'id', clerkId: 'clerk_id', displayName: 'display_name', email: 'email' },
    tournaments: { id: 'id', name: 'name', currentParticipants: 'current_participants', maxParticipants: 'max_participants' },
    tournamentRegistrations: {
      id: 'id',
      tournamentId: 'tournament_id',
      divisionId: 'division_id',
      status: 'status',
      waitlistPosition: 'waitlist_position',
      spotOfferedAt: 'spot_offered_at',
      spotExpiresAt: 'spot_expires_at',
      registeredAt: 'registered_at',
    },
    tournamentRegistrationPlayers: { registrationId: 'registration_id', userId: 'user_id', isCaptain: 'is_captain' },
    leagues: { id: 'id', name: 'name' },
    leagueSeasons: { id: 'id', leagueId: 'league_id', seasonNumber: 'season_number', maxParticipants: 'max_participants' },
    leagueParticipants: { id: 'id', seasonId: 'season_id', rank: 'rank', status: 'status', createdAt: 'created_at', updatedAt: 'updated_at' },
    leagueParticipantPlayers: { participantId: 'participant_id', userId: 'user_id', isCaptain: 'is_captain' },
  },
}));

// Mock the notification service
vi.mock('./notificationService.js', () => ({
  notificationService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '../db/index.js';
import { waitlistService } from './waitlistService.js';
import { notificationService } from './notificationService.js';

// Helper to create mock data
function createMockTournament(overrides = {}) {
  return {
    id: 'tournament-uuid-123',
    name: 'Test Tournament',
    organizerId: 'organizer-uuid-123',
    status: 'registration_open',
    currentParticipants: 10,
    maxParticipants: 32,
    ...overrides,
  };
}

function createMockLeague(overrides = {}) {
  return {
    id: 'league-uuid-123',
    name: 'Test League',
    organizerId: 'organizer-uuid-123',
    ...overrides,
  };
}

function createMockSeason(overrides = {}) {
  return {
    id: 'season-uuid-123',
    leagueId: 'league-uuid-123',
    seasonNumber: 1,
    maxParticipants: 20,
    ...overrides,
  };
}

function createMockRegistration(overrides = {}) {
  return {
    id: 'registration-uuid-123',
    tournamentId: 'tournament-uuid-123',
    divisionId: null,
    status: 'waitlisted',
    waitlistPosition: 1,
    spotOfferedAt: null,
    spotExpiresAt: null,
    registeredAt: new Date(),
    ...overrides,
  };
}

function createMockParticipant(overrides = {}) {
  return {
    id: 'participant-uuid-123',
    seasonId: 'season-uuid-123',
    rank: -1,
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('WaitlistService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('addToWaitlist', () => {
    describe('Tournament Waitlist', () => {
      it('should add user to tournament waitlist with correct position', async () => {
        const mockTournament = createMockTournament();
        const mockRegistration = createMockRegistration();

        // Mock getting max waitlist position
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxPosition: 3 }]),
          }),
        } as any);

        // Mock transaction for insert
        vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockRegistration]),
              }),
            }),
          };
          return callback(tx);
        });

        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);
        vi.mocked(notificationService.create).mockResolvedValue(undefined);

        const result = await waitlistService.addToWaitlist(
          'user-uuid-123',
          'tournament',
          'tournament-uuid-123'
        );

        expect(result).toHaveProperty('registrationId');
        expect(result).toHaveProperty('position');
        expect(db.transaction).toHaveBeenCalled();
      });

      it('should add user to tournament waitlist with division', async () => {
        const mockTournament = createMockTournament();
        const mockRegistration = createMockRegistration({ divisionId: 'division-uuid-123' });

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxPosition: 0 }]),
          }),
        } as any);

        vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockRegistration]),
              }),
            }),
          };
          return callback(tx);
        });

        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

        const result = await waitlistService.addToWaitlist(
          'user-uuid-123',
          'tournament',
          'tournament-uuid-123',
          'division-uuid-123'
        );

        expect(result).toHaveProperty('registrationId');
        expect(result.position).toBe(1); // First in waitlist
      });

      it('should send notification when added to tournament waitlist', async () => {
        const mockTournament = createMockTournament();
        const mockRegistration = createMockRegistration();

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxPosition: 0 }]),
          }),
        } as any);

        vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockRegistration]),
              }),
            }),
          };
          return callback(tx);
        });

        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

        await waitlistService.addToWaitlist(
          'user-uuid-123',
          'tournament',
          'tournament-uuid-123'
        );

        expect(notificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-uuid-123',
            type: 'tournament_update',
            title: "You're on the waitlist!",
          })
        );
      });
    });

    describe('League Waitlist', () => {
      it('should add user to league waitlist with correct position', async () => {
        const mockLeague = createMockLeague();
        const mockSeason = createMockSeason();
        const mockParticipant = createMockParticipant();

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxRank: 0 }]),
          }),
        } as any);

        vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockParticipant]),
              }),
            }),
          };
          return callback(tx);
        });

        vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);

        const result = await waitlistService.addToWaitlist(
          'user-uuid-123',
          'league',
          'league-uuid-123'
        );

        expect(result).toHaveProperty('registrationId');
        expect(result).toHaveProperty('position');
      });

      it('should add user to league waitlist with specific season', async () => {
        const mockLeague = createMockLeague();
        const mockSeason = createMockSeason({ id: 'season-2-uuid' });
        const mockParticipant = createMockParticipant({ seasonId: 'season-2-uuid' });

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxRank: -2 }]),
          }),
        } as any);

        vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockParticipant]),
              }),
            }),
          };
          return callback(tx);
        });

        vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);

        const result = await waitlistService.addToWaitlist(
          'user-uuid-123',
          'league',
          'league-uuid-123',
          'season-2-uuid'
        );

        expect(result).toHaveProperty('registrationId');
        expect(result.position).toBe(3); // Position is absolute value of -3
      });

      it('should throw error when no active season found', async () => {
        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(null);

        await expect(
          waitlistService.addToWaitlist('user-uuid-123', 'league', 'league-uuid-123')
        ).rejects.toThrow('No active season found for this league');
      });

      it('should send notification when added to league waitlist', async () => {
        const mockLeague = createMockLeague();
        const mockSeason = createMockSeason();
        const mockParticipant = createMockParticipant();

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxRank: 0 }]),
          }),
        } as any);

        vi.mocked(db.transaction).mockImplementation(async (callback: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([mockParticipant]),
              }),
            }),
          };
          return callback(tx);
        });

        vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);

        await waitlistService.addToWaitlist('user-uuid-123', 'league', 'league-uuid-123');

        expect(notificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-uuid-123',
            type: 'league_update',
            title: "You're on the waitlist!",
          })
        );
      });
    });
  });

  describe('getWaitlistPosition', () => {
    describe('Tournament Position', () => {
      it('should return user position on tournament waitlist', async () => {
        const mockRegistration = createMockRegistration({
          waitlistPosition: 3,
          status: 'waitlisted',
        });

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValueOnce([mockRegistration]),
              }),
            }),
          }),
        } as any);

        // Mock total count
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockRegistration]),
              }),
            }),
          }),
        } as any).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        } as any);

        const result = await waitlistService.getWaitlistPosition(
          'user-uuid-123',
          'tournament',
          'tournament-uuid-123'
        );

        expect(result).not.toBeNull();
        expect(result!.position).toBe(3);
        expect(result!.totalWaitlisted).toBe(5);
        expect(result!.status).toBe('waitlisted');
      });

      it('should return null when user is not on tournament waitlist', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        } as any);

        const result = await waitlistService.getWaitlistPosition(
          'user-uuid-123',
          'tournament',
          'tournament-uuid-123'
        );

        expect(result).toBeNull();
      });

      it('should return spot offer info when status is spot_offered', async () => {
        const spotOfferedAt = new Date();
        const spotExpiresAt = new Date(spotOfferedAt.getTime() + 24 * 60 * 60 * 1000);

        const mockRegistration = createMockRegistration({
          waitlistPosition: 1,
          status: 'spot_offered',
          spotOfferedAt,
          spotExpiresAt,
        });

        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockRegistration]),
              }),
            }),
          }),
        } as any).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 3 }]),
          }),
        } as any);

        const result = await waitlistService.getWaitlistPosition(
          'user-uuid-123',
          'tournament',
          'tournament-uuid-123'
        );

        expect(result).not.toBeNull();
        expect(result!.status).toBe('spot_offered');
        expect(result!.spotOfferedAt).toEqual(spotOfferedAt);
        expect(result!.spotExpiresAt).toEqual(spotExpiresAt);
      });
    });

    describe('League Position', () => {
      it('should return user position on league waitlist', async () => {
        const mockSeason = createMockSeason();
        const mockParticipation = { id: 'part-1', rank: -2, status: 'active' };

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockParticipation]),
              }),
            }),
          }),
        } as any).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 4 }]),
          }),
        } as any);

        const result = await waitlistService.getWaitlistPosition(
          'user-uuid-123',
          'league',
          'league-uuid-123'
        );

        expect(result).not.toBeNull();
        expect(result!.position).toBe(2); // Absolute value of -2
        expect(result!.totalWaitlisted).toBe(4);
        expect(result!.status).toBe('waitlisted');
      });

      it('should return null when no active season', async () => {
        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(null);

        const result = await waitlistService.getWaitlistPosition(
          'user-uuid-123',
          'league',
          'league-uuid-123'
        );

        expect(result).toBeNull();
      });

      it('should return null when user is not on league waitlist', async () => {
        const mockSeason = createMockSeason();
        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        } as any);

        const result = await waitlistService.getWaitlistPosition(
          'user-uuid-123',
          'league',
          'league-uuid-123'
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('processWaitlist', () => {
    describe('Tournament Waitlist Processing', () => {
      it('should offer spot to next person in tournament waitlist', async () => {
        const mockRegistration = createMockRegistration({ waitlistPosition: 1 });
        const mockPlayer = { userId: 'user-uuid-123', user: { id: 'user-uuid-123' } };
        const mockTournament = createMockTournament();

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockRegistration]),
              }),
            }),
          }),
        } as any);

        vi.mocked(db.query.tournamentRegistrationPlayers.findFirst).mockResolvedValue(mockPlayer as any);
        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

        vi.mocked(db.update).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        } as any);

        const result = await waitlistService.processWaitlist('tournament', 'tournament-uuid-123');

        expect(result).not.toBeNull();
        expect(result!.userId).toBe('user-uuid-123');
        expect(result!.registrationId).toBe('registration-uuid-123');
        expect(db.update).toHaveBeenCalled();
      });

      it('should return null when no one is on tournament waitlist', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        } as any);

        const result = await waitlistService.processWaitlist('tournament', 'tournament-uuid-123');

        expect(result).toBeNull();
      });

      it('should send notification when spot is offered', async () => {
        const mockRegistration = createMockRegistration({ waitlistPosition: 1 });
        const mockPlayer = { userId: 'user-uuid-123', user: { id: 'user-uuid-123' } };
        const mockTournament = createMockTournament();

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockRegistration]),
              }),
            }),
          }),
        } as any);

        vi.mocked(db.query.tournamentRegistrationPlayers.findFirst).mockResolvedValue(mockPlayer as any);
        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

        vi.mocked(db.update).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        } as any);

        await waitlistService.processWaitlist('tournament', 'tournament-uuid-123');

        expect(notificationService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-uuid-123',
            type: 'tournament_update',
            title: 'A spot opened up!',
          })
        );
      });
    });

    describe('League Waitlist Processing', () => {
      it('should promote next person in league waitlist', async () => {
        const mockSeason = createMockSeason();
        const mockParticipant = createMockParticipant({ rank: -1 });
        const mockPlayer = { userId: 'user-uuid-123', user: { id: 'user-uuid-123' } };
        const mockLeague = createMockLeague();

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([mockParticipant]),
              }),
            }),
          }),
        } as any).mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxRank: 5 }]),
          }),
        } as any);

        vi.mocked(db.query.leagueParticipantPlayers.findFirst).mockResolvedValue(mockPlayer as any);
        vi.mocked(db.query.leagues.findFirst).mockResolvedValue(mockLeague as any);

        vi.mocked(db.update).mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        } as any);

        const result = await waitlistService.processWaitlist('league', 'league-uuid-123');

        expect(result).not.toBeNull();
        expect(result!.userId).toBe('user-uuid-123');
      });

      it('should return null when no active season', async () => {
        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(null);

        const result = await waitlistService.processWaitlist('league', 'league-uuid-123');

        expect(result).toBeNull();
      });

      it('should return null when no one is on league waitlist', async () => {
        const mockSeason = createMockSeason();
        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        } as any);

        const result = await waitlistService.processWaitlist('league', 'league-uuid-123');

        expect(result).toBeNull();
      });
    });
  });

  describe('acceptWaitlistSpot', () => {
    it('should accept spot within 24 hours', async () => {
      const futureExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
      const mockRegistration = createMockRegistration({
        status: 'spot_offered',
        spotExpiresAt: futureExpiry,
      });
      const mockTournament = createMockTournament();

      // Mock the select chain with innerJoin for finding registration
      const selectMock = vi.fn();
      selectMock.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockRegistration]),
            }),
          }),
        }),
      }).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      const result = await waitlistService.acceptWaitlistSpot(
        'user-uuid-123',
        'tournament',
        'tournament-uuid-123'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Spot accepted successfully');
    });

    it('should return error when spot offer has expired', async () => {
      const pastExpiry = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const mockRegistration = createMockRegistration({
        status: 'spot_offered',
        spotExpiresAt: pastExpiry,
      });

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockRegistration]),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await waitlistService.acceptWaitlistSpot(
        'user-uuid-123',
        'tournament',
        'tournament-uuid-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Spot offer has expired');
    });

    it('should return error when no spot offer found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const result = await waitlistService.acceptWaitlistSpot(
        'user-uuid-123',
        'tournament',
        'tournament-uuid-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No spot offer found');
    });

    it('should return error for league events', async () => {
      const result = await waitlistService.acceptWaitlistSpot(
        'user-uuid-123',
        'league',
        'league-uuid-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Accept spot is only available for tournaments');
    });

    it('should update participant count when accepting spot', async () => {
      const futureExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const mockRegistration = createMockRegistration({
        status: 'spot_offered',
        spotExpiresAt: futureExpiry,
      });
      const mockTournament = createMockTournament();

      // Mock the select chain with innerJoin for finding registration
      const selectMock = vi.fn();
      selectMock.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockRegistration]),
            }),
          }),
        }),
      }).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(selectMock);

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock);

      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      await waitlistService.acceptWaitlistSpot(
        'user-uuid-123',
        'tournament',
        'tournament-uuid-123'
      );

      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('declineWaitlistSpot', () => {
    it('should decline spot and offer to next person', async () => {
      const mockRegistration = createMockRegistration({
        status: 'spot_offered',
      });

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockRegistration]),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await waitlistService.declineWaitlistSpot(
        'user-uuid-123',
        'tournament',
        'tournament-uuid-123'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Spot declined. The next person in line will be notified.');
    });

    it('should return error when no spot offer found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const result = await waitlistService.declineWaitlistSpot(
        'user-uuid-123',
        'tournament',
        'tournament-uuid-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No spot offer found');
    });

    it('should return error for league events', async () => {
      const result = await waitlistService.declineWaitlistSpot(
        'user-uuid-123',
        'league',
        'league-uuid-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Decline spot is only available for tournaments');
    });

    it('should mark registration as withdrawn', async () => {
      const mockRegistration = createMockRegistration({
        status: 'spot_offered',
      });

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockRegistration]),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock);

      await waitlistService.declineWaitlistSpot(
        'user-uuid-123',
        'tournament',
        'tournament-uuid-123'
      );

      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('expireOldSpotOffers', () => {
    it('should expire spot offers past 24 hours', async () => {
      const pastExpiry = new Date(Date.now() - 60 * 60 * 1000);
      const expiredRegistration = {
        id: 'reg-expired-1',
        tournamentId: 'tournament-uuid-123',
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expiredRegistration]),
        }),
      } as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.query.tournamentRegistrationPlayers.findFirst).mockResolvedValue({
        userId: 'user-uuid-123',
      } as any);

      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(createMockTournament() as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const count = await waitlistService.expireOldSpotOffers();

      expect(count).toBe(1);
      expect(db.update).toHaveBeenCalled();
    });

    it('should return 0 when no offers to expire', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const count = await waitlistService.expireOldSpotOffers();

      expect(count).toBe(0);
    });

    it('should notify user when their offer expires', async () => {
      const expiredRegistration = {
        id: 'reg-expired-1',
        tournamentId: 'tournament-uuid-123',
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expiredRegistration]),
        }),
      } as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.query.tournamentRegistrationPlayers.findFirst).mockResolvedValue({
        userId: 'user-uuid-123',
      } as any);

      const mockTournament = createMockTournament();
      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await waitlistService.expireOldSpotOffers();

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-123',
          type: 'tournament_update',
          title: 'Spot offer expired',
        })
      );
    });

    it('should process waitlist after expiring offers', async () => {
      const expiredRegistration = {
        id: 'reg-expired-1',
        tournamentId: 'tournament-uuid-123',
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expiredRegistration]),
        }),
      } as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      } as any);

      vi.mocked(db.query.tournamentRegistrationPlayers.findFirst).mockResolvedValue({
        userId: 'user-uuid-123',
      } as any);

      vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(createMockTournament() as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await waitlistService.expireOldSpotOffers();

      // Should call select multiple times - once for expired, once for reorder, once for process
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe('isEventFull', () => {
    describe('Tournament Full Check', () => {
      it('should return true when tournament is at capacity', async () => {
        const mockTournament = createMockTournament({
          currentParticipants: 32,
          maxParticipants: 32,
        });

        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

        const result = await waitlistService.isEventFull('tournament', 'tournament-uuid-123');

        expect(result.isFull).toBe(true);
        expect(result.currentCount).toBe(32);
        expect(result.maxCount).toBe(32);
      });

      it('should return false when tournament has spots available', async () => {
        const mockTournament = createMockTournament({
          currentParticipants: 20,
          maxParticipants: 32,
        });

        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

        const result = await waitlistService.isEventFull('tournament', 'tournament-uuid-123');

        expect(result.isFull).toBe(false);
        expect(result.currentCount).toBe(20);
        expect(result.maxCount).toBe(32);
      });

      it('should return false when tournament has no max participants', async () => {
        const mockTournament = createMockTournament({
          currentParticipants: 100,
          maxParticipants: null,
        });

        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(mockTournament as any);

        const result = await waitlistService.isEventFull('tournament', 'tournament-uuid-123');

        expect(result.isFull).toBe(false);
        expect(result.maxCount).toBeNull();
      });

      it('should throw error when tournament not found', async () => {
        vi.mocked(db.query.tournaments.findFirst).mockResolvedValue(null);

        await expect(
          waitlistService.isEventFull('tournament', 'nonexistent-tournament')
        ).rejects.toThrow('Tournament not found');
      });
    });

    describe('League Full Check', () => {
      it('should return true when league season is at capacity', async () => {
        const mockSeason = createMockSeason({ maxParticipants: 20 });

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 20 }]),
          }),
        } as any);

        const result = await waitlistService.isEventFull('league', 'league-uuid-123');

        expect(result.isFull).toBe(true);
        expect(result.currentCount).toBe(20);
        expect(result.maxCount).toBe(20);
      });

      it('should return false when league season has spots available', async () => {
        const mockSeason = createMockSeason({ maxParticipants: 20 });

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 15 }]),
          }),
        } as any);

        const result = await waitlistService.isEventFull('league', 'league-uuid-123');

        expect(result.isFull).toBe(false);
        expect(result.currentCount).toBe(15);
      });

      it('should throw error when no active season found', async () => {
        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(null);

        await expect(
          waitlistService.isEventFull('league', 'league-uuid-123')
        ).rejects.toThrow('No active season found');
      });

      it('should return false when league has no max participants', async () => {
        const mockSeason = createMockSeason({ maxParticipants: null });

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 50 }]),
          }),
        } as any);

        const result = await waitlistService.isEventFull('league', 'league-uuid-123');

        expect(result.isFull).toBe(false);
        expect(result.maxCount).toBeNull();
      });
    });
  });

  describe('getWaitlistEntries', () => {
    describe('Tournament Entries', () => {
      it('should return all waitlist entries for tournament', async () => {
        const mockEntries = [
          {
            id: 'reg-1',
            position: 1,
            status: 'waitlisted',
            spotOfferedAt: null,
            spotExpiresAt: null,
            registeredAt: new Date(),
            userId: 'user-1',
            displayName: 'User One',
            email: 'user1@test.com',
          },
          {
            id: 'reg-2',
            position: 2,
            status: 'waitlisted',
            spotOfferedAt: null,
            spotExpiresAt: null,
            registeredAt: new Date(),
            userId: 'user-2',
            displayName: 'User Two',
            email: 'user2@test.com',
          },
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockEntries),
                }),
              }),
            }),
          }),
        } as any);

        const entries = await waitlistService.getWaitlistEntries('tournament', 'tournament-uuid-123');

        expect(entries).toHaveLength(2);
        expect(entries[0].position).toBe(1);
        expect(entries[0].user.displayName).toBe('User One');
      });

      it('should return empty array when no waitlist entries', async () => {
        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        } as any);

        const entries = await waitlistService.getWaitlistEntries('tournament', 'tournament-uuid-123');

        expect(entries).toHaveLength(0);
      });
    });

    describe('League Entries', () => {
      it('should return all waitlist entries for league', async () => {
        const mockSeason = createMockSeason();
        const mockEntries = [
          {
            id: 'part-1',
            rank: -1,
            status: 'active',
            createdAt: new Date(),
            userId: 'user-1',
            displayName: 'User One',
            email: 'user1@test.com',
          },
          {
            id: 'part-2',
            rank: -2,
            status: 'active',
            createdAt: new Date(),
            userId: 'user-2',
            displayName: 'User Two',
            email: 'user2@test.com',
          },
        ];

        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(mockSeason as any);

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue(mockEntries),
                }),
              }),
            }),
          }),
        } as any);

        const entries = await waitlistService.getWaitlistEntries('league', 'league-uuid-123');

        expect(entries).toHaveLength(2);
        expect(entries[0].position).toBe(1); // Absolute value of -1
        expect(entries[1].position).toBe(2); // Absolute value of -2
      });

      it('should return empty array when no active season', async () => {
        vi.mocked(db.query.leagueSeasons.findFirst).mockResolvedValue(null);

        const entries = await waitlistService.getWaitlistEntries('league', 'league-uuid-123');

        expect(entries).toHaveLength(0);
      });
    });
  });

  describe('reorderWaitlistPositions', () => {
    it('should reorder tournament waitlist positions sequentially', async () => {
      const mockWaitlisted = [
        { id: 'reg-1', waitlistPosition: 3 },
        { id: 'reg-2', waitlistPosition: 5 },
        { id: 'reg-3', waitlistPosition: 7 },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockWaitlisted),
          }),
        }),
      } as any);

      const updateMock = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockImplementation(updateMock);

      await waitlistService.reorderWaitlistPositions('tournament', 'tournament-uuid-123');

      expect(updateMock).toHaveBeenCalledTimes(3);
    });

    it('should do nothing for league waitlists', async () => {
      // Leagues use negative rank which self-orders
      await waitlistService.reorderWaitlistPositions('league', 'league-uuid-123');

      expect(db.select).not.toHaveBeenCalled();
    });
  });
});
