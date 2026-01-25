'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for a single league card
 */
export function LeagueCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          {/* Title and badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>

          {/* League details */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* User standing (optional) */}
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Action Area */}
        <div className="flex items-center gap-3 lg:flex-shrink-0">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="w-5 h-5 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for league stats overview
 */
export function LeagueStatsSkeleton() {
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
 * Skeleton for league filter tabs
 */
export function LeagueTabsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <Skeleton
          key={i}
          className={`h-10 rounded-lg ${i === 0 ? 'w-12' : 'w-24'}`}
        />
      ))}
      <Skeleton className="h-10 w-32 rounded-lg ml-auto" />
    </div>
  );
}

/**
 * Complete league list skeleton matching the actual leagues page layout
 */
export function LeagueListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
        <div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Stats Overview */}
      <LeagueStatsSkeleton />

      {/* Filter Tabs */}
      <LeagueTabsSkeleton />

      {/* League Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <LeagueCardSkeleton />
        <LeagueCardSkeleton />
        <LeagueCardSkeleton />
        <LeagueCardSkeleton />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between animate-pulse">
        <Skeleton className="h-5 w-44" />
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

export default LeagueListSkeleton;
