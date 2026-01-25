'use client';

import { CalendarDays, Users, TrendingUp, Medal, Search } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/EmptyState';

interface NoLeaguesProps {
  /** Context: 'joined' for user's leagues, 'browse' for discovery */
  context?: 'joined' | 'browse';
  /** Show compact version for inline use */
  compact?: boolean;
  /** Callback to switch to browse view (for "my leagues" context) */
  onBrowse?: () => void;
  /** Custom class name */
  className?: string;
}

export function NoLeagues({ context = 'browse', compact = false, onBrowse, className }: NoLeaguesProps) {
  if (context === 'joined') {
    return (
      <EmptyState
        icon={CalendarDays}
        iconVariant="default"
        title="No leagues joined"
        description="Join a league for regular competitive play with standings and schedules. Leagues are a great way to improve your game and meet other players."
        primaryActionLabel="Browse Leagues"
        primaryActionOnClick={onBrowse}
        primaryActionHref={onBrowse ? undefined : "/leagues"}
        compact={compact}
        className={className}
      >
        {/* Benefits */}
        {!compact && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full max-w-lg">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Why join a league?
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Improve Skills</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Meet Players</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Medal className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Compete</span>
              </div>
            </div>
          </div>
        )}
      </EmptyState>
    );
  }

  return (
    <EmptyState
      icon={CalendarDays}
      iconVariant="default"
      title="No leagues available"
      description="There are no leagues in your area right now. Be the first to create one and bring organized league play to your community."
      primaryActionLabel="Create League"
      primaryActionHref="/leagues/new"
      compact={compact}
      className={className}
    >
      {/* Benefits */}
      {!compact && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full max-w-lg">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            League formats available
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Ladder', 'Round Robin', 'Doubles', 'Mixed Doubles', 'Singles'].map((format) => (
              <span
                key={format}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      )}
    </EmptyState>
  );
}

/** Variant for filtered results showing no matches */
export function NoLeaguesFiltered({
  filterLabel,
  onClearFilter
}: {
  filterLabel: string;
  onClearFilter?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      iconVariant="info"
      title="No leagues found"
      description={`No leagues match your "${filterLabel}" filter. Try adjusting your search or create a new league.`}
      primaryActionLabel="Create League"
      primaryActionHref="/leagues/new"
      secondaryActionLabel={onClearFilter ? "Clear Filter" : undefined}
      secondaryActionOnClick={onClearFilter}
      compact
    />
  );
}

/** Inline variant for use within lists or cards */
export function NoLeaguesInline({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center mb-3">
        <CalendarDays className="w-6 h-6 text-pickle-600 dark:text-pickle-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No leagues joined
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 max-w-xs">
        Join a league for regular play
      </p>
      {onBrowse ? (
        <button
          onClick={onBrowse}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-pickle-500 hover:bg-pickle-600 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          Browse
        </button>
      ) : (
        <Link
          href="/leagues"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-pickle-500 hover:bg-pickle-600 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          Browse
        </Link>
      )}
    </div>
  );
}
