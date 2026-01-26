'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Trophy,
  Plus,
  Minus,
  X,
  Check,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  GameTypeSelector,
  type GameEventType,
  type GameTypeConfig,
} from '@/components/games/game-type-selector';
import {
  generateTeamRoundRobin,
  generateIndividualRoundRobin,
  generateSinglesRoundRobin,
  getMatchesByRound,
  type Player,
  type Team,
  type Match,
} from '@/lib/round-robin';
import { cn } from '@/lib/utils';
import { LocationAutocomplete } from '@/components/location-autocomplete';

type SingleMatchType = 'singles' | 'doubles';
type GameFormat = 'singles' | 'doubles';
type ScoreEntry = { team1: number; team2: number };

// Extended player type with DUPR info
interface PlayerWithDupr extends Player {
  duprId?: string;
  hasDuprLinked?: boolean;
}

interface TeamWithDupr extends Team {
  player1: PlayerWithDupr;
  player2: PlayerWithDupr;
}

// Map internal game mode to GameEventType
type GameMode = 'single-match' | 'round-robin' | 'set-partner-round-robin';

const gameEventTypeToMode: Record<GameEventType, GameMode> = {
  single_match: 'single-match',
  round_robin: 'round-robin',
  set_partner_round_robin: 'set-partner-round-robin',
};

const gameModeToEventType: Record<GameMode, GameEventType> = {
  'single-match': 'single_match',
  'round-robin': 'round_robin',
  'set-partner-round-robin': 'set_partner_round_robin',
};

interface WizardState {
  step: number;
  gameMode: GameMode;
  duprEnabled: boolean;
  // Round robin format (singles 1v1 or doubles with rotating partners)
  gameFormat: GameFormat;
  // Round robin configuration
  playerCount?: number;
  teamCount?: number;
  numberOfRounds?: number;
  // Single match state
  singleMatchType: SingleMatchType;
  singleMatchScores: ScoreEntry[];
  partner: string;
  partnerHasDupr: boolean;
  opponents: string[];
  opponentsHaveDupr: boolean[];
  // Round robin state
  roundRobinPlayers: PlayerWithDupr[];
  roundRobinMatches: Match[];
  // Set partner round robin state
  teams: TeamWithDupr[];
  teamRoundRobinMatches: Match[];
  // Common fields
  location: string;
  locationCoordinates?: { lat: number; lng: number };
  notes: string;
}

const STEPS = {
  'single-match': ['Game Type', 'Match Details', 'Review'],
  'round-robin': ['Game Type', 'Add Players', 'Enter Scores', 'Review'],
  'set-partner-round-robin': ['Game Type', 'Add Teams', 'Enter Scores', 'Review'],
};

export default function NewGamePage() {
  const [state, setState] = useState<WizardState>({
    step: 0,
    gameMode: 'single-match',
    duprEnabled: false,
    gameFormat: 'doubles',
    playerCount: 4,
    teamCount: 3,
    numberOfRounds: 1,
    singleMatchType: 'doubles',
    singleMatchScores: [{ team1: 0, team2: 0 }],
    partner: '',
    partnerHasDupr: false,
    opponents: ['', ''],
    opponentsHaveDupr: [false, false],
    roundRobinPlayers: [],
    roundRobinMatches: [],
    teams: [],
    teamRoundRobinMatches: [],
    location: '',
    locationCoordinates: undefined,
    notes: '',
  });

  const steps = STEPS[state.gameMode] as string[];
  const isLastStep = state.step === steps.length - 1;
  const isFirstStep = state.step === 0;

  // Generate matchups when players/teams change
  const matchesByRound = useMemo(() => {
    if (state.gameMode === 'round-robin' && state.roundRobinMatches.length > 0) {
      const result = getMatchesByRound(state.roundRobinMatches);
      console.log('[DEBUG matchesByRound] round-robin mode:');
      console.log('  - roundRobinMatches count:', state.roundRobinMatches.length);
      console.log('  - rounds in map:', Array.from(result.keys()));
      console.log('  - first match sample:', state.roundRobinMatches[0]);
      return result;
    }
    if (state.gameMode === 'set-partner-round-robin' && state.teamRoundRobinMatches.length > 0) {
      const result = getMatchesByRound(state.teamRoundRobinMatches);
      console.log('[DEBUG matchesByRound] set-partner mode:');
      console.log('  - teamRoundRobinMatches count:', state.teamRoundRobinMatches.length);
      console.log('  - rounds in map:', Array.from(result.keys()));
      console.log('  - first match sample:', state.teamRoundRobinMatches[0]);
      return result;
    }
    console.log('[DEBUG matchesByRound] returning empty map, gameMode:', state.gameMode);
    return new Map<number, Match[]>();
  }, [state.gameMode, state.roundRobinMatches, state.teamRoundRobinMatches]);

  // Get list of players missing DUPR IDs when DUPR is enabled
  const playersMissingDupr = useMemo(() => {
    if (!state.duprEnabled) return [];

    const missingPlayers: string[] = [];

    if (state.gameMode === 'single-match') {
      // For single match, check partner and opponents
      // Note: Current user is assumed to have DUPR linked (would be validated server-side)
      if (state.singleMatchType === 'doubles' && state.partner && !state.partnerHasDupr) {
        missingPlayers.push(state.partner);
      }
      state.opponents.forEach((opponent, index) => {
        if (opponent && !state.opponentsHaveDupr[index]) {
          missingPlayers.push(opponent);
        }
      });
    } else if (state.gameMode === 'round-robin') {
      // For round robin, check all players
      state.roundRobinPlayers.forEach((player) => {
        if (!player.hasDuprLinked) {
          missingPlayers.push(player.name);
        }
      });
    } else if (state.gameMode === 'set-partner-round-robin') {
      // For set partner round robin, check all team members
      state.teams.forEach((team) => {
        if (!team.player1.hasDuprLinked) {
          missingPlayers.push(team.player1.name);
        }
        if (!team.player2.hasDuprLinked) {
          missingPlayers.push(team.player2.name);
        }
      });
    }

    return missingPlayers;
  }, [
    state.duprEnabled,
    state.gameMode,
    state.singleMatchType,
    state.partner,
    state.partnerHasDupr,
    state.opponents,
    state.opponentsHaveDupr,
    state.roundRobinPlayers,
    state.teams,
  ]);

  const handleNext = () => {
    // When moving from step 0 (game type) to step 1 (add players/teams), initialize arrays
    if (state.step === 0) {
      if (state.gameMode === 'round-robin' && state.playerCount) {
        // Initialize empty players array based on playerCount
        const emptyPlayers: PlayerWithDupr[] = Array.from({ length: state.playerCount }, (_, i) => ({
          id: `player-${i}`,
          name: '',
          hasDuprLinked: false,
        }));
        setState((prev) => ({ ...prev, roundRobinPlayers: emptyPlayers, step: prev.step + 1 }));
        return; // Exit early since we've already incremented step
      }
      if (state.gameMode === 'set-partner-round-robin' && state.teamCount) {
        // Initialize empty teams array based on teamCount
        const emptyTeams: TeamWithDupr[] = Array.from({ length: state.teamCount }, (_, i) => ({
          id: `team-${i}`,
          player1: { id: `team-${i}-p1`, name: '', hasDuprLinked: false },
          player2: { id: `team-${i}-p2`, name: '', hasDuprLinked: false },
        }));
        setState((prev) => ({ ...prev, teams: emptyTeams, step: prev.step + 1 }));
        return; // Exit early since we've already incremented step
      }
    }

    if (state.step === 1) {
      // Generate matchups when moving from player/team selection to scores
      if (state.gameMode === 'round-robin') {
        // Filter out players with empty names
        const validPlayers = state.roundRobinPlayers.filter(p => p.name.trim());
        const minPlayers = state.gameFormat === 'singles' ? 2 : 4;
        console.log('[DEBUG handleNext] round-robin generation:');
        console.log('  - validPlayers:', validPlayers.map(p => p.name));
        console.log('  - gameFormat:', state.gameFormat);
        console.log('  - minPlayers required:', minPlayers);
        console.log('  - numberOfRounds:', state.numberOfRounds);
        if (validPlayers.length >= minPlayers) {
          // Use singles or doubles generator based on format
          // Pass maxRounds to limit the number of rounds generated
          const options = { maxRounds: state.numberOfRounds };
          const result = state.gameFormat === 'singles'
            ? generateSinglesRoundRobin(validPlayers, options)
            : generateIndividualRoundRobin(validPlayers, options);
          console.log('[DEBUG handleNext] generation result:');
          console.log('  - matches count:', result.matches.length);
          console.log('  - rounds:', result.rounds);
          console.log('  - first match:', result.matches[0]);
          // Combine state updates into single setState to avoid race condition
          setState((prev) => ({
            ...prev,
            roundRobinMatches: result.matches,
            roundRobinPlayers: validPlayers,
            step: prev.step + 1,
          }));
          return; // Exit early since we've already incremented step
        }
      }
      if (state.gameMode === 'set-partner-round-robin') {
        // Filter out incomplete teams
        const validTeams = state.teams.filter(t => t.player1.name.trim() && t.player2.name.trim());
        if (validTeams.length >= 2) {
          // Pass maxRounds to limit the number of rounds generated
          const options = { maxRounds: state.numberOfRounds };
          const result = generateTeamRoundRobin(validTeams, options);
          // Combine state updates into single setState to avoid race condition
          setState((prev) => ({
            ...prev,
            teamRoundRobinMatches: result.matches,
            teams: validTeams,
            step: prev.step + 1,
          }));
          return; // Exit early since we've already incremented step
        }
      }
    }
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, steps.length - 1) }));
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      gameMode: state.gameMode,
      reportToDupr: state.duprEnabled,
      location: state.location,
      locationCoordinates: state.locationCoordinates,
      notes: state.notes,
      timestamp: new Date().toISOString(),
      ...(state.gameMode === 'single-match' && {
        matchType: state.singleMatchType,
        scores: state.singleMatchScores,
        partner: state.partner,
        opponents: state.opponents,
        reportToDupr: state.duprEnabled,
      }),
      ...(state.gameMode === 'round-robin' && {
        players: state.roundRobinPlayers,
        matches: state.roundRobinMatches.map((match) => ({
          ...match,
          reportToDupr: state.duprEnabled,
        })),
        reportToDupr: state.duprEnabled,
      }),
      ...(state.gameMode === 'set-partner-round-robin' && {
        teams: state.teams,
        matches: state.teamRoundRobinMatches.map((match) => ({
          ...match,
          reportToDupr: state.duprEnabled,
        })),
        reportToDupr: state.duprEnabled,
      }),
    };

    // TODO: Implement actual API submission
    if (process.env.NODE_ENV === 'development') {
      console.log('Submitting game data:', submitData);
    }
    alert('Game submission not yet implemented');
  };

  // Single match helpers
  const addGame = () => {
    if (state.singleMatchScores.length < 20) {
      setState((prev) => ({
        ...prev,
        singleMatchScores: [...prev.singleMatchScores, { team1: 0, team2: 0 }],
      }));
    }
  };

  const removeGame = (index: number) => {
    if (state.singleMatchScores.length > 1) {
      setState((prev) => ({
        ...prev,
        singleMatchScores: prev.singleMatchScores.filter((_, i) => i !== index),
      }));
    }
  };

  const updateSingleMatchScore = (gameIndex: number, team: 'team1' | 'team2', value: number) => {
    setState((prev) => {
      const newScores = [...prev.singleMatchScores];
      const game = newScores[gameIndex];
      if (game) {
        game[team] = Math.max(0, Math.min(21, value));
      }
      return { ...prev, singleMatchScores: newScores };
    });
  };

  // Update player name at a specific index (for fixed input fields)
  const updatePlayer = (index: number, name: string) => {
    setState((prev) => {
      const newPlayers = [...prev.roundRobinPlayers];
      if (newPlayers[index]) {
        newPlayers[index] = { ...newPlayers[index], name };
      }
      return { ...prev, roundRobinPlayers: newPlayers };
    });
  };

  // Update team at a specific index (for fixed input fields)
  const updateTeam = (index: number, player1Name: string, player2Name: string) => {
    setState((prev) => {
      const newTeams = [...prev.teams];
      if (newTeams[index]) {
        newTeams[index] = {
          ...newTeams[index],
          player1: { ...newTeams[index].player1, name: player1Name },
          player2: { ...newTeams[index].player2, name: player2Name },
        };
      }
      return { ...prev, teams: newTeams };
    });
  };

  // Match score update
  const updateMatchScore = (matchId: string, team: 'team1' | 'team2', value: number) => {
    const isRoundRobin = state.gameMode === 'round-robin';
    const matchesKey = isRoundRobin ? 'roundRobinMatches' : 'teamRoundRobinMatches';

    setState((prev) => ({
      ...prev,
      [matchesKey]: prev[matchesKey].map((m) =>
        m.id === matchId
          ? {
              ...m,
              score: { ...m.score, [team]: Math.max(0, Math.min(21, value)) },
              completed: true,
            }
          : m
      ),
    }));
  };

  const canProceed = () => {
    switch (state.step) {
      case 0:
        return true; // Game type selection always valid
      case 1:
        if (state.gameMode === 'single-match') {
          return true; // Match details
        }
        if (state.gameMode === 'round-robin') {
          // All players must have names filled in, and meet minimum count
          const filledPlayers = state.roundRobinPlayers.filter(p => p.name.trim());
          const minPlayers = state.gameFormat === 'singles' ? 2 : 4;
          return filledPlayers.length >= minPlayers;
        }
        if (state.gameMode === 'set-partner-round-robin') {
          // All teams must have both players named, and at least 2 complete teams
          const completeTeams = state.teams.filter(t => t.player1.name.trim() && t.player2.name.trim());
          return completeTeams.length >= 2;
        }
        return false;
      default:
        return true;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/games"
          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log New Game</h1>
          <p className="text-gray-600 dark:text-gray-300">Record your match details</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((stepName: string, index: number) => (
            <div key={stepName} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index < state.step
                    ? 'bg-pickle-500 text-white'
                    : index === state.step
                      ? 'bg-pickle-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}
              >
                {index < state.step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-12 sm:w-24 h-1 mx-2',
                    index < state.step ? 'bg-pickle-500' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {steps.map((stepName: string) => (
            <span key={stepName} className="text-center flex-1">
              {stepName}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 0: Game Type Selection */}
        {state.step === 0 && (
          <GameTypeSelector
            value={{
              type: gameModeToEventType[state.gameMode],
              reportToDupr: state.duprEnabled,
              gameFormat: state.gameFormat,
              playerCount: state.playerCount,
              teamCount: state.teamCount,
              numberOfRounds: state.numberOfRounds,
            }}
            onChange={(config: GameTypeConfig) => {
              setState((prev) => ({
                ...prev,
                gameMode: gameEventTypeToMode[config.type],
                duprEnabled: config.reportToDupr,
                gameFormat: config.gameFormat ?? 'doubles',
                playerCount: config.playerCount,
                teamCount: config.teamCount,
                numberOfRounds: config.numberOfRounds,
              }));
            }}
          />
        )}

        {/* Step 1: Match Details / Add Players / Add Teams */}
        {state.step === 1 && state.gameMode === 'single-match' && (
          <SingleMatchStep
            matchType={state.singleMatchType}
            setMatchType={(type) => setState((prev) => ({ ...prev, singleMatchType: type }))}
            scores={state.singleMatchScores}
            addGame={addGame}
            removeGame={removeGame}
            updateScore={updateSingleMatchScore}
            partner={state.partner}
            setPartner={(p) => setState((prev) => ({ ...prev, partner: p }))}
            opponents={state.opponents}
            setOpponents={(o) => setState((prev) => ({ ...prev, opponents: o }))}
          />
        )}

        {state.step === 1 && state.gameMode === 'round-robin' && (
          <AddPlayersStep
            players={state.roundRobinPlayers}
            playerCount={state.playerCount ?? 4}
            onUpdatePlayer={updatePlayer}
            gameFormat={state.gameFormat}
          />
        )}

        {state.step === 1 && state.gameMode === 'set-partner-round-robin' && (
          <AddTeamsStep
            teams={state.teams}
            teamCount={state.teamCount ?? 3}
            onUpdateTeam={updateTeam}
          />
        )}

        {/* Step 2 for round robins: Enter Scores */}
        {state.step === 2 && state.gameMode !== 'single-match' && (
          <EnterScoresStep
            matchesByRound={matchesByRound}
            updateMatchScore={updateMatchScore}
            allPlayers={
              state.gameMode === 'round-robin'
                ? state.roundRobinPlayers.map(p => ({ id: p.id, name: p.name }))
                : state.teams.flatMap(t => [
                    { id: t.player1.id, name: t.player1.name },
                    { id: t.player2.id, name: t.player2.name },
                  ])
            }
          />
        )}

        {/* Review Step */}
        {isLastStep && (
          <>
            {/* DUPR Warning Banner */}
            {state.duprEnabled && playersMissingDupr.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      DUPR Account Required
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      The following players need to link their DUPR accounts:{' '}
                      <span className="font-medium">{playersMissingDupr.join(', ')}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <ReviewStep
              state={state}
              matchesByRound={matchesByRound}
              playersMissingDupr={playersMissingDupr}
            />
          </>
        )}

        {/* Common fields on last step before review or on review */}
        {(state.step === steps.length - 2 || isLastStep) && (
          <>
            {/* Location */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Location (Optional)
              </label>
              <LocationAutocomplete
                value={state.location}
                onChange={(value, coordinates) =>
                  setState((prev) => ({
                    ...prev,
                    location: value,
                    locationCoordinates: coordinates,
                  }))
                }
                placeholder="Search for a court or location..."
                className="w-full"
              />
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Any notes about this game..."
                value={state.notes}
                onChange={(e) => setState((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent resize-none"
              />
            </div>
          </>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-4">
          {isFirstStep ? (
            <Link
              href="/games"
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-center font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {isLastStep ? (
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-pickle-500 hover:bg-pickle-600 text-white rounded-xl font-medium transition-colors"
            >
              Save Game
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors',
                canProceed()
                  ? 'bg-pickle-500 hover:bg-pickle-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Single Match Step Component
function SingleMatchStep({
  matchType,
  setMatchType,
  scores,
  addGame,
  removeGame,
  updateScore,
  partner,
  setPartner,
  opponents,
  setOpponents,
}: {
  matchType: SingleMatchType;
  setMatchType: (type: SingleMatchType) => void;
  scores: ScoreEntry[];
  addGame: () => void;
  removeGame: (index: number) => void;
  updateScore: (index: number, team: 'team1' | 'team2', value: number) => void;
  partner: string;
  setPartner: (value: string) => void;
  opponents: string[];
  setOpponents: (value: string[]) => void;
}) {
  return (
    <>
      {/* Game Type */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Match Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setMatchType('singles');
              setPartner('');
              setOpponents(['']);
            }}
            className={cn(
              'flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors',
              matchType === 'singles'
                ? 'border-pickle-500 bg-pickle-50 dark:bg-pickle-900/20 text-pickle-700 dark:text-pickle-400'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            )}
          >
            <Trophy className="w-5 h-5" />
            Singles
          </button>
          <button
            type="button"
            onClick={() => {
              setMatchType('doubles');
              setPartner('');
              setOpponents(['', '']);
            }}
            className={cn(
              'flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors',
              matchType === 'doubles'
                ? 'border-pickle-500 bg-pickle-50 dark:bg-pickle-900/20 text-pickle-700 dark:text-pickle-400'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            )}
          >
            <Users className="w-5 h-5" />
            Doubles
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Your Team */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {matchType === 'singles' ? 'You' : 'Your Team'}
            </label>
            <div className="space-y-3">
              <div className="p-3 bg-pickle-50 dark:bg-pickle-900/20 rounded-lg border border-pickle-200 dark:border-pickle-800">
                <span className="text-pickle-700 dark:text-pickle-400 font-medium">You</span>
              </div>
              {matchType === 'doubles' && (
                <input
                  type="text"
                  placeholder="Partner's name"
                  value={partner}
                  onChange={(e) => setPartner(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
                />
              )}
            </div>
          </div>

          {/* Opponents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {matchType === 'singles' ? 'Opponent' : 'Opponents'}
            </label>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Opponent's name"
                value={opponents[0]}
                onChange={(e) => setOpponents([e.target.value, opponents[1] || ''])}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
              />
              {matchType === 'doubles' && (
                <input
                  type="text"
                  placeholder="Opponent's partner"
                  value={opponents[1]}
                  onChange={(e) => setOpponents([opponents[0] ?? '', e.target.value])}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Score
          </label>
          {scores.length < 20 && (
            <button
              type="button"
              onClick={addGame}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm font-medium text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300 hover:bg-pickle-50 dark:hover:bg-pickle-900/20 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Game
            </button>
          )}
        </div>

        {/* Team Headers */}
        <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-2 items-center mb-3 px-1">
          <div className="w-16" /> {/* Spacer for game number */}
          <div className="text-center">
            <span className="text-sm font-semibold text-pickle-600 dark:text-pickle-400">
              Your Team
            </span>
            {matchType === 'doubles' && partner && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                You & {partner}
              </p>
            )}
          </div>
          <div className="w-8" /> {/* Spacer for vs */}
          <div className="text-center">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              Opponent
            </span>
            {opponents.filter(Boolean).length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {opponents.filter(Boolean).join(' & ')}
              </p>
            )}
          </div>
          <div className="w-11" /> {/* Spacer for remove button */}
        </div>

        <div className="space-y-3">
          {scores.map((score, index) => (
            <div
              key={index}
              className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-2 items-center"
            >
              <span className="text-sm text-gray-500 dark:text-gray-400 w-16">
                Game {index + 1}
              </span>

              {/* Your Team Score */}
              <div className="flex justify-center">
                <div className="bg-pickle-50 dark:bg-pickle-900/20 rounded-lg p-1 border border-pickle-200 dark:border-pickle-800">
                  <ScoreInput
                    value={score.team1}
                    onChange={(val) => updateScore(index, 'team1', val)}
                    label="Your score"
                  />
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex items-center justify-center w-8">
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500">vs</span>
              </div>

              {/* Opponent Score */}
              <div className="flex justify-center">
                <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                  <ScoreInput
                    value={score.team2}
                    onChange={(val) => updateScore(index, 'team2', val)}
                    label="Opponent score"
                  />
                </div>
              </div>

              {/* Remove Button */}
              <div className="w-11 flex justify-center">
                {scores.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGame(index)}
                    className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
                    aria-label={`Remove game ${index + 1}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Add Players Step Component - Shows fixed number of input fields based on playerCount
function AddPlayersStep({
  players,
  playerCount,
  onUpdatePlayer,
  gameFormat,
}: {
  players: PlayerWithDupr[];
  playerCount: number;
  onUpdatePlayer: (index: number, name: string) => void;
  gameFormat: GameFormat;
}) {
  const description = gameFormat === 'singles'
    ? `Enter names for all ${playerCount} players. Each player plays against every other player.`
    : `Enter names for all ${playerCount} players. Players will rotate partners each match.`;

  // Count how many players have names filled in
  const filledCount = players.filter(p => p.name.trim()).length;
  const allFilled = filledCount === playerCount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Name Your Players
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {description}
      </p>

      {/* Player Input Fields */}
      <div className="space-y-3">
        {Array.from({ length: playerCount }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex items-center justify-center text-sm font-medium flex-shrink-0">
              {index + 1}
            </span>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="words"
              placeholder={`Player ${index + 1}`}
              value={players[index]?.name || ''}
              onChange={(e) => onUpdatePlayer(index, e.target.value)}
              className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent touch-manipulation"
            />
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        {!allFilled ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {filledCount} of {playerCount} players named
          </p>
        ) : (
          <p className="text-sm text-pickle-600 dark:text-pickle-400">
            All {playerCount} players named - ready to continue!
          </p>
        )}
      </div>
    </div>
  );
}

// Add Teams Step Component - Shows fixed number of team input fields based on teamCount
function AddTeamsStep({
  teams,
  teamCount,
  onUpdateTeam,
}: {
  teams: TeamWithDupr[];
  teamCount: number;
  onUpdateTeam: (index: number, player1: string, player2: string) => void;
}) {
  // Count how many teams are complete (both players named)
  const completeCount = teams.filter(t => t.player1.name.trim() && t.player2.name.trim()).length;
  const allComplete = completeCount === teamCount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Name Your Teams
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Enter both player names for each of the {teamCount} teams. Each team will play against every other team.
      </p>

      {/* Team Input Fields */}
      <div className="space-y-4">
        {Array.from({ length: teamCount }, (_, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex items-center justify-center text-sm font-medium flex-shrink-0">
                {index + 1}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Team {index + 1}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="words"
                placeholder="Player 1"
                value={teams[index]?.player1.name || ''}
                onChange={(e) => onUpdateTeam(index, e.target.value, teams[index]?.player2.name || '')}
                className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent touch-manipulation"
              />
              <span className="hidden sm:flex items-center text-gray-400 dark:text-gray-500">&</span>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="words"
                placeholder="Player 2"
                value={teams[index]?.player2.name || ''}
                onChange={(e) => onUpdateTeam(index, teams[index]?.player1.name || '', e.target.value)}
                className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent touch-manipulation"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        {!allComplete ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {completeCount} of {teamCount} teams complete
          </p>
        ) : (
          <p className="text-sm text-pickle-600 dark:text-pickle-400">
            All {teamCount} teams complete - ready to continue!
          </p>
        )}
      </div>
    </div>
  );
}

// Enter Scores Step Component - Swish-style with round navigation
function EnterScoresStep({
  matchesByRound,
  updateMatchScore,
  allPlayers,
}: {
  matchesByRound: Map<number, Match[]>;
  updateMatchScore: (matchId: string, team: 'team1' | 'team2', value: number) => void;
  allPlayers?: { id: string; name: string }[];
}) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
  const totalRounds = rounds.length;
  const currentRound = rounds[currentRoundIndex] ?? 1;
  const currentMatches = matchesByRound.get(currentRound) ?? [];

  // Helper to get participant name(s) for display
  const getParticipantName = (match: Match, side: 'team1' | 'team2'): string => {
    // Singles match (player1/player2 format)
    if (match.player1 && match.player2) {
      return side === 'team1' ? match.player1.name : match.player2.name;
    }
    // Doubles/Team match (team1/team2 format)
    const team = side === 'team1' ? match.team1 : match.team2;
    if (team) {
      return `${team.player1.name} & ${team.player2.name}`;
    }
    return side === 'team1' ? 'Player 1' : 'Player 2';
  };

  // Check if this is a singles tournament
  const isSingles = (matches: Match[]): boolean => {
    const firstMatch = matches[0];
    return firstMatch ? !!firstMatch.player1 && !!firstMatch.player2 : false;
  };

  const allMatches = Array.from(matchesByRound.values()).flat();
  const singlesMode = isSingles(allMatches);

  // Calculate players with byes in current round (players not in any match)
  const getPlayersWithByes = (): string[] => {
    if (!allPlayers || allPlayers.length === 0) return [];

    const playersInRound = new Set<string>();
    for (const match of currentMatches) {
      if (match.player1) playersInRound.add(match.player1.id);
      if (match.player2) playersInRound.add(match.player2.id);
      if (match.team1) {
        playersInRound.add(match.team1.player1.id);
        playersInRound.add(match.team1.player2.id);
      }
      if (match.team2) {
        playersInRound.add(match.team2.player1.id);
        playersInRound.add(match.team2.player2.id);
      }
    }

    return allPlayers
      .filter(p => !playersInRound.has(p.id) && !p.id.startsWith('bye'))
      .map(p => p.name);
  };

  const playersWithByes = getPlayersWithByes();

  // Handle navigation
  const goToPrevRound = () => {
    setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1));
  };

  const goToNextRound = () => {
    setCurrentRoundIndex(Math.min(totalRounds - 1, currentRoundIndex + 1));
  };

  // Handle empty state
  if (totalRounds === 0 || allMatches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-amber-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Matches Generated
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unable to generate matches with the current player configuration.
            Please go back and adjust the number of players.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Tip: For doubles with rotating partners, use 4, 6, 7, or 8 players. 5 players is not supported.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with round progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Enter Scores
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentMatches.filter(m => m.score.team1 > 0 || m.score.team2 > 0).length} of {currentMatches.length} scored
          </span>
        </div>

        {/* Round navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrevRound}
            disabled={currentRoundIndex === 0}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              currentRoundIndex === 0
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Round {currentRound} of {totalRounds}
            </span>
            {/* Round dots indicator */}
            <div className="flex gap-1.5 mt-2">
              {rounds.map((r, idx) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCurrentRoundIndex(idx)}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-all',
                    idx === currentRoundIndex
                      ? 'bg-pickle-500 scale-125'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  )}
                  aria-label={`Go to round ${r}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextRound}
            disabled={currentRoundIndex === totalRounds - 1}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              currentRoundIndex === totalRounds - 1
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bye indicator */}
      {playersWithByes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">
              Sitting out this round:
            </span>
            <span className="text-amber-700 dark:text-amber-300 text-sm">
              {playersWithByes.join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Current round matches */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          {currentMatches.map((match, matchIndex) => (
            <div
              key={match.id}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              {/* Match header with court assignment */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Match {matchIndex + 1}
                </span>
                {match.court && (
                  <span className="text-xs font-medium text-pickle-600 dark:text-pickle-400 bg-pickle-50 dark:bg-pickle-900/30 px-2 py-1 rounded">
                    Court {match.court}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Side 1 */}
                  <div className="flex-1 text-center sm:text-right">
                    <div className="inline-block sm:block bg-pickle-50 dark:bg-pickle-900/20 rounded-lg px-3 py-2 border border-pickle-200 dark:border-pickle-800">
                      <span className="text-sm font-medium text-pickle-700 dark:text-pickle-300">
                        {getParticipantName(match, 'team1')}
                      </span>
                    </div>
                  </div>

                  {/* Score Input */}
                  <div className="flex items-center justify-center gap-2 flex-shrink-0">
                    <div className="bg-pickle-50 dark:bg-pickle-900/20 rounded-lg p-1 border border-pickle-200 dark:border-pickle-800">
                      <ScoreInput
                        value={match.score.team1}
                        onChange={(val) => updateMatchScore(match.id, 'team1', val)}
                        label={singlesMode ? 'Player 1 score' : 'Team 1 score'}
                      />
                    </div>
                    <span className="text-gray-400 font-bold text-sm px-1">vs</span>
                    <div className="bg-gray-100 dark:bg-gray-600/50 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                      <ScoreInput
                        value={match.score.team2}
                        onChange={(val) => updateMatchScore(match.id, 'team2', val)}
                        label={singlesMode ? 'Player 2 score' : 'Team 2 score'}
                      />
                    </div>
                  </div>

                  {/* Side 2 */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="inline-block sm:block bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getParticipantName(match, 'team2')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick round navigation for mobile */}
      <div className="flex justify-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={goToPrevRound}
          disabled={currentRoundIndex === 0}
          className={cn(
            'flex-1 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
            currentRoundIndex === 0
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          )}
        >
          Previous Round
        </button>
        <button
          type="button"
          onClick={goToNextRound}
          disabled={currentRoundIndex === totalRounds - 1}
          className={cn(
            'flex-1 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
            currentRoundIndex === totalRounds - 1
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
              : 'bg-pickle-500 text-white'
          )}
        >
          Next Round
        </button>
      </div>
    </div>
  );
}

// Review Step Component
function ReviewStep({
  state,
  matchesByRound,
  playersMissingDupr: _playersMissingDupr, // Available for future validation UI enhancements
}: {
  state: WizardState;
  matchesByRound: Map<number, Match[]>;
  playersMissingDupr: string[];
}) {
  // Note: _playersMissingDupr could be used for inline validation
  // Currently the warning is shown in the parent component
  void _playersMissingDupr;
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  // Get all players for DUPR status display
  const getAllPlayers = (): { name: string; hasDupr: boolean }[] => {
    if (state.gameMode === 'single-match') {
      const players: { name: string; hasDupr: boolean }[] = [
        { name: 'You', hasDupr: true }, // Current user assumed to have DUPR
      ];
      if (state.singleMatchType === 'doubles' && state.partner) {
        players.push({ name: state.partner, hasDupr: state.partnerHasDupr });
      }
      state.opponents.forEach((opponent, index) => {
        if (opponent) {
          players.push({ name: opponent, hasDupr: state.opponentsHaveDupr[index] ?? false });
        }
      });
      return players;
    } else if (state.gameMode === 'round-robin') {
      return state.roundRobinPlayers.map((p) => ({
        name: p.name,
        hasDupr: p.hasDuprLinked ?? false,
      }));
    } else {
      const players: { name: string; hasDupr: boolean }[] = [];
      state.teams.forEach((team) => {
        players.push({ name: team.player1.name, hasDupr: team.player1.hasDuprLinked ?? false });
        players.push({ name: team.player2.name, hasDupr: team.player2.hasDuprLinked ?? false });
      });
      return players;
    }
  };

  return (
    <div className="space-y-4">
      {/* DUPR Info Section */}
      {state.duprEnabled && (
        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="font-semibold text-brand-800 dark:text-brand-200">DUPR Reporting</h3>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-700 dark:text-brand-300">
                This game will be reported to DUPR
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-700 dark:text-brand-300">
                Scores must be verified by both teams before submission
              </p>
            </div>
          </div>

          {/* Player DUPR Status List */}
          <div className="border-t border-brand-200 dark:border-brand-700 pt-4">
            <p className="text-sm font-medium text-brand-800 dark:text-brand-200 mb-2">
              Player DUPR Status
            </p>
            <div className="grid gap-2">
              {getAllPlayers().map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5 px-3 bg-white/50 dark:bg-gray-800/50 rounded-lg"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">{player.name}</span>
                  {player.hasDupr ? (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Linked</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <XCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Not Linked</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Review & Submit
        </h2>

        {/* Game Mode Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full text-sm font-medium">
            {state.gameMode === 'single-match'
              ? 'Single Match'
              : state.gameMode === 'round-robin'
                ? 'Round Robin'
                : 'Set Partner Round Robin'}
          </span>
          {state.duprEnabled && (
            <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-sm font-medium">
              DUPR Rated
            </span>
          )}
        </div>

        {/* Single Match Summary */}
        {state.gameMode === 'single-match' && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                {state.singleMatchType === 'singles' ? 'Singles Match' : 'Doubles Match'}
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    You{state.singleMatchType === 'doubles' && state.partner && ` & ${state.partner}`}
                  </p>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {state.singleMatchScores.map((s) => `${s.team1}-${s.team2}`).join(', ')}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {state.opponents.filter(Boolean).join(' & ') || 'Opponents'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Round Robin Summary */}
        {state.gameMode !== 'single-match' && rounds.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Tournament Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {state.gameMode === 'round-robin'
                      ? state.roundRobinPlayers.length
                      : state.teams.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {state.gameMode === 'round-robin' ? 'Players' : 'Teams'}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{rounds.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Rounds</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {state.gameMode === 'round-robin'
                      ? state.roundRobinMatches.length
                      : state.teamRoundRobinMatches.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Matches</p>
                </div>
              </div>
            </div>

            {/* Match Results */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Match Results</h3>
              {rounds.map((round) => (
                <div key={round}>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Round {round}</p>
                  {matchesByRound.get(round)?.map((match) => {
                    // Get participant names - handle singles (player1/player2) and doubles (team1/team2)
                    const side1Name = match.player1
                      ? match.player1.name
                      : match.team1
                        ? `${match.team1.player1.name} & ${match.team1.player2.name}`
                        : 'Unknown';
                    const side2Name = match.player2
                      ? match.player2.name
                      : match.team2
                        ? `${match.team2.player1.name} & ${match.team2.player2.name}`
                        : 'Unknown';

                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded mb-1 text-sm"
                      >
                        <span className="truncate flex-1 text-gray-900 dark:text-white">
                          {side1Name}
                        </span>
                        <span className="px-3 font-mono font-medium text-gray-900 dark:text-white">
                          {match.score.team1} - {match.score.team2}
                        </span>
                        <span className="truncate flex-1 text-right text-gray-900 dark:text-white">
                          {side2Name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Score Input Component
function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="min-w-[44px] min-h-[44px] p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 flex items-center justify-center"
        aria-label={`Decrease ${label}`}
      >
        <Minus className="w-5 h-5" />
      </button>
      <input
        type="number"
        min="0"
        max="21"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-14 min-h-[44px] py-3 text-center text-lg font-medium border-y border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-pickle-500"
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="min-w-[44px] min-h-[44px] p-3 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-r-lg border border-l-0 border-gray-300 dark:border-gray-600 flex items-center justify-center"
        aria-label={`Increase ${label}`}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}
