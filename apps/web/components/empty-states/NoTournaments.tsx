'use client';

import { Trophy, Plus, Calendar, Users, Award } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/EmptyState';

interface NoTournamentsProps {
  /** Context: 'manage' for tournament directors, 'browse' for players */
  context?: 'manage' | 'browse';
  /** Show compact version for inline use */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export function NoTournaments({ context = 'manage', compact = false, className }: NoTournamentsProps) {
  if (context === 'browse') {
    return (
      <EmptyState
        icon={Trophy}
        iconVariant="default"
        title="No tournaments available"
        description="There are no tournaments in your area right now. Check back soon or create your own tournament to compete with others."
        primaryActionLabel="Create Tournament"
        primaryActionHref="/tournaments/new"
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <EmptyState
      icon={Trophy}
      iconVariant="default"
      title="No tournaments yet"
      description="Create a tournament to organize competitive play. Set up events, manage registrations, and run brackets all in one place."
      primaryActionLabel="Create Tournament"
      primaryActionHref="/tournaments/new"
      secondaryActionLabel="Browse Tournaments"
      secondaryActionHref="/tournaments/browse"
      compact={compact}
      className={className}
    >
      {/* Feature highlights */}
      {!compact && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full max-w-lg">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Tournament features
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Registration</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Scheduling</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Brackets</span>
            </div>
          </div>
        </div>
      )}
    </EmptyState>
  );
}

/** Variant for filtered results showing no matches */
export function NoTournamentsFiltered({
  filterLabel,
  onClearFilter
}: {
  filterLabel: string;
  onClearFilter?: () => void;
}) {
  return (
    <EmptyState
      icon={Trophy}
      iconVariant="info"
      title="No tournaments found"
      description={`No tournaments match the "${filterLabel}" filter. Try a different filter or create a new tournament.`}
      primaryActionLabel="Create Tournament"
      primaryActionHref="/tournaments/new"
      secondaryActionLabel={onClearFilter ? "Clear Filter" : undefined}
      secondaryActionOnClick={onClearFilter}
      compact
    />
  );
}

/** Inline variant for use within lists or cards */
export function NoTournamentsInline() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center mb-3">
        <Trophy className="w-6 h-6 text-pickle-600 dark:text-pickle-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No tournaments
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 max-w-xs">
        Create or join a tournament to compete
      </p>
      <Link
        href="/tournaments/new"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-pickle-500 hover:bg-pickle-600 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create
      </Link>
    </div>
  );
}
