'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Plus,
  Filter,
  Users,
  MapPin,
  Trophy,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Award,
  TrendingUp,
  Star,
} from 'lucide-react';
import { useLeagues } from '@/hooks/use-api';

// Type definitions for API response
type LeagueType = 'ladder' | 'round_robin' | 'doubles' | 'mixed_doubles' | 'singles';
type LeagueStatus = 'registration' | 'active' | 'playoffs' | 'completed';

interface League {
  id: string;
  name: string;
  description: string | null;
  leagueType: LeagueType;
  status: LeagueStatus;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  currentWeek: number | null;
  totalWeeks: number;
  maxTeams: number;
  currentTeams: number;
  isDuprRated: boolean;
  skillLevelMin: number | null;
  skillLevelMax: number | null;
  venue: {
    id: string;
    name: string;
    city: string | null;
  } | null;
  isUserRegistered?: boolean;
  userStanding?: number | null;
}

interface LeaguesResponse {
  leagues: League[];
  total: number;
}

type FilterTab = 'all' | 'my-leagues' | 'active' | 'upcoming' | 'completed';

export default function LeaguesPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const limit = 10;

  // Map tab to API status filter
  const getStatusFilter = () => {
    switch (activeTab) {
      case 'active':
        return 'active';
      case 'upcoming':
        return 'registration';
      case 'completed':
        return 'completed';
      default:
        return undefined;
    }
  };

  const { data, isLoading, isError, error } = useLeagues({
    page,
    limit,
    status: getStatusFilter(),
  });

  // Cast the response to our expected type
  const leaguesData = data as LeaguesResponse | undefined;
  const leagues = leaguesData?.leagues ?? [];
  const total = leaguesData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Filter for "My Leagues" tab (client-side for now)
  const displayedLeagues = activeTab === 'my-leagues'
    ? leagues.filter(l => l.isUserRegistered)
    : leagues;

  // Calculate stats
  const myLeaguesCount = leagues.filter(l => l.isUserRegistered).length;
  const activeCount = leagues.filter(l => l.status === 'active').length;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'my-leagues', label: 'My Leagues' },
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Leagues
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Join organized league play in your area
          </p>
        </div>
        <Link
          href="/leagues/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create League
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Leagues</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : total}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">My Leagues</div>
          <div className="text-2xl font-bold text-pickle-600 dark:text-pickle-400 mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : myLeaguesCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Active Now</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : activeCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Best Finish</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '--'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-pickle-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-pickle-500 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Loading leagues...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Failed to load leagues
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && displayedLeagues.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-pickle-600 dark:text-pickle-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {activeTab === 'my-leagues' ? 'No leagues joined yet' : 'No leagues found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
              {activeTab === 'my-leagues'
                ? 'Join a league to compete against other players in organized play. Browse available leagues to get started.'
                : 'No leagues match your current filters. Try adjusting your filters or create a new league.'}
            </p>
            {activeTab === 'my-leagues' ? (
              <button
                onClick={() => setActiveTab('all')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
              >
                Browse Leagues
              </button>
            ) : (
              <Link
                href="/leagues/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create League
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Leagues Grid */}
      {!isLoading && !isError && displayedLeagues.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {displayedLeagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} leagues
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg ${
                    page === 1
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 rounded-lg ${
                        page === pageNum
                          ? 'bg-pickle-500 text-white'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg ${
                    page >= totalPages
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeagueCard({ league }: { league: League }) {
  // Format league type for display
  const formatLeagueType = (type: LeagueType): string => {
    const typeLabels: Record<LeagueType, string> = {
      ladder: 'Ladder',
      round_robin: 'Round Robin',
      doubles: 'Doubles',
      mixed_doubles: 'Mixed Doubles',
      singles: 'Singles',
    };
    return typeLabels[type] || type;
  };

  // Get status badge styling
  const getStatusBadge = (status: LeagueStatus) => {
    const styles: Record<LeagueStatus, { bg: string; text: string; label: string }> = {
      registration: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'Registration',
      },
      active: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        label: 'Active',
      },
      playoffs: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        label: 'Playoffs',
      },
      completed: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        label: 'Completed',
      },
    };
    return styles[status];
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get progress text based on status
  const getProgressText = () => {
    if (league.status === 'registration') {
      if (league.registrationDeadline) {
        const deadline = new Date(league.registrationDeadline);
        const now = new Date();
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0) {
          return `Registration ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
        }
      }
      return `Starts ${formatDate(league.startDate)}`;
    }
    if (league.status === 'active' && league.currentWeek && league.totalWeeks) {
      return `Week ${league.currentWeek} of ${league.totalWeeks}`;
    }
    if (league.status === 'playoffs') {
      return 'Playoffs in progress';
    }
    if (league.status === 'completed') {
      return `Ended ${formatDate(league.endDate)}`;
    }
    return '';
  };

  // Format skill level
  const formatSkillLevel = () => {
    if (league.skillLevelMin && league.skillLevelMax) {
      return `${league.skillLevelMin.toFixed(1)}-${league.skillLevelMax.toFixed(1)}`;
    }
    if (league.skillLevelMin) {
      return `${league.skillLevelMin.toFixed(1)}+`;
    }
    return 'All Levels';
  };

  const statusBadge = getStatusBadge(league.status);

  return (
    <Link href={`/leagues/${league.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-pickle-300 dark:hover:border-pickle-700 hover:shadow-md transition-all cursor-pointer">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {league.name}
              </h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full">
                {formatLeagueType(league.leagueType)}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
              {league.isDuprRated && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  DUPR
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {getProgressText()}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {league.currentTeams}/{league.maxTeams} {league.leagueType === 'singles' || league.leagueType === 'ladder' ? 'players' : 'teams'}
              </div>
              {league.venue && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {league.venue.name}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {formatSkillLevel()}
              </div>
            </div>

            {/* User standing if registered */}
            {league.isUserRegistered && league.userStanding && (
              <div className="mt-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-pickle-500" />
                <span className="text-sm font-medium text-pickle-600 dark:text-pickle-400">
                  Your position: {league.userStanding} of {league.currentTeams}
                </span>
              </div>
            )}
          </div>

          {/* Action Area */}
          <div className="flex items-center gap-3 lg:flex-shrink-0">
            {league.isUserRegistered ? (
              <span className="px-3 py-1.5 text-sm font-medium bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-lg">
                Joined
              </span>
            ) : league.status === 'registration' && league.currentTeams < league.maxTeams ? (
              <span className="px-3 py-1.5 text-sm font-medium bg-pickle-500 text-white rounded-lg">
                Register Now
              </span>
            ) : null}
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </Link>
  );
}
