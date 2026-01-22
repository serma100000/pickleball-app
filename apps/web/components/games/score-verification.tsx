'use client';

import * as React from 'react';
import { Check, Clock, AlertCircle, Loader2, Send, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types
// ============================================================================

interface Player {
  id: string;
  name: string;
  hasConfirmed: boolean;
}

interface Team {
  players: Player[];
}

interface ScoreVerificationProps {
  gameId: string;
  currentUserId: string;
  teams: {
    team1: Team;
    team2: Team;
  };
  scores: { team1: number; team2: number }[];
  duprStatus: 'pending_verification' | 'verified' | 'submitting' | 'submitted' | 'failed';
  onConfirm: () => Promise<void>;
  errorMessage?: string;
}

// ============================================================================
// Status Badge Component
// ============================================================================

interface StatusBadgeProps {
  status: ScoreVerificationProps['duprStatus'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    pending_verification: {
      label: 'Pending Verification',
      icon: Clock,
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    },
    verified: {
      label: 'Verified',
      icon: Check,
      className: 'bg-pickle-100 text-pickle-800 dark:bg-pickle-900/30 dark:text-pickle-400',
    },
    submitting: {
      label: 'Submitting to DUPR',
      icon: Loader2,
      className: 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400',
    },
    submitted: {
      label: 'Submitted to DUPR',
      icon: Send,
      className: 'bg-pickle-100 text-pickle-800 dark:bg-pickle-900/30 dark:text-pickle-400',
    },
    failed: {
      label: 'Submission Failed',
      icon: AlertCircle,
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        config.className
      )}
    >
      <Icon
        className={cn('h-4 w-4', status === 'submitting' && 'animate-spin')}
      />
      {config.label}
    </div>
  );
}

// ============================================================================
// Player Verification Status Component
// ============================================================================

interface PlayerVerificationProps {
  player: Player;
  isCurrentUser: boolean;
}

function PlayerVerification({ player, isCurrentUser }: PlayerVerificationProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center justify-center h-6 w-6 rounded-full',
          player.hasConfirmed
            ? 'bg-pickle-100 dark:bg-pickle-900/30'
            : 'bg-gray-100 dark:bg-gray-700'
        )}
      >
        {player.hasConfirmed ? (
          <Check className="h-4 w-4 text-pickle-600 dark:text-pickle-400" />
        ) : (
          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
      <span
        className={cn(
          'text-sm',
          isCurrentUser
            ? 'font-medium text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400'
        )}
      >
        {player.name}
        {isCurrentUser && ' (You)'}
      </span>
    </div>
  );
}

// ============================================================================
// Team Card Component
// ============================================================================

interface TeamCardProps {
  team: Team;
  teamLabel: string;
  currentUserId: string;
  totalScore: number;
  isWinner: boolean;
}

function TeamCard({ team, teamLabel, currentUserId, totalScore, isWinner }: TeamCardProps) {
  const allConfirmed = team.players.every((p) => p.hasConfirmed);

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all',
        allConfirmed
          ? 'border-pickle-200 bg-pickle-50/50 dark:border-pickle-800 dark:bg-pickle-900/20'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {teamLabel}
          </span>
        </div>
        <div
          className={cn(
            'text-2xl font-bold',
            isWinner
              ? 'text-pickle-600 dark:text-pickle-400'
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          {totalScore}
        </div>
      </div>
      <div className="space-y-2">
        {team.players.map((player) => (
          <PlayerVerification
            key={player.id}
            player={player}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
      </div>
      {allConfirmed && (
        <div className="mt-3 pt-3 border-t border-pickle-200 dark:border-pickle-700">
          <span className="text-xs font-medium text-pickle-600 dark:text-pickle-400">
            All players confirmed
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Score Display Component
// ============================================================================

interface ScoreDisplayProps {
  scores: { team1: number; team2: number }[];
}

function ScoreDisplay({ scores }: ScoreDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Game Scores
      </span>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {scores.map((score, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <span
              className={cn(
                'font-bold text-lg',
                score.team1 > score.team2
                  ? 'text-pickle-600 dark:text-pickle-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {score.team1}
            </span>
            <span className="text-gray-400 dark:text-gray-500">-</span>
            <span
              className={cn(
                'font-bold text-lg',
                score.team2 > score.team1
                  ? 'text-pickle-600 dark:text-pickle-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {score.team2}
            </span>
            {scores.length > 1 && (
              <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                G{index + 1}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ScoreVerification({
  gameId,
  currentUserId,
  teams,
  scores,
  duprStatus,
  onConfirm,
  errorMessage,
}: ScoreVerificationProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Calculate total scores
  const team1Total = scores.reduce((sum, s) => sum + s.team1, 0);
  const team2Total = scores.reduce((sum, s) => sum + s.team2, 0);

  // Determine if current user has confirmed
  const currentUserHasConfirmed = React.useMemo(() => {
    const allPlayers = [...teams.team1.players, ...teams.team2.players];
    const currentPlayer = allPlayers.find((p) => p.id === currentUserId);
    return currentPlayer?.hasConfirmed ?? false;
  }, [teams, currentUserId]);

  // Determine if all players have confirmed
  const allConfirmed = React.useMemo(() => {
    const allPlayers = [...teams.team1.players, ...teams.team2.players];
    return allPlayers.every((p) => p.hasConfirmed);
  }, [teams]);

  // Handle confirm action
  const handleConfirm = async () => {
    setIsConfirming(true);
    setLocalError(null);
    try {
      await onConfirm();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to confirm scores');
    } finally {
      setIsConfirming(false);
    }
  };

  const displayError = errorMessage || localError;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Score Verification</CardTitle>
          <StatusBadge status={duprStatus} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {duprStatus === 'pending_verification' &&
            'All players must confirm scores before DUPR submission'}
          {duprStatus === 'verified' && 'Scores verified - Submitting to DUPR'}
          {duprStatus === 'submitting' && 'Submitting match results to DUPR...'}
          {duprStatus === 'submitted' && 'Match results successfully submitted to DUPR'}
          {duprStatus === 'failed' && 'Failed to submit to DUPR. Please try again.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Score Display */}
        <ScoreDisplay scores={scores} />

        {/* Teams */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TeamCard
            team={teams.team1}
            teamLabel="Team 1"
            currentUserId={currentUserId}
            totalScore={team1Total}
            isWinner={team1Total > team2Total}
          />
          <TeamCard
            team={teams.team2}
            teamLabel="Team 2"
            currentUserId={currentUserId}
            totalScore={team2Total}
            isWinner={team2Total > team1Total}
          />
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{displayError}</p>
          </div>
        )}

        {/* Action Area */}
        <div className="pt-2">
          {duprStatus === 'pending_verification' && (
            <>
              {!currentUserHasConfirmed ? (
                <Button
                  onClick={handleConfirm}
                  loading={isConfirming}
                  className="w-full"
                  size="lg"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Scores
                </Button>
              ) : !allConfirmed ? (
                <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    Waiting for opponent verification
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 p-4 bg-pickle-50 dark:bg-pickle-900/20 border border-pickle-200 dark:border-pickle-800 rounded-xl">
                  <Check className="h-5 w-5 text-pickle-600 dark:text-pickle-400" />
                  <span className="text-sm font-medium text-pickle-700 dark:text-pickle-300">
                    Scores Verified - Submitting to DUPR
                  </span>
                </div>
              )}
            </>
          )}

          {duprStatus === 'submitting' && (
            <div className="flex items-center justify-center gap-2 p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl">
              <Loader2 className="h-5 w-5 text-brand-600 dark:text-brand-400 animate-spin" />
              <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                Submitting to DUPR...
              </span>
            </div>
          )}

          {duprStatus === 'submitted' && (
            <div className="flex items-center justify-center gap-2 p-4 bg-pickle-50 dark:bg-pickle-900/20 border border-pickle-200 dark:border-pickle-800 rounded-xl">
              <Check className="h-5 w-5 text-pickle-600 dark:text-pickle-400" />
              <span className="text-sm font-medium text-pickle-700 dark:text-pickle-300">
                Successfully submitted to DUPR
              </span>
            </div>
          )}

          {duprStatus === 'failed' && (
            <Button
              onClick={handleConfirm}
              loading={isConfirming}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Retry DUPR Submission
            </Button>
          )}
        </div>

        {/* Game ID Reference */}
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Game ID: {gameId}
        </p>
      </CardContent>
    </Card>
  );
}

// Default export for convenience
export default ScoreVerification;
