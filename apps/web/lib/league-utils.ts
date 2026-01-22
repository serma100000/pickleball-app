/**
 * League Management Utilities
 * Comprehensive utilities for managing various league formats:
 * - Ladder Leagues
 * - Pool Play
 * - Playoff/Bracket (Single & Double Elimination)
 * - King of the Court
 */

import { generateTeamRoundRobin, type Team, type Match as RoundRobinMatch } from './round-robin';

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a player in a league with optional ranking and pool assignment
 */
export interface LeaguePlayer {
  id: string;
  name: string;
  rank?: number;
  poolNumber?: number;
  partnerId?: string;
  partnerName?: string;
  skillLevel?: number;
}

/**
 * Represents a team (pair of players) for doubles leagues
 */
export interface LeagueTeam {
  id: string;
  player1: LeaguePlayer;
  player2: LeaguePlayer;
}

/**
 * Represents a match in the league
 */
export interface LeagueMatch {
  id: string;
  weekNumber: number;
  team1: LeaguePlayer | LeagueTeam;
  team2: LeaguePlayer | LeagueTeam;
  score: { team1: number; team2: number };
  winnerId?: string;
  completed: boolean;
  isPlayoff: boolean;
  playoffRound?: string;
  poolNumber?: number;
  challengeMatch?: boolean;
}

/**
 * Represents a pool in pool play format
 */
export interface Pool {
  number: number;
  players: LeaguePlayer[];
  teams?: LeagueTeam[];
  matches: LeagueMatch[];
}

/**
 * Represents a match in a bracket
 */
export interface BracketMatch {
  id: string;
  roundNumber: number;
  matchNumber: number;
  team1?: LeaguePlayer | LeagueTeam;
  team2?: LeaguePlayer | LeagueTeam;
  score?: { team1: number; team2: number };
  winnerId?: string;
  loserId?: string;
  completed: boolean;
  nextMatchId?: string;
  loserNextMatchId?: string;
  team1Source?: { matchId: string; isWinner: boolean };
  team2Source?: { matchId: string; isWinner: boolean };
}

/**
 * Represents a round in a bracket
 */
export interface BracketRound {
  name: string;
  roundNumber: number;
  matches: BracketMatch[];
}

/**
 * Represents a complete bracket structure
 */
export interface Bracket {
  rounds: BracketRound[];
  type: 'single' | 'double';
  losersRounds?: BracketRound[];
  grandFinal?: BracketMatch;
  grandFinalReset?: BracketMatch;
}

/**
 * League standings entry
 */
export interface LeagueStanding {
  playerId: string;
  playerName: string;
  rank?: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  winPercentage: number;
}

/**
 * King of the Court state
 */
export interface KingOfCourtState {
  courtKing: LeaguePlayer | LeagueTeam;
  challenger: LeaguePlayer | LeagueTeam;
  queue: (LeaguePlayer | LeagueTeam)[];
  matchesPlayed: number;
  kingStreak: number;
}

/**
 * League configuration
 */
export interface LeagueConfig {
  type: 'ladder' | 'pool' | 'round-robin' | 'king-of-court';
  numberOfWeeks: number;
  playoffFormat?: 'single' | 'double' | 'none';
  poolCount?: number;
  teamsPerPoolAdvancing?: number;
  maxChallengeRange?: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Fisher-Yates shuffle for randomizing arrays
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * Check if an entity is a team (has player1 and player2)
 */
export function isLeagueTeam(entity: LeaguePlayer | LeagueTeam): entity is LeagueTeam {
  return 'player1' in entity && 'player2' in entity;
}

/**
 * Get the ID of a player or team
 */
function getEntityId(entity: LeaguePlayer | LeagueTeam): string {
  return entity.id;
}

/**
 * Get the display name of a player or team
 */
export function getEntityName(entity: LeaguePlayer | LeagueTeam): string {
  if (isLeagueTeam(entity)) {
    return `${entity.player1.name} & ${entity.player2.name}`;
  }
  return entity.name;
}

// =============================================================================
// Ladder League Utilities
// =============================================================================

/**
 * Initialize ladder rankings for players
 * @param players - Array of players to rank
 * @param sortBySkill - If true, sort by skill level; if false, randomize
 * @returns Players with assigned rankings
 */
export function initializeLadderRankings(
  players: LeaguePlayer[],
  sortBySkill: boolean = false
): LeaguePlayer[] {
  let orderedPlayers: LeaguePlayer[];

  if (sortBySkill) {
    // Sort by skill level (higher skill = better rank)
    orderedPlayers = [...players].sort((a, b) => (b.skillLevel ?? 0) - (a.skillLevel ?? 0));
  } else {
    // Randomize order
    orderedPlayers = shuffleArray(players);
  }

  // Assign ranks (1 is best)
  return orderedPlayers.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
}

/**
 * Process a ladder challenge match and update rankings
 * @param players - Current player list with rankings
 * @param challengerId - ID of the challenging player
 * @param defenderId - ID of the defending player
 * @param challengerWon - Whether the challenger won
 * @returns Updated player list with new rankings
 */
export function processLadderChallenge(
  players: LeaguePlayer[],
  challengerId: string,
  defenderId: string,
  challengerWon: boolean
): LeaguePlayer[] {
  const challenger = players.find((p) => p.id === challengerId);
  const defender = players.find((p) => p.id === defenderId);

  if (!challenger || !defender || !challenger.rank || !defender.rank) {
    return players;
  }

  // Challenger must have a worse (higher number) rank to challenge
  if (challenger.rank <= defender.rank) {
    console.warn('Invalid challenge: Challenger must have a lower ranking than defender');
    return players;
  }

  if (!challengerWon) {
    // Defender retains position, no changes
    return players;
  }

  // Challenger wins: they take the defender's rank
  // All players between challenger's old rank and defender's rank shift down
  const challengerOldRank = challenger.rank;
  const defenderRank = defender.rank;

  return players.map((player) => {
    if (player.id === challengerId) {
      // Challenger moves up to defender's rank
      return { ...player, rank: defenderRank };
    }
    if (player.rank && player.rank >= defenderRank && player.rank < challengerOldRank) {
      // Players between the two shift down one position
      return { ...player, rank: player.rank + 1 };
    }
    return player;
  });
}

/**
 * Get valid challenge targets for a player
 * @param playerRank - The challenging player's rank
 * @param totalPlayers - Total number of players in the ladder
 * @param maxChallengeRange - Maximum number of ranks above that can be challenged
 * @returns Array of valid rank numbers that can be challenged
 */
export function getValidChallengeTargets(
  playerRank: number,
  totalPlayers: number,
  maxChallengeRange: number = 3
): number[] {
  if (playerRank <= 1) {
    // Top ranked player cannot challenge anyone
    return [];
  }

  const highestValidTarget = Math.max(1, playerRank - maxChallengeRange);
  const targets: number[] = [];

  for (let rank = highestValidTarget; rank < playerRank; rank++) {
    targets.push(rank);
  }

  return targets;
}

/**
 * Get ladder standings sorted by rank
 * @param players - Array of players with rankings
 * @returns Sorted array of players by rank
 */
export function getLadderStandings(players: LeaguePlayer[]): LeaguePlayer[] {
  return [...players]
    .filter((p) => p.rank !== undefined)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
}

// =============================================================================
// Pool Play Utilities
// =============================================================================

/**
 * Generate balanced pools from a list of players
 * Uses snake draft pattern to balance skill levels across pools
 * @param players - Array of players to distribute
 * @param numberOfPools - Number of pools to create
 * @returns Array of Pool objects
 */
export function generatePools(players: LeaguePlayer[], numberOfPools: number): Pool[] {
  if (numberOfPools < 1) {
    throw new Error('Must have at least 1 pool');
  }

  if (players.length < numberOfPools * 2) {
    throw new Error('Not enough players for the specified number of pools');
  }

  // Sort by skill level for balanced distribution
  const sortedPlayers = [...players].sort(
    (a, b) => (b.skillLevel ?? 0) - (a.skillLevel ?? 0)
  );

  // Initialize pools
  const pools: Pool[] = Array.from({ length: numberOfPools }, (_, i) => ({
    number: i + 1,
    players: [],
    matches: [],
  }));

  // Snake draft distribution
  sortedPlayers.forEach((player, index) => {
    const round = Math.floor(index / numberOfPools);
    let poolIndex: number;

    if (round % 2 === 0) {
      // Forward direction
      poolIndex = index % numberOfPools;
    } else {
      // Reverse direction
      poolIndex = numberOfPools - 1 - (index % numberOfPools);
    }

    const pool = pools[poolIndex];
    if (pool) {
      pool.players.push({
        ...player,
        poolNumber: poolIndex + 1,
      });
    }
  });

  return pools;
}

/**
 * Generate pools for teams instead of individual players
 * @param teams - Array of teams to distribute
 * @param numberOfPools - Number of pools to create
 * @returns Array of Pool objects with teams
 */
export function generateTeamPools(teams: LeagueTeam[], numberOfPools: number): Pool[] {
  if (numberOfPools < 1) {
    throw new Error('Must have at least 1 pool');
  }

  if (teams.length < numberOfPools * 2) {
    throw new Error('Not enough teams for the specified number of pools');
  }

  // Calculate average skill for each team for balanced distribution
  const teamsWithSkill = teams.map((team) => ({
    ...team,
    avgSkill:
      ((team.player1.skillLevel ?? 0) + (team.player2.skillLevel ?? 0)) / 2,
  }));

  const sortedTeams = teamsWithSkill.sort((a, b) => b.avgSkill - a.avgSkill);

  const pools: Pool[] = Array.from({ length: numberOfPools }, (_, i) => ({
    number: i + 1,
    players: [],
    teams: [],
    matches: [],
  }));

  // Snake draft for teams
  sortedTeams.forEach((team, index) => {
    const round = Math.floor(index / numberOfPools);
    let poolIndex: number;

    if (round % 2 === 0) {
      poolIndex = index % numberOfPools;
    } else {
      poolIndex = numberOfPools - 1 - (index % numberOfPools);
    }

    const pool = pools[poolIndex];
    if (pool && pool.teams) {
      pool.teams.push(team);
    }
  });

  return pools;
}

/**
 * Generate round robin schedule within a pool
 * @param pool - The pool to generate matches for
 * @param weekNumber - The week number for these matches
 * @returns Updated pool with generated matches
 */
export function generatePoolSchedule(pool: Pool, weekNumber: number = 1): Pool {
  const matches: LeagueMatch[] = [];

  if (pool.teams && pool.teams.length >= 2) {
    // Team-based pool play
    const teams: Team[] = pool.teams.map((t) => ({
      id: t.id,
      player1: { id: t.player1.id, name: t.player1.name },
      player2: { id: t.player2.id, name: t.player2.name },
    }));

    const roundRobinResult = generateTeamRoundRobin(teams);

    roundRobinResult.matches.forEach((rrMatch) => {
      if (rrMatch.team1 && rrMatch.team2) {
        const team1 = pool.teams?.find((t) => t.id === rrMatch.team1?.id);
        const team2 = pool.teams?.find((t) => t.id === rrMatch.team2?.id);

        if (team1 && team2) {
          matches.push({
            id: generateId(),
            weekNumber,
            team1,
            team2,
            score: { team1: 0, team2: 0 },
            completed: false,
            isPlayoff: false,
            poolNumber: pool.number,
          });
        }
      }
    });
  } else if (pool.players.length >= 2) {
    // Individual player pool play (singles)
    const players = pool.players;
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const player1 = players[i];
        const player2 = players[j];
        if (player1 && player2) {
          matches.push({
            id: generateId(),
            weekNumber,
            team1: player1,
            team2: player2,
            score: { team1: 0, team2: 0 },
            completed: false,
            isPlayoff: false,
            poolNumber: pool.number,
          });
        }
      }
    }
  }

  return {
    ...pool,
    matches,
  };
}

/**
 * Calculate standings within a pool
 * @param matches - Array of pool matches (completed)
 * @param pool - The pool being calculated
 * @returns Sorted standings array
 */
export function getPoolStandings(matches: LeagueMatch[], pool: Pool): LeagueStanding[] {
  const standingsMap = new Map<string, LeagueStanding>();

  // Initialize standings for all participants
  const participants = pool.teams ?? pool.players;
  participants.forEach((p) => {
    standingsMap.set(p.id, {
      playerId: p.id,
      playerName: isLeagueTeam(p) ? getEntityName(p) : p.name,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      winPercentage: 0,
    });
  });

  // Calculate from completed matches
  matches
    .filter((m) => m.completed && m.poolNumber === pool.number)
    .forEach((match) => {
      const team1Id = getEntityId(match.team1);
      const team2Id = getEntityId(match.team2);
      const team1Standing = standingsMap.get(team1Id);
      const team2Standing = standingsMap.get(team2Id);

      if (team1Standing && team2Standing) {
        team1Standing.pointsFor += match.score.team1;
        team1Standing.pointsAgainst += match.score.team2;
        team2Standing.pointsFor += match.score.team2;
        team2Standing.pointsAgainst += match.score.team1;

        if (match.score.team1 > match.score.team2) {
          team1Standing.wins++;
          team2Standing.losses++;
        } else if (match.score.team2 > match.score.team1) {
          team2Standing.wins++;
          team1Standing.losses++;
        }
      }
    });

  // Calculate point diff and win percentage
  const standings = Array.from(standingsMap.values()).map((s) => {
    const totalGames = s.wins + s.losses;
    return {
      ...s,
      pointDiff: s.pointsFor - s.pointsAgainst,
      winPercentage: totalGames > 0 ? s.wins / totalGames : 0,
    };
  });

  // Sort by wins, then point diff, then head-to-head
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsFor - a.pointsFor;
  });

  return standings;
}

/**
 * Advance top teams from each pool to playoffs
 * @param pools - Array of pools with completed matches
 * @param teamsPerPool - Number of teams to advance from each pool
 * @returns Array of advancing teams/players with seeding
 */
export function advanceToPlayoffs(
  pools: Pool[],
  teamsPerPool: number = 2
): (LeaguePlayer | LeagueTeam)[] {
  const advancingTeams: { entity: LeaguePlayer | LeagueTeam; poolRank: number; poolNumber: number }[] = [];

  pools.forEach((pool) => {
    const standings = getPoolStandings(pool.matches, pool);
    const topTeams = standings.slice(0, teamsPerPool);

    topTeams.forEach((standing, index) => {
      const entity = pool.teams
        ? pool.teams.find((t) => t.id === standing.playerId)
        : pool.players.find((p) => p.id === standing.playerId);

      if (entity) {
        advancingTeams.push({
          entity,
          poolRank: index + 1,
          poolNumber: pool.number,
        });
      }
    });
  });

  // Sort for proper seeding (pool winners first, then runners-up)
  advancingTeams.sort((a, b) => {
    if (a.poolRank !== b.poolRank) return a.poolRank - b.poolRank;
    return a.poolNumber - b.poolNumber;
  });

  return advancingTeams.map((t) => t.entity);
}

// =============================================================================
// Playoff/Bracket Utilities
// =============================================================================

/**
 * Get round name based on number of teams remaining
 */
function getRoundName(teamsInRound: number, isLosersBracket: boolean = false): string {
  const prefix = isLosersBracket ? 'Losers ' : '';

  if (teamsInRound === 2) return isLosersBracket ? 'Losers Final' : 'Final';
  if (teamsInRound === 4) return `${prefix}Semifinal`;
  if (teamsInRound === 8) return `${prefix}Quarterfinal`;
  return `${prefix}Round of ${teamsInRound}`;
}

/**
 * Calculate the next power of 2 for bracket sizing
 */
function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generate a single elimination bracket
 * @param teams - Array of teams/players to seed into bracket
 * @returns Complete bracket structure
 */
export function generateSingleEliminationBracket(
  teams: (LeaguePlayer | LeagueTeam)[]
): Bracket {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams for a bracket');
  }

  const bracketSize = nextPowerOf2(teams.length);
  const rounds: BracketRound[] = [];
  const numberOfRounds = Math.log2(bracketSize);

  // Calculate byes needed
  const byesNeeded = bracketSize - teams.length;

  // Create seeding order (1 vs last, 2 vs second-to-last, etc.)
  const seededTeams: (LeaguePlayer | LeagueTeam | null)[] = new Array(bracketSize).fill(null);

  // Standard bracket seeding positions for power of 2
  const seedingOrder = generateBracketSeeding(bracketSize);

  teams.forEach((team, index) => {
    const position = seedingOrder[index];
    if (position !== undefined) {
      seededTeams[position] = team;
    }
  });

  // Generate first round matches
  const firstRoundMatches: BracketMatch[] = [];
  let matchId = 1;

  for (let i = 0; i < bracketSize; i += 2) {
    const team1 = seededTeams[i];
    const team2 = seededTeams[i + 1];
    const nextRoundMatchNumber = Math.floor(i / 4) + 1;
    const nextMatchIdStr = `r2-m${nextRoundMatchNumber}`;

    const match: BracketMatch = {
      id: `r1-m${matchId}`,
      roundNumber: 1,
      matchNumber: matchId,
      team1: team1 ?? undefined,
      team2: team2 ?? undefined,
      completed: false,
      nextMatchId: numberOfRounds > 1 ? nextMatchIdStr : undefined,
    };

    // If one team is a bye (null), auto-advance the other
    if (team1 && !team2) {
      match.winnerId = getEntityId(team1);
      match.completed = true;
    } else if (!team1 && team2) {
      match.winnerId = getEntityId(team2);
      match.completed = true;
    }

    firstRoundMatches.push(match);
    matchId++;
  }

  rounds.push({
    name: getRoundName(bracketSize),
    roundNumber: 1,
    matches: firstRoundMatches,
  });

  // Generate subsequent rounds
  let teamsInRound = bracketSize / 2;
  for (let round = 2; round <= numberOfRounds; round++) {
    const roundMatches: BracketMatch[] = [];
    const matchesInRound = teamsInRound / 2;

    for (let m = 1; m <= matchesInRound; m++) {
      const nextRoundMatchNumber = Math.floor((m - 1) / 2) + 1;
      const nextMatchIdStr = round < numberOfRounds ? `r${round + 1}-m${nextRoundMatchNumber}` : undefined;

      roundMatches.push({
        id: `r${round}-m${m}`,
        roundNumber: round,
        matchNumber: m,
        completed: false,
        nextMatchId: nextMatchIdStr,
        team1Source: {
          matchId: `r${round - 1}-m${(m - 1) * 2 + 1}`,
          isWinner: true,
        },
        team2Source: {
          matchId: `r${round - 1}-m${(m - 1) * 2 + 2}`,
          isWinner: true,
        },
      });
    }

    rounds.push({
      name: getRoundName(teamsInRound),
      roundNumber: round,
      matches: roundMatches,
    });

    teamsInRound = teamsInRound / 2;
  }

  return {
    rounds,
    type: 'single',
  };
}

/**
 * Generate proper bracket seeding positions
 * Ensures 1 seed plays lowest seed, 2 plays second lowest, etc.
 */
function generateBracketSeeding(size: number): number[] {
  if (size === 2) return [0, 1];

  const smaller = generateBracketSeeding(size / 2);
  const result: number[] = [];

  smaller.forEach((pos, index) => {
    result.push(pos * 2);
    result.push(size - 1 - pos * 2);
  });

  return result;
}

/**
 * Generate a double elimination bracket
 * @param teams - Array of teams/players to seed into bracket
 * @returns Complete bracket with winners and losers brackets
 */
export function generateDoubleEliminationBracket(
  teams: (LeaguePlayer | LeagueTeam)[]
): Bracket {
  if (teams.length < 2) {
    throw new Error('Need at least 2 teams for a bracket');
  }

  // Generate winners bracket (same as single elimination)
  const winnersBracket = generateSingleEliminationBracket(teams);
  const bracketSize = nextPowerOf2(teams.length);
  const winnersRounds = Math.log2(bracketSize);

  // Generate losers bracket
  const losersRounds: BracketRound[] = [];

  // Losers bracket has roughly (2 * winners rounds - 2) rounds
  // First round of losers = losers from round 1 of winners
  // Then alternates between dropdowns from winners and losers bracket matches

  let losersRoundNumber = 1;
  let matchNumber = 1;

  // For each winners round (except final), losers drop down
  for (let wr = 1; wr <= winnersRounds; wr++) {
    // Losers from this winners round
    const winnersRoundMatches = winnersBracket.rounds[wr - 1]?.matches.length ?? 0;

    if (wr === 1) {
      // First losers round: losers from first winners round play each other
      const losersMatches: BracketMatch[] = [];
      for (let m = 1; m <= Math.floor(winnersRoundMatches / 2); m++) {
        losersMatches.push({
          id: `L${losersRoundNumber}-m${m}`,
          roundNumber: losersRoundNumber,
          matchNumber: m,
          completed: false,
          nextMatchId: `L${losersRoundNumber + 1}-m${Math.floor((m - 1) / 2) + 1}`,
          team1Source: { matchId: `r1-m${(m - 1) * 2 + 1}`, isWinner: false },
          team2Source: { matchId: `r1-m${(m - 1) * 2 + 2}`, isWinner: false },
        });
      }

      if (losersMatches.length > 0) {
        losersRounds.push({
          name: getRoundName(winnersRoundMatches, true),
          roundNumber: losersRoundNumber,
          matches: losersMatches,
        });
        losersRoundNumber++;
      }
    } else if (wr < winnersRounds) {
      // Dropdown round: losers from winners play losers bracket survivors
      const dropdownMatches: BracketMatch[] = [];
      const previousLosersRound = losersRounds[losersRounds.length - 1];
      const previousLosersMatches = previousLosersRound?.matches.length ?? winnersRoundMatches;

      for (let m = 1; m <= previousLosersMatches; m++) {
        dropdownMatches.push({
          id: `L${losersRoundNumber}-m${m}`,
          roundNumber: losersRoundNumber,
          matchNumber: m,
          completed: false,
          nextMatchId: `L${losersRoundNumber + 1}-m${Math.floor((m - 1) / 2) + 1}`,
          team1Source: { matchId: `r${wr}-m${m}`, isWinner: false },
          team2Source: previousLosersRound
            ? { matchId: previousLosersRound.matches[m - 1]?.id ?? '', isWinner: true }
            : undefined,
        });
      }

      if (dropdownMatches.length > 0) {
        losersRounds.push({
          name: `Losers Round ${losersRoundNumber}`,
          roundNumber: losersRoundNumber,
          matches: dropdownMatches,
        });
        losersRoundNumber++;

        // Add consolidation round (losers bracket winners play each other)
        if (dropdownMatches.length >= 2) {
          const consolidationMatches: BracketMatch[] = [];
          for (let m = 1; m <= Math.floor(dropdownMatches.length / 2); m++) {
            consolidationMatches.push({
              id: `L${losersRoundNumber}-m${m}`,
              roundNumber: losersRoundNumber,
              matchNumber: m,
              completed: false,
              nextMatchId: `L${losersRoundNumber + 1}-m${Math.floor((m - 1) / 2) + 1}`,
              team1Source: { matchId: `L${losersRoundNumber - 1}-m${(m - 1) * 2 + 1}`, isWinner: true },
              team2Source: { matchId: `L${losersRoundNumber - 1}-m${(m - 1) * 2 + 2}`, isWinner: true },
            });
          }

          losersRounds.push({
            name: `Losers Round ${losersRoundNumber}`,
            roundNumber: losersRoundNumber,
            matches: consolidationMatches,
          });
          losersRoundNumber++;
        }
      }
    }
  }

  // Grand Final: Winners bracket champion vs Losers bracket champion
  const grandFinal: BracketMatch = {
    id: 'grand-final',
    roundNumber: winnersRounds + 1,
    matchNumber: 1,
    completed: false,
    team1Source: { matchId: `r${winnersRounds}-m1`, isWinner: true },
    team2Source: losersRounds.length > 0
      ? { matchId: losersRounds[losersRounds.length - 1]?.matches[0]?.id ?? '', isWinner: true }
      : undefined,
  };

  // Grand Final Reset (if losers bracket winner wins grand final)
  const grandFinalReset: BracketMatch = {
    id: 'grand-final-reset',
    roundNumber: winnersRounds + 2,
    matchNumber: 1,
    completed: false,
    team1Source: { matchId: 'grand-final', isWinner: false },
    team2Source: { matchId: 'grand-final', isWinner: true },
  };

  // Update winners bracket rounds to include loser destinations
  const updatedWinnersRounds = winnersBracket.rounds.map((round, roundIndex) => ({
    ...round,
    matches: round.matches.map((match, matchIndex) => ({
      ...match,
      loserNextMatchId: roundIndex < winnersRounds - 1
        ? `L${roundIndex * 2 + 1}-m${matchIndex + 1}`
        : undefined,
    })),
  }));

  return {
    rounds: updatedWinnersRounds,
    losersRounds,
    type: 'double',
    grandFinal,
    grandFinalReset,
  };
}

/**
 * Get the next playoff match after a result is recorded
 * @param bracket - The bracket structure
 * @param completedMatchId - ID of the match that was just completed
 * @param winnerId - ID of the winner
 * @param loserId - ID of the loser (for double elimination)
 * @returns Information about the next match(es) to update
 */
export function getNextPlayoffMatch(
  bracket: Bracket,
  completedMatchId: string,
  winnerId: string,
  loserId?: string
): { winnerNextMatch?: BracketMatch; loserNextMatch?: BracketMatch } {
  // Find the completed match
  let completedMatch: BracketMatch | undefined;
  let isLosersMatch = false;

  for (const round of bracket.rounds) {
    const match = round.matches.find((m) => m.id === completedMatchId);
    if (match) {
      completedMatch = match;
      break;
    }
  }

  if (!completedMatch && bracket.losersRounds) {
    for (const round of bracket.losersRounds) {
      const match = round.matches.find((m) => m.id === completedMatchId);
      if (match) {
        completedMatch = match;
        isLosersMatch = true;
        break;
      }
    }
  }

  if (!completedMatch) {
    if (completedMatchId === 'grand-final' && bracket.grandFinal) {
      completedMatch = bracket.grandFinal;
    } else {
      return {};
    }
  }

  const result: { winnerNextMatch?: BracketMatch; loserNextMatch?: BracketMatch } = {};

  // Find winner's next match
  if (completedMatch.nextMatchId) {
    const allMatches = [
      ...bracket.rounds.flatMap((r) => r.matches),
      ...(bracket.losersRounds?.flatMap((r) => r.matches) ?? []),
    ];

    if (bracket.grandFinal) allMatches.push(bracket.grandFinal);
    if (bracket.grandFinalReset) allMatches.push(bracket.grandFinalReset);

    result.winnerNextMatch = allMatches.find((m) => m.id === completedMatch?.nextMatchId);
  }

  // Find loser's next match (double elimination only)
  if (bracket.type === 'double' && completedMatch.loserNextMatchId && loserId) {
    const loserMatches = bracket.losersRounds?.flatMap((r) => r.matches) ?? [];
    result.loserNextMatch = loserMatches.find((m) => m.id === completedMatch?.loserNextMatchId);
  }

  return result;
}

/**
 * Update bracket after a match result
 * @param bracket - The current bracket
 * @param matchId - ID of the completed match
 * @param winnerId - ID of the winning team/player
 * @param score - The match score
 * @returns Updated bracket
 */
export function updateBracketWithResult(
  bracket: Bracket,
  matchId: string,
  winnerId: string,
  score: { team1: number; team2: number }
): Bracket {
  const updatedBracket = JSON.parse(JSON.stringify(bracket)) as Bracket;

  // Find and update the completed match
  const findAndUpdate = (matches: BracketMatch[]): boolean => {
    const match = matches.find((m) => m.id === matchId);
    if (match) {
      match.completed = true;
      match.winnerId = winnerId;
      match.score = score;
      match.loserId = match.team1 && getEntityId(match.team1) === winnerId
        ? match.team2 ? getEntityId(match.team2) : undefined
        : match.team1 ? getEntityId(match.team1) : undefined;
      return true;
    }
    return false;
  };

  // Search in winners rounds
  for (const round of updatedBracket.rounds) {
    if (findAndUpdate(round.matches)) break;
  }

  // Search in losers rounds
  if (updatedBracket.losersRounds) {
    for (const round of updatedBracket.losersRounds) {
      if (findAndUpdate(round.matches)) break;
    }
  }

  // Check grand finals
  if (updatedBracket.grandFinal?.id === matchId) {
    findAndUpdate([updatedBracket.grandFinal]);
  }
  if (updatedBracket.grandFinalReset?.id === matchId) {
    findAndUpdate([updatedBracket.grandFinalReset]);
  }

  // Propagate winner/loser to next matches
  const completedMatch = [
    ...updatedBracket.rounds.flatMap((r) => r.matches),
    ...(updatedBracket.losersRounds?.flatMap((r) => r.matches) ?? []),
    updatedBracket.grandFinal,
    updatedBracket.grandFinalReset,
  ].find((m) => m?.id === matchId);

  if (completedMatch) {
    const winner = completedMatch.team1 && getEntityId(completedMatch.team1) === winnerId
      ? completedMatch.team1
      : completedMatch.team2;
    const loser = completedMatch.team1 && getEntityId(completedMatch.team1) === winnerId
      ? completedMatch.team2
      : completedMatch.team1;

    // Propagate winner
    if (completedMatch.nextMatchId && winner) {
      const nextMatch = [
        ...updatedBracket.rounds.flatMap((r) => r.matches),
        ...(updatedBracket.losersRounds?.flatMap((r) => r.matches) ?? []),
        updatedBracket.grandFinal,
        updatedBracket.grandFinalReset,
      ].find((m) => m?.id === completedMatch.nextMatchId);

      if (nextMatch) {
        if (nextMatch.team1Source?.matchId === matchId) {
          nextMatch.team1 = winner;
        } else if (nextMatch.team2Source?.matchId === matchId) {
          nextMatch.team2 = winner;
        }
      }
    }

    // Propagate loser (double elimination)
    if (completedMatch.loserNextMatchId && loser) {
      const loserNextMatch = updatedBracket.losersRounds
        ?.flatMap((r) => r.matches)
        .find((m) => m.id === completedMatch.loserNextMatchId);

      if (loserNextMatch) {
        if (loserNextMatch.team1Source?.matchId === matchId) {
          loserNextMatch.team1 = loser;
        } else if (loserNextMatch.team2Source?.matchId === matchId) {
          loserNextMatch.team2 = loser;
        }
      }
    }
  }

  return updatedBracket;
}

// =============================================================================
// King of the Court Utilities
// =============================================================================

/**
 * Initialize King of the Court format
 * @param players - Array of players or teams
 * @returns Initial King of the Court state
 */
export function initializeKingOfCourt(
  players: (LeaguePlayer | LeagueTeam)[]
): KingOfCourtState {
  if (players.length < 2) {
    throw new Error('Need at least 2 players/teams for King of the Court');
  }

  const shuffled = shuffleArray(players);
  const [king, challenger, ...queue] = shuffled;

  if (!king || !challenger) {
    throw new Error('Failed to initialize King of the Court');
  }

  return {
    courtKing: king,
    challenger,
    queue,
    matchesPlayed: 0,
    kingStreak: 0,
  };
}

/**
 * Process a King of the Court result
 * Winner stays on court, loser goes to back of queue
 * @param state - Current King of the Court state
 * @param kingWon - Whether the current king won
 * @returns Updated state
 */
export function processKingOfCourtResult(
  state: KingOfCourtState,
  kingWon: boolean
): KingOfCourtState {
  const newQueue = [...state.queue];
  const nextChallenger = newQueue.shift();

  if (!nextChallenger) {
    // Queue is empty, loser becomes next challenger
    if (kingWon) {
      return {
        courtKing: state.courtKing,
        challenger: state.challenger,
        queue: [],
        matchesPlayed: state.matchesPlayed + 1,
        kingStreak: state.kingStreak + 1,
      };
    } else {
      return {
        courtKing: state.challenger,
        challenger: state.courtKing,
        queue: [],
        matchesPlayed: state.matchesPlayed + 1,
        kingStreak: 1,
      };
    }
  }

  if (kingWon) {
    // King stays, challenger goes to back of queue
    newQueue.push(state.challenger);
    return {
      courtKing: state.courtKing,
      challenger: nextChallenger,
      queue: newQueue,
      matchesPlayed: state.matchesPlayed + 1,
      kingStreak: state.kingStreak + 1,
    };
  } else {
    // Challenger becomes new king, old king goes to back of queue
    newQueue.push(state.courtKing);
    return {
      courtKing: state.challenger,
      challenger: nextChallenger,
      queue: newQueue,
      matchesPlayed: state.matchesPlayed + 1,
      kingStreak: 1,
    };
  }
}

/**
 * Get King of the Court standings based on accumulated wins
 * @param results - Array of match results with winnerId
 * @param players - All players in the format
 * @returns Standings sorted by wins
 */
export function getKingOfCourtStandings(
  results: { winnerId: string; loserId: string }[],
  players: (LeaguePlayer | LeagueTeam)[]
): LeagueStanding[] {
  const statsMap = new Map<string, { wins: number; losses: number }>();

  // Initialize
  players.forEach((p) => {
    statsMap.set(getEntityId(p), { wins: 0, losses: 0 });
  });

  // Tally results
  results.forEach((result) => {
    const winnerStats = statsMap.get(result.winnerId);
    const loserStats = statsMap.get(result.loserId);

    if (winnerStats) winnerStats.wins++;
    if (loserStats) loserStats.losses++;
  });

  // Build standings
  const standings: LeagueStanding[] = players.map((p) => {
    const stats = statsMap.get(getEntityId(p)) ?? { wins: 0, losses: 0 };
    const totalGames = stats.wins + stats.losses;

    return {
      playerId: getEntityId(p),
      playerName: getEntityName(p),
      wins: stats.wins,
      losses: stats.losses,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      winPercentage: totalGames > 0 ? stats.wins / totalGames : 0,
    };
  });

  // Sort by wins, then win percentage
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.winPercentage - a.winPercentage;
  });

  return standings;
}

// =============================================================================
// General League Utilities
// =============================================================================

/**
 * Calculate aggregate league standings across all weeks
 * @param matches - All league matches
 * @param players - All league participants
 * @returns Aggregate standings
 */
export function calculateLeagueStandings(
  matches: LeagueMatch[],
  players: (LeaguePlayer | LeagueTeam)[]
): LeagueStanding[] {
  const standingsMap = new Map<string, LeagueStanding>();

  // Initialize
  players.forEach((p) => {
    standingsMap.set(getEntityId(p), {
      playerId: getEntityId(p),
      playerName: getEntityName(p),
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      winPercentage: 0,
    });
  });

  // Process completed matches
  matches
    .filter((m) => m.completed)
    .forEach((match) => {
      const team1Id = getEntityId(match.team1);
      const team2Id = getEntityId(match.team2);
      const team1Standing = standingsMap.get(team1Id);
      const team2Standing = standingsMap.get(team2Id);

      if (team1Standing && team2Standing) {
        team1Standing.pointsFor += match.score.team1;
        team1Standing.pointsAgainst += match.score.team2;
        team2Standing.pointsFor += match.score.team2;
        team2Standing.pointsAgainst += match.score.team1;

        if (match.score.team1 > match.score.team2 || match.winnerId === team1Id) {
          team1Standing.wins++;
          team2Standing.losses++;
        } else if (match.score.team2 > match.score.team1 || match.winnerId === team2Id) {
          team2Standing.wins++;
          team1Standing.losses++;
        }
      }
    });

  // Calculate derived stats
  const standings = Array.from(standingsMap.values()).map((s) => {
    const totalGames = s.wins + s.losses;
    return {
      ...s,
      pointDiff: s.pointsFor - s.pointsAgainst,
      winPercentage: totalGames > 0 ? s.wins / totalGames : 0,
    };
  });

  // Sort by wins, point diff, points for
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsFor - a.pointsFor;
  });

  // Assign ranks
  return standings.map((s, index) => ({
    ...s,
    rank: index + 1,
  }));
}

/**
 * Generate weekly schedule based on league type
 * @param leagueType - Type of league
 * @param players - League participants
 * @param weekNumber - Week number to generate
 * @param config - Additional configuration
 * @returns Array of matches for the week
 */
export function generateWeeklySchedule(
  leagueType: LeagueConfig['type'],
  players: (LeaguePlayer | LeagueTeam)[],
  weekNumber: number,
  config?: Partial<LeagueConfig>
): LeagueMatch[] {
  switch (leagueType) {
    case 'ladder': {
      // For ladder leagues, matches are challenge-based and not pre-scheduled
      // Return empty array - matches are created when challenges are made
      return [];
    }

    case 'pool': {
      // Generate pool play matches
      const poolCount = config?.poolCount ?? 2;
      const isTeamBased = players.length > 0 && isLeagueTeam(players[0]!);

      let pools: Pool[];
      if (isTeamBased) {
        pools = generateTeamPools(players as LeagueTeam[], poolCount);
      } else {
        pools = generatePools(players as LeaguePlayer[], poolCount);
      }

      const allMatches: LeagueMatch[] = [];
      pools.forEach((pool) => {
        const poolWithSchedule = generatePoolSchedule(pool, weekNumber);
        allMatches.push(...poolWithSchedule.matches);
      });

      return allMatches;
    }

    case 'round-robin': {
      // Full round robin across all participants
      if (players.length < 2) return [];

      const isTeamBased = isLeagueTeam(players[0]!);
      const matches: LeagueMatch[] = [];

      if (isTeamBased) {
        const teams: Team[] = (players as LeagueTeam[]).map((t) => ({
          id: t.id,
          player1: { id: t.player1.id, name: t.player1.name },
          player2: { id: t.player2.id, name: t.player2.name },
        }));

        const rrResult = generateTeamRoundRobin(teams);

        // Filter to only matches for this week's round
        const matchesForWeek = rrResult.matches.filter((m) => m.round === weekNumber);

        matchesForWeek.forEach((rrMatch) => {
          if (rrMatch.team1 && rrMatch.team2) {
            const team1 = (players as LeagueTeam[]).find((t) => t.id === rrMatch.team1?.id);
            const team2 = (players as LeagueTeam[]).find((t) => t.id === rrMatch.team2?.id);

            if (team1 && team2) {
              matches.push({
                id: generateId(),
                weekNumber,
                team1,
                team2,
                score: { team1: 0, team2: 0 },
                completed: false,
                isPlayoff: false,
              });
            }
          }
        });
      } else {
        // Singles round robin
        const playerList = players as LeaguePlayer[];
        for (let i = 0; i < playerList.length; i++) {
          for (let j = i + 1; j < playerList.length; j++) {
            const p1 = playerList[i];
            const p2 = playerList[j];
            if (p1 && p2) {
              matches.push({
                id: generateId(),
                weekNumber,
                team1: p1,
                team2: p2,
                score: { team1: 0, team2: 0 },
                completed: false,
                isPlayoff: false,
              });
            }
          }
        }
      }

      return matches;
    }

    case 'king-of-court': {
      // King of the Court is run in real-time, not pre-scheduled
      return [];
    }

    default:
      return [];
  }
}

/**
 * Check if a league is complete (all regular season and playoffs done)
 * @param config - League configuration
 * @param matches - All league matches
 * @param bracket - Optional playoff bracket
 * @returns Whether the league is complete
 */
export function isLeagueComplete(
  config: LeagueConfig,
  matches: LeagueMatch[],
  bracket?: Bracket
): boolean {
  // Check regular season matches
  const regularMatches = matches.filter((m) => !m.isPlayoff);
  const allRegularComplete = regularMatches.length > 0 &&
    regularMatches.every((m) => m.completed);

  if (!allRegularComplete) {
    return false;
  }

  // Check playoffs if applicable
  if (config.playoffFormat && config.playoffFormat !== 'none' && bracket) {
    // Check all bracket matches
    const allBracketMatches = [
      ...bracket.rounds.flatMap((r) => r.matches),
      ...(bracket.losersRounds?.flatMap((r) => r.matches) ?? []),
    ];

    // Filter to only matches that have teams assigned
    const scheduledMatches = allBracketMatches.filter((m) => m.team1 && m.team2);

    if (!scheduledMatches.every((m) => m.completed)) {
      return false;
    }

    // Check grand final for double elimination
    if (bracket.type === 'double' && bracket.grandFinal) {
      if (!bracket.grandFinal.completed) {
        return false;
      }
      // Check if reset is needed and completed
      if (bracket.grandFinal.winnerId !== bracket.grandFinal.team1Source?.matchId &&
          bracket.grandFinalReset && !bracket.grandFinalReset.completed) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get the current week number based on completed matches
 * @param matches - All league matches
 * @returns Current week number (1-indexed)
 */
export function getCurrentWeek(matches: LeagueMatch[]): number {
  if (matches.length === 0) return 1;

  const maxWeek = Math.max(...matches.map((m) => m.weekNumber));
  const currentWeekMatches = matches.filter((m) => m.weekNumber === maxWeek);

  // If current week is complete, move to next
  if (currentWeekMatches.every((m) => m.completed)) {
    return maxWeek + 1;
  }

  return maxWeek;
}

/**
 * Create a ladder challenge match
 * @param challenger - The challenging player
 * @param defender - The defending player
 * @param weekNumber - Current week number
 * @returns The challenge match
 */
export function createLadderChallenge(
  challenger: LeaguePlayer,
  defender: LeaguePlayer,
  weekNumber: number
): LeagueMatch {
  return {
    id: generateId(),
    weekNumber,
    team1: challenger,
    team2: defender,
    score: { team1: 0, team2: 0 },
    completed: false,
    isPlayoff: false,
    challengeMatch: true,
  };
}

/**
 * Validate a ladder challenge
 * @param challenger - The challenging player
 * @param defender - The defending player
 * @param maxChallengeRange - Maximum ranks above that can be challenged
 * @returns Validation result with error message if invalid
 */
export function validateLadderChallenge(
  challenger: LeaguePlayer,
  defender: LeaguePlayer,
  maxChallengeRange: number = 3
): { valid: boolean; error?: string } {
  if (!challenger.rank || !defender.rank) {
    return { valid: false, error: 'Both players must have ranks assigned' };
  }

  if (challenger.rank <= defender.rank) {
    return { valid: false, error: 'Can only challenge players ranked higher than you' };
  }

  const rankDiff = challenger.rank - defender.rank;
  if (rankDiff > maxChallengeRange) {
    return {
      valid: false,
      error: `Can only challenge players within ${maxChallengeRange} ranks (tried to challenge ${rankDiff} ranks up)`
    };
  }

  return { valid: true };
}
