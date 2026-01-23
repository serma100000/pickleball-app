'use client';

import Link from 'next/link';
import {
  MapPin,
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  ChevronRight,
  Activity,
  Plus,
} from 'lucide-react';

import { useAuth, useRecentGames, useUserStats, useNearbyCourts, useGeolocation } from '@/hooks';

// Types for API responses
interface UserStats {
  gamesPlayed: number;
  gamesPlayedThisWeek?: number;
  winRate: number;
  winRateChange?: number;
  skillRating: number;
  skillRatingChange?: number;
  playingPartners: number;
  newPartnersThisMonth?: number;
}

interface Game {
  id: string;
  gameType: 'singles' | 'doubles';
  result: 'won' | 'lost';
  scores: { team1: number; team2: number }[];
  opponent?: string;
  opponents?: string[];
  playedAt: string;
}

interface Court {
  id: string;
  name: string;
  distance?: number;
  numberOfCourts: number;
  averageRating?: number;
  currentStatus?: 'open' | 'busy' | 'closed';
}

interface GamesResponse {
  data: Game[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface CourtsResponse {
  data: Court[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export default function DashboardPage() {
  const { profile, fullName, isLoaded: isAuthLoaded } = useAuth();
  const { latitude, longitude, error: geoError } = useGeolocation();

  // Fetch user stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    error: statsError,
  } = useUserStats(profile?.id || '');

  // Fetch recent games
  const {
    data: gamesResponse,
    isLoading: isGamesLoading,
    error: gamesError,
  } = useRecentGames();

  // Fetch nearby courts (only if we have location)
  const {
    data: courtsResponse,
    isLoading: isCourtsLoading,
    error: courtsError,
  } = useNearbyCourts(latitude || 0, longitude || 0, 10);

  // Type the responses
  const typedStats = stats as UserStats | undefined;
  const typedGamesResponse = gamesResponse as GamesResponse | undefined;
  const typedCourtsResponse = courtsResponse as CourtsResponse | undefined;

  const games = typedGamesResponse?.data || [];
  const courts = typedCourtsResponse?.data || [];

  // Format relative date
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Format score from array
  const formatScore = (scores: { team1: number; team2: number }[]): string => {
    return scores.map(s => `${s.team1}-${s.team2}`).join(', ');
  };

  // Format opponents for display
  const formatOpponents = (game: Game): string => {
    if (game.gameType === 'singles' && game.opponent) {
      return `vs. ${game.opponent}`;
    }
    if (game.gameType === 'doubles' && game.opponents) {
      return `vs. ${game.opponents.join(' & ')}`;
    }
    return 'vs. Unknown';
  };

  // Format distance
  const formatDistance = (distance?: number): string => {
    if (!distance) return 'Unknown distance';
    if (distance < 1) return `${Math.round(distance * 5280)} ft`;
    return `${distance.toFixed(1)} mi`;
  };

  // Get greeting based on time of day
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = fullName || profile?.firstName || 'Player';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {displayName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Here&apos;s what&apos;s happening in your pickleball world
          </p>
        </div>
        <Link
          href="/games/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
        >
          <Trophy className="w-4 h-4" />
          Log New Game
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isStatsLoading || !isAuthLoaded ? (
          // Loading skeletons
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : statsError ? (
          // Error state - show zeros
          <>
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="Games Played"
              value="0"
              change="Start playing!"
              trend="neutral"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Win Rate"
              value="--"
              change="Play a game"
              trend="neutral"
            />
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label="Skill Rating"
              value="--"
              change="Not rated yet"
              trend="neutral"
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Playing Partners"
              value="0"
              change="Find partners"
              trend="neutral"
            />
          </>
        ) : (
          // Real data
          <>
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="Games Played"
              value={String(typedStats?.gamesPlayed || 0)}
              change={typedStats?.gamesPlayedThisWeek
                ? `+${typedStats.gamesPlayedThisWeek} this week`
                : 'No games this week'}
              trend={typedStats?.gamesPlayedThisWeek && typedStats.gamesPlayedThisWeek > 0 ? 'up' : 'neutral'}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Win Rate"
              value={typedStats?.gamesPlayed && typedStats.gamesPlayed > 0
                ? `${Math.round(typedStats.winRate * 100)}%`
                : '--'}
              change={typedStats?.winRateChange
                ? `${typedStats.winRateChange > 0 ? '+' : ''}${Math.round(typedStats.winRateChange * 100)}% this month`
                : 'Play more to track'}
              trend={typedStats?.winRateChange && typedStats.winRateChange > 0 ? 'up' :
                     typedStats?.winRateChange && typedStats.winRateChange < 0 ? 'down' : 'neutral'}
            />
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label="Skill Rating"
              value={typedStats?.skillRating ? typedStats.skillRating.toFixed(2) : '--'}
              change={typedStats?.skillRatingChange
                ? `${typedStats.skillRatingChange > 0 ? '+' : ''}${typedStats.skillRatingChange.toFixed(2)} since last`
                : 'Not rated yet'}
              trend={typedStats?.skillRatingChange && typedStats.skillRatingChange > 0 ? 'up' :
                     typedStats?.skillRatingChange && typedStats.skillRatingChange < 0 ? 'down' : 'neutral'}
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="Playing Partners"
              value={String(typedStats?.playingPartners || 0)}
              change={typedStats?.newPartnersThisMonth
                ? `${typedStats.newPartnersThisMonth} new this month`
                : 'Invite friends'}
              trend={typedStats?.newPartnersThisMonth && typedStats.newPartnersThisMonth > 0 ? 'up' : 'neutral'}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          href="/courts"
          icon={<MapPin className="w-6 h-6" />}
          title="Find Courts"
          description="Discover nearby courts"
          color="pickle"
        />
        <QuickActionCard
          href="/games/new"
          icon={<Trophy className="w-6 h-6" />}
          title="Log Game"
          description="Record your latest match"
          color="ball"
        />
        <QuickActionCard
          href="/clubs"
          icon={<Users className="w-6 h-6" />}
          title="Join Club"
          description="Find your community"
          color="court"
        />
        <QuickActionCard
          href="/tournaments"
          icon={<Calendar className="w-6 h-6" />}
          title="Tournaments"
          description="Browse upcoming events"
          color="pickle"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Games */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Recent Games
            </h2>
            <Link
              href="/games"
              className="text-sm text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isGamesLoading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <GameRowSkeleton />
              <GameRowSkeleton />
              <GameRowSkeleton />
            </div>
          ) : gamesError ? (
            <EmptyState
              icon={<Trophy className="w-12 h-12" />}
              title="Couldn't load games"
              description="There was an error loading your recent games."
              action={
                <button
                  onClick={() => window.location.reload()}
                  className="text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 font-medium"
                >
                  Try again
                </button>
              }
            />
          ) : games.length === 0 ? (
            <EmptyState
              icon={<Trophy className="w-12 h-12" />}
              title="No games yet"
              description="Log your first game to start tracking your progress!"
              action={
                <Link
                  href="/games/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Log Your First Game
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {games.slice(0, 5).map((game) => (
                <GameRow
                  key={game.id}
                  opponent={formatOpponents(game)}
                  result={game.result === 'won' ? 'Won' : 'Lost'}
                  score={formatScore(game.scores)}
                  date={formatRelativeDate(game.playedAt)}
                  type={game.gameType === 'singles' ? 'Singles' : 'Doubles'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events - Keep static for now */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Upcoming
            </h2>
            <Link
              href="/leagues"
              className="text-sm text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="No upcoming events"
            description="Join a league or register for a tournament to see your schedule."
            action={
              <Link
                href="/tournaments"
                className="text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 font-medium"
              >
                Browse Tournaments
              </Link>
            }
          />
        </div>
      </div>

      {/* Nearby Courts Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Nearby Courts
          </h2>
          <Link
            href="/courts"
            className="text-sm text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300 flex items-center gap-1"
          >
            View map
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isCourtsLoading ? (
          <div className="grid md:grid-cols-3 gap-4 p-4">
            <CourtCardSkeleton />
            <CourtCardSkeleton />
            <CourtCardSkeleton />
          </div>
        ) : geoError || courtsError ? (
          <EmptyState
            icon={<MapPin className="w-12 h-12" />}
            title={geoError ? "Location access needed" : "Couldn't load courts"}
            description={geoError
              ? "Enable location access to find courts near you."
              : "There was an error loading nearby courts."}
            action={
              <Link
                href="/courts"
                className="text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 font-medium"
              >
                Browse All Courts
              </Link>
            }
          />
        ) : courts.length === 0 ? (
          <EmptyState
            icon={<MapPin className="w-12 h-12" />}
            title="No courts nearby"
            description="We couldn't find any courts in your area. Try expanding your search."
            action={
              <Link
                href="/courts"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Find Courts
              </Link>
            }
          />
        ) : (
          <div className="grid md:grid-cols-3 gap-4 p-4">
            {courts.slice(0, 3).map((court) => (
              <CourtCard
                key={court.id}
                name={court.name}
                distance={formatDistance(court.distance)}
                courts={court.numberOfCourts}
                rating={court.averageRating || 0}
                status={court.currentStatus || 'open'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400">
          {icon}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div
        className={`text-sm ${
          trend === 'up'
            ? 'text-green-600 dark:text-green-400'
            : trend === 'down'
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {change}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'pickle' | 'ball' | 'court';
}) {
  const colorClasses = {
    pickle: 'bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400',
    ball: 'bg-ball-100 dark:bg-ball-900/30 text-ball-600 dark:text-ball-400',
    court: 'bg-court-100 dark:bg-court-900/30 text-court-600 dark:text-court-400',
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors"
    >
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
      <div>
        <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </Link>
  );
}

function GameRow({
  opponent,
  result,
  score,
  date,
  type,
}: {
  opponent: string;
  result: 'Won' | 'Lost';
  score: string;
  date: string;
  type: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            result === 'Won' ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{opponent}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {type} &middot; {score}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span
          className={`text-sm font-medium ${
            result === 'Won'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {result}
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-400">{date}</p>
      </div>
    </div>
  );
}

function GameRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="text-gray-300 dark:text-gray-600 mb-3">{icon}</div>
      <h3 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
        {description}
      </p>
      {action}
    </div>
  );
}

function CourtCard({
  name,
  distance,
  courts,
  rating,
  status,
}: {
  name: string;
  distance: string;
  courts: number;
  rating: number;
  status: 'open' | 'busy' | 'closed';
}) {
  const statusColors = {
    open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    busy: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusLabels = {
    open: 'Open',
    busy: 'Busy',
    closed: 'Closed',
  };

  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-white">{name}</h3>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>
      <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
        <p>{distance} away</p>
        <p>{courts} court{courts !== 1 ? 's' : ''}</p>
        {rating > 0 && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {rating.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}

function CourtCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="h-5 w-12 bg-gray-200 dark:bg-gray-600 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded" />
        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-600 rounded" />
      </div>
    </div>
  );
}
