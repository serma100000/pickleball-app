'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for a single game row in the games list
 */
export function GameRowSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Date & Result */}
        <div className="flex items-center gap-3 md:w-32">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-16 mb-1" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Game Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-48 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Rating Change */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for game stats overview cards
 */
export function GameStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
        >
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for filter buttons
 */
export function GameFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3 animate-pulse">
      <Skeleton className="h-10 w-32 rounded-lg" />
      <Skeleton className="h-10 w-28 rounded-lg" />
      <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
  );
}

/**
 * Complete game list skeleton matching the actual games page layout
 */
export function GameListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats Overview */}
      <GameStatsSkeleton />

      {/* Filters */}
      <GameFiltersSkeleton />

      {/* Games List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          <GameRowSkeleton />
          <GameRowSkeleton />
          <GameRowSkeleton />
          <GameRowSkeleton />
          <GameRowSkeleton />
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
        <Skeleton className="h-5 w-44 order-2 sm:order-1" />
        <div className="flex items-center gap-2 order-1 sm:order-2">
          <Skeleton className="h-11 w-20 rounded-lg" />
          <Skeleton className="h-11 w-11 rounded-lg hidden sm:block" />
          <Skeleton className="h-11 w-11 rounded-lg hidden sm:block" />
          <Skeleton className="h-11 w-11 rounded-lg hidden sm:block" />
          <Skeleton className="h-5 w-12 sm:hidden" />
          <Skeleton className="h-11 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default GameListSkeleton;
