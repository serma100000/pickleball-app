/**
 * Round Robin Tournament Utilities
 * Generates matchups for round robin tournaments (individual and team-based)
 *
 * Swish-style round robin features:
 * - Configurable number of rounds (respects maxRounds limit)
 * - Each player plays once per round (proper scheduling)
 * - Rotating partners for doubles round robin
 * - Court-aware scheduling (matches can be played in parallel)
 */

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  player1: Player;
  player2: Player;
}

export interface Match {
  id: string;
  round: number;
  court?: number; // Court assignment (1-based)
  // For individual round robin
  player1?: Player;
  player2?: Player;
  // For team round robin (set partner)
  team1?: Team;
  team2?: Team;
  // Score tracking
  score: {
    team1: number;
    team2: number;
  };
  completed: boolean;
}

export interface RoundRobinResult {
  matches: Match[];
  rounds: number;
  totalPossibleRounds: number; // How many rounds would be needed for full round robin
}

export interface RoundRobinOptions {
  maxRounds?: number; // Limit number of rounds (default: all rounds needed)
  numberOfCourts?: number; // Number of courts available (for scheduling)
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Generate singles round robin matchups (1v1)
 * Each player plays against every other player exactly once
 * Respects maxRounds limit if specified
 */
export function generateSinglesRoundRobin(
  players: Player[],
  options: RoundRobinOptions = {}
): RoundRobinResult {
  const matches: Match[] = [];
  const n = players.length;

  if (n < 2) {
    return { matches: [], rounds: 0, totalPossibleRounds: 0 };
  }

  // Use circle method for optimal round-robin scheduling
  const playersCopy = [...players];

  // If odd number of players, add a "bye" placeholder
  const hasBye = n % 2 === 1;
  if (hasBye) {
    playersCopy.push({ id: 'bye', name: 'BYE' });
  }

  const numPlayers = playersCopy.length;
  const totalPossibleRounds = numPlayers - 1;
  const maxRounds = options.maxRounds ?? totalPossibleRounds;
  // Allow more rounds than totalPossibleRounds - matchups will repeat in cycles
  const roundsToGenerate = maxRounds;
  const matchesPerRound = numPlayers / 2;

  for (let round = 0; round < roundsToGenerate; round++) {
    // Use modulo to cycle through rotations when rounds exceed totalPossibleRounds
    const rotationIndex = round % totalPossibleRounds;
    let courtNumber = 1;
    for (let match = 0; match < matchesPerRound; match++) {
      const home = match;
      const away = numPlayers - 1 - match;

      // Rotate players (keep first player fixed for circle method)
      const homePlayer = playersCopy[home === 0 ? 0 : ((home + rotationIndex - 1) % (numPlayers - 1)) + 1];
      const awayPlayer = playersCopy[away === 0 ? 0 : ((away + rotationIndex - 1) % (numPlayers - 1)) + 1];

      // Skip bye matches
      if (homePlayer?.id === 'bye' || awayPlayer?.id === 'bye') {
        continue;
      }

      if (homePlayer && awayPlayer) {
        matches.push({
          id: generateId(),
          round: round + 1,
          court: courtNumber++,
          player1: homePlayer,
          player2: awayPlayer,
          score: { team1: 0, team2: 0 },
          completed: false,
        });
      }
    }
  }

  return { matches, rounds: roundsToGenerate, totalPossibleRounds };
}

/**
 * Generate round robin matchups for individual players (doubles with rotating partners)
 * Uses a balanced scheduling algorithm to ensure:
 * 1. Each player plays exactly once per round
 * 2. Partners rotate as evenly as possible across rounds
 * 3. Each player faces different opponents across rounds
 * (Swish-style rotating partners)
 */
export function generateIndividualRoundRobin(
  players: Player[],
  options: RoundRobinOptions = {}
): RoundRobinResult {
  const matches: Match[] = [];
  const n = players.length;

  if (n < 4) {
    // Not enough for doubles round robin - need at least 4 players
    return { matches: [], rounds: 0, totalPossibleRounds: 0 };
  }

  // Ensure we have a multiple of 4 players for clean doubles scheduling
  // If not, some players will sit out each round (bye)
  const playersCopy = [...players];

  // If odd number or not divisible by 4, add bye placeholders
  while (playersCopy.length % 4 !== 0) {
    playersCopy.push({ id: `bye-${playersCopy.length}`, name: 'BYE' });
  }

  const numPlayers = playersCopy.length;
  const matchesPerRound = numPlayers / 4;

  // For n players, the maximum rounds where each player can have a unique partner
  // is n-1 (each player can partner with n-1 other players)
  const totalPossibleRounds = numPlayers - 1;
  const maxRounds = options.maxRounds ?? totalPossibleRounds;
  // Allow more rounds than totalPossibleRounds - matchups will repeat in cycles
  const roundsToGenerate = maxRounds;

  // Track partnerships to ensure even distribution
  const partnershipCount = new Map<string, number>();
  const getPartnerKey = (p1: string, p2: string) => [p1, p2].sort().join('-');

  // Use a balanced "whist tournament" style algorithm
  // This ensures partners rotate evenly across rounds
  for (let round = 0; round < roundsToGenerate; round++) {
    // Use modulo to cycle through rotations when rounds exceed totalPossibleRounds
    const rotationIndex = round % totalPossibleRounds;
    // Create pairings for this round using circle method with offset pairing
    // Keep player 0 fixed, rotate others
    const positions: number[] = [0];
    for (let i = 1; i < numPlayers; i++) {
      positions.push(((i - 1 + rotationIndex) % (numPlayers - 1)) + 1);
    }

    // Map positions to actual players
    const roundPlayers = positions.map(pos => playersCopy[pos]!);

    // Create balanced partnerships for this round
    // Use a scheme where partners come from different "halves" of the rotation
    // This helps ensure variety in partnerships across rounds
    const pairings: [Player, Player, Player, Player][] = [];

    for (let m = 0; m < matchesPerRound; m++) {
      // Use interleaved pairing: (0, n/2) vs (1, n/2+1), (2, n/2+2) vs (3, n/2+3), etc.
      // This creates more variety in partnerships than consecutive pairing
      const halfSize = numPlayers / 2;
      const base = m * 2;

      const p1 = roundPlayers[base % halfSize]!;
      const p2 = roundPlayers[(base % halfSize) + halfSize]!;
      const p3 = roundPlayers[(base + 1) % halfSize]!;
      const p4 = roundPlayers[((base + 1) % halfSize) + halfSize]!;

      pairings.push([p1, p2, p3, p4]);
    }

    // Generate matches from pairings
    let courtNumber = 1;
    for (const [p1, p2, p3, p4] of pairings) {
      // Skip matches with bye players
      if (p1.id.startsWith('bye') || p2.id.startsWith('bye') ||
          p3.id.startsWith('bye') || p4.id.startsWith('bye')) {
        continue;
      }

      // Track partnerships
      partnershipCount.set(
        getPartnerKey(p1.id, p2.id),
        (partnershipCount.get(getPartnerKey(p1.id, p2.id)) ?? 0) + 1
      );
      partnershipCount.set(
        getPartnerKey(p3.id, p4.id),
        (partnershipCount.get(getPartnerKey(p3.id, p4.id)) ?? 0) + 1
      );

      matches.push({
        id: generateId(),
        round: round + 1,
        court: courtNumber++,
        team1: {
          id: generateId(),
          player1: p1,
          player2: p2,
        },
        team2: {
          id: generateId(),
          player1: p3,
          player2: p4,
        },
        score: { team1: 0, team2: 0 },
        completed: false,
      });
    }
  }

  const actualRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
  return { matches, rounds: actualRounds, totalPossibleRounds };
}

/**
 * Generate round robin matchups for set partner teams
 * Each team plays against every other team exactly once
 * Respects maxRounds limit if specified
 */
export function generateTeamRoundRobin(
  teams: Team[],
  options: RoundRobinOptions = {}
): RoundRobinResult {
  const matches: Match[] = [];
  const n = teams.length;

  if (n < 2) {
    return { matches: [], rounds: 0, totalPossibleRounds: 0 };
  }

  // Use circle method for optimal round-robin scheduling
  // This ensures each team plays exactly once per round (when possible)
  const teamsCopy = [...teams];

  // If odd number of teams, add a "bye" placeholder
  const hasBye = n % 2 === 1;
  if (hasBye) {
    teamsCopy.push({ id: 'bye', player1: { id: 'bye', name: 'BYE' }, player2: { id: 'bye', name: '' } });
  }

  const numTeams = teamsCopy.length;
  const totalPossibleRounds = numTeams - 1;
  const maxRounds = options.maxRounds ?? totalPossibleRounds;
  // Allow more rounds than totalPossibleRounds - matchups will repeat in cycles
  const roundsToGenerate = maxRounds;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < roundsToGenerate; round++) {
    // Use modulo to cycle through rotations when rounds exceed totalPossibleRounds
    const rotationIndex = round % totalPossibleRounds;
    let courtNumber = 1;
    for (let match = 0; match < matchesPerRound; match++) {
      const home = match;
      const away = numTeams - 1 - match;

      // Rotate teams (keep first team fixed for circle method)
      const homeTeam = teamsCopy[home === 0 ? 0 : ((home + rotationIndex - 1) % (numTeams - 1)) + 1];
      const awayTeam = teamsCopy[away === 0 ? 0 : ((away + rotationIndex - 1) % (numTeams - 1)) + 1];

      // Skip bye matches
      if (homeTeam?.id === 'bye' || awayTeam?.id === 'bye') {
        continue;
      }

      if (homeTeam && awayTeam) {
        matches.push({
          id: generateId(),
          round: round + 1,
          court: courtNumber++,
          team1: homeTeam,
          team2: awayTeam,
          score: { team1: 0, team2: 0 },
          completed: false,
        });
      }
    }
  }

  return { matches, rounds: roundsToGenerate, totalPossibleRounds };
}

/**
 * Calculate standings from completed matches
 */
export interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
}

export function calculateStandings(matches: Match[], teams: Team[]): Standing[] {
  const standings = new Map<string, Standing>();

  // Initialize standings for all teams
  for (const team of teams) {
    standings.set(team.id, {
      teamId: team.id,
      teamName: team.player1.name + ' & ' + team.player2.name,
      played: 0,
      won: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
    });
  }

  // Calculate from completed matches
  for (const match of matches) {
    if (!match.completed || !match.team1 || !match.team2) continue;

    const team1Standing = standings.get(match.team1.id);
    const team2Standing = standings.get(match.team2.id);

    if (team1Standing && team2Standing) {
      team1Standing.played++;
      team2Standing.played++;

      team1Standing.pointsFor += match.score.team1;
      team1Standing.pointsAgainst += match.score.team2;
      team2Standing.pointsFor += match.score.team2;
      team2Standing.pointsAgainst += match.score.team1;

      if (match.score.team1 > match.score.team2) {
        team1Standing.won++;
        team2Standing.lost++;
      } else if (match.score.team2 > match.score.team1) {
        team2Standing.won++;
        team1Standing.lost++;
      }
    }
  }

  // Calculate point diff and convert to array
  const standingsArray = Array.from(standings.values()).map((s) => ({
    ...s,
    pointDiff: s.pointsFor - s.pointsAgainst,
  }));

  // Sort by wins (desc), then point diff (desc)
  standingsArray.sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    return b.pointDiff - a.pointDiff;
  });

  return standingsArray;
}

/**
 * Get matches grouped by round
 */
export function getMatchesByRound(matches: Match[]): Map<number, Match[]> {
  const byRound = new Map<number, Match[]>();

  for (const match of matches) {
    const roundMatches = byRound.get(match.round) || [];
    roundMatches.push(match);
    byRound.set(match.round, roundMatches);
  }

  return byRound;
}

/**
 * Check if all matches are completed
 */
export function isRoundRobinComplete(matches: Match[]): boolean {
  return matches.length > 0 && matches.every((m) => m.completed);
}

/**
 * Get number of completed matches
 */
export function getCompletedMatchCount(matches: Match[]): number {
  return matches.filter((m) => m.completed).length;
}
