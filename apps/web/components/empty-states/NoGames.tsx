'use client';

import { Gamepad2, Plus, TrendingUp, Target, BarChart3 } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/EmptyState';

interface NoGamesProps {
  /** Show compact version for inline use */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export function NoGames({ compact = false, className }: NoGamesProps) {
  return (
    <EmptyState
      icon={Gamepad2}
      iconVariant="default"
      title="No games logged yet"
      description="Track your matches to build your game history and see your progress over time. Every game helps you understand your strengths and areas for improvement."
      primaryActionLabel="Log Your First Game"
      primaryActionHref="/games/new"
      compact={compact}
      className={className}
    >
      {/* Feature highlights */}
      {!compact && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full max-w-lg">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            What you can track
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Win Rate</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Skill Rating</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Statistics</span>
            </div>
          </div>
        </div>
      )}
    </EmptyState>
  );
}

/** Inline variant for use within lists or cards */
export function NoGamesInline() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center mb-3">
        <Gamepad2 className="w-6 h-6 text-pickle-600 dark:text-pickle-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        No games yet
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 max-w-xs">
        Start tracking your matches to see your progress
      </p>
      <Link
        href="/games/new"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-pickle-500 hover:bg-pickle-600 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Log Game
      </Link>
    </div>
  );
}
