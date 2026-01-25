'use client';

import {
  Skeleton,
  SkeletonStatCard,
} from '@/components/ui/skeleton';

/**
 * Skeleton for a single game row in Recent Games section
 */
export function GameRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-2 h-2 rounded-full" />
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-10 mb-1 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a single league row in My Leagues section
 */
export function LeagueRowSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="w-5 h-5 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton for quick action cards
 */
export function QuickActionSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <div>
        <Skeleton className="h-5 w-24 mb-1" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

/**
 * Complete dashboard skeleton matching the actual dashboard layout
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Welcome Section Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Quick Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionSkeleton />
        <QuickActionSkeleton />
        <QuickActionSkeleton />
        <QuickActionSkeleton />
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Games Section */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <GameRowSkeleton />
            <GameRowSkeleton />
            <GameRowSkeleton />
            <GameRowSkeleton />
            <GameRowSkeleton />
          </div>
        </div>

        {/* My Leagues Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <LeagueRowSkeleton />
            <LeagueRowSkeleton />
            <LeagueRowSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;
