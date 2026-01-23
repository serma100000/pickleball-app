'use client';

import * as React from 'react';
import { Users, Trophy, LayoutGrid, List, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PoolStandings, type Standing, type SortColumn } from './pool-standings';
import { PoolSchedule, type PoolMatch } from './pool-schedule';

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

export interface Pool {
  id: string;
  name: string;
  number: number;
  teams: Team[];
  matches: PoolMatch[];
}

export interface PoolViewProps {
  pool: Pool;
  advanceCount: number;
  onMatchClick?: (matchId: string) => void;
  onTeamClick?: (teamId: string) => void;
  isEditable?: boolean;
  defaultView?: 'standings' | 'schedule';
  scheduleView?: 'list' | 'grid';
  courts?: string[];
  timeSlots?: Array<{
    slot: number;
    startTime: string;
    endTime?: string;
  }>;
  highlightTeamId?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

/**
 * Calculate standings from pool matches
 */
function calculateStandings(pool: Pool): Standing[] {
  const standingsMap = new Map<string, Standing>();

  // Initialize standings for all teams
  pool.teams.forEach((team, index) => {
    standingsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      rank: index + 1,
      wins: 0,
      losses: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      headToHead: {},
    });
  });

  // Calculate from completed matches
  pool.matches
    .filter((match) => match.status === 'completed' && match.winnerId)
    .forEach((match) => {
      const team1Standing = standingsMap.get(match.team1.id);
      const team2Standing = standingsMap.get(match.team2.id);

      if (!team1Standing || !team2Standing || !match.scores) return;

      // Count games won by each team
      const team1Games = match.scores.filter((s) => s.team1 > s.team2).length;
      const team2Games = match.scores.filter((s) => s.team2 > s.team1).length;

      // Count total points
      const team1Points = match.scores.reduce((sum, s) => sum + s.team1, 0);
      const team2Points = match.scores.reduce((sum, s) => sum + s.team2, 0);

      // Update team 1
      team1Standing.gamesWon += team1Games;
      team1Standing.gamesLost += team2Games;
      team1Standing.pointsFor += team1Points;
      team1Standing.pointsAgainst += team2Points;

      // Update team 2
      team2Standing.gamesWon += team2Games;
      team2Standing.gamesLost += team1Games;
      team2Standing.pointsFor += team2Points;
      team2Standing.pointsAgainst += team1Points;

      // Record match result
      if (match.winnerId === match.team1.id) {
        team1Standing.wins++;
        team2Standing.losses++;
        if (team1Standing.headToHead) {
          team1Standing.headToHead[match.team2.id] = 'W';
        }
        if (team2Standing.headToHead) {
          team2Standing.headToHead[match.team1.id] = 'L';
        }
      } else if (match.winnerId === match.team2.id) {
        team2Standing.wins++;
        team1Standing.losses++;
        if (team1Standing.headToHead) {
          team1Standing.headToHead[match.team2.id] = 'L';
        }
        if (team2Standing.headToHead) {
          team2Standing.headToHead[match.team1.id] = 'W';
        }
      }
    });

  // Calculate point differential and convert to array
  const standings = Array.from(standingsMap.values()).map((s) => ({
    ...s,
    pointDiff: s.pointsFor - s.pointsAgainst,
  }));

  // Sort by: wins (desc), then point diff (desc), then points for (desc)
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return b.pointsFor - a.pointsFor;
  });

  // Assign ranks
  standings.forEach((s, index) => {
    s.rank = index + 1;
  });

  return standings;
}

/**
 * Get pool completion status
 */
function getPoolStatus(pool: Pool): {
  completed: number;
  total: number;
  inProgress: number;
  percentage: number;
} {
  const total = pool.matches.length;
  const completed = pool.matches.filter((m) => m.status === 'completed').length;
  const inProgress = pool.matches.filter((m) => m.status === 'in_progress').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, inProgress, percentage };
}

export function PoolView({
  pool,
  advanceCount,
  onMatchClick,
  onTeamClick,
  isEditable = false,
  defaultView = 'standings',
  scheduleView = 'list',
  courts,
  timeSlots,
  highlightTeamId,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: PoolViewProps) {
  const [activeTab, setActiveTab] = React.useState<'standings' | 'schedule'>(defaultView);
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('rank');

  const standings = React.useMemo(() => calculateStandings(pool), [pool]);
  const status = React.useMemo(() => getPoolStatus(pool), [pool]);

  const CollapseIcon = isCollapsed ? ChevronDown : ChevronUp;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700',
          collapsible && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
        )}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsCollapsed(!isCollapsed);
                }
              }
            : undefined
        }
        tabIndex={collapsible ? 0 : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? !isCollapsed : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pickle-100 dark:bg-pickle-900/30">
            <Trophy className="w-5 h-5 text-pickle-600 dark:text-pickle-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {pool.name || `Pool ${pool.number}`}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {pool.teams.length} teams
              </span>
              <span>
                {status.completed}/{status.total} matches
              </span>
              {status.inProgress > 0 && (
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  {status.inProgress} in progress
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  status.percentage === 100
                    ? 'bg-green-500'
                    : status.inProgress > 0
                      ? 'bg-orange-500'
                      : 'bg-pickle-500'
                )}
                style={{ width: `${status.percentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
              {status.percentage}%
            </span>
          </div>

          {collapsible && (
            <CollapseIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setActiveTab('standings')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'standings'
                  ? 'text-pickle-600 dark:text-pickle-400 border-b-2 border-pickle-500 -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Trophy className="w-4 h-4" />
              Standings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'schedule'
                  ? 'text-pickle-600 dark:text-pickle-400 border-b-2 border-pickle-500 -mb-px'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {scheduleView === 'grid' ? (
                <LayoutGrid className="w-4 h-4" />
              ) : (
                <List className="w-4 h-4" />
              )}
              Schedule
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {activeTab === 'standings' ? (
              <PoolStandings
                standings={standings}
                advanceCount={advanceCount}
                onTeamClick={onTeamClick}
                showTiebreakers={true}
                sortColumn={sortColumn}
                onSortChange={setSortColumn}
              />
            ) : (
              <PoolSchedule
                matches={pool.matches}
                courts={courts}
                timeSlots={timeSlots}
                onMatchClick={onMatchClick}
                isEditable={isEditable}
                highlightTeamId={highlightTeamId}
                view={scheduleView}
              />
            )}
          </div>

          {/* Advancing teams indicator */}
          {advanceCount > 0 && (
            <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                <span className="font-semibold">Top {advanceCount}</span> team
                {advanceCount > 1 ? 's' : ''} advance
                {advanceCount > 1 ? '' : 's'} to playoffs
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PoolView;
