'use client';

import Link from 'next/link';
import { Plus, Filter, Calendar, Trophy, TrendingUp, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { useGames } from '@/hooks/use-api';
import { useState } from 'react';
import { NoGames } from '@/components/empty-states';
import { GameListSkeleton } from '@/components/skeletons';

// Type definitions for API response
interface GameParticipant {
  id: string;
  userId: string;
  team: number;
  ratingAtGame: string | null;
  ratingChange: string | null;
  isConfirmed: boolean;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface Game {
  id: string;
  gameFormat: 'singles' | 'doubles' | 'mixed_doubles';
  gameType: 'casual' | 'competitive' | 'tournament' | 'league' | 'ladder';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'forfeited';
  scores: Array<{ team1: number; team2: number }> | null;
  winningTeam: number | null;
  isRated: boolean;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  court: {
    id: string;
    name: string;
  } | null;
  venue: {
    id: string;
    name: string;
  } | null;
  participants: GameParticipant[];
}

interface GamesResponse {
  games: Game[];
  total: number;
}


export default function GamesPage() {
  const [page, setPage] = useState(1);
  const [gameTypeFilter] = useState<string | undefined>(undefined);
  const limit = 10;

  const { data, isLoading, isError, error } = useGames({ page, limit, type: gameTypeFilter });

  // Cast the response to our expected type
  const gamesData = data as GamesResponse | undefined;
  const games = gamesData?.games ?? [];
  const total = gamesData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Calculate stats from games data
  const totalGames = total;

  // Note: These stats would ideally come from a dedicated user stats endpoint
  // For now, we'll show placeholder values or compute from available data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Games History
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Track your matches and view your progress
          </p>
        </div>
        <Link
          href="/games/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log New Game
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Games</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : totalGames}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Win Rate</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '--'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Current Streak</div>
          <div className="text-2xl font-bold text-pickle-600 dark:text-pickle-400 mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '--'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Skill Rating</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '--'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Calendar className="w-4 h-4" />
          This Month
          <ChevronDown className="w-4 h-4" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Trophy className="w-4 h-4" />
          All Types
          <ChevronDown className="w-4 h-4" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Loading State */}
      {isLoading && <GameListSkeleton />}

      {/* Error State */}
      {isError && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Failed to load games
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
      {!isLoading && !isError && games.length === 0 && <NoGames />}

      {/* Games List */}
      {!isLoading && !isError && games.length > 0 && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {games.map((game) => (
                <GameRow key={game.id} game={game} />
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
              Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} games
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-sm ${
                  page === 1
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              <div className="hidden sm:flex items-center gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg text-sm ${
                        page === pageNum
                          ? 'bg-pickle-500 text-white'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <span className="sm:hidden text-sm text-gray-600 dark:text-gray-400 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-sm ${
                  page >= totalPages
                    ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GameRow({ game }: { game: Game }) {
  // Determine if user won (simplified - would need current user context)
  const isWin = game.winningTeam === 1; // Placeholder logic

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format score
  const formatScore = () => {
    if (!game.scores || game.scores.length === 0) return 'No score';
    return game.scores
      .map((s) => `${s.team1}-${s.team2}`)
      .join(', ');
  };

  // Get team players
  const team1Players = game.participants
    .filter((p) => p.team === 1)
    .map((p) => p.user.displayName || p.user.username || 'Player');
  const team2Players = game.participants
    .filter((p) => p.team === 2)
    .map((p) => p.user.displayName || p.user.username || 'Player');

  // Calculate rating change (from first participant for simplicity)
  const ratingChange = game.participants[0]?.ratingChange;
  const ratingChangeFormatted = ratingChange
    ? (parseFloat(ratingChange) >= 0 ? `+${ratingChange}` : ratingChange)
    : null;

  // Format game type for display
  const formatGameType = (format: string) => {
    return format
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get display date
  const displayDate = game.completedAt || game.scheduledAt || game.createdAt;

  return (
    <Link href={`/games/${game.id}`} className="block">
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Date & Result */}
          <div className="flex items-center gap-3 md:w-32">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                game.status !== 'completed'
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  : isWin
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {game.status === 'completed' ? (isWin ? 'W' : 'L') : game.status.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(displayDate)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatTime(displayDate)}
              </p>
            </div>
          </div>

          {/* Game Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                {formatGameType(game.gameFormat)}
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatScore()}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {team1Players.join(' & ')}
              </span>
              <span className="text-gray-400 dark:text-gray-500"> vs </span>
              <span className="text-gray-500 dark:text-gray-400">
                {team2Players.join(' & ')}
              </span>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {game.venue?.name || game.court?.name || 'Location not specified'}
            </p>
          </div>

          {/* Rating Change */}
          {ratingChangeFormatted && game.status === 'completed' && (
            <div className="flex items-center gap-2">
              <TrendingUp
                className={`w-4 h-4 ${
                  ratingChangeFormatted.startsWith('+')
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}
              />
              <span
                className={`font-medium ${
                  ratingChangeFormatted.startsWith('+')
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {ratingChangeFormatted}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
