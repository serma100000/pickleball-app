'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for a single tournament card
 */
export function TournamentCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          {/* Title and status badge */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          {/* Date, events, participants info */}
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Registration Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>

        {/* View Details Arrow */}
        <Skeleton className="hidden lg:block w-10 h-10 rounded-full flex-shrink-0" />
      </div>
    </div>
  );
}

/**
 * Skeleton for tournament stats overview
 */
export function TournamentStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for tournament filter tabs
 */
export function TournamentTabsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <Skeleton
          key={i}
          className={`h-10 rounded-lg ${i === 0 ? 'w-16' : 'w-28'}`}
        />
      ))}
    </div>
  );
}

/**
 * Complete tournament list skeleton matching the actual tournaments page layout
 */
export function TournamentListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Stats Overview */}
      <TournamentStatsSkeleton />

      {/* Filter Tabs */}
      <TournamentTabsSkeleton />

      {/* Tournament Cards */}
      <div className="space-y-4">
        <TournamentCardSkeleton />
        <TournamentCardSkeleton />
        <TournamentCardSkeleton />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between animate-pulse">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default TournamentListSkeleton;
