'use client';

import { useState, useMemo, useRef } from 'react';
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
  UserPlus,
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

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newTeamPlayer1, setNewTeamPlayer1] = useState('');
  const [newTeamPlayer2, setNewTeamPlayer2] = useState('');

  const steps = STEPS[state.gameMode] as string[];
  const isLastStep = state.step === steps.length - 1;
  const isFirstStep = state.step === 0;

  // Generate matchups when players/teams change
  const matchesByRound = useMemo(() => {
    if (state.gameMode === 'round-robin' && state.roundRobinMatches.length > 0) {
      return getMatchesByRound(state.roundRobinMatches);
    }
    if (state.gameMode === 'set-partner-round-robin' && state.teamRoundRobinMatches.length > 0) {
      return getMatchesByRound(state.teamRoundRobinMatches);
    }
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
    if (state.step === 1) {
      // Generate matchups when moving from player/team selection to scores
      if (state.gameMode === 'round-robin') {
        const minPlayers = state.gameFormat === 'singles' ? 2 : 4;
        if (state.roundRobinPlayers.length >= minPlayers) {
          // Use singles or doubles generator based on format
          const result = state.gameFormat === 'singles'
            ? generateSinglesRoundRobin(state.roundRobinPlayers)
            : generateIndividualRoundRobin(state.roundRobinPlayers);
          setState((prev) => ({ ...prev, roundRobinMatches: result.matches }));
        }
      }
      if (state.gameMode === 'set-partner-round-robin' && state.teams.length >= 2) {
        const result = generateTeamRoundRobin(state.teams);
        setState((prev) => ({ ...prev, teamRoundRobinMatches: result.matches }));
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

  // Round robin player helpers
  const addPlayer = () => {
    if (newPlayerName.trim()) {
      const player: PlayerWithDupr = {
        id: Math.random().toString(36).substring(2, 9),
        name: newPlayerName.trim(),
        hasDuprLinked: false, // Default to false, would be checked via API in real implementation
      };
      setState((prev) => ({
        ...prev,
        roundRobinPlayers: [...prev.roundRobinPlayers, player],
      }));
      setNewPlayerName('');
    }
  };

  const removePlayer = (playerId: string) => {
    setState((prev) => ({
      ...prev,
      roundRobinPlayers: prev.roundRobinPlayers.filter((p) => p.id !== playerId),
    }));
  };

  // Team helpers
  const addTeam = () => {
    if (newTeamPlayer1.trim() && newTeamPlayer2.trim()) {
      const team: TeamWithDupr = {
        id: Math.random().toString(36).substring(2, 9),
        player1: {
          id: Math.random().toString(36).substring(2, 9),
          name: newTeamPlayer1.trim(),
          hasDuprLinked: false, // Default to false, would be checked via API
        },
        player2: {
          id: Math.random().toString(36).substring(2, 9),
          name: newTeamPlayer2.trim(),
          hasDuprLinked: false, // Default to false, would be checked via API
        },
      };
      setState((prev) => ({
        ...prev,
        teams: [...prev.teams, team],
      }));
      setNewTeamPlayer1('');
      setNewTeamPlayer2('');
    }
  };

  const removeTeam = (teamId: string) => {
    setState((prev) => ({
      ...prev,
      teams: prev.teams.filter((t) => t.id !== teamId),
    }));
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
          // Singles needs at least 2 players, doubles needs at least 4
          const minPlayers = state.gameFormat === 'singles' ? 2 : 4;
          return state.roundRobinPlayers.length >= minPlayers;
        }
        if (state.gameMode === 'set-partner-round-robin') {
          return state.teams.length >= 2;
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
            newPlayerName={newPlayerName}
            setNewPlayerName={setNewPlayerName}
            addPlayer={addPlayer}
            removePlayer={removePlayer}
            gameFormat={state.gameFormat}
          />
        )}

        {state.step === 1 && state.gameMode === 'set-partner-round-robin' && (
          <AddTeamsStep
            teams={state.teams}
            newTeamPlayer1={newTeamPlayer1}
            newTeamPlayer2={newTeamPlayer2}
            setNewTeamPlayer1={setNewTeamPlayer1}
            setNewTeamPlayer2={setNewTeamPlayer2}
            addTeam={addTeam}
            removeTeam={removeTeam}
          />
        )}

        {/* Step 2 for round robins: Enter Scores */}
        {state.step === 2 && state.gameMode !== 'single-match' && (
          <EnterScoresStep
            matchesByRound={matchesByRound}
            updateMatchScore={updateMatchScore}
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

// Add Players Step Component
function AddPlayersStep({
  players,
  newPlayerName,
  setNewPlayerName,
  addPlayer,
  removePlayer,
  gameFormat,
}: {
  players: Player[];
  newPlayerName: string;
  setNewPlayerName: (name: string) => void;
  addPlayer: () => void;
  removePlayer: (id: string) => void;
  gameFormat: GameFormat;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const minPlayers = gameFormat === 'singles' ? 2 : 4;
  const maxPlayers = 20; // Reasonable maximum for round robin
  const description = gameFormat === 'singles'
    ? `Add at least ${minPlayers} players for a singles round robin. Each player plays against every other player.`
    : `Add at least ${minPlayers} players for a doubles round robin. Players will rotate partners each match.`;

  const handleAddPlayer = () => {
    if (newPlayerName.trim() && players.length < maxPlayers) {
      addPlayer();
      // Auto-focus input after adding for quick entry of next player
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Add Players
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {description}
      </p>

      {/* Add Player Input */}
      {players.length < maxPlayers ? (
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleAddPlayer();
              }
            }}
            className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent touch-manipulation"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddPlayer();
            }}
            disabled={!newPlayerName.trim()}
            className={cn(
              'min-w-[44px] min-h-[44px] px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center touch-manipulation',
              newPlayerName.trim()
                ? 'bg-pickle-500 hover:bg-pickle-600 active:bg-pickle-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
            aria-label="Add player"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
          Maximum of {maxPlayers} players reached
        </p>
      )}

      {/* Players List */}
      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-900 dark:text-white">{player.name}</span>
            </div>
            <button
              type="button"
              onClick={() => removePlayer(player.id)}
              className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
              aria-label={`Remove ${player.name}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {players.length > 0 && players.length < minPlayers && (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          Add {minPlayers - players.length} more player{minPlayers - players.length > 1 ? 's' : ''} to start the tournament
        </p>
      )}

      {players.length >= minPlayers && (
        <p className="mt-4 text-sm text-pickle-600 dark:text-pickle-400">
          Ready to generate matchups with {players.length} players!
        </p>
      )}
    </div>
  );
}

// Add Teams Step Component
function AddTeamsStep({
  teams,
  newTeamPlayer1,
  newTeamPlayer2,
  setNewTeamPlayer1,
  setNewTeamPlayer2,
  addTeam,
  removeTeam,
}: {
  teams: Team[];
  newTeamPlayer1: string;
  newTeamPlayer2: string;
  setNewTeamPlayer1: (name: string) => void;
  setNewTeamPlayer2: (name: string) => void;
  addTeam: () => void;
  removeTeam: (id: string) => void;
}) {
  const player1InputRef = useRef<HTMLInputElement>(null);
  const maxTeams = 10; // Reasonable maximum for team round robin

  const handleAddTeam = () => {
    if (newTeamPlayer1.trim() && newTeamPlayer2.trim() && teams.length < maxTeams) {
      addTeam();
      // Auto-focus first input after adding for quick entry of next team
      setTimeout(() => {
        player1InputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Add Teams
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Add at least 2 teams. Each team will play against every other team.
      </p>

      {/* Add Team Input */}
      {teams.length < maxTeams ? (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            ref={player1InputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Player 1"
            value={newTeamPlayer1}
            onChange={(e) => setNewTeamPlayer1(e.target.value)}
            className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent touch-manipulation"
          />
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Player 2"
            value={newTeamPlayer2}
            onChange={(e) => setNewTeamPlayer2(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleAddTeam();
              }
            }}
            className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent touch-manipulation"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddTeam();
            }}
            disabled={!newTeamPlayer1.trim() || !newTeamPlayer2.trim()}
            className={cn(
              'min-w-[44px] min-h-[44px] px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center touch-manipulation',
              newTeamPlayer1.trim() && newTeamPlayer2.trim()
                ? 'bg-pickle-500 hover:bg-pickle-600 active:bg-pickle-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
            aria-label="Add team"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
          Maximum of {maxTeams} teams reached
        </p>
      )}

      {/* Teams List */}
      <div className="space-y-2">
        {teams.map((team, index) => (
          <div
            key={team.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-900 dark:text-white">
                {team.player1.name} & {team.player2.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeTeam(team.id)}
              className="min-w-[44px] min-h-[44px] p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
              aria-label={`Remove team ${team.player1.name} & ${team.player2.name}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {teams.length > 0 && teams.length < 2 && (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          Add {2 - teams.length} more team{2 - teams.length > 1 ? 's' : ''} to start the tournament
        </p>
      )}

      {teams.length >= 2 && (
        <p className="mt-4 text-sm text-pickle-600 dark:text-pickle-400">
          Ready to generate matchups with {teams.length} teams!
        </p>
      )}
    </div>
  );
}

// Enter Scores Step Component
function EnterScoresStep({
  matchesByRound,
  updateMatchScore,
}: {
  matchesByRound: Map<number, Match[]>;
  updateMatchScore: (matchId: string, team: 'team1' | 'team2', value: number) => void;
}) {
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);

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

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Enter Scores
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enter the scores for each match. Matches are organized by round.
        </p>
      </div>

      {rounds.map((round) => (
        <div
          key={round}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
        >
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
            Round {round}
          </h3>
          <div className="space-y-4">
            {matchesByRound.get(round)?.map((match) => (
              <div
                key={match.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex flex-col gap-3">
                  {/* Labels Row */}
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                    <span className="text-pickle-600 dark:text-pickle-400 flex-1 text-center sm:text-right sm:pr-4">
                      {singlesMode ? 'Player A' : 'Team A'}
                    </span>
                    <div className="w-[180px]" /> {/* Spacer for score inputs */}
                    <span className="text-gray-500 dark:text-gray-400 flex-1 text-center sm:text-left sm:pl-4">
                      {singlesMode ? 'Player B' : 'Team B'}
                    </span>
                  </div>

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
      ))}
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
                  {matchesByRound.get(round)?.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded mb-1 text-sm"
                    >
                      <span className="truncate flex-1 text-gray-900 dark:text-white">
                        {match.team1
                          ? `${match.team1.player1.name} & ${match.team1.player2.name}`
                          : 'Team 1'}
                      </span>
                      <span className="px-3 font-mono font-medium text-gray-900 dark:text-white">
                        {match.score.team1} - {match.score.team2}
                      </span>
                      <span className="truncate flex-1 text-right text-gray-900 dark:text-white">
                        {match.team2
                          ? `${match.team2.player1.name} & ${match.team2.player2.name}`
                          : 'Team 2'}
                      </span>
                    </div>
                  ))}
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
