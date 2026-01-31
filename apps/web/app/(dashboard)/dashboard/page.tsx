'use client';

import Link from 'next/link';
import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  ChevronRight,
  Activity,
  Plus,
  Gamepad2,
  MapPin,
  Search,
} from 'lucide-react';

import { useAuth, useRecentGames, useUserStats, useLeagues, useUpcomingTournaments } from '@/hooks';

// Types for API responses
interface UserStats {
  gamesPlayed: number;
  gamesPlayedThisWeek?: number;
  wins: number;
  losses: number;
  winRate: number;
  winRateChange?: number;
  skillRating: number;
  skillRatingChange?: number;
  playingPartners: number;
  newPartnersThisMonth?: number;
  tournamentsParticipated: number;
  tournamentsThisYear?: number;
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

interface GamesResponse {
  data: Game[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface League {
  id: string;
  name: string;
  leagueType: string;
  status: string;
  currentWeek: number | null;
  totalWeeks: number;
  currentTeams: number;
  maxTeams: number;
  startDate: string;
  isUserRegistered?: boolean;
}

interface LeaguesResponse {
  leagues: League[];
  total: number;
}

interface Tournament {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  venue?: string;
  registrationDeadline?: string;
  status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
  currentParticipants: number;
  maxParticipants: number;
  entryFee?: number;
  isUserRegistered?: boolean;
}

interface TournamentsResponse {
  tournaments: Tournament[];
  total: number;
}

export default function DashboardPage() {
  const { profile, fullName, isLoaded: isAuthLoaded } = useAuth();

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

  // Fetch leagues
  const {
    data: leaguesResponse,
    isLoading: isLeaguesLoading,
    error: leaguesError,
  } = useLeagues({ limit: 5 });

  // Fetch upcoming tournaments
  const {
    data: tournamentsResponse,
    isLoading: isTournamentsLoading,
    error: tournamentsError,
  } = useUpcomingTournaments();

  // Type the responses
  const typedStats = stats as UserStats | undefined;
  const typedGamesResponse = gamesResponse as GamesResponse | undefined;
  const typedLeaguesResponse = leaguesResponse as LeaguesResponse | undefined;
  const typedTournamentsResponse = tournamentsResponse as TournamentsResponse | undefined;

  const games = typedGamesResponse?.data || [];
  const leagues = typedLeaguesResponse?.leagues || [];
  const tournaments = typedTournamentsResponse?.tournaments || [];

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
            Here&apos;s your Paddle Up dashboard
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
              icon={<Gamepad2 className="w-5 h-5" />}
              label="Games Played"
              value="0"
              change="Start playing!"
              trend="neutral"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Win/Loss"
              value="0-0"
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
              icon={<Trophy className="w-5 h-5" />}
              label="Tournaments"
              value="0"
              change="Join a tournament"
              trend="neutral"
            />
          </>
        ) : (
          // Real data
          <>
            <StatCard
              icon={<Gamepad2 className="w-5 h-5" />}
              label="Games Played"
              value={String(typedStats?.gamesPlayed || 0)}
              change={typedStats?.gamesPlayedThisWeek
                ? `+${typedStats.gamesPlayedThisWeek} this week`
                : 'No games this week'}
              trend={typedStats?.gamesPlayedThisWeek && typedStats.gamesPlayedThisWeek > 0 ? 'up' : 'neutral'}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Win/Loss"
              value={typedStats?.gamesPlayed && typedStats.gamesPlayed > 0
                ? `${typedStats.wins || 0}-${typedStats.losses || 0}`
                : '0-0'}
              change={typedStats?.gamesPlayed && typedStats.gamesPlayed > 0
                ? `${Math.round((typedStats.winRate || 0) * 100)}% win rate`
                : 'Play to track'}
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
              icon={<Trophy className="w-5 h-5" />}
              label="Tournaments"
              value={String(typedStats?.tournamentsParticipated || 0)}
              change={typedStats?.tournamentsThisYear
                ? `${typedStats.tournamentsThisYear} this year`
                : 'Join a tournament'}
              trend={typedStats?.tournamentsThisYear && typedStats.tournamentsThisYear > 0 ? 'up' : 'neutral'}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <QuickActionCard
          href="/games/new"
          icon={<Plus className="w-6 h-6" />}
          title="Log Game"
          description="Record your latest match"
          color="pickle"
        />
        <QuickActionCard
          href="/tournaments/new"
          icon={<Trophy className="w-6 h-6" />}
          title="Create Tournament"
          description="Organize a competition"
          color="ball"
        />
        <QuickActionCard
          href="/tournaments"
          icon={<Search className="w-6 h-6" />}
          title="Browse Tournaments"
          description="Find events near you"
          color="court"
        />
        <QuickActionCard
          href="/leagues"
          icon={<Users className="w-6 h-6" />}
          title="Join League"
          description="Weekly organized play"
          color="pickle"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Games */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
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
              icon={<Gamepad2 className="w-12 h-12" />}
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
              icon={<Gamepad2 className="w-12 h-12" />}
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

        {/* Upcoming Tournaments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Upcoming Tournaments
            </h2>
            <Link
              href="/tournaments"
              className="text-sm text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isTournamentsLoading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <TournamentRowSkeleton />
              <TournamentRowSkeleton />
              <TournamentRowSkeleton />
            </div>
          ) : tournamentsError ? (
            <EmptyState
              icon={<Trophy className="w-12 h-12" />}
              title="Couldn't load tournaments"
              description="There was an error loading tournaments."
              action={
                <button
                  onClick={() => window.location.reload()}
                  className="text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 font-medium"
                >
                  Try again
                </button>
              }
            />
          ) : tournaments.length === 0 ? (
            <EmptyState
              icon={<Trophy className="w-12 h-12" />}
              title="No upcoming tournaments"
              description="Check back later or create your own tournament!"
              action={
                <Link
                  href="/tournaments/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Tournament
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tournaments.slice(0, 4).map((tournament) => (
                <TournamentRow key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Content Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Leagues */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              My Leagues
            </h2>
            <Link
              href="/leagues"
              className="text-sm text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300 flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLeaguesLoading ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <LeagueRowSkeleton />
              <LeagueRowSkeleton />
            </div>
          ) : leaguesError ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="Couldn't load leagues"
              description="There was an error loading leagues."
              action={
                <button
                  onClick={() => window.location.reload()}
                  className="text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 font-medium"
                >
                  Try again
                </button>
              }
            />
          ) : leagues.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="No leagues yet"
              description="Join a league to compete in organized play."
              action={
                <Link
                  href="/leagues"
                  className="text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 font-medium"
                >
                  Browse Leagues
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {leagues.slice(0, 3).map((league) => (
                <LeagueRow key={league.id} league={league} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Tips / Getting Started */}
        <div className="bg-gradient-to-br from-pickle-50 to-ball-50 dark:from-pickle-900/20 dark:to-ball-900/20 rounded-xl shadow-sm border border-pickle-200 dark:border-pickle-800">
          <div className="p-4 border-b border-pickle-200 dark:border-pickle-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Get More from Paddle Up
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <TipCard
              icon={<Gamepad2 className="w-5 h-5" />}
              title="Track Your Progress"
              description="Log games after each match to see your improvement over time."
              href="/games/new"
            />
            <TipCard
              icon={<Trophy className="w-5 h-5" />}
              title="Compete in Tournaments"
              description="Join local tournaments to challenge yourself and meet players."
              href="/tournaments"
            />
            <TipCard
              icon={<Users className="w-5 h-5" />}
              title="Find Your Crew"
              description="Connect with players at your skill level through leagues."
              href="/leagues"
            />
          </div>
        </div>
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

function LeagueRow({ league }: { league: League }) {
  const statusColors: Record<string, string> = {
    registration: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    playoffs: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  const statusLabels: Record<string, string> = {
    registration: 'Registration',
    active: 'Active',
    playoffs: 'Playoffs',
    completed: 'Completed',
  };

  const formatLeagueType = (type: string | undefined | null) => {
    if (!type) return 'League';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getProgressText = () => {
    if (league.status === 'active' && league.currentWeek && league.totalWeeks) {
      return `Week ${league.currentWeek}/${league.totalWeeks}`;
    }
    if (league.status === 'registration') {
      return `${league.currentTeams}/${league.maxTeams} teams`;
    }
    return `${league.currentTeams} teams`;
  };

  return (
    <Link href={`/leagues/${league.id}`}>
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {league.name}
              </p>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[league.status] || statusColors.active}`}
              >
                {statusLabels[league.status] || league.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatLeagueType(league.leagueType)} &middot; {getProgressText()}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}

function LeagueRowSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

function TournamentRow({ tournament }: { tournament: Tournament }) {
  const statusColors: Record<string, string> = {
    registration: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  const statusLabels: Record<string, string> = {
    registration: 'Open',
    active: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    draft: 'Coming Soon',
  };

  const formatTournamentDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getSpotsText = () => {
    const available = tournament.maxParticipants - tournament.currentParticipants;
    if (available <= 0) return 'Full';
    if (available <= 5) return `${available} spots left`;
    return `${tournament.currentParticipants}/${tournament.maxParticipants}`;
  };

  return (
    <Link href={`/tournaments/${tournament.id}`}>
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {tournament.name}
              </p>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[tournament.status] || statusColors.registration}`}
              >
                {statusLabels[tournament.status] || tournament.status}
              </span>
              {tournament.isUserRegistered && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-pickle-100 text-pickle-700 dark:bg-pickle-900/30 dark:text-pickle-400">
                  Registered
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatTournamentDate(tournament.startDate)}
              </span>
              {tournament.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{tournament.location}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {getSpotsText()}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
        </div>
      </div>
    </Link>
  );
}

function TournamentRowSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 transition-colors"
    >
      <div className="p-2 rounded-lg bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white text-sm">
          {title}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
          {description}
        </p>
      </div>
    </Link>
  );
}
