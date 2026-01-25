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
  const roundsToGenerate = Math.min(maxRounds, totalPossibleRounds);
  const matchesPerRound = numPlayers / 2;

  for (let round = 0; round < roundsToGenerate; round++) {
    let courtNumber = 1;
    for (let match = 0; match < matchesPerRound; match++) {
      const home = match;
      const away = numPlayers - 1 - match;

      // Rotate players (keep first player fixed for circle method)
      const homePlayer = playersCopy[home === 0 ? 0 : ((home + round - 1) % (numPlayers - 1)) + 1];
      const awayPlayer = playersCopy[away === 0 ? 0 : ((away + round - 1) % (numPlayers - 1)) + 1];

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
 * Uses a proper scheduling algorithm where each player plays exactly once per round
 * with a different partner each round (Swish-style rotating partners)
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

  // For rotating partners doubles, we use a modified circle method
  // Each round: pair up players so everyone plays once with a different partner
  // The total possible rounds depends on how we want to handle it:
  // - If we want each player to partner with everyone once: n-1 rounds
  // - If we want each player to play against everyone: more complex

  // Swish-style: Each round, players rotate partners and opponents
  // We use a balanced schedule where each player plays once per round
  const playersCopy = [...players];

  // If odd number, add bye
  const hasBye = n % 2 === 1;
  if (hasBye) {
    playersCopy.push({ id: 'bye', name: 'BYE' });
  }

  const numPlayers = playersCopy.length;

  // For doubles with 2n players, we need n/2 matches per round (each match uses 4 players)
  // So we can have floor(numPlayers/4) matches per round where each player plays once
  const matchesPerRound = Math.floor(numPlayers / 4);

  if (matchesPerRound === 0) {
    return { matches: [], rounds: 0, totalPossibleRounds: 0 };
  }

  // Calculate total possible rounds - in rotating doubles, this is complex
  // A simple approach: generate rounds until we've had good variety
  // Standard approach: n-1 rounds allows each player to partner with everyone once
  const totalPossibleRounds = numPlayers - 1;
  const maxRounds = options.maxRounds ?? totalPossibleRounds;
  const roundsToGenerate = Math.min(maxRounds, totalPossibleRounds);

  // Use a rotation system for fair matchups
  // In each round, we rotate positions to create different pairings
  for (let round = 0; round < roundsToGenerate; round++) {
    // Create rotated list (keep first player fixed, rotate others)
    const rotated: Player[] = [playersCopy[0]!];
    for (let i = 1; i < numPlayers; i++) {
      const rotatedIndex = ((i - 1 + round) % (numPlayers - 1)) + 1;
      rotated.push(playersCopy[rotatedIndex]!);
    }

    // Generate matches for this round
    // Pair consecutive players: (0,1) vs (2,3), (4,5) vs (6,7), etc.
    let courtNumber = 1;
    for (let m = 0; m < matchesPerRound; m++) {
      const idx = m * 4;
      const p1 = rotated[idx];
      const p2 = rotated[idx + 1];
      const p3 = rotated[idx + 2];
      const p4 = rotated[idx + 3];

      // Skip if any player is a bye
      if (!p1 || !p2 || !p3 || !p4) continue;
      if (p1.id === 'bye' || p2.id === 'bye' || p3.id === 'bye' || p4.id === 'bye') continue;

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
  const roundsToGenerate = Math.min(maxRounds, totalPossibleRounds);
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < roundsToGenerate; round++) {
    let courtNumber = 1;
    for (let match = 0; match < matchesPerRound; match++) {
      const home = match;
      const away = numTeams - 1 - match;

      // Rotate teams (keep first team fixed for circle method)
      const homeTeam = teamsCopy[home === 0 ? 0 : ((home + round - 1) % (numTeams - 1)) + 1];
      const awayTeam = teamsCopy[away === 0 ? 0 : ((away + round - 1) % (numTeams - 1)) + 1];

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
