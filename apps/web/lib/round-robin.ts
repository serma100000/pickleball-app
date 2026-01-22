/**
 * Round Robin Tournament Utilities
 * Generates matchups for round robin tournaments (individual and team-based)
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
 */
export function generateSinglesRoundRobin(players: Player[]): RoundRobinResult {
  const matches: Match[] = [];
  const n = players.length;

  if (n < 2) {
    return { matches: [], rounds: 0 };
  }

  // Use circle method for optimal round-robin scheduling
  const playersCopy = [...players];

  // If odd number of players, add a "bye" placeholder
  const hasBye = n % 2 === 1;
  if (hasBye) {
    playersCopy.push({ id: 'bye', name: 'BYE' });
  }

  const numPlayers = playersCopy.length;
  const rounds = numPlayers - 1;
  const matchesPerRound = numPlayers / 2;

  for (let round = 0; round < rounds; round++) {
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
          player1: homePlayer,
          player2: awayPlayer,
          score: { team1: 0, team2: 0 },
          completed: false,
        });
      }
    }
  }

  return { matches, rounds };
}

/**
 * Generate round robin matchups for individual players (doubles with rotating partners)
 * Each player plays with every other player as a partner AND against every other player
 */
export function generateIndividualRoundRobin(players: Player[]): RoundRobinResult {
  const matches: Match[] = [];
  const n = players.length;

  if (n < 4) {
    // Not enough for doubles round robin - need at least 4 players
    return { matches: [], rounds: 0 };
  }

  // For doubles round robin, we generate matches where each pair of players
  // plays against every other pair
  const pairs: [Player, Player][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p1 = players[i];
      const p2 = players[j];
      if (p1 && p2) {
        pairs.push([p1, p2]);
      }
    }
  }

  // Generate matches between pairs (teams play against teams)
  let matchIndex = 0;
  const matchesPerRound = Math.floor(pairs.length / 2);

  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const pair1 = pairs[i];
      const pair2 = pairs[j];

      // Skip if any player appears in both pairs
      if (!pair1 || !pair2) continue;
      const [p1a, p1b] = pair1;
      const [p2a, p2b] = pair2;

      if (!p1a || !p1b || !p2a || !p2b) continue;
      if (p1a.id === p2a.id || p1a.id === p2b.id || p1b.id === p2a.id || p1b.id === p2b.id) {
        continue;
      }

      matches.push({
        id: generateId(),
        round: Math.floor(matchIndex / matchesPerRound) + 1,
        team1: {
          id: generateId(),
          player1: p1a,
          player2: p1b,
        },
        team2: {
          id: generateId(),
          player1: p2a,
          player2: p2b,
        },
        score: { team1: 0, team2: 0 },
        completed: false,
      });
      matchIndex++;
    }
  }

  // Recalculate rounds
  const totalRounds = matches.length > 0 ? matches[matches.length - 1]?.round ?? 1 : 0;

  return { matches, rounds: totalRounds };
}

/**
 * Generate round robin matchups for set partner teams
 * Each team plays against every other team exactly once
 */
export function generateTeamRoundRobin(teams: Team[]): RoundRobinResult {
  const matches: Match[] = [];
  const n = teams.length;

  if (n < 2) {
    return { matches: [], rounds: 0 };
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
  const rounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < rounds; round++) {
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
          team1: homeTeam,
          team2: awayTeam,
          score: { team1: 0, team2: 0 },
          completed: false,
        });
      }
    }
  }

  return { matches, rounds };
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
