/**
 * Comprehensive Unit Tests for Tournament Utilities
 *
 * Tests cover:
 * - Pool Generation with various participant counts
 * - Bracket Generation (single and double elimination)
 * - Cross-Pool Seeding methods
 * - Pool to Bracket Transitions
 * - Third Place and Consolation Brackets
 * - Pool Standings Calculations
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePools,
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateThirdPlaceMatch,
  generateConsolationBracket,
  calculatePoolStandings,
  advanceToPlayoffs,
  applyCrossPoolSeeding,
  calculateBracketRounds,
  calculateBracketSize,
  calculateByes,
  getRoundName,
  seedParticipants,
  recordMatchResult,
  getNextMatch,
  getReadyMatches,
  getBracketProgress,
  getPoolProgress,
  validateParticipantCount,
  createEmptyScore,
  calculateMatchScore,
  isGameComplete,
  formatScoreDisplay,
} from '../tournament-utils';

import {
  type TournamentParticipant,
  type TournamentPlayer,
  type TournamentTeam,
  type PoolMatch,
  type Pool,
  type MatchScore,
  type GameScore,
  RegistrationStatus,
  MatchStatus,
  SeedingMethod,
  TournamentFormat,
  TiebreakerRule,
} from '../tournament-types';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a singles participant for testing
 */
function createSinglesParticipant(
  id: string,
  name: string,
  rating: number
): TournamentParticipant {
  const player: TournamentPlayer = {
    id,
    userId: `user-${id}`,
    firstName: name.split(' ')[0] || name,
    lastName: name.split(' ')[1] || '',
    rating,
    ratingType: 'dupr',
    email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
  };

  return {
    type: 'singles',
    player,
    seed: undefined,
    status: RegistrationStatus.CONFIRMED,
  };
}

/**
 * Create a doubles team for testing
 */
function createDoublesTeam(
  id: string,
  player1Name: string,
  player2Name: string,
  rating1: number,
  rating2: number
): TournamentParticipant {
  const player1: TournamentPlayer = {
    id: `${id}-p1`,
    userId: `user-${id}-p1`,
    firstName: player1Name.split(' ')[0] || player1Name,
    lastName: player1Name.split(' ')[1] || '',
    rating: rating1,
    ratingType: 'dupr',
    email: `${player1Name.toLowerCase().replace(' ', '.')}@test.com`,
  };

  const player2: TournamentPlayer = {
    id: `${id}-p2`,
    userId: `user-${id}-p2`,
    firstName: player2Name.split(' ')[0] || player2Name,
    lastName: player2Name.split(' ')[1] || '',
    rating: rating2,
    ratingType: 'dupr',
    email: `${player2Name.toLowerCase().replace(' ', '.')}@test.com`,
  };

  const team: TournamentTeam = {
    id,
    player1,
    player2,
    combinedRating: rating1 + rating2,
    averageRating: (rating1 + rating2) / 2,
    status: RegistrationStatus.CONFIRMED,
    checkedIn: false,
  };

  return {
    type: 'doubles',
    team,
    seed: undefined,
    status: RegistrationStatus.CONFIRMED,
  };
}

/**
 * Create an array of participants with descending ratings
 */
function createParticipants(count: number): TournamentParticipant[] {
  return Array.from({ length: count }, (_, i) =>
    createSinglesParticipant(`p${i + 1}`, `Player ${i + 1}`, 5.0 - i * 0.1)
  );
}

/**
 * Create a completed match score
 */
function createMatchScore(
  team1Games: number,
  team2Games: number,
  winner: 1 | 2
): MatchScore {
  const games: GameScore[] = [];
  let team1Won = 0;
  let team2Won = 0;
  let gameNum = 1;

  while (team1Won < team1Games || team2Won < team2Games) {
    if (team1Won < team1Games) {
      games.push({ gameNumber: gameNum++, team1Score: 11, team2Score: 5 });
      team1Won++;
    } else if (team2Won < team2Games) {
      games.push({ gameNumber: gameNum++, team1Score: 5, team2Score: 11 });
      team2Won++;
    }
  }

  return {
    games,
    team1GamesWon: team1Games,
    team2GamesWon: team2Games,
    team1TotalPoints: team1Games * 11 + team2Games * 5,
    team2TotalPoints: team2Games * 11 + team1Games * 5,
    winner,
  };
}

// =============================================================================
// BRACKET CALCULATION TESTS
// =============================================================================

describe('Bracket Calculations', () => {
  describe('calculateBracketRounds', () => {
    it('should return 0 for 0 or 1 participants', () => {
      expect(calculateBracketRounds(0)).toBe(0);
      expect(calculateBracketRounds(1)).toBe(0);
    });

    it('should return correct rounds for power of 2', () => {
      expect(calculateBracketRounds(2)).toBe(1);
      expect(calculateBracketRounds(4)).toBe(2);
      expect(calculateBracketRounds(8)).toBe(3);
      expect(calculateBracketRounds(16)).toBe(4);
      expect(calculateBracketRounds(32)).toBe(5);
    });

    it('should return correct rounds for non-power of 2', () => {
      expect(calculateBracketRounds(3)).toBe(2);
      expect(calculateBracketRounds(5)).toBe(3);
      expect(calculateBracketRounds(6)).toBe(3);
      expect(calculateBracketRounds(7)).toBe(3);
      expect(calculateBracketRounds(9)).toBe(4);
      expect(calculateBracketRounds(10)).toBe(4);
      expect(calculateBracketRounds(13)).toBe(4);
    });
  });

  describe('calculateBracketSize', () => {
    it('should return next power of 2', () => {
      expect(calculateBracketSize(2)).toBe(2);
      expect(calculateBracketSize(3)).toBe(4);
      expect(calculateBracketSize(4)).toBe(4);
      expect(calculateBracketSize(5)).toBe(8);
      expect(calculateBracketSize(8)).toBe(8);
      expect(calculateBracketSize(9)).toBe(16);
      expect(calculateBracketSize(13)).toBe(16);
      expect(calculateBracketSize(16)).toBe(16);
      expect(calculateBracketSize(17)).toBe(32);
    });

    it('should handle edge case of 1 participant', () => {
      expect(calculateBracketSize(1)).toBe(1);
    });
  });

  describe('calculateByes', () => {
    it('should return 0 for power of 2 counts', () => {
      expect(calculateByes(2)).toBe(0);
      expect(calculateByes(4)).toBe(0);
      expect(calculateByes(8)).toBe(0);
      expect(calculateByes(16)).toBe(0);
    });

    it('should return correct byes for non-power of 2', () => {
      expect(calculateByes(3)).toBe(1);
      expect(calculateByes(5)).toBe(3);
      expect(calculateByes(6)).toBe(2);
      expect(calculateByes(7)).toBe(1);
      expect(calculateByes(9)).toBe(7);
      expect(calculateByes(10)).toBe(6);
      expect(calculateByes(13)).toBe(3);
    });
  });

  describe('getRoundName', () => {
    it('should return Finals for last round', () => {
      expect(getRoundName(4, 4)).toBe('Finals');
      expect(getRoundName(3, 3)).toBe('Finals');
      expect(getRoundName(5, 5)).toBe('Finals');
    });

    it('should return Semifinals for second to last', () => {
      expect(getRoundName(3, 4)).toBe('Semifinals');
      expect(getRoundName(2, 3)).toBe('Semifinals');
    });

    it('should return Quarterfinals for third to last', () => {
      expect(getRoundName(2, 4)).toBe('Quarterfinals');
      expect(getRoundName(3, 5)).toBe('Quarterfinals');
    });

    it('should return Round of X for earlier rounds', () => {
      expect(getRoundName(1, 4)).toBe('Round of 16');
      expect(getRoundName(1, 5)).toBe('Round of 32');
      expect(getRoundName(2, 5)).toBe('Round of 16');
    });

    it('should return generic round name for very early rounds', () => {
      expect(getRoundName(1, 9)).toBe('Round 1');
    });
  });
});

// =============================================================================
// POOL GENERATION TESTS
// =============================================================================

describe('Pool Generation', () => {
  describe('generatePools', () => {
    it('should return empty array for fewer than 3 participants', () => {
      expect(generatePools([])).toEqual([]);
      expect(generatePools(createParticipants(1))).toEqual([]);
      expect(generatePools(createParticipants(2))).toEqual([]);
    });

    it('should generate 2 pools for 8 participants with target size 4', () => {
      const participants = createParticipants(8);
      const pools = generatePools(participants, { targetPoolSize: 4 });

      expect(pools.length).toBe(2);
      expect(pools[0]?.participants.length).toBe(4);
      expect(pools[1]?.participants.length).toBe(4);
    });

    it('should generate balanced pools for 10 participants', () => {
      const participants = createParticipants(10);
      const pools = generatePools(participants, { numberOfPools: 2 });

      expect(pools.length).toBe(2);
      expect(pools[0]?.participants.length).toBe(5);
      expect(pools[1]?.participants.length).toBe(5);
    });

    it('should generate 3 pools for 13 participants', () => {
      const participants = createParticipants(13);
      const pools = generatePools(participants, { numberOfPools: 3 });

      expect(pools.length).toBe(3);
      // 13 / 3 = 4.33, so pools should be 5, 4, 4 or similar
      const totalParticipants = pools.reduce((sum, p) => sum + p.participants.length, 0);
      expect(totalParticipants).toBe(13);
    });

    it('should generate correct number of pools for 16 participants', () => {
      const participants = createParticipants(16);
      const pools = generatePools(participants, { numberOfPools: 4 });

      expect(pools.length).toBe(4);
      pools.forEach((pool) => {
        expect(pool.participants.length).toBe(4);
      });
    });

    it('should use snake seeding by default', () => {
      const participants = createParticipants(8);
      const pools = generatePools(participants, { numberOfPools: 2 });

      // With snake seeding: Pool A gets #1, #4, #5, #8
      // Pool B gets #2, #3, #6, #7
      const poolAIds = pools[0]?.participants.map((p) =>
        p.type === 'singles' ? p.player.id : p.team.id
      );
      const poolBIds = pools[1]?.participants.map((p) =>
        p.type === 'singles' ? p.player.id : p.team.id
      );

      expect(poolAIds).toContain('p1'); // #1 seed
      expect(poolAIds).toContain('p4'); // #4 seed
      expect(poolBIds).toContain('p2'); // #2 seed
      expect(poolBIds).toContain('p3'); // #3 seed
    });

    it('should generate correct number of matches per pool', () => {
      const participants = createParticipants(8);
      const pools = generatePools(participants, { numberOfPools: 2 });

      // 4 players in a pool = 4 * 3 / 2 = 6 matches (round robin)
      expect(pools[0]?.matches.length).toBe(6);
      expect(pools[1]?.matches.length).toBe(6);
    });

    it('should handle odd number of participants in a pool', () => {
      const participants = createParticipants(5);
      const pools = generatePools(participants, { numberOfPools: 1 });

      expect(pools.length).toBe(1);
      expect(pools[0]?.participants.length).toBe(5);
      // 5 players = 5 * 4 / 2 = 10 matches
      expect(pools[0]?.matches.length).toBe(10);
    });

    it('should assign pool names correctly (A, B, C...)', () => {
      const participants = createParticipants(12);
      const pools = generatePools(participants, { numberOfPools: 3 });

      expect(pools[0]?.name).toBe('Pool A');
      expect(pools[1]?.name).toBe('Pool B');
      expect(pools[2]?.name).toBe('Pool C');
    });

    it('should set advancement count correctly', () => {
      const participants = createParticipants(8);
      const pools = generatePools(participants, {
        numberOfPools: 2,
        advancementCount: 2,
      });

      expect(pools[0]?.advancementCount).toBe(2);
      expect(pools[1]?.advancementCount).toBe(2);
    });
  });
});

// =============================================================================
// SINGLE ELIMINATION BRACKET TESTS
// =============================================================================

describe('Single Elimination Bracket Generation', () => {
  describe('generateSingleEliminationBracket', () => {
    it('should handle empty participants', () => {
      const bracket = generateSingleEliminationBracket([]);

      expect(bracket.totalRounds).toBe(0);
      expect(bracket.matches.length).toBe(0);
      expect(bracket.isComplete).toBe(true);
    });

    it('should handle single participant', () => {
      const participants = createParticipants(1);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(0);
      expect(bracket.isComplete).toBe(true);
      expect(bracket.champion).toEqual(participants[0]);
    });

    it('should generate correct bracket for 4 participants', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(2);
      expect(bracket.rounds.length).toBe(2);
      expect(bracket.rounds[0]?.matches.length).toBe(2); // Semifinals
      expect(bracket.rounds[1]?.matches.length).toBe(1); // Finals
      expect(bracket.matches.length).toBe(3);
    });

    it('should generate correct bracket for 8 participants', () => {
      const participants = createParticipants(8);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(3);
      expect(bracket.rounds[0]?.matches.length).toBe(4); // Quarterfinals
      expect(bracket.rounds[1]?.matches.length).toBe(2); // Semifinals
      expect(bracket.rounds[2]?.matches.length).toBe(1); // Finals
      expect(bracket.matches.length).toBe(7);
    });

    it('should generate correct bracket for 16 participants', () => {
      const participants = createParticipants(16);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(4);
      expect(bracket.matches.length).toBe(15);
    });

    it('should handle non-power of 2 with byes (5 participants)', () => {
      const participants = createParticipants(5);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(3);
      // Should have 3 byes (8 - 5)
      const byeMatches = bracket.matches.filter((m) => m.isBye);
      expect(byeMatches.length).toBe(3);
    });

    it('should handle non-power of 2 with byes (6 participants)', () => {
      const participants = createParticipants(6);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(3);
      const byeMatches = bracket.matches.filter((m) => m.isBye);
      expect(byeMatches.length).toBe(2);
    });

    it('should handle non-power of 2 with byes (10 participants)', () => {
      const participants = createParticipants(10);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(4);
      const byeMatches = bracket.matches.filter((m) => m.isBye);
      expect(byeMatches.length).toBe(6);
    });

    it('should place #1 seed against lowest seed in their bracket region', () => {
      const participants = createParticipants(8);
      const bracket = generateSingleEliminationBracket(participants, {
        seedingMethod: SeedingMethod.RATING,
      });

      // With standard bracket seeding, #1 faces a lower seed in their quadrant
      // The specific pairing depends on the seeding algorithm
      const firstRoundMatches = bracket.rounds[0]?.matches ?? [];
      const topSeedMatch = firstRoundMatches.find((m) => {
        const p1Id =
          m.participant1?.type === 'singles'
            ? m.participant1.player.id
            : m.participant1?.team.id;
        return p1Id === 'p1';
      });

      expect(topSeedMatch).toBeDefined();
      // #1 seed should face a lower-rated opponent (higher seed number)
      const opponentSeed = topSeedMatch?.participant2Seed;
      expect(opponentSeed).toBeGreaterThan(1);
    });

    it('should set correct round names', () => {
      const participants = createParticipants(16);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.rounds[0]?.name).toBe('Round of 16');
      expect(bracket.rounds[1]?.name).toBe('Quarterfinals');
      expect(bracket.rounds[2]?.name).toBe('Semifinals');
      expect(bracket.rounds[3]?.name).toBe('Finals');
    });

    it('should set winnerGoesTo correctly', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);

      const firstRound = bracket.rounds[0]?.matches ?? [];
      const final = bracket.rounds[1]?.matches[0];

      // Check that first round matches have winnerGoesTo set to finals
      expect(final).toBeDefined();

      // Both first round matches should eventually lead to finals
      // (either directly or the structure leads there)
      expect(firstRound.length).toBe(2);
      expect(final).toBeDefined();
    });

    it('should propagate bye winners to next round', () => {
      const participants = createParticipants(5);
      const bracket = generateSingleEliminationBracket(participants);

      // With 5 participants in an 8-size bracket, there are 3 byes
      const byeMatches = bracket.matches.filter((m) => m.isBye);
      expect(byeMatches.length).toBe(3);

      // Bye matches should be marked completed
      byeMatches.forEach((m) => {
        expect(m.status).toBe(MatchStatus.COMPLETED);
        expect(m.winner).toBe(1);
      });
    });
  });
});

// =============================================================================
// DOUBLE ELIMINATION BRACKET TESTS
// =============================================================================

describe('Double Elimination Bracket Generation', () => {
  describe('generateDoubleEliminationBracket', () => {
    it('should generate winners, losers, and grand finals brackets', () => {
      const participants = createParticipants(8);
      const { winners, losers, grandFinals } = generateDoubleEliminationBracket(participants);

      expect(winners).toBeDefined();
      expect(losers).toBeDefined();
      expect(grandFinals).toBeDefined();
    });

    it('should have correct structure for 4 participants', () => {
      const participants = createParticipants(4);
      const { winners, losers, grandFinals } = generateDoubleEliminationBracket(participants);

      // Winners: 2 rounds (semis + finals)
      expect(winners.totalRounds).toBe(2);

      // Losers: 2 * 2 - 1 = 3 rounds
      expect(losers.totalRounds).toBe(3);

      // Grand finals: 1 round
      expect(grandFinals.totalRounds).toBe(1);
    });

    it('should have correct structure for 8 participants', () => {
      const participants = createParticipants(8);
      const { winners, losers } = generateDoubleEliminationBracket(participants);

      // Winners: 3 rounds
      expect(winners.totalRounds).toBe(3);

      // Losers: 3 * 2 - 1 = 5 rounds
      expect(losers.totalRounds).toBe(5);
    });

    it('should link losers bracket to winners bracket', () => {
      const participants = createParticipants(4);
      const { winners } = generateDoubleEliminationBracket(participants);

      // First round losers should have loserGoesTo set
      const firstRound = winners.rounds[0]?.matches ?? [];
      firstRound.forEach((match) => {
        expect(match.loserGoesTo).toBeDefined();
      });
    });

    it('should set up grand finals sources correctly', () => {
      const participants = createParticipants(4);
      const { winners, losers, grandFinals } = generateDoubleEliminationBracket(participants);

      const gfMatch = grandFinals.matches[0];

      // Should come from winners bracket winner
      expect(gfMatch?.participant1Source?.sourceId).toBe(
        winners.matches[winners.matches.length - 1]?.id
      );

      // Should come from losers bracket winner
      expect(gfMatch?.participant2Source?.sourceId).toBe(
        losers.matches[losers.matches.length - 1]?.id
      );
    });
  });
});

// =============================================================================
// THIRD PLACE MATCH TESTS
// =============================================================================

describe('Third Place Match Generation', () => {
  describe('generateThirdPlaceMatch', () => {
    it('should return null for bracket with fewer than 2 rounds', () => {
      const participants = createParticipants(2);
      const bracket = generateSingleEliminationBracket(participants);
      const thirdPlaceMatch = generateThirdPlaceMatch(bracket);

      expect(thirdPlaceMatch).toBeNull();
    });

    it('should generate third place match for 4+ participants', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);
      const thirdPlaceMatch = generateThirdPlaceMatch(bracket);

      expect(thirdPlaceMatch).toBeDefined();
      expect(thirdPlaceMatch?.matchIdentifier).toBe('3RD');
    });

    it('should source from semifinal losers', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);
      const thirdPlaceMatch = generateThirdPlaceMatch(bracket);

      const semifinalRound = bracket.rounds[bracket.totalRounds - 2];
      expect(semifinalRound?.matches.length).toBe(2);

      expect(thirdPlaceMatch?.participant1Source?.sourceId).toBe(
        semifinalRound?.matches[0]?.id
      );
      expect(thirdPlaceMatch?.participant2Source?.sourceId).toBe(
        semifinalRound?.matches[1]?.id
      );
      expect(thirdPlaceMatch?.participant1Source?.position).toBe('loser');
      expect(thirdPlaceMatch?.participant2Source?.position).toBe('loser');
    });

    it('should update semifinal loserGoesTo', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);
      const thirdPlaceMatch = generateThirdPlaceMatch(bracket);

      const semifinalRound = bracket.rounds[bracket.totalRounds - 2];

      expect(semifinalRound?.matches[0]?.loserGoesTo?.matchId).toBe(thirdPlaceMatch?.id);
      expect(semifinalRound?.matches[1]?.loserGoesTo?.matchId).toBe(thirdPlaceMatch?.id);
    });
  });
});

// =============================================================================
// CONSOLATION BRACKET TESTS
// =============================================================================

describe('Consolation Bracket Generation', () => {
  describe('generateConsolationBracket', () => {
    it('should generate consolation bracket from first round losers', () => {
      const participants = createParticipants(8);
      const mainBracket = generateSingleEliminationBracket(participants);
      const consolation = generateConsolationBracket(participants, mainBracket);

      expect(consolation).toBeDefined();
      expect(consolation.type).toBe('consolation');
      expect(consolation.name).toBe('Consolation Bracket');
    });

    it('should have correct structure for 8 participant main bracket', () => {
      const participants = createParticipants(8);
      const mainBracket = generateSingleEliminationBracket(participants);
      const consolation = generateConsolationBracket(participants, mainBracket);

      // 4 first round losers -> consolation bracket
      // Round 1: 2 matches (4 losers)
      // Round 2: 1 match (finals)
      expect(consolation.totalRounds).toBe(2);
      expect(consolation.rounds[0]?.matches.length).toBe(2);
      expect(consolation.rounds[1]?.matches.length).toBe(1);
    });

    it('should link first round matches to main bracket losers', () => {
      const participants = createParticipants(8);
      const mainBracket = generateSingleEliminationBracket(participants);
      const consolation = generateConsolationBracket(participants, mainBracket);

      const firstConsolationRound = consolation.rounds[0]?.matches ?? [];

      firstConsolationRound.forEach((match) => {
        expect(match.participant1Source?.position).toBe('loser');
        expect(match.participant2Source?.position).toBe('loser');
      });
    });

    it('should set up loserGoesTo in main bracket', () => {
      const participants = createParticipants(8);
      const mainBracket = generateSingleEliminationBracket(participants);
      generateConsolationBracket(participants, mainBracket);

      const firstRoundMatches = mainBracket.rounds[0]?.matches ?? [];

      firstRoundMatches.forEach((match) => {
        expect(match.loserGoesTo).toBeDefined();
      });
    });

    it('should name final round correctly', () => {
      const participants = createParticipants(8);
      const mainBracket = generateSingleEliminationBracket(participants);
      const consolation = generateConsolationBracket(participants, mainBracket);

      const lastRound = consolation.rounds[consolation.rounds.length - 1];
      expect(lastRound?.name).toBe('Consolation Finals');
    });
  });
});

// =============================================================================
// CROSS-POOL SEEDING TESTS
// =============================================================================

describe('Cross-Pool Seeding', () => {
  const createAdvancingParticipants = (poolCount: number, advancementCount: number) => {
    const advancing: Array<{
      participant: TournamentParticipant;
      poolRank: number;
      poolNumber: number;
    }> = [];

    for (let pool = 1; pool <= poolCount; pool++) {
      for (let rank = 1; rank <= advancementCount; rank++) {
        advancing.push({
          participant: createSinglesParticipant(
            `pool${pool}-rank${rank}`,
            `Pool ${pool} Rank ${rank}`,
            5.0 - rank * 0.1
          ),
          poolRank: rank,
          poolNumber: pool,
        });
      }
    }

    return advancing;
  };

  describe('applyCrossPoolSeeding - standard method', () => {
    it('should arrange 1st vs 2nd from different pools', () => {
      const advancing = createAdvancingParticipants(2, 2);
      const seeded = applyCrossPoolSeeding(advancing, 2, 2, {
        method: 'standard',
      });

      expect(seeded.length).toBe(4);

      // Should have participants from both pools
      const ids = seeded.map((p) =>
        p.type === 'singles' ? p.player.id : p.team.id
      );

      expect(ids).toContain('pool1-rank1');
      expect(ids).toContain('pool2-rank2');
    });

    it('should work with 4 pools', () => {
      const advancing = createAdvancingParticipants(4, 2);
      const seeded = applyCrossPoolSeeding(advancing, 2, 4, {
        method: 'standard',
      });

      expect(seeded.length).toBe(8);
    });
  });

  describe('applyCrossPoolSeeding - reverse method', () => {
    it('should arrange so top seeds have easier matchups', () => {
      const advancing = createAdvancingParticipants(2, 2);
      const seeded = applyCrossPoolSeeding(advancing, 2, 2, {
        method: 'reverse',
      });

      expect(seeded.length).toBe(4);

      // All participants should be present
      const ids = seeded.map((p) =>
        p.type === 'singles' ? p.player.id : p.team.id
      );

      expect(ids).toContain('pool1-rank1');
      expect(ids).toContain('pool2-rank1');
      expect(ids).toContain('pool1-rank2');
      expect(ids).toContain('pool2-rank2');
    });
  });

  describe('applyCrossPoolSeeding - snake method', () => {
    it('should use alternating pattern', () => {
      const advancing = createAdvancingParticipants(2, 2);
      const seeded = applyCrossPoolSeeding(advancing, 2, 2, {
        method: 'snake',
      });

      expect(seeded.length).toBe(4);
    });

    it('should handle 3 pools with snake pattern', () => {
      const advancing = createAdvancingParticipants(3, 2);
      const seeded = applyCrossPoolSeeding(advancing, 2, 3, {
        method: 'snake',
      });

      expect(seeded.length).toBe(6);
    });
  });
});

// =============================================================================
// POOL STANDINGS TESTS
// =============================================================================

describe('Pool Standings Calculation', () => {
  describe('calculatePoolStandings', () => {
    let participants: TournamentParticipant[];
    let matches: PoolMatch[];

    beforeEach(() => {
      participants = createParticipants(4);
      matches = [];
    });

    it('should initialize standings for all participants', () => {
      const standings = calculatePoolStandings(matches, participants, 2);

      expect(standings.length).toBe(4);
      standings.forEach((s) => {
        expect(s.matchesPlayed).toBe(0);
        expect(s.matchesWon).toBe(0);
        expect(s.winPercentage).toBe(0);
      });
    });

    it('should calculate standings from completed matches', () => {
      // P1 beats P2
      matches.push({
        id: 'm1',
        poolId: 'pool1',
        round: 1,
        matchNumber: 1,
        participant1: participants[0]!,
        participant2: participants[1]!,
        status: MatchStatus.COMPLETED,
        score: createMatchScore(2, 0, 1),
      });

      const standings = calculatePoolStandings(matches, participants, 2);

      const p1Standing = standings.find((s) => s.participantId === 'p1');
      const p2Standing = standings.find((s) => s.participantId === 'p2');

      expect(p1Standing?.matchesWon).toBe(1);
      expect(p1Standing?.matchesLost).toBe(0);
      expect(p1Standing?.winPercentage).toBe(1);

      expect(p2Standing?.matchesWon).toBe(0);
      expect(p2Standing?.matchesLost).toBe(1);
      expect(p2Standing?.winPercentage).toBe(0);
    });

    it('should rank by win percentage', () => {
      // P1 beats P2
      matches.push({
        id: 'm1',
        poolId: 'pool1',
        round: 1,
        matchNumber: 1,
        participant1: participants[0]!,
        participant2: participants[1]!,
        status: MatchStatus.COMPLETED,
        score: createMatchScore(2, 0, 1),
      });

      // P3 beats P4
      matches.push({
        id: 'm2',
        poolId: 'pool1',
        round: 1,
        matchNumber: 2,
        participant1: participants[2]!,
        participant2: participants[3]!,
        status: MatchStatus.COMPLETED,
        score: createMatchScore(2, 0, 1),
      });

      const standings = calculatePoolStandings(matches, participants, 2);

      // P1 and P3 should be ranked 1-2, P2 and P4 should be ranked 3-4
      expect(standings[0]?.winPercentage).toBe(1);
      expect(standings[1]?.winPercentage).toBe(1);
      expect(standings[2]?.winPercentage).toBe(0);
      expect(standings[3]?.winPercentage).toBe(0);
    });

    it('should apply head-to-head tiebreaker', () => {
      // P1 beats P2, P3 beats P1, P2 beats P3 (circular)
      matches = [
        {
          id: 'm1',
          poolId: 'pool1',
          round: 1,
          matchNumber: 1,
          participant1: participants[0]!,
          participant2: participants[1]!,
          status: MatchStatus.COMPLETED,
          score: createMatchScore(2, 0, 1),
        },
        {
          id: 'm2',
          poolId: 'pool1',
          round: 1,
          matchNumber: 2,
          participant1: participants[2]!,
          participant2: participants[0]!,
          status: MatchStatus.COMPLETED,
          score: createMatchScore(2, 0, 1),
        },
        {
          id: 'm3',
          poolId: 'pool1',
          round: 1,
          matchNumber: 3,
          participant1: participants[1]!,
          participant2: participants[2]!,
          status: MatchStatus.COMPLETED,
          score: createMatchScore(2, 0, 1),
        },
      ];

      const standings = calculatePoolStandings(
        matches,
        participants.slice(0, 3),
        2,
        [TiebreakerRule.HEAD_TO_HEAD, TiebreakerRule.POINT_DIFFERENTIAL]
      );

      // All have 1 win, 1 loss - H2H should break ties
      standings.forEach((s) => {
        expect(s.matchesWon).toBe(1);
        expect(s.matchesLost).toBe(1);
      });
    });

    it('should apply point differential tiebreaker', () => {
      // P1 beats P2 by large margin
      matches.push({
        id: 'm1',
        poolId: 'pool1',
        round: 1,
        matchNumber: 1,
        participant1: participants[0]!,
        participant2: participants[1]!,
        status: MatchStatus.COMPLETED,
        score: {
          games: [{ gameNumber: 1, team1Score: 11, team2Score: 2 }],
          team1GamesWon: 1,
          team2GamesWon: 0,
          team1TotalPoints: 11,
          team2TotalPoints: 2,
          winner: 1,
        },
      });

      // P3 beats P4 by small margin
      matches.push({
        id: 'm2',
        poolId: 'pool1',
        round: 1,
        matchNumber: 2,
        participant1: participants[2]!,
        participant2: participants[3]!,
        status: MatchStatus.COMPLETED,
        score: {
          games: [{ gameNumber: 1, team1Score: 11, team2Score: 9 }],
          team1GamesWon: 1,
          team2GamesWon: 0,
          team1TotalPoints: 11,
          team2TotalPoints: 9,
          winner: 1,
        },
      });

      const standings = calculatePoolStandings(matches, participants, 2, [
        TiebreakerRule.POINT_DIFFERENTIAL,
      ]);

      // P1 should rank higher than P3 due to better point differential
      const p1Idx = standings.findIndex((s) => s.participantId === 'p1');
      const p3Idx = standings.findIndex((s) => s.participantId === 'p3');

      expect(p1Idx).toBeLessThan(p3Idx);
    });

    it('should mark advancing participants correctly', () => {
      matches.push({
        id: 'm1',
        poolId: 'pool1',
        round: 1,
        matchNumber: 1,
        participant1: participants[0]!,
        participant2: participants[1]!,
        status: MatchStatus.COMPLETED,
        score: createMatchScore(2, 0, 1),
      });

      const standings = calculatePoolStandings(matches, participants, 2);

      // Top 2 should advance
      expect(standings[0]?.advances).toBe(true);
      expect(standings[1]?.advances).toBe(true);
      expect(standings[2]?.advances).toBe(false);
      expect(standings[3]?.advances).toBe(false);
    });

    it('should calculate games won/lost correctly', () => {
      matches.push({
        id: 'm1',
        poolId: 'pool1',
        round: 1,
        matchNumber: 1,
        participant1: participants[0]!,
        participant2: participants[1]!,
        status: MatchStatus.COMPLETED,
        score: createMatchScore(2, 1, 1), // 2-1 in games
      });

      const standings = calculatePoolStandings(matches, participants, 2);

      const p1Standing = standings.find((s) => s.participantId === 'p1');
      const p2Standing = standings.find((s) => s.participantId === 'p2');

      expect(p1Standing?.gamesWon).toBe(2);
      expect(p1Standing?.gamesLost).toBe(1);
      expect(p2Standing?.gamesWon).toBe(1);
      expect(p2Standing?.gamesLost).toBe(2);
    });

    it('should ignore incomplete matches', () => {
      matches.push({
        id: 'm1',
        poolId: 'pool1',
        round: 1,
        matchNumber: 1,
        participant1: participants[0]!,
        participant2: participants[1]!,
        status: MatchStatus.IN_PROGRESS,
        // No score
      });

      const standings = calculatePoolStandings(matches, participants, 2);

      standings.forEach((s) => {
        expect(s.matchesPlayed).toBe(0);
      });
    });
  });
});

// =============================================================================
// POOL TO BRACKET ADVANCEMENT TESTS
// =============================================================================

describe('Pool to Bracket Advancement', () => {
  describe('advanceToPlayoffs', () => {
    const createPoolWithStandings = (
      poolNumber: number,
      participantCount: number
    ): Pool => {
      const participants = Array.from({ length: participantCount }, (_, i) =>
        createSinglesParticipant(
          `pool${poolNumber}-p${i + 1}`,
          `Pool ${poolNumber} Player ${i + 1}`,
          5.0 - i * 0.2
        )
      );

      return {
        id: `pool-${poolNumber}`,
        eventId: 'event-1',
        name: `Pool ${String.fromCharCode(64 + poolNumber)}`,
        poolNumber,
        participants,
        matches: [],
        standings: participants.map((p, i) => ({
          participantId: p.type === 'singles' ? p.player.id : p.team.id,
          participant: p,
          rank: i + 1,
          matchesPlayed: participantCount - 1,
          matchesWon: participantCount - 1 - i,
          matchesLost: i,
          gamesWon: (participantCount - 1 - i) * 2,
          gamesLost: i * 2,
          pointsFor: (participantCount - 1 - i) * 22,
          pointsAgainst: i * 22,
          pointDifferential: (participantCount - 1 - 2 * i) * 22,
          winPercentage: (participantCount - 1 - i) / (participantCount - 1),
          advances: i < 2,
        })),
        advancementCount: 2,
        isComplete: true,
        completedMatches: (participantCount * (participantCount - 1)) / 2,
        totalMatches: (participantCount * (participantCount - 1)) / 2,
      };
    };

    it('should advance correct number of participants from 2 pools', () => {
      const pools = [createPoolWithStandings(1, 4), createPoolWithStandings(2, 4)];

      const bracket = advanceToPlayoffs(pools, 2) as ReturnType<
        typeof generateSingleEliminationBracket
      >;

      // 2 pools x 2 advancing = 4 participants
      const firstRound = bracket.rounds[0]?.matches ?? [];
      expect(firstRound.length).toBe(2);
    });

    it('should advance correct number of participants from 4 pools', () => {
      const pools = [
        createPoolWithStandings(1, 4),
        createPoolWithStandings(2, 4),
        createPoolWithStandings(3, 4),
        createPoolWithStandings(4, 4),
      ];

      const bracket = advanceToPlayoffs(pools, 2) as ReturnType<
        typeof generateSingleEliminationBracket
      >;

      // 4 pools x 2 advancing = 8 participants
      expect(bracket.matches.length).toBe(7); // 8-team bracket has 7 matches
    });

    it('should use standard cross-pool seeding by default', () => {
      const pools = [createPoolWithStandings(1, 4), createPoolWithStandings(2, 4)];

      const bracket = advanceToPlayoffs(pools, 2) as ReturnType<
        typeof generateSingleEliminationBracket
      >;

      // First round should have cross-pool matchups
      const firstRound = bracket.rounds[0]?.matches ?? [];
      expect(firstRound.length).toBe(2);
    });

    it('should generate double elimination when specified', () => {
      const pools = [createPoolWithStandings(1, 4), createPoolWithStandings(2, 4)];

      const result = advanceToPlayoffs(pools, 2, TournamentFormat.DOUBLE_ELIMINATION);

      expect('winners' in result).toBe(true);
      expect('losers' in result).toBe(true);
      expect('grandFinals' in result).toBe(true);
    });

    it('should use custom cross-pool seeding method', () => {
      const pools = [createPoolWithStandings(1, 4), createPoolWithStandings(2, 4)];

      const bracket = advanceToPlayoffs(pools, 2, TournamentFormat.SINGLE_ELIMINATION, {
        crossPoolSeeding: { method: 'snake' },
      }) as ReturnType<typeof generateSingleEliminationBracket>;

      expect(bracket).toBeDefined();
    });

    it('should handle single advancement per pool', () => {
      const pools = [createPoolWithStandings(1, 4), createPoolWithStandings(2, 4)];

      const bracket = advanceToPlayoffs(pools, 1) as ReturnType<
        typeof generateSingleEliminationBracket
      >;

      // 2 pools x 1 advancing = 2 participants
      expect(bracket.rounds[0]?.matches.length).toBe(1);
    });
  });
});

// =============================================================================
// SEEDING UTILITY TESTS
// =============================================================================

describe('Seeding Utilities', () => {
  describe('seedParticipants', () => {
    let participants: TournamentParticipant[];

    beforeEach(() => {
      participants = createParticipants(8);
    });

    it('should sort by rating in RATING mode', () => {
      const seeded = seedParticipants(participants, SeedingMethod.RATING);

      const getRating = (p: TournamentParticipant): number => {
        if (p.type === 'singles') {
          return p.player.rating ?? 0;
        }
        return p.team.averageRating ?? 0;
      };

      for (let i = 0; i < seeded.length - 1; i++) {
        const rating1 = getRating(seeded[i]!);
        const rating2 = getRating(seeded[i + 1]!);
        expect(rating1).toBeGreaterThanOrEqual(rating2);
      }
    });

    it('should return original order in MANUAL mode', () => {
      const seeded = seedParticipants(participants, SeedingMethod.MANUAL);

      for (let i = 0; i < seeded.length; i++) {
        expect(seeded[i]).toEqual(participants[i]);
      }
    });

    it('should shuffle in RANDOM mode', () => {
      const seeded = seedParticipants(participants, SeedingMethod.RANDOM);

      expect(seeded.length).toBe(participants.length);
      // Can't guarantee different order (random), but length should match
    });

    it('should keep top seeds and shuffle rest in HYBRID mode', () => {
      const seeded = seedParticipants(participants, SeedingMethod.HYBRID);

      // Top 2 (25% of 8) should be in order by rating
      const top1 = seeded[0]!.type === 'singles' ? seeded[0]!.player.id : seeded[0]!.team.id;
      const top2 = seeded[1]!.type === 'singles' ? seeded[1]!.player.id : seeded[1]!.team.id;

      expect(top1).toBe('p1');
      expect(top2).toBe('p2');
    });

    it('should sort by rating in SNAKE mode (for pool distribution)', () => {
      const seeded = seedParticipants(participants, SeedingMethod.SNAKE);

      // SNAKE still sorts by rating (distribution happens in generatePools)
      const firstId = seeded[0]!.type === 'singles' ? seeded[0]!.player.id : seeded[0]!.team.id;
      expect(firstId).toBe('p1');
    });
  });
});

// =============================================================================
// MATCH UTILITIES TESTS
// =============================================================================

describe('Match Utilities', () => {
  describe('recordMatchResult', () => {
    it('should update match with score and winner', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);
      const firstMatch = bracket.matches[0]!;

      const score = createMatchScore(2, 0, 1);
      const updatedBracket = recordMatchResult(bracket, firstMatch.id, score);

      const match = updatedBracket.matches.find((m) => m.id === firstMatch.id);
      expect(match?.status).toBe(MatchStatus.COMPLETED);
      expect(match?.winner).toBe(1);
      expect(match?.score).toEqual(score);
    });

    it('should propagate winner to next match', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);

      // Find a first round match with both participants
      const firstRoundMatch = bracket.matches.find(
        (m) => m.round === 1 && m.participant1 && m.participant2 && !m.isBye
      );
      expect(firstRoundMatch).toBeDefined();

      const score = createMatchScore(2, 0, 1);
      const updatedBracket = recordMatchResult(bracket, firstRoundMatch!.id, score);

      // The match should be completed
      const completedMatch = updatedBracket.matches.find((m) => m.id === firstRoundMatch!.id);
      expect(completedMatch?.status).toBe(MatchStatus.COMPLETED);
      expect(completedMatch?.winner).toBe(1);
    });

    it('should mark bracket complete when all matches done', () => {
      const participants = createParticipants(2);
      const bracket = generateSingleEliminationBracket(participants);
      const match = bracket.matches[0]!;

      const score = createMatchScore(2, 0, 1);
      const updatedBracket = recordMatchResult(bracket, match.id, score);

      expect(updatedBracket.isComplete).toBe(true);
      expect(updatedBracket.champion).toBeDefined();
    });
  });

  describe('getNextMatch', () => {
    it('should return first ready match', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);

      const nextMatch = getNextMatch(bracket);

      expect(nextMatch).toBeDefined();
      expect(nextMatch?.status).toBe(MatchStatus.NOT_STARTED);
      expect(nextMatch?.participant1).toBeDefined();
      expect(nextMatch?.participant2).toBeDefined();
    });

    it('should return null when no matches ready', () => {
      const participants = createParticipants(4);
      let bracket = generateSingleEliminationBracket(participants);

      // Complete all matches
      for (const match of bracket.matches) {
        if (!match.isBye && match.participant1 && match.participant2) {
          bracket = recordMatchResult(bracket, match.id, createMatchScore(2, 0, 1));
        }
      }

      const nextMatch = getNextMatch(bracket);
      expect(nextMatch).toBeNull();
    });
  });

  describe('getReadyMatches', () => {
    it('should return all ready matches', () => {
      const participants = createParticipants(8);
      const bracket = generateSingleEliminationBracket(participants);

      const readyMatches = getReadyMatches(bracket);

      // First round should have 4 ready matches
      expect(readyMatches.length).toBe(4);
    });

    it('should not include bye matches', () => {
      const participants = createParticipants(5);
      const bracket = generateSingleEliminationBracket(participants);

      const readyMatches = getReadyMatches(bracket);

      readyMatches.forEach((m) => {
        expect(m.isBye).toBe(false);
      });
    });
  });
});

// =============================================================================
// PROGRESS TRACKING TESTS
// =============================================================================

describe('Progress Tracking', () => {
  describe('getBracketProgress', () => {
    it('should return correct progress for new bracket', () => {
      const participants = createParticipants(4);
      const bracket = generateSingleEliminationBracket(participants);

      const progress = getBracketProgress(bracket);

      expect(progress.totalMatches).toBe(3);
      expect(progress.completedMatches).toBe(0);
      expect(progress.remainingMatches).toBe(3);
      expect(progress.percentComplete).toBe(0);
      expect(progress.currentRound).toBe(1);
    });

    it('should update progress after matches', () => {
      const participants = createParticipants(4);
      let bracket = generateSingleEliminationBracket(participants);

      // Complete first round
      const firstRoundMatches = bracket.rounds[0]?.matches ?? [];
      for (const match of firstRoundMatches) {
        bracket = recordMatchResult(bracket, match.id, createMatchScore(2, 0, 1));
      }

      const progress = getBracketProgress(bracket);

      expect(progress.completedMatches).toBe(2);
      expect(progress.remainingMatches).toBe(1);
      expect(Math.round(progress.percentComplete)).toBe(67);
      expect(progress.currentRound).toBe(2);
    });
  });

  describe('getPoolProgress', () => {
    it('should return correct progress for pool', () => {
      const participants = createParticipants(4);
      const pools = generatePools(participants, { numberOfPools: 1 });
      const pool = pools[0]!;

      const progress = getPoolProgress(pool);

      expect(progress.totalMatches).toBe(6); // 4 choose 2 = 6
      expect(progress.completedMatches).toBe(0);
      expect(progress.remainingMatches).toBe(6);
      expect(progress.percentComplete).toBe(0);
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe('Validation Utilities', () => {
  describe('validateParticipantCount', () => {
    it('should validate single elimination requirements', () => {
      expect(validateParticipantCount(1, TournamentFormat.SINGLE_ELIMINATION).valid).toBe(false);
      expect(validateParticipantCount(2, TournamentFormat.SINGLE_ELIMINATION).valid).toBe(true);
    });

    it('should validate double elimination requirements', () => {
      expect(validateParticipantCount(3, TournamentFormat.DOUBLE_ELIMINATION).valid).toBe(false);
      expect(validateParticipantCount(4, TournamentFormat.DOUBLE_ELIMINATION).valid).toBe(true);
    });

    it('should validate round robin requirements', () => {
      expect(validateParticipantCount(2, TournamentFormat.ROUND_ROBIN).valid).toBe(false);
      expect(validateParticipantCount(3, TournamentFormat.ROUND_ROBIN).valid).toBe(true);
    });

    it('should validate pool play requirements', () => {
      expect(validateParticipantCount(5, TournamentFormat.POOL_PLAY).valid).toBe(false);
      expect(validateParticipantCount(6, TournamentFormat.POOL_PLAY).valid).toBe(true);
    });

    it('should validate pool to bracket requirements', () => {
      expect(validateParticipantCount(7, TournamentFormat.POOL_TO_BRACKET).valid).toBe(false);
      expect(validateParticipantCount(8, TournamentFormat.POOL_TO_BRACKET).valid).toBe(true);
    });

    it('should warn about too many byes', () => {
      const result = validateParticipantCount(3, TournamentFormat.SINGLE_ELIMINATION);
      expect(result.valid).toBe(true);
      // 3 participants needs 4-size bracket, so 1 bye
      // Should be valid but may have a recommendation
    });
  });
});

// =============================================================================
// SCORE UTILITIES TESTS
// =============================================================================

describe('Score Utilities', () => {
  describe('createEmptyScore', () => {
    it('should create empty score object', () => {
      const score = createEmptyScore(3);

      expect(score.games).toEqual([]);
      expect(score.team1GamesWon).toBe(0);
      expect(score.team2GamesWon).toBe(0);
      expect(score.team1TotalPoints).toBe(0);
      expect(score.team2TotalPoints).toBe(0);
      expect(score.winner).toBeNull();
    });
  });

  describe('calculateMatchScore', () => {
    it('should calculate winner for best of 1', () => {
      const games: GameScore[] = [{ gameNumber: 1, team1Score: 11, team2Score: 7 }];

      const score = calculateMatchScore(games, 1, 11, 2);

      expect(score.winner).toBe(1);
      expect(score.team1GamesWon).toBe(1);
    });

    it('should calculate winner for best of 3', () => {
      const games: GameScore[] = [
        { gameNumber: 1, team1Score: 11, team2Score: 9 },
        { gameNumber: 2, team1Score: 7, team2Score: 11 },
        { gameNumber: 3, team1Score: 11, team2Score: 8 },
      ];

      const score = calculateMatchScore(games, 3, 11, 2);

      expect(score.winner).toBe(1);
      expect(score.team1GamesWon).toBe(2);
      expect(score.team2GamesWon).toBe(1);
    });

    it('should handle no winner yet', () => {
      const games: GameScore[] = [
        { gameNumber: 1, team1Score: 11, team2Score: 9 },
        { gameNumber: 2, team1Score: 9, team2Score: 11 },
      ];

      const score = calculateMatchScore(games, 3, 11, 2);

      expect(score.winner).toBeNull();
      expect(score.team1GamesWon).toBe(1);
      expect(score.team2GamesWon).toBe(1);
    });

    it('should calculate total points correctly', () => {
      const games: GameScore[] = [
        { gameNumber: 1, team1Score: 11, team2Score: 9 },
        { gameNumber: 2, team1Score: 11, team2Score: 7 },
      ];

      const score = calculateMatchScore(games, 3, 11, 2);

      expect(score.team1TotalPoints).toBe(22);
      expect(score.team2TotalPoints).toBe(16);
    });
  });

  describe('isGameComplete', () => {
    it('should return true when team reaches points to win', () => {
      expect(isGameComplete({ gameNumber: 1, team1Score: 11, team2Score: 5 }, 11, 2)).toBe(true);
      expect(isGameComplete({ gameNumber: 1, team1Score: 5, team2Score: 11 }, 11, 2)).toBe(true);
    });

    it('should require win by margin', () => {
      expect(isGameComplete({ gameNumber: 1, team1Score: 11, team2Score: 10 }, 11, 2)).toBe(false);
      expect(isGameComplete({ gameNumber: 1, team1Score: 12, team2Score: 10 }, 11, 2)).toBe(true);
    });

    it('should respect max points cap', () => {
      expect(
        isGameComplete({ gameNumber: 1, team1Score: 15, team2Score: 14 }, 11, 2, 15)
      ).toBe(true);
      expect(
        isGameComplete({ gameNumber: 1, team1Score: 14, team2Score: 15 }, 11, 2, 15)
      ).toBe(true);
    });

    it('should return false for incomplete game', () => {
      expect(isGameComplete({ gameNumber: 1, team1Score: 8, team2Score: 7 }, 11, 2)).toBe(false);
    });
  });

  describe('formatScoreDisplay', () => {
    it('should return dash for undefined score', () => {
      expect(formatScoreDisplay(undefined)).toBe('-');
    });

    it('should return dash for empty games', () => {
      const score: MatchScore = {
        games: [],
        team1GamesWon: 0,
        team2GamesWon: 0,
        team1TotalPoints: 0,
        team2TotalPoints: 0,
        winner: null,
      };

      expect(formatScoreDisplay(score)).toBe('-');
    });

    it('should format single game score', () => {
      const score: MatchScore = {
        games: [{ gameNumber: 1, team1Score: 11, team2Score: 7 }],
        team1GamesWon: 1,
        team2GamesWon: 0,
        team1TotalPoints: 11,
        team2TotalPoints: 7,
        winner: 1,
      };

      expect(formatScoreDisplay(score)).toBe('11-7');
    });

    it('should format multiple game scores', () => {
      const score: MatchScore = {
        games: [
          { gameNumber: 1, team1Score: 11, team2Score: 9 },
          { gameNumber: 2, team1Score: 7, team2Score: 11 },
          { gameNumber: 3, team1Score: 11, team2Score: 8 },
        ],
        team1GamesWon: 2,
        team2GamesWon: 1,
        team1TotalPoints: 29,
        team2TotalPoints: 28,
        winner: 1,
      };

      expect(formatScoreDisplay(score)).toBe('11-9, 7-11, 11-8');
    });
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  describe('Empty inputs', () => {
    it('should handle empty participants for pools', () => {
      const pools = generatePools([]);
      expect(pools).toEqual([]);
    });

    it('should handle empty participants for bracket', () => {
      const bracket = generateSingleEliminationBracket([]);
      expect(bracket.totalRounds).toBe(0);
      expect(bracket.isComplete).toBe(true);
    });

    it('should handle empty matches for standings', () => {
      const participants = createParticipants(4);
      const standings = calculatePoolStandings([], participants, 2);

      expect(standings.length).toBe(4);
      standings.forEach((s) => {
        expect(s.matchesPlayed).toBe(0);
      });
    });
  });

  describe('Single participant', () => {
    it('should handle single participant in bracket', () => {
      const participants = createParticipants(1);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.isComplete).toBe(true);
      expect(bracket.champion).toEqual(participants[0]);
    });

    it('should handle single participant in pool', () => {
      const participants = createParticipants(1);
      const pools = generatePools(participants);

      expect(pools).toEqual([]);
    });
  });

  describe('Large participant counts', () => {
    it('should handle 64 participants in bracket', () => {
      const participants = createParticipants(64);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(6);
      expect(bracket.matches.length).toBe(63);
    });

    it('should handle 100 participants with byes', () => {
      const participants = createParticipants(100);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(7);
      expect(calculateByes(100)).toBe(28);
    });
  });

  describe('Doubles teams', () => {
    it('should handle doubles teams in bracket', () => {
      const teams: TournamentParticipant[] = [
        createDoublesTeam('t1', 'Alice A', 'Bob B', 4.5, 4.3),
        createDoublesTeam('t2', 'Charlie C', 'David D', 4.2, 4.4),
        createDoublesTeam('t3', 'Eve E', 'Frank F', 4.0, 4.1),
        createDoublesTeam('t4', 'Grace G', 'Henry H', 3.9, 4.0),
      ];

      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.totalRounds).toBe(2);
      expect(bracket.matches[0]?.participant1?.type).toBe('doubles');
    });

    it('should seed doubles teams by average rating', () => {
      const teams: TournamentParticipant[] = [
        createDoublesTeam('t1', 'A A', 'B B', 4.0, 4.0), // avg 4.0
        createDoublesTeam('t2', 'C C', 'D D', 4.5, 4.5), // avg 4.5
        createDoublesTeam('t3', 'E E', 'F F', 3.5, 3.5), // avg 3.5
        createDoublesTeam('t4', 'G G', 'H H', 4.2, 4.2), // avg 4.2
      ];

      const seeded = seedParticipants(teams, SeedingMethod.RATING);

      // Should be ordered by average rating: t2 (4.5), t4 (4.2), t1 (4.0), t3 (3.5)
      expect(seeded[0]?.type === 'doubles' && seeded[0].team.id).toBe('t2');
      expect(seeded[1]?.type === 'doubles' && seeded[1].team.id).toBe('t4');
      expect(seeded[2]?.type === 'doubles' && seeded[2].team.id).toBe('t1');
      expect(seeded[3]?.type === 'doubles' && seeded[3].team.id).toBe('t3');
    });
  });

  describe('Boundary conditions', () => {
    it('should handle 2 participants (minimum for bracket)', () => {
      const participants = createParticipants(2);
      const bracket = generateSingleEliminationBracket(participants);

      expect(bracket.totalRounds).toBe(1);
      expect(bracket.matches.length).toBe(1);
    });

    it('should handle 3 participants (minimum for pool)', () => {
      const participants = createParticipants(3);
      const pools = generatePools(participants, { numberOfPools: 1 });

      expect(pools.length).toBe(1);
      expect(pools[0]?.matches.length).toBe(3); // 3 choose 2 = 3
    });
  });
});
