'use client';

import * as React from 'react';
import {
  Check,
  Clock,
  Play,
  Calendar,
  MapPin,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface Team {
  id: string;
  name: string;
  seed?: number;
}

export interface GameScore {
  team1: number;
  team2: number;
}

export interface PoolMatch {
  id: string;
  team1: Team;
  team2: Team;
  scores?: GameScore[];
  winnerId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  court?: string;
  scheduledTime?: Date | string;
  timeSlot?: number;
}

export interface PoolScheduleProps {
  matches: PoolMatch[];
  courts?: string[];
  timeSlots?: Array<{
    slot: number;
    startTime: string;
    endTime?: string;
  }>;
  onMatchClick?: (matchId: string) => void;
  isEditable?: boolean;
  highlightTeamId?: string;
  view?: 'list' | 'grid';
  className?: string;
}

function StatusBadge({ status }: { status: PoolMatch['status'] }) {
  const config = {
    pending: {
      icon: Clock,
      label: 'Upcoming',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    },
    in_progress: {
      icon: Play,
      label: 'In Progress',
      className:
        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 animate-pulse',
    },
    completed: {
      icon: Check,
      label: 'Completed',
      className:
        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function MatchCard({
  match,
  onMatchClick,
  isEditable,
  highlightTeamId,
}: {
  match: PoolMatch;
  onMatchClick?: (matchId: string) => void;
  isEditable?: boolean;
  highlightTeamId?: string;
}) {
  const { team1, team2, scores, winnerId, status, court, scheduledTime } = match;

  const isTeam1Winner = winnerId === team1.id;
  const isTeam2Winner = winnerId === team2.id;
  const isTeam1Highlighted = highlightTeamId === team1.id;
  const isTeam2Highlighted = highlightTeamId === team2.id;
  const isClickable = isEditable && status !== 'completed';

  // Calculate game scores (total games won by each team)
  const team1Games = scores?.filter((s) => s.team1 > s.team2).length ?? 0;
  const team2Games = scores?.filter((s) => s.team2 > s.team1).length ?? 0;

  // Format time
  const formattedTime = scheduledTime
    ? new Date(scheduledTime).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

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

  return (
    <div
      className={cn(
        'relative rounded-lg border transition-all',
        status === 'in_progress'
          ? 'border-orange-400 dark:border-orange-500 ring-2 ring-orange-100 dark:ring-orange-900/30'
          : status === 'completed'
            ? 'border-green-200 dark:border-green-800'
            : 'border-gray-200 dark:border-gray-700',
        isClickable &&
          'cursor-pointer hover:shadow-md hover:border-pickle-400 dark:hover:border-pickle-500'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      aria-label={
        isClickable ? `Edit match: ${team1.name} vs ${team2.name}` : undefined
      }
    >
      {/* Header with time/court and status */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {formattedTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formattedTime}
            </span>
          )}
          {court && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Court {court}
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Teams */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {/* Team 1 */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2.5',
            isTeam1Winner && 'bg-green-50 dark:bg-green-900/20',
            isTeam1Highlighted && !isTeam1Winner && 'bg-pickle-50 dark:bg-pickle-900/20'
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {team1.seed && (
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                {team1.seed}
              </span>
            )}
            <span
              className={cn(
                'truncate text-sm font-medium',
                isTeam1Winner
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-900 dark:text-white'
              )}
            >
              {team1.name}
            </span>
            {isTeam1Winner && (
              <Check className="flex-shrink-0 w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </div>
          {scores && scores.length > 0 && (
            <span
              className={cn(
                'flex-shrink-0 ml-2 text-lg font-bold tabular-nums',
                isTeam1Winner
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {team1Games}
            </span>
          )}
        </div>

        {/* Team 2 */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2.5',
            isTeam2Winner && 'bg-green-50 dark:bg-green-900/20',
            isTeam2Highlighted && !isTeam2Winner && 'bg-pickle-50 dark:bg-pickle-900/20'
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {team2.seed && (
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                {team2.seed}
              </span>
            )}
            <span
              className={cn(
                'truncate text-sm font-medium',
                isTeam2Winner
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-900 dark:text-white'
              )}
            >
              {team2.name}
            </span>
            {isTeam2Winner && (
              <Check className="flex-shrink-0 w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </div>
          {scores && scores.length > 0 && (
            <span
              className={cn(
                'flex-shrink-0 ml-2 text-lg font-bold tabular-nums',
                isTeam2Winner
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {team2Games}
            </span>
          )}
        </div>
      </div>

      {/* Game scores detail */}
      {scores && scores.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {scores.map((score, idx) => (
              <span
                key={idx}
                className={cn(
                  'px-2 py-0.5 rounded font-medium tabular-nums',
                  score.team1 > score.team2
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : score.team2 > score.team1
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      : 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                {score.team1}-{score.team2}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Edit indicator */}
      {isClickable && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
          <Edit2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </div>
      )}
    </div>
  );
}

export function PoolSchedule({
  matches,
  courts,
  timeSlots,
  onMatchClick,
  isEditable = false,
  highlightTeamId,
  view = 'list',
  className,
}: PoolScheduleProps) {
  // Group matches by time slot for grid view
  const matchesBySlot = React.useMemo(() => {
    if (view !== 'grid' || !timeSlots) return null;

    const grouped = new Map<number, PoolMatch[]>();
    timeSlots.forEach((slot) => {
      grouped.set(slot.slot, []);
    });

    matches.forEach((match) => {
      if (match.timeSlot !== undefined) {
        const slotMatches = grouped.get(match.timeSlot) ?? [];
        slotMatches.push(match);
        grouped.set(match.timeSlot, slotMatches);
      }
    });

    return grouped;
  }, [matches, timeSlots, view]);

  // Group matches by status for list view
  const matchesByStatus = React.useMemo(() => {
    if (view !== 'list') return null;

    return {
      in_progress: matches.filter((m) => m.status === 'in_progress'),
      pending: matches.filter((m) => m.status === 'pending'),
      completed: matches.filter((m) => m.status === 'completed'),
    };
  }, [matches, view]);

  if (view === 'grid' && timeSlots && courts && matchesBySlot) {
    return (
      <div className={cn('overflow-x-auto', className)}>
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                <Calendar className="w-4 h-4 inline-block mr-1" />
                Time
              </th>
              {courts.map((court) => (
                <th
                  key={court}
                  className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700"
                >
                  <MapPin className="w-3 h-3 inline-block mr-1" />
                  Court {court}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot) => (
              <tr key={slot.slot}>
                <td className="p-2 align-top border-b border-gray-100 dark:border-gray-800">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {slot.startTime}
                  </div>
                  {slot.endTime && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      - {slot.endTime}
                    </div>
                  )}
                </td>
                {courts.map((court) => {
                  const match = matchesBySlot
                    .get(slot.slot)
                    ?.find((m) => m.court === court);

                  return (
                    <td
                      key={court}
                      className="p-2 align-top border-b border-gray-100 dark:border-gray-800"
                    >
                      {match ? (
                        <MatchCard
                          match={match}
                          onMatchClick={onMatchClick}
                          isEditable={isEditable}
                          highlightTeamId={highlightTeamId}
                        />
                      ) : (
                        <div className="h-24 flex items-center justify-center text-xs text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                          No match
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // List view (default)
  return (
    <div className={cn('space-y-6', className)}>
      {/* In Progress */}
      {matchesByStatus?.in_progress && matchesByStatus.in_progress.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300 mb-3">
            <Play className="w-4 h-4" />
            In Progress ({matchesByStatus.in_progress.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {matchesByStatus.in_progress.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onMatchClick={onMatchClick}
                isEditable={isEditable}
                highlightTeamId={highlightTeamId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {matchesByStatus?.pending && matchesByStatus.pending.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <Clock className="w-4 h-4" />
            Upcoming ({matchesByStatus.pending.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {matchesByStatus.pending.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onMatchClick={onMatchClick}
                isEditable={isEditable}
                highlightTeamId={highlightTeamId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {matchesByStatus?.completed && matchesByStatus.completed.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300 mb-3">
            <Check className="w-4 h-4" />
            Completed ({matchesByStatus.completed.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {matchesByStatus.completed.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onMatchClick={onMatchClick}
                isEditable={isEditable}
                highlightTeamId={highlightTeamId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            No matches scheduled yet
          </p>
        </div>
      )}
    </div>
  );
}

export default PoolSchedule;
