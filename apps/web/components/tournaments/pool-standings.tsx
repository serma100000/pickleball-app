'use client';

import * as React from 'react';
import { Trophy, ArrowUp, ArrowDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export interface Standing {
  teamId: string;
  teamName: string;
  rank?: number;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  headToHead?: Record<string, 'W' | 'L' | '-'>;
}

export interface PoolStandingsProps {
  standings: Standing[];
  advanceCount: number;
  onTeamClick?: (teamId: string) => void;
  showTiebreakers?: boolean;
  sortColumn?: SortColumn;
  onSortChange?: (column: SortColumn) => void;
  className?: string;
}

export type SortColumn = 'rank' | 'wins' | 'gamesWon' | 'pointDiff' | 'pointsFor';

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

function SortHeader({
  label,
  column,
  currentSort,
  onSort,
  className,
}: {
  label: string;
  column: SortColumn;
  currentSort: SortState;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const isActive = currentSort.column === column;
  const Icon = isActive
    ? currentSort.direction === 'asc'
      ? ChevronUp
      : ChevronDown
    : null;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'flex items-center gap-1 font-medium text-xs uppercase tracking-wide',
        'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
        'transition-colors',
        isActive && 'text-pickle-700 dark:text-pickle-400',
        className
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {Icon && <Icon className="w-3.5 h-3.5" />}
    </button>
  );
}

function StatBadge({
  value,
  variant = 'neutral',
}: {
  value: number;
  variant?: 'positive' | 'negative' | 'neutral';
}) {
  const Icon =
    variant === 'positive' ? ArrowUp : variant === 'negative' ? ArrowDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        variant === 'positive' && 'text-green-600 dark:text-green-400',
        variant === 'negative' && 'text-red-600 dark:text-red-400',
        variant === 'neutral' && 'text-gray-500 dark:text-gray-400'
      )}
    >
      {variant !== 'neutral' && <Icon className="w-3 h-3" />}
      {value > 0 && variant === 'positive' ? '+' : ''}
      {value}
    </span>
  );
}

export function PoolStandings({
  standings,
  advanceCount,
  onTeamClick,
  showTiebreakers = false,
  sortColumn: externalSortColumn,
  onSortChange,
  className,
}: PoolStandingsProps) {
  const [internalSort, setInternalSort] = React.useState<SortState>({
    column: 'rank',
    direction: 'asc',
  });

  const sortState: SortState = externalSortColumn
    ? { column: externalSortColumn, direction: 'desc' }
    : internalSort;

  const handleSort = (column: SortColumn) => {
    if (onSortChange) {
      onSortChange(column);
    } else {
      setInternalSort((prev) => ({
        column,
        direction:
          prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
      }));
    }
  };

  // Sort standings
  const sortedStandings = React.useMemo(() => {
    const sorted = [...standings];
    sorted.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortState.column) {
        case 'wins':
          aVal = a.wins;
          bVal = b.wins;
          break;
        case 'gamesWon':
          aVal = a.gamesWon;
          bVal = b.gamesWon;
          break;
        case 'pointDiff':
          aVal = a.pointDiff;
          bVal = b.pointDiff;
          break;
        case 'pointsFor':
          aVal = a.pointsFor;
          bVal = b.pointsFor;
          break;
        case 'rank':
        default:
          aVal = a.rank ?? 999;
          bVal = b.rank ?? 999;
          return sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [standings, sortState]);

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[500px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="py-3 px-3 text-left">
              <SortHeader
                label="#"
                column="rank"
                currentSort={sortState}
                onSort={handleSort}
              />
            </th>
            <th className="py-3 px-3 text-left">
              <span className="font-medium text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Team
              </span>
            </th>
            <th className="py-3 px-2 text-center">
              <SortHeader
                label="W"
                column="wins"
                currentSort={sortState}
                onSort={handleSort}
                className="justify-center"
              />
            </th>
            <th className="py-3 px-2 text-center">
              <span className="font-medium text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                L
              </span>
            </th>
            <th className="py-3 px-2 text-center">
              <SortHeader
                label="GW"
                column="gamesWon"
                currentSort={sortState}
                onSort={handleSort}
                className="justify-center"
              />
            </th>
            <th className="py-3 px-2 text-center">
              <span className="font-medium text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                GL
              </span>
            </th>
            <th className="py-3 px-2 text-center">
              <SortHeader
                label="+/-"
                column="pointDiff"
                currentSort={sortState}
                onSort={handleSort}
                className="justify-center"
              />
            </th>
            {showTiebreakers && (
              <th className="py-3 px-2 text-center">
                <SortHeader
                  label="PF"
                  column="pointsFor"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="justify-center"
                />
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {sortedStandings.map((standing, index) => {
            const isAdvancing = index < advanceCount;
            const isClickable = !!onTeamClick;

            return (
              <tr
                key={standing.teamId}
                className={cn(
                  'transition-colors',
                  isAdvancing &&
                    'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30',
                  !isAdvancing && 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  isClickable && 'cursor-pointer'
                )}
                onClick={() => onTeamClick?.(standing.teamId)}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onTeamClick?.(standing.teamId);
                  }
                }}
                role={isClickable ? 'button' : undefined}
              >
                {/* Rank */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                        isAdvancing
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {standing.rank ?? index + 1}
                    </span>
                    {isAdvancing && index === 0 && (
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </td>

                {/* Team Name */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-medium',
                        isAdvancing
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {standing.teamName}
                    </span>
                    {isAdvancing && (
                      <span className="inline-flex px-1.5 py-0.5 text-2xs font-medium bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded">
                        Advances
                      </span>
                    )}
                  </div>
                </td>

                {/* Wins */}
                <td className="py-3 px-2 text-center">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {standing.wins}
                  </span>
                </td>

                {/* Losses */}
                <td className="py-3 px-2 text-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {standing.losses}
                  </span>
                </td>

                {/* Games Won */}
                <td className="py-3 px-2 text-center">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {standing.gamesWon}
                  </span>
                </td>

                {/* Games Lost */}
                <td className="py-3 px-2 text-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    {standing.gamesLost}
                  </span>
                </td>

                {/* Point Differential */}
                <td className="py-3 px-2 text-center">
                  <StatBadge
                    value={standing.pointDiff}
                    variant={
                      standing.pointDiff > 0
                        ? 'positive'
                        : standing.pointDiff < 0
                          ? 'negative'
                          : 'neutral'
                    }
                  />
                </td>

                {/* Points For (tiebreaker) */}
                {showTiebreakers && (
                  <td className="py-3 px-2 text-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {standing.pointsFor}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-3 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Advances to playoffs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">W/L</span>
            <span>= Matches</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">GW/GL</span>
            <span>= Games</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">+/-</span>
            <span>= Point Differential</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PoolStandings;
