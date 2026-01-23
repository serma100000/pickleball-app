'use client';

import * as React from 'react';
import { Trophy, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface Team {
  id: string;
  name: string;
  seed?: number;
  players?: Array<{
    id: string;
    name: string;
  }>;
}

export interface GameScore {
  team1: number;
  team2: number;
}

export interface Match {
  id: string;
  round: number;
  position: number;
  team1?: Team;
  team2?: Team;
  scores?: GameScore[];
  winnerId?: string;
  scheduledTime?: Date | string;
  court?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
  bracketType?: 'winners' | 'losers' | 'finals';
}

export interface BracketMatchProps {
  match: Match;
  onMatchClick?: (matchId: string) => void;
  isEditable?: boolean;
  highlightTeamId?: string;
  compact?: boolean;
}

function TeamRow({
  team,
  score,
  isWinner,
  isHighlighted,
  isBye,
  position,
}: {
  team?: Team;
  score?: number;
  isWinner: boolean;
  isHighlighted: boolean;
  isBye: boolean;
  position: 'top' | 'bottom';
}) {
  const displayName = team?.name || (isBye ? 'BYE' : 'TBD');
  const seed = team?.seed;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 transition-colors',
        position === 'top' ? 'rounded-t-lg' : 'rounded-b-lg',
        isWinner && 'bg-green-50 dark:bg-green-900/20',
        isHighlighted && !isWinner && 'bg-pickle-50 dark:bg-pickle-900/20',
        !isWinner && !isHighlighted && 'bg-white dark:bg-gray-800',
        isBye && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {seed && (
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
            {seed}
          </span>
        )}
        <span
          className={cn(
            'truncate text-sm',
            isWinner
              ? 'font-semibold text-green-700 dark:text-green-300'
              : team
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-gray-500 italic'
          )}
        >
          {displayName}
        </span>
        {isWinner && (
          <Trophy className="flex-shrink-0 w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        )}
      </div>
      {score !== undefined && (
        <span
          className={cn(
            'flex-shrink-0 ml-2 text-sm font-semibold tabular-nums',
            isWinner
              ? 'text-green-700 dark:text-green-300'
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

export function BracketMatch({
  match,
  onMatchClick,
  isEditable = false,
  highlightTeamId,
  compact = false,
}: BracketMatchProps) {
  const { team1, team2, scores, winnerId, scheduledTime, court, status } = match;

  // Calculate total scores (games won)
  const getGamesWon = (teamPosition: 'team1' | 'team2'): number => {
    if (!scores || scores.length === 0) return 0;
    return scores.filter((s) =>
      teamPosition === 'team1' ? s.team1 > s.team2 : s.team2 > s.team1
    ).length;
  };

  const team1GamesWon = getGamesWon('team1');
  const team2GamesWon = getGamesWon('team2');

  const isTeam1Winner = winnerId === team1?.id;
  const isTeam2Winner = winnerId === team2?.id;
  const isTeam1Highlighted = highlightTeamId === team1?.id;
  const isTeam2Highlighted = highlightTeamId === team2?.id;
  const isBye = status === 'bye' || (team1 === undefined && team2 !== undefined) || (team1 !== undefined && team2 === undefined);

  const isClickable = isEditable && (team1 || team2) && status !== 'bye';

  const handleClick = () => {
    if (isClickable && onMatchClick) {
      onMatchClick(match.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && onMatchClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onMatchClick(match.id);
    }
  };

  // Format scheduled time
  const formattedTime = scheduledTime
    ? new Date(scheduledTime).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className={cn(
        'relative rounded-lg border shadow-sm transition-all',
        status === 'in_progress'
          ? 'border-orange-400 dark:border-orange-500 ring-2 ring-orange-100 dark:ring-orange-900/30'
          : status === 'completed'
            ? 'border-gray-200 dark:border-gray-700'
            : 'border-gray-200 dark:border-gray-700',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-pickle-400 dark:hover:border-pickle-500',
        compact ? 'w-40' : 'w-52'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      aria-label={
        isClickable
          ? `Edit match: ${team1?.name || 'TBD'} vs ${team2?.name || 'TBD'}`
          : undefined
      }
    >
      {/* Status indicator */}
      {status === 'in_progress' && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
          LIVE
        </div>
      )}

      {/* Match content */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        <TeamRow
          team={team1}
          score={scores && scores.length > 0 ? team1GamesWon : undefined}
          isWinner={isTeam1Winner}
          isHighlighted={isTeam1Highlighted}
          isBye={isBye && !team1}
          position="top"
        />
        <TeamRow
          team={team2}
          score={scores && scores.length > 0 ? team2GamesWon : undefined}
          isWinner={isTeam2Winner}
          isHighlighted={isTeam2Highlighted}
          isBye={isBye && !team2}
          position="bottom"
        />
      </div>

      {/* Game scores detail (shown on hover or when completed) */}
      {scores && scores.length > 0 && status === 'completed' && !compact && (
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            {scores.map((score, idx) => (
              <span key={idx} className="font-medium tabular-nums">
                {score.team1}-{score.team2}
                {idx < scores.length - 1 && <span className="ml-1.5">,</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Schedule info (for pending matches) */}
      {status === 'pending' && (formattedTime || court) && !compact && (
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {formattedTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedTime}
              </span>
            )}
            {court && (
              <span>Court {court}</span>
            )}
          </div>
        </div>
      )}

      {/* Edit indicator */}
      {isClickable && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
}

export default BracketMatch;
