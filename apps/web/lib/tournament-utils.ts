/**
 * Tournament Management System - Utility Functions
 *
 * Provides bracket generation, pool management, standings calculation,
 * seeding algorithms, and match scheduling utilities.
 */

import {
  type TournamentParticipant,
  type Bracket,
  type BracketMatch,
  type BracketRound,
  type Pool,
  type PoolMatch,
  type PoolStanding,
  type MatchScore,
  type GameScore,
  TournamentFormat,
  BracketType,
  MatchStatus,
  SeedingMethod,
  TiebreakerRule,
  getParticipantId,
  getParticipantRating,
} from './tournament-types';

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// BRACKET GENERATION
// =============================================================================

/**
 * Calculate the number of rounds needed for a bracket
 */
export function calculateBracketRounds(participantCount: number): number {
  if (participantCount <= 1) return 0;
  return Math.ceil(Math.log2(participantCount));
}

/**
 * Calculate the bracket size (next power of 2)
 */
export function calculateBracketSize(participantCount: number): number {
  return Math.pow(2, calculateBracketRounds(participantCount));
}

/**
 * Calculate number of byes needed
 */
export function calculateByes(participantCount: number): number {
  const bracketSize = calculateBracketSize(participantCount);
  return bracketSize - participantCount;
}

/**
 * Get round name based on round number and total rounds
 */
export function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromFinal = totalRounds - roundNumber + 1;

  switch (roundsFromFinal) {
    case 1:
      return 'Finals';
    case 2:
      return 'Semifinals';
    case 3:
      return 'Quarterfinals';
    case 4:
      return 'Round of 16';
    case 5:
      return 'Round of 32';
    case 6:
      return 'Round of 64';
    case 7:
      return 'Round of 128';
    case 8:
      return 'Round of 256';
    default:
      return `Round ${roundNumber}`;
  }
}

/**
 * Generate match identifier based on bracket type and position
 */
function generateMatchIdentifier(
  bracketType: BracketType,
  round: number,
  position: number,
  totalRounds: number
): string {
  const prefix = bracketType === BracketType.LOSERS ? 'L' : 'W';
  const roundsFromFinal = totalRounds - round + 1;

  if (roundsFromFinal === 1) {
    return bracketType === BracketType.LOSERS ? 'LF' : 'F';
  }
  if (roundsFromFinal === 2) {
    return `${prefix}SF${position + 1}`;
  }
  if (roundsFromFinal === 3) {
    return `${prefix}QF${position + 1}`;
  }

  return `${prefix}${round}-${position + 1}`;
}

/**
 * Generate single elimination bracket
 */
export function generateSingleEliminationBracket(
  participants: TournamentParticipant[],
  options: {
    bracketId?: string;
    eventId?: string;
    bestOf?: number;
    finalsBestOf?: number;
    seedingMethod?: SeedingMethod;
  } = {}
): Bracket {
  const {
    bracketId = generateId(),
    eventId = '',
    bestOf = 1,
    finalsBestOf = bestOf,
    seedingMethod = SeedingMethod.RATING,
  } = options;

  // Seed participants
  const seededParticipants = seedParticipants(participants, seedingMethod);
  const participantCount = seededParticipants.length;

  if (participantCount < 2) {
    return {
      id: bracketId,
      eventId,
      type: BracketType.WINNERS,
      name: 'Main Bracket',
      totalRounds: 0,
      rounds: [],
      matches: [],
      isComplete: true,
      champion: seededParticipants[0],
    };
  }

  const totalRounds = calculateBracketRounds(participantCount);
  const bracketSize = calculateBracketSize(participantCount);

  // Place participants with byes
  const bracketPositions: (TournamentParticipant | null)[] = new Array(bracketSize).fill(null);

  // Standard seeding placement for power of 2 brackets
  const seedPositions = generateSeedPositions(bracketSize);

  seededParticipants.forEach((participant, index) => {
    const position = seedPositions[index];
    if (position !== undefined) {
      bracketPositions[position] = participant;
    }
  });

  // Generate all matches
  const allMatches: BracketMatch[] = [];
  const rounds: BracketRound[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    const roundMatches: BracketMatch[] = [];
    const isFinals = round === totalRounds;
    const roundBestOf = isFinals ? finalsBestOf : bestOf;

    for (let position = 0; position < matchesInRound; position++) {
      const matchId = generateId();
      let participant1: TournamentParticipant | null = null;
      let participant2: TournamentParticipant | null = null;
      let isBye = false;

      if (round === 1) {
        // First round - get from bracket positions
        const pos1 = position * 2;
        const pos2 = position * 2 + 1;
        participant1 = bracketPositions[pos1] ?? null;
        participant2 = bracketPositions[pos2] ?? null;

        // Handle byes
        if (!participant1 && participant2) {
          participant1 = participant2;
          participant2 = null;
          isBye = true;
        } else if (participant1 && !participant2) {
          isBye = true;
        }
      }

      const match: BracketMatch = {
        id: matchId,
        bracketId,
        round,
        position,
        matchIdentifier: generateMatchIdentifier(BracketType.WINNERS, round, position, totalRounds),
        participant1,
        participant2,
        participant1Seed: participant1 ? seededParticipants.indexOf(participant1) + 1 : undefined,
        participant2Seed: participant2 ? seededParticipants.indexOf(participant2) + 1 : undefined,
        status: isBye ? MatchStatus.COMPLETED : MatchStatus.NOT_STARTED,
        winner: isBye ? 1 : null,
        winnerId: isBye && participant1 ? getParticipantId(participant1) : undefined,
        isBye,
      };

      // Set up source for non-first round matches
      if (round > 1) {
        const prevRoundMatches = rounds[round - 2]?.matches ?? [];
        const sourceMatch1Index = position * 2;
        const sourceMatch2Index = position * 2 + 1;

        if (prevRoundMatches[sourceMatch1Index]) {
          match.participant1Source = {
            type: 'match',
            sourceId: prevRoundMatches[sourceMatch1Index]!.id,
            position: 'winner',
          };
        }
        if (prevRoundMatches[sourceMatch2Index]) {
          match.participant2Source = {
            type: 'match',
            sourceId: prevRoundMatches[sourceMatch2Index]!.id,
            position: 'winner',
          };
        }
      }

      roundMatches.push(match);
      allMatches.push(match);
    }

    // Set up winner destinations
    if (round < totalRounds) {
      roundMatches.forEach((match, idx) => {
        const nextRoundPosition = Math.floor(idx / 2);
        const nextRoundMatches = allMatches.filter(
          (m) => m.round === round + 1 && m.position === nextRoundPosition
        );
        if (nextRoundMatches[0]) {
          match.winnerGoesTo = {
            matchId: nextRoundMatches[0].id,
            position: (idx % 2 === 0 ? 1 : 2) as 1 | 2,
          };
        }
      });
    }

    rounds.push({
      roundNumber: round,
      name: getRoundName(round, totalRounds),
      matches: roundMatches,
      isComplete: roundMatches.every((m) => m.status === MatchStatus.COMPLETED),
      bestOf: roundBestOf,
    });
  }

  // Propagate bye winners
  propagateByeWinners(rounds, allMatches);

  return {
    id: bracketId,
    eventId,
    type: BracketType.WINNERS,
    name: 'Main Bracket',
    totalRounds,
    rounds,
    matches: allMatches,
    isComplete: false,
  };
}

/**
 * Propagate bye winners through the bracket
 */
function propagateByeWinners(rounds: BracketRound[], allMatches: BracketMatch[]): void {
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBye && match.winnerId && match.winnerGoesTo) {
        const nextMatch = allMatches.find((m) => m.id === match.winnerGoesTo!.matchId);
        if (nextMatch) {
          if (match.winnerGoesTo.position === 1) {
            nextMatch.participant1 = match.participant1;
            nextMatch.participant1Seed = match.participant1Seed;
          } else {
            nextMatch.participant2 = match.participant1;
            nextMatch.participant2Seed = match.participant1Seed;
          }
        }
      }
    }
  }
}

/**
 * Generate standard seeding positions for power-of-2 bracket
 * This ensures 1 vs lowest seed, 2 vs second lowest, etc.
 */
function generateSeedPositions(bracketSize: number): number[] {
  const positions: number[] = [];

  function fillPositions(start: number, end: number, seeds: number[]): void {
    if (seeds.length === 1) {
      positions[seeds[0]!] = start;
      return;
    }

    const mid = Math.floor((start + end) / 2);
    const topHalf: number[] = [];
    const bottomHalf: number[] = [];

    seeds.forEach((seed, i) => {
      if (i % 2 === 0) {
        topHalf.push(seed);
      } else {
        bottomHalf.push(seed);
      }
    });

    fillPositions(start, mid, topHalf);
    fillPositions(mid + 1, end, bottomHalf);
  }

  const seeds = Array.from({ length: bracketSize }, (_, i) => i);
  fillPositions(0, bracketSize - 1, seeds);

  return positions;
}

/**
 * Generate double elimination bracket
 */
export function generateDoubleEliminationBracket(
  participants: TournamentParticipant[],
  options: {
    eventId?: string;
    bestOf?: number;
    finalsBestOf?: number;
    seedingMethod?: SeedingMethod;
  } = {}
): { winners: Bracket; losers: Bracket; grandFinals: Bracket } {
  const { eventId = '', bestOf = 1, finalsBestOf = bestOf, seedingMethod = SeedingMethod.RATING } =
    options;

  // Generate winners bracket
  const winners = generateSingleEliminationBracket(participants, {
    eventId,
    bestOf,
    finalsBestOf,
    seedingMethod,
  });
  winners.type = BracketType.WINNERS;
  winners.name = 'Winners Bracket';

  // Calculate losers bracket structure
  const totalRounds = winners.totalRounds;
  const losersRounds = totalRounds * 2 - 1;

  const losersBracketId = generateId();
  const losersMatches: BracketMatch[] = [];
  const losersRoundsList: BracketRound[] = [];

  // Losers bracket starts with first round losers
  let currentLosersCount = Math.pow(2, totalRounds - 1);

  for (let round = 1; round <= losersRounds; round++) {
    const isDropDownRound = round % 2 === 1 && round < losersRounds;
    const matchesInRound = isDropDownRound
      ? currentLosersCount
      : Math.ceil(currentLosersCount / 2);

    const roundMatches: BracketMatch[] = [];

    for (let position = 0; position < matchesInRound; position++) {
      const match: BracketMatch = {
        id: generateId(),
        bracketId: losersBracketId,
        round,
        position,
        matchIdentifier: generateMatchIdentifier(
          BracketType.LOSERS,
          round,
          position,
          losersRounds
        ),
        status: MatchStatus.NOT_STARTED,
        isBye: false,
      };

      // Set sources from winners bracket for dropdown rounds
      if (isDropDownRound) {
        const winnersRound = Math.ceil(round / 2);
        const winnersMatch = winners.rounds[winnersRound - 1]?.matches[position];
        if (winnersMatch) {
          match.participant1Source = {
            type: 'match',
            sourceId: winnersMatch.id,
            position: 'loser',
          };
          // Set up loser goes to in winners match
          winnersMatch.loserGoesTo = {
            matchId: match.id,
            position: 1,
          };
        }
      }

      roundMatches.push(match);
      losersMatches.push(match);
    }

    losersRoundsList.push({
      roundNumber: round,
      name: `Losers Round ${round}`,
      matches: roundMatches,
      isComplete: false,
      bestOf: round === losersRounds ? finalsBestOf : bestOf,
    });

    if (!isDropDownRound) {
      currentLosersCount = Math.ceil(currentLosersCount / 2);
    }
  }

  const losers: Bracket = {
    id: losersBracketId,
    eventId,
    type: BracketType.LOSERS,
    name: 'Losers Bracket',
    totalRounds: losersRounds,
    rounds: losersRoundsList,
    matches: losersMatches,
    isComplete: false,
  };

  // Grand finals (best of 2 sets potentially)
  const grandFinalsId = generateId();
  const grandFinalsMatch: BracketMatch = {
    id: generateId(),
    bracketId: grandFinalsId,
    round: 1,
    position: 0,
    matchIdentifier: 'GF',
    participant1Source: {
      type: 'match',
      sourceId: winners.matches[winners.matches.length - 1]?.id ?? '',
      position: 'winner',
    },
    participant2Source: {
      type: 'match',
      sourceId: losers.matches[losers.matches.length - 1]?.id ?? '',
      position: 'winner',
    },
    status: MatchStatus.NOT_STARTED,
    isBye: false,
  };

  const grandFinals: Bracket = {
    id: grandFinalsId,
    eventId,
    type: BracketType.FINALS,
    name: 'Grand Finals',
    totalRounds: 1,
    rounds: [
      {
        roundNumber: 1,
        name: 'Grand Finals',
        matches: [grandFinalsMatch],
        isComplete: false,
        bestOf: finalsBestOf,
      },
    ],
    matches: [grandFinalsMatch],
    isComplete: false,
  };

  return { winners, losers, grandFinals };
}

/**
 * Generate a third place match for single elimination brackets
 */
export function generateThirdPlaceMatch(
  winnersBracket: Bracket,
  _options: {
    eventId?: string;
    bestOf?: number;
  } = {}
): BracketMatch | null {
  // Options reserved for future use (e.g., custom bestOf for 3rd place match)

  // Find semifinal matches (second to last round)
  if (winnersBracket.totalRounds < 2) return null;

  const semifinalRound = winnersBracket.rounds[winnersBracket.totalRounds - 2];
  if (!semifinalRound || semifinalRound.matches.length !== 2) return null;

  const bronzeMatchId = generateId();
  const bronzeMatch: BracketMatch = {
    id: bronzeMatchId,
    bracketId: winnersBracket.id,
    round: winnersBracket.totalRounds + 1, // After finals
    position: 0,
    matchIdentifier: '3RD',
    participant1Source: {
      type: 'match',
      sourceId: semifinalRound.matches[0]!.id,
      position: 'loser',
    },
    participant2Source: {
      type: 'match',
      sourceId: semifinalRound.matches[1]!.id,
      position: 'loser',
    },
    status: MatchStatus.NOT_STARTED,
    isBye: false,
  };

  // Set up loser destinations for semifinal matches
  semifinalRound.matches[0]!.loserGoesTo = { matchId: bronzeMatchId, position: 1 };
  semifinalRound.matches[1]!.loserGoesTo = { matchId: bronzeMatchId, position: 2 };

  return bronzeMatch;
}

/**
 * Generate consolation bracket for first-round losers
 */
export function generateConsolationBracket(
  _participants: TournamentParticipant[],
  mainBracket: Bracket,
  options: {
    eventId?: string;
    bestOf?: number;
  } = {}
): Bracket {
  // Note: participants arg kept for potential future use (manual consolation seeding)
  const { eventId = '', bestOf = 1 } = options;
  const consolationBracketId = generateId();

  // Get first round losers from main bracket
  const firstRoundMatches = mainBracket.rounds[0]?.matches ?? [];

  // Create consolation bracket with half the participants
  const consolationSize = Math.floor(firstRoundMatches.length);
  const totalRounds = calculateBracketRounds(consolationSize);

  const rounds: BracketRound[] = [];
  const allMatches: BracketMatch[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    const roundMatches: BracketMatch[] = [];

    for (let position = 0; position < matchesInRound; position++) {
      const matchId = generateId();
      const match: BracketMatch = {
        id: matchId,
        bracketId: consolationBracketId,
        round,
        position,
        matchIdentifier: `C${round}-${position + 1}`,
        status: MatchStatus.NOT_STARTED,
        isBye: false,
      };

      // First round gets losers from main bracket
      if (round === 1) {
        const sourceMatch1 = firstRoundMatches[position * 2];
        const sourceMatch2 = firstRoundMatches[position * 2 + 1];

        if (sourceMatch1) {
          match.participant1Source = {
            type: 'match',
            sourceId: sourceMatch1.id,
            position: 'loser',
          };
          sourceMatch1.loserGoesTo = { matchId, position: 1 };
        }

        if (sourceMatch2) {
          match.participant2Source = {
            type: 'match',
            sourceId: sourceMatch2.id,
            position: 'loser',
          };
          sourceMatch2.loserGoesTo = { matchId, position: 2 };
        }
      } else {
        // Subsequent rounds get winners from previous consolation round
        const prevRoundMatches = rounds[round - 2]?.matches ?? [];
        const source1 = prevRoundMatches[position * 2];
        const source2 = prevRoundMatches[position * 2 + 1];

        if (source1) {
          match.participant1Source = {
            type: 'match',
            sourceId: source1.id,
            position: 'winner',
          };
        }
        if (source2) {
          match.participant2Source = {
            type: 'match',
            sourceId: source2.id,
            position: 'winner',
          };
        }
      }

      roundMatches.push(match);
      allMatches.push(match);
    }

    // Set up winner destinations
    if (round < totalRounds) {
      roundMatches.forEach((match, idx) => {
        const nextRoundPosition = Math.floor(idx / 2);
        const nextMatch = allMatches.find(
          m => m.round === round + 1 && m.position === nextRoundPosition
        );
        if (nextMatch) {
          match.winnerGoesTo = {
            matchId: nextMatch.id,
            position: (idx % 2 === 0 ? 1 : 2) as 1 | 2,
          };
        }
      });
    }

    rounds.push({
      roundNumber: round,
      name: round === totalRounds ? 'Consolation Finals' : `Consolation Round ${round}`,
      matches: roundMatches,
      isComplete: false,
      bestOf,
    });
  }

  return {
    id: consolationBracketId,
    eventId,
    type: BracketType.CONSOLATION,
    name: 'Consolation Bracket',
    totalRounds,
    rounds,
    matches: allMatches,
    isComplete: false,
  };
}

// =============================================================================
// POOL GENERATION
// =============================================================================

/**
 * Generate pools for pool play format
 */
export function generatePools(
  participants: TournamentParticipant[],
  options: {
    numberOfPools?: number;
    targetPoolSize?: number;
    advancementCount?: number;
    seedingMethod?: SeedingMethod;
    eventId?: string;
  } = {}
): Pool[] {
  const {
    numberOfPools,
    targetPoolSize = 4,
    advancementCount = 2,
    seedingMethod = SeedingMethod.SNAKE,
    eventId = '',
  } = options;

  const participantCount = participants.length;

  if (participantCount < 3) {
    return [];
  }

  // Calculate number of pools
  const poolCount = numberOfPools ?? Math.max(2, Math.ceil(participantCount / targetPoolSize));

  // Seed participants
  const seededParticipants = seedParticipants(participants, seedingMethod);

  // Distribute participants to pools using snake seeding
  const poolAssignments: TournamentParticipant[][] = Array.from(
    { length: poolCount },
    () => []
  );

  let direction = 1; // 1 = forward, -1 = backward
  let poolIndex = 0;

  for (const participant of seededParticipants) {
    poolAssignments[poolIndex]!.push(participant);

    poolIndex += direction;

    // Reverse direction at boundaries (snake pattern)
    if (poolIndex >= poolCount) {
      poolIndex = poolCount - 1;
      direction = -1;
    } else if (poolIndex < 0) {
      poolIndex = 0;
      direction = 1;
    }
  }

  // Generate pools with matches
  const pools: Pool[] = poolAssignments.map((poolParticipants, index) => {
    const poolId = generateId();
    const poolName = String.fromCharCode(65 + index); // A, B, C, etc.

    // Generate round robin matches for this pool
    const matches = generatePoolMatches(poolId, poolParticipants);

    return {
      id: poolId,
      eventId,
      name: `Pool ${poolName}`,
      poolNumber: index + 1,
      participants: poolParticipants,
      matches,
      standings: calculatePoolStandings(matches, poolParticipants, advancementCount),
      advancementCount,
      isComplete: false,
      completedMatches: 0,
      totalMatches: matches.length,
    };
  });

  return pools;
}

/**
 * Generate round robin matches for a pool
 */
function generatePoolMatches(
  poolId: string,
  participants: TournamentParticipant[]
): PoolMatch[] {
  const matches: PoolMatch[] = [];
  const n = participants.length;

  if (n < 2) {
    return matches;
  }

  // Use circle method for optimal scheduling
  const participantsCopy = [...participants];
  const hasBye = n % 2 === 1;

  if (hasBye) {
    participantsCopy.push(null as unknown as TournamentParticipant); // BYE placeholder
  }

  const numParticipants = participantsCopy.length;
  const rounds = numParticipants - 1;
  const matchesPerRound = numParticipants / 2;

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = match;
      const away = numParticipants - 1 - match;

      // Rotate participants (keep first participant fixed for circle method)
      const homeIdx = home === 0 ? 0 : ((home + round - 1) % (numParticipants - 1)) + 1;
      const awayIdx = away === 0 ? 0 : ((away + round - 1) % (numParticipants - 1)) + 1;

      const participant1 = participantsCopy[homeIdx];
      const participant2 = participantsCopy[awayIdx];

      // Skip bye matches
      if (!participant1 || !participant2) {
        continue;
      }

      matches.push({
        id: generateId(),
        poolId,
        round: round + 1,
        matchNumber: matches.length + 1,
        participant1,
        participant2,
        status: MatchStatus.NOT_STARTED,
      });
    }
  }

  return matches;
}

// =============================================================================
// STANDINGS CALCULATION
// =============================================================================

/**
 * Calculate pool standings from matches
 */
export function calculatePoolStandings(
  matches: PoolMatch[],
  participants: TournamentParticipant[],
  advancementCount: number,
  tiebreakers: TiebreakerRule[] = [
    TiebreakerRule.HEAD_TO_HEAD,
    TiebreakerRule.POINT_DIFFERENTIAL,
    TiebreakerRule.POINTS_FOR,
  ]
): PoolStanding[] {
  // Initialize standings for all participants
  const standingsMap = new Map<string, PoolStanding>();

  for (const participant of participants) {
    const id = getParticipantId(participant);
    standingsMap.set(id, {
      participantId: id,
      participant,
      rank: 0,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      winPercentage: 0,
      advances: false,
    });
  }

  // Calculate from completed matches
  for (const match of matches) {
    if (match.status !== MatchStatus.COMPLETED || !match.score) {
      continue;
    }

    const p1Id = getParticipantId(match.participant1);
    const p2Id = getParticipantId(match.participant2);

    const standing1 = standingsMap.get(p1Id);
    const standing2 = standingsMap.get(p2Id);

    if (!standing1 || !standing2) continue;

    standing1.matchesPlayed++;
    standing2.matchesPlayed++;

    standing1.gamesWon += match.score.team1GamesWon;
    standing1.gamesLost += match.score.team2GamesWon;
    standing2.gamesWon += match.score.team2GamesWon;
    standing2.gamesLost += match.score.team1GamesWon;

    standing1.pointsFor += match.score.team1TotalPoints;
    standing1.pointsAgainst += match.score.team2TotalPoints;
    standing2.pointsFor += match.score.team2TotalPoints;
    standing2.pointsAgainst += match.score.team1TotalPoints;

    if (match.score.winner === 1) {
      standing1.matchesWon++;
      standing2.matchesLost++;
    } else if (match.score.winner === 2) {
      standing2.matchesWon++;
      standing1.matchesLost++;
    }
  }

  // Calculate derived values
  const standings = Array.from(standingsMap.values()).map((s) => ({
    ...s,
    pointDifferential: s.pointsFor - s.pointsAgainst,
    winPercentage: s.matchesPlayed > 0 ? s.matchesWon / s.matchesPlayed : 0,
  }));

  // Sort standings using tiebreakers
  standings.sort((a, b) => {
    // Primary: win percentage
    if (b.winPercentage !== a.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }

    // Apply tiebreakers
    for (const rule of tiebreakers) {
      const result = applyTiebreaker(a, b, rule, matches);
      if (result !== 0) return result;
    }

    return 0;
  });

  // Assign ranks and advancement
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
    standing.advances = index < advancementCount;
  });

  return standings;
}

/**
 * Apply a single tiebreaker rule
 */
function applyTiebreaker(
  a: PoolStanding,
  b: PoolStanding,
  rule: TiebreakerRule,
  matches: PoolMatch[]
): number {
  switch (rule) {
    case TiebreakerRule.HEAD_TO_HEAD: {
      const h2hMatch = matches.find(
        (m) =>
          m.status === MatchStatus.COMPLETED &&
          ((getParticipantId(m.participant1) === a.participantId &&
            getParticipantId(m.participant2) === b.participantId) ||
            (getParticipantId(m.participant1) === b.participantId &&
              getParticipantId(m.participant2) === a.participantId))
      );

      if (h2hMatch?.score?.winner) {
        const aWasTeam1 = getParticipantId(h2hMatch.participant1) === a.participantId;
        const aWon =
          (aWasTeam1 && h2hMatch.score.winner === 1) ||
          (!aWasTeam1 && h2hMatch.score.winner === 2);
        return aWon ? -1 : 1;
      }
      return 0;
    }

    case TiebreakerRule.POINT_DIFFERENTIAL:
      return b.pointDifferential - a.pointDifferential;

    case TiebreakerRule.POINTS_FOR:
      return b.pointsFor - a.pointsFor;

    case TiebreakerRule.POINTS_AGAINST:
      return a.pointsAgainst - b.pointsAgainst;

    case TiebreakerRule.GAMES_WON:
      return b.gamesWon - a.gamesWon;

    case TiebreakerRule.RATING:
      return (
        getParticipantRating(b.participant) - getParticipantRating(a.participant)
      );

    default:
      return 0;
  }
}

// =============================================================================
// ADVANCEMENT & BRACKET TRANSITION
// =============================================================================

/**
 * Cross-pool seeding methods for pool-to-bracket transitions
 */
export type CrossPoolSeedingMethod = 'standard' | 'reverse' | 'snake';

/**
 * Cross-pool seeding options configuration
 */
export interface CrossPoolSeedingOptions {
  method: CrossPoolSeedingMethod;
  /** If true, 1st seeds from different pools won't meet until later rounds */
  separateTopSeeds?: boolean;
}

/**
 * Apply cross-pool seeding to arrange participants for bracket
 */
export function applyCrossPoolSeeding(
  advancingParticipants: Array<{
    participant: TournamentParticipant;
    poolRank: number;
    poolNumber: number;
  }>,
  advancementCount: number,
  poolCount: number,
  options: CrossPoolSeedingOptions = { method: 'standard' }
): TournamentParticipant[] {
  const { method, separateTopSeeds = true } = options;

  switch (method) {
    case 'standard':
      // Standard: 1st from Pool A vs 2nd from Pool B, etc.
      // This ensures top seeds from each pool are on opposite sides of bracket
      return applyStandardCrossPoolSeeding(advancingParticipants, advancementCount, poolCount, separateTopSeeds);

    case 'reverse':
      // Reverse: Structure so 1st seeds meet in later rounds
      // Seeds are arranged so top performers have easier early matchups
      return applyReverseCrossPoolSeeding(advancingParticipants, advancementCount, poolCount);

    case 'snake':
      // Snake: Alternating pattern for balanced distribution
      // Provides most balanced distribution across the bracket
      return applySnakeCrossPoolSeeding(advancingParticipants, advancementCount);

    default:
      return applyStandardCrossPoolSeeding(advancingParticipants, advancementCount, poolCount, separateTopSeeds);
  }
}

/**
 * Standard cross-pool seeding: 1st vs 2nd from different pools
 */
function applyStandardCrossPoolSeeding(
  participants: Array<{ participant: TournamentParticipant; poolRank: number; poolNumber: number }>,
  advancementCount: number,
  poolCount: number,
  separateTopSeeds: boolean
): TournamentParticipant[] {
  const seededParticipants: TournamentParticipant[] = [];

  // Create matchups: 1st from Pool A vs 2nd from Pool B (for 2-pool case)
  // For more pools, arrange so 1st seeds are on opposite halves of bracket
  if (separateTopSeeds && poolCount === 2 && advancementCount >= 2) {
    // Special handling for 2 pools with cross-seeding
    const pool1Participants = participants.filter(p => p.poolNumber === 1).sort((a, b) => a.poolRank - b.poolRank);
    const pool2Participants = participants.filter(p => p.poolNumber === 2).sort((a, b) => a.poolRank - b.poolRank);

    // Arrange so: A1 vs B2 and B1 vs A2 (if both advance to finals)
    // Bracket positions: [A1, B4, B2, A3, B1, A4, A2, B3] for 4 from each pool
    for (let i = 0; i < advancementCount; i++) {
      const p1 = pool1Participants[i];
      const p2 = pool2Participants[advancementCount - 1 - i];
      if (p1) seededParticipants.push(p1.participant);
      if (p2) seededParticipants.push(p2.participant);
    }
  } else {
    // Multi-pool standard seeding
    for (let rank = 1; rank <= advancementCount; rank++) {
      const rankParticipants = participants
        .filter(p => p.poolRank === rank)
        .sort((a, b) => a.poolNumber - b.poolNumber);

      // Alternate direction for each rank to distribute fairly
      if (rank % 2 === 0) {
        rankParticipants.reverse();
      }

      seededParticipants.push(...rankParticipants.map(p => p.participant));
    }
  }

  return seededParticipants;
}

/**
 * Reverse cross-pool seeding: Top seeds get easier early matchups
 */
function applyReverseCrossPoolSeeding(
  participants: Array<{ participant: TournamentParticipant; poolRank: number; poolNumber: number }>,
  advancementCount: number,
  poolCount: number
): TournamentParticipant[] {
  // Reverse seeding: 1st seeds get byes or face lowest seeds
  // Arrange bracket so 1st seeds are spread maximally apart
  const allSorted = [...participants].sort((a, b) => {
    // Primary sort by rank
    if (a.poolRank !== b.poolRank) return a.poolRank - b.poolRank;
    // Secondary sort by pool (reversed)
    return b.poolNumber - a.poolNumber;
  });

  // Create bracket positions using standard seeding algorithm
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(poolCount * advancementCount)));
  const positions = generateBracketSeedPositions(bracketSize);

  // Place participants according to seed positions
  const result: (TournamentParticipant | undefined)[] = new Array(allSorted.length);
  for (let i = 0; i < allSorted.length && i < positions.length; i++) {
    const pos = positions[i];
    if (pos !== undefined && pos < allSorted.length && allSorted[i]) {
      result[pos] = allSorted[i]!.participant;
    }
  }

  // Filter out undefined and return
  return result.filter((p): p is TournamentParticipant => p !== undefined);
}

/**
 * Snake cross-pool seeding: Alternating pattern for balance
 */
function applySnakeCrossPoolSeeding(
  participants: Array<{ participant: TournamentParticipant; poolRank: number; poolNumber: number }>,
  _advancementCount: number // Reserved for potential future validation
): TournamentParticipant[] {
  const seededParticipants: TournamentParticipant[] = [];

  // Sort by rank first, then pool number
  const sorted = [...participants].sort((a, b) => {
    if (a.poolRank !== b.poolRank) return a.poolRank - b.poolRank;
    return a.poolNumber - b.poolNumber;
  });

  // Apply snake pattern
  let direction = 1;
  let currentRank = 0;

  for (const p of sorted) {
    if (p.poolRank !== currentRank) {
      // New rank, potentially reverse direction
      if (currentRank > 0) {
        direction *= -1;
      }
      currentRank = p.poolRank;
    }

    if (direction === 1) {
      seededParticipants.push(p.participant);
    } else {
      // Find insertion point for reverse
      let insertIdx = seededParticipants.length;
      for (let i = seededParticipants.length - 1; i >= 0; i--) {
        const existing = participants.find(ep => ep.participant === seededParticipants[i]);
        if (existing && existing.poolRank < p.poolRank) {
          insertIdx = i + 1;
          break;
        }
      }
      seededParticipants.splice(insertIdx, 0, p.participant);
    }
  }

  return seededParticipants;
}

/**
 * Generate standard bracket seed positions for power-of-2 bracket
 */
function generateBracketSeedPositions(bracketSize: number): number[] {
  const positions: number[] = new Array(bracketSize);

  function fillPositions(seeds: number[], start: number, end: number): void {
    if (seeds.length === 1) {
      positions[seeds[0]!] = start;
      return;
    }

    const mid = Math.floor((start + end) / 2);
    const top: number[] = [];
    const bottom: number[] = [];

    for (let i = 0; i < seeds.length; i++) {
      if (i % 2 === 0) {
        top.push(seeds[i]!);
      } else {
        bottom.push(seeds[i]!);
      }
    }

    fillPositions(top, start, mid);
    fillPositions(bottom, mid + 1, end);
  }

  const seeds = Array.from({ length: bracketSize }, (_, i) => i);
  fillPositions(seeds, 0, bracketSize - 1);

  return positions;
}

/**
 * Advance top participants from pools to bracket
 */
export function advanceToPlayoffs(
  pools: Pool[],
  advancementCount: number,
  bracketFormat: TournamentFormat.SINGLE_ELIMINATION | TournamentFormat.DOUBLE_ELIMINATION =
    TournamentFormat.SINGLE_ELIMINATION,
  options: {
    eventId?: string;
    bestOf?: number;
    finalsBestOf?: number;
    crossPoolSeeding?: CrossPoolSeedingOptions;
  } = {}
): Bracket | { winners: Bracket; losers: Bracket; grandFinals: Bracket } {
  // Collect advancing participants from each pool
  const advancingParticipants: Array<{
    participant: TournamentParticipant;
    poolRank: number;
    poolNumber: number;
  }> = [];

  for (const pool of pools) {
    const standings = pool.standings.filter((s) => s.rank <= advancementCount);
    for (const standing of standings) {
      advancingParticipants.push({
        participant: standing.participant,
        poolRank: standing.rank,
        poolNumber: pool.poolNumber,
      });
    }
  }

  // Apply cross-pool seeding based on options
  const crossPoolOptions = options.crossPoolSeeding ?? { method: 'standard' };
  const seededParticipants = applyCrossPoolSeeding(
    advancingParticipants,
    advancementCount,
    pools.length,
    crossPoolOptions
  );

  if (bracketFormat === TournamentFormat.DOUBLE_ELIMINATION) {
    return generateDoubleEliminationBracket(seededParticipants, {
      eventId: options.eventId,
      bestOf: options.bestOf,
      finalsBestOf: options.finalsBestOf,
      seedingMethod: SeedingMethod.MANUAL, // Already seeded
    });
  }

  return generateSingleEliminationBracket(seededParticipants, {
    eventId: options.eventId,
    bestOf: options.bestOf,
    finalsBestOf: options.finalsBestOf,
    seedingMethod: SeedingMethod.MANUAL, // Already seeded
  });
}

// =============================================================================
// MATCH UTILITIES
// =============================================================================

/**
 * Find the next unplayed match in a bracket
 */
export function getNextMatch(bracket: Bracket): BracketMatch | null {
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (
        match.status === MatchStatus.NOT_STARTED &&
        match.participant1 &&
        match.participant2 &&
        !match.isBye
      ) {
        return match;
      }
    }
  }
  return null;
}

/**
 * Get all ready-to-play matches (both participants present, not started)
 */
export function getReadyMatches(bracket: Bracket): BracketMatch[] {
  return bracket.matches.filter(
    (match) =>
      match.status === MatchStatus.NOT_STARTED &&
      match.participant1 &&
      match.participant2 &&
      !match.isBye
  );
}

/**
 * Get matches in progress
 */
export function getInProgressMatches(bracket: Bracket): BracketMatch[] {
  return bracket.matches.filter((match) => match.status === MatchStatus.IN_PROGRESS);
}

/**
 * Record match result and propagate winner
 */
export function recordMatchResult(
  bracket: Bracket,
  matchId: string,
  score: MatchScore
): Bracket {
  const matchIndex = bracket.matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) return bracket;

  const match = bracket.matches[matchIndex]!;
  const updatedMatch: BracketMatch = {
    ...match,
    score,
    winner: score.winner,
    winnerId:
      score.winner === 1 && match.participant1
        ? getParticipantId(match.participant1)
        : score.winner === 2 && match.participant2
          ? getParticipantId(match.participant2)
          : undefined,
    loserId:
      score.winner === 1 && match.participant2
        ? getParticipantId(match.participant2)
        : score.winner === 2 && match.participant1
          ? getParticipantId(match.participant1)
          : undefined,
    status: MatchStatus.COMPLETED,
    completedAt: new Date().toISOString(),
  };

  const updatedMatches = [...bracket.matches];
  updatedMatches[matchIndex] = updatedMatch;

  // Propagate winner to next match
  if (updatedMatch.winnerGoesTo) {
    const nextMatchIndex = updatedMatches.findIndex(
      (m) => m.id === updatedMatch.winnerGoesTo!.matchId
    );
    if (nextMatchIndex !== -1) {
      const nextMatch = updatedMatches[nextMatchIndex]!;
      const winner =
        score.winner === 1 ? match.participant1 : match.participant2;
      const winnerSeed =
        score.winner === 1 ? match.participant1Seed : match.participant2Seed;

      if (updatedMatch.winnerGoesTo.position === 1) {
        updatedMatches[nextMatchIndex] = {
          ...nextMatch,
          participant1: winner,
          participant1Seed: winnerSeed,
        };
      } else {
        updatedMatches[nextMatchIndex] = {
          ...nextMatch,
          participant2: winner,
          participant2Seed: winnerSeed,
        };
      }
    }
  }

  // Propagate loser (for double elimination)
  if (updatedMatch.loserGoesTo) {
    const losersMatchIndex = updatedMatches.findIndex(
      (m) => m.id === updatedMatch.loserGoesTo!.matchId
    );
    if (losersMatchIndex !== -1) {
      const losersMatch = updatedMatches[losersMatchIndex]!;
      const loser =
        score.winner === 1 ? match.participant2 : match.participant1;
      const loserSeed =
        score.winner === 1 ? match.participant2Seed : match.participant1Seed;

      if (updatedMatch.loserGoesTo.position === 1) {
        updatedMatches[losersMatchIndex] = {
          ...losersMatch,
          participant1: loser,
          participant1Seed: loserSeed,
        };
      } else {
        updatedMatches[losersMatchIndex] = {
          ...losersMatch,
          participant2: loser,
          participant2Seed: loserSeed,
        };
      }
    }
  }

  // Rebuild rounds
  const updatedRounds = bracket.rounds.map((round) => ({
    ...round,
    matches: updatedMatches.filter((m) => m.round === round.roundNumber),
    isComplete: updatedMatches
      .filter((m) => m.round === round.roundNumber)
      .every((m) => m.status === MatchStatus.COMPLETED),
  }));

  // Check if bracket is complete
  const isComplete = updatedMatches.every(
    (m) => m.status === MatchStatus.COMPLETED || m.isBye
  );

  // Determine champion if complete
  let champion: TournamentParticipant | undefined;
  let runnerUp: TournamentParticipant | undefined;

  if (isComplete) {
    const finalsMatch = updatedMatches.find((m) => m.round === bracket.totalRounds);
    if (finalsMatch?.winner) {
      champion =
        finalsMatch.winner === 1
          ? finalsMatch.participant1 ?? undefined
          : finalsMatch.participant2 ?? undefined;
      runnerUp =
        finalsMatch.winner === 1
          ? finalsMatch.participant2 ?? undefined
          : finalsMatch.participant1 ?? undefined;
    }
  }

  return {
    ...bracket,
    matches: updatedMatches,
    rounds: updatedRounds,
    isComplete,
    champion,
    runnerUp,
  };
}

// =============================================================================
// SEEDING UTILITIES
// =============================================================================

/**
 * Seed participants based on method
 */
export function seedParticipants(
  participants: TournamentParticipant[],
  method: SeedingMethod
): TournamentParticipant[] {
  switch (method) {
    case SeedingMethod.RANDOM:
      return shuffleArray([...participants]);

    case SeedingMethod.RATING:
      return [...participants].sort(
        (a, b) => getParticipantRating(b) - getParticipantRating(a)
      );

    case SeedingMethod.MANUAL:
      // Assume participants are already in desired order
      return participants;

    case SeedingMethod.SNAKE:
      // Sort by rating then apply snake pattern (used for pools)
      return [...participants].sort(
        (a, b) => getParticipantRating(b) - getParticipantRating(a)
      );

    case SeedingMethod.HYBRID:
      // Top seeds by rating, rest random
      const sorted = [...participants].sort(
        (a, b) => getParticipantRating(b) - getParticipantRating(a)
      );
      const topCount = Math.ceil(participants.length / 4);
      const top = sorted.slice(0, topCount);
      const rest = shuffleArray(sorted.slice(topCount));
      return [...top, ...rest];

    default:
      return participants;
  }
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

// =============================================================================
// SCORE UTILITIES
// =============================================================================

/**
 * Create an empty match score
 */
export function createEmptyScore(_bestOf: number): MatchScore {
  return {
    games: [],
    team1GamesWon: 0,
    team2GamesWon: 0,
    team1TotalPoints: 0,
    team2TotalPoints: 0,
    winner: null,
  };
}

/**
 * Calculate match score from games
 */
export function calculateMatchScore(
  games: GameScore[],
  bestOf: number,
  pointsToWin: number,
  winBy: number
): MatchScore {
  let team1GamesWon = 0;
  let team2GamesWon = 0;
  let team1TotalPoints = 0;
  let team2TotalPoints = 0;

  for (const game of games) {
    team1TotalPoints += game.team1Score;
    team2TotalPoints += game.team2Score;

    // Determine game winner
    const team1Won =
      game.team1Score >= pointsToWin &&
      game.team1Score - game.team2Score >= winBy;
    const team2Won =
      game.team2Score >= pointsToWin &&
      game.team2Score - game.team1Score >= winBy;

    if (team1Won) team1GamesWon++;
    if (team2Won) team2GamesWon++;
  }

  const gamesNeeded = Math.ceil(bestOf / 2);
  let winner: 1 | 2 | null = null;

  if (team1GamesWon >= gamesNeeded) {
    winner = 1;
  } else if (team2GamesWon >= gamesNeeded) {
    winner = 2;
  }

  return {
    games,
    team1GamesWon,
    team2GamesWon,
    team1TotalPoints,
    team2TotalPoints,
    winner,
  };
}

/**
 * Check if a game is complete
 */
export function isGameComplete(
  score: GameScore,
  pointsToWin: number,
  winBy: number,
  maxPoints?: number
): boolean {
  const { team1Score, team2Score } = score;

  // Check if max points reached (cap)
  if (maxPoints && (team1Score >= maxPoints || team2Score >= maxPoints)) {
    return true;
  }

  // Check standard win condition
  if (team1Score >= pointsToWin && team1Score - team2Score >= winBy) {
    return true;
  }
  if (team2Score >= pointsToWin && team2Score - team1Score >= winBy) {
    return true;
  }

  return false;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate participant count for a format
 */
export function validateParticipantCount(
  count: number,
  format: TournamentFormat
): { valid: boolean; message?: string; recommendation?: number } {
  const minParticipants: Record<TournamentFormat, number> = {
    [TournamentFormat.SINGLE_ELIMINATION]: 2,
    [TournamentFormat.DOUBLE_ELIMINATION]: 4,
    [TournamentFormat.ROUND_ROBIN]: 3,
    [TournamentFormat.POOL_PLAY]: 6,
    [TournamentFormat.POOL_TO_BRACKET]: 8,
  };

  const min = minParticipants[format];

  if (count < min) {
    return {
      valid: false,
      message: `${format} requires at least ${min} participants`,
      recommendation: min,
    };
  }

  // Check for optimal bracket sizes
  if (
    format === TournamentFormat.SINGLE_ELIMINATION ||
    format === TournamentFormat.DOUBLE_ELIMINATION
  ) {
    const bracketSize = calculateBracketSize(count);
    const byes = bracketSize - count;

    if (byes > bracketSize / 2) {
      return {
        valid: true,
        message: `${byes} byes will be needed. Consider waiting for ${bracketSize / 2 - byes + count} participants`,
        recommendation: bracketSize / 2 + 1,
      };
    }
  }

  return { valid: true };
}

// =============================================================================
// DISPLAY UTILITIES
// =============================================================================

/**
 * Get bracket progress summary
 */
export function getBracketProgress(bracket: Bracket): {
  totalMatches: number;
  completedMatches: number;
  remainingMatches: number;
  percentComplete: number;
  currentRound: number;
  currentRoundName: string;
} {
  const nonByeMatches = bracket.matches.filter((m) => !m.isBye);
  const completedMatches = nonByeMatches.filter(
    (m) => m.status === MatchStatus.COMPLETED
  ).length;
  const totalMatches = nonByeMatches.length;

  // Find current active round
  let currentRound = 1;
  for (const round of bracket.rounds) {
    const roundComplete = round.matches.every(
      (m) => m.status === MatchStatus.COMPLETED || m.isBye
    );
    if (!roundComplete) {
      currentRound = round.roundNumber;
      break;
    }
    currentRound = round.roundNumber + 1;
  }

  return {
    totalMatches,
    completedMatches,
    remainingMatches: totalMatches - completedMatches,
    percentComplete: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
    currentRound: Math.min(currentRound, bracket.totalRounds),
    currentRoundName: getRoundName(
      Math.min(currentRound, bracket.totalRounds),
      bracket.totalRounds
    ),
  };
}

/**
 * Get pool progress summary
 */
export function getPoolProgress(pool: Pool): {
  totalMatches: number;
  completedMatches: number;
  remainingMatches: number;
  percentComplete: number;
} {
  const completedMatches = pool.matches.filter(
    (m) => m.status === MatchStatus.COMPLETED
  ).length;
  const totalMatches = pool.matches.length;

  return {
    totalMatches,
    completedMatches,
    remainingMatches: totalMatches - completedMatches,
    percentComplete: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0,
  };
}

/**
 * Format score for display
 */
export function formatScoreDisplay(score: MatchScore | undefined): string {
  if (!score || score.games.length === 0) {
    return '-';
  }

  return score.games
    .map((g) => `${g.team1Score}-${g.team2Score}`)
    .join(', ');
}

/**
 * Get estimated remaining time for a bracket/pool
 */
export function getEstimatedRemainingTime(
  remainingMatches: number,
  avgMatchDurationMinutes: number,
  availableCourts: number
): number {
  if (availableCourts === 0 || remainingMatches === 0) return 0;

  const parallelRounds = Math.ceil(remainingMatches / availableCourts);
  return parallelRounds * avgMatchDurationMinutes;
}
