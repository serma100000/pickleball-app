'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Trophy,
  Star,
  TrendingUp,
  Clock,
  Award,
  Settings,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Play,
  Edit,
  UserPlus,
  UserMinus,
  Swords,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useLeague, useLeagueStandings, useLeagueSchedule, useRegisterForLeague } from '@/hooks/use-api';

// Type definitions
type LeagueType = 'ladder' | 'round_robin' | 'doubles' | 'mixed_doubles' | 'singles';
type LeagueStatus = 'registration' | 'active' | 'playoffs' | 'completed';
type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'forfeited';

interface LeaguePlayer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rating: number | null;
}

interface LeagueTeam {
  id: string;
  name: string;
  players: LeaguePlayer[];
  registrationStatus: 'pending' | 'confirmed' | 'waitlist';
}

interface Standing {
  rank: number;
  teamId: string;
  teamName: string;
  players: LeaguePlayer[];
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  streak?: string;
  isCurrentUser?: boolean;
}

interface LeagueMatch {
  id: string;
  week: number;
  scheduledAt: string;
  status: MatchStatus;
  team1: {
    id: string;
    name: string;
    players: LeaguePlayer[];
  };
  team2: {
    id: string;
    name: string;
    players: LeaguePlayer[];
  };
  scores: Array<{ team1: number; team2: number }> | null;
  winningTeamId: string | null;
  court?: string;
  isUserMatch?: boolean;
}

interface PlayoffMatch {
  id: string;
  round: number;
  matchNumber: number;
  team1: {
    id: string;
    name: string;
    seed?: number;
  } | null;
  team2: {
    id: string;
    name: string;
    seed?: number;
  } | null;
  winnerId: string | null;
  scores: Array<{ team1: number; team2: number }> | null;
  status: MatchStatus;
}

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
  hasPlayoffs: boolean;
  playoffTeams: number | null;
  skillLevelMin: number | null;
  skillLevelMax: number | null;
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
  } | null;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
  };
  rules: string | null;
  isUserRegistered: boolean;
  isUserAdmin: boolean;
  userTeamId: string | null;
  teams: LeagueTeam[];
}

type Tab = 'overview' | 'standings' | 'schedule' | 'players' | 'playoffs';

export default function LeagueDetailPage() {
  const params = useParams();
  const leagueId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const { data: league, isLoading, isError, error } = useLeague(leagueId);
  const { data: standings } = useLeagueStandings(leagueId);
  const { data: schedule } = useLeagueSchedule(leagueId);
  const registerMutation = useRegisterForLeague();

  // Cast data to expected types
  const leagueData = league as League | undefined;
  const standingsData = standings as { standings: Standing[]; week?: number } | undefined;
  const scheduleData = schedule as { matches: LeagueMatch[]; playoffs?: PlayoffMatch[] } | undefined;

  // Set default selected week
  if (selectedWeek === null && leagueData?.currentWeek) {
    setSelectedWeek(leagueData.currentWeek);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-pickle-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading league details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !leagueData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            League not found
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error instanceof Error ? error.message : 'The league you are looking for does not exist or has been removed.'}
          </p>
          <Link
            href="/leagues"
            className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leagues
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

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

  const getStatusBadge = (status: LeagueStatus) => {
    const styles: Record<LeagueStatus, { bg: string; text: string; label: string }> = {
      registration: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'Registration Open',
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

  const handleRegister = async () => {
    try {
      await registerMutation.mutateAsync({ leagueId, data: {} });
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const statusBadge = getStatusBadge(leagueData.status);

  // Filter matches by selected week
  const weekMatches = scheduleData?.matches.filter(m => m.week === selectedWeek) ?? [];

  // Determine available tabs
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'standings', label: 'Standings', show: leagueData.status !== 'registration' },
    { key: 'schedule', label: 'Schedule', show: true },
    { key: 'players', label: 'Players', show: true },
    { key: 'playoffs', label: 'Playoffs', show: leagueData.hasPlayoffs && (leagueData.status === 'playoffs' || leagueData.status === 'completed') },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/leagues"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Leagues
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {leagueData.name}
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full">
                {formatLeagueType(leagueData.leagueType)}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
              {leagueData.isDuprRated && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  DUPR Rated
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
              {leagueData.venue && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {leagueData.venue.name}{leagueData.venue.city && `, ${leagueData.venue.city}`}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {leagueData.currentTeams}/{leagueData.maxTeams} {leagueData.leagueType === 'singles' || leagueData.leagueType === 'ladder' ? 'players' : 'teams'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(leagueData.startDate)} - {formatDate(leagueData.endDate)}
              </div>
              {leagueData.currentWeek && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Week {leagueData.currentWeek} of {leagueData.totalWeeks}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {leagueData.isUserRegistered ? (
              <button className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
                <UserMinus className="w-4 h-4" />
                Leave League
              </button>
            ) : leagueData.status === 'registration' && leagueData.currentTeams < leagueData.maxTeams ? (
              <button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {registerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Join League
              </button>
            ) : null}

            {leagueData.isUserAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showAdminMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edit League
                    </button>
                    {leagueData.status === 'registration' && (
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Start League
                      </button>
                    )}
                    {leagueData.status === 'active' && leagueData.hasPlayoffs && (
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Start Playoffs
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.filter(t => t.show).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-pickle-500 text-pickle-600 dark:text-pickle-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab league={leagueData} />
        )}

        {activeTab === 'standings' && (
          <StandingsTab
            league={leagueData}
            standings={standingsData?.standings ?? []}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            league={leagueData}
            matches={weekMatches}
            selectedWeek={selectedWeek ?? 1}
            onWeekChange={setSelectedWeek}
            expandedMatchId={expandedMatchId}
            onMatchToggle={(id) => setExpandedMatchId(expandedMatchId === id ? null : id)}
          />
        )}

        {activeTab === 'players' && (
          <PlayersTab league={leagueData} />
        )}

        {activeTab === 'playoffs' && (
          <PlayoffsTab
            playoffMatches={scheduleData?.playoffs ?? []}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ league }: { league: League }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFormatExplanation = (type: LeagueType): string => {
    const explanations: Record<LeagueType, string> = {
      ladder: 'Players are ranked and can challenge those above them. Win a challenge to swap positions. Defend your rank against challengers below you.',
      round_robin: 'Every team plays against every other team once. Final standings are determined by total wins and point differential.',
      doubles: 'Teams of two compete in a bracket or round-robin format. Partners play together throughout the season.',
      mixed_doubles: 'Teams consist of one male and one female player. Standard doubles rules apply with mixed gender pairings.',
      singles: 'Individual players compete against each other. No partners or teams involved.',
    };
    return explanations[type];
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            About This League
          </h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {league.description || 'No description provided for this league.'}
          </p>
        </div>

        {/* Format Explanation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            League Format
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {getFormatExplanation(league.leagueType)}
          </p>
          {league.rules && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Additional Rules</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm">
                {league.rules}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Key Dates */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Key Dates
          </h3>
          <div className="space-y-4">
            {league.registrationDeadline && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Registration Deadline</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(league.registrationDeadline)}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Play className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Season Start</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(league.startDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Season End</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(league.endDate)}</p>
              </div>
            </div>
            {league.hasPlayoffs && (
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Playoffs</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Top {league.playoffTeams} teams qualify</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* League Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            League Details
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Capacity</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {league.currentTeams}/{league.maxTeams} {league.leagueType === 'singles' || league.leagueType === 'ladder' ? 'players' : 'teams'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Duration</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{league.totalWeeks} weeks</p>
              </div>
            </div>
            {(league.skillLevelMin || league.skillLevelMax) && (
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Skill Level</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {league.skillLevelMin && league.skillLevelMax
                      ? `${league.skillLevelMin.toFixed(1)} - ${league.skillLevelMax.toFixed(1)}`
                      : league.skillLevelMin
                        ? `${league.skillLevelMin.toFixed(1)}+`
                        : 'All Levels'}
                  </p>
                </div>
              </div>
            )}
            {league.isDuprRated && (
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">DUPR Rating</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Games are DUPR rated</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Organizer */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Organizer
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center">
              <span className="text-pickle-700 dark:text-pickle-400 font-medium">
                {(league.creator.displayName || league.creator.username).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {league.creator.displayName || league.creator.username}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">League Creator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Standings Tab Component
function StandingsTab({ league, standings }: { league: League; standings: Standing[] }) {
  if (league.leagueType === 'ladder') {
    return <LadderRankings players={standings} />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Team
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                W
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                L
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PF
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PA
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                +/-
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Streak
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {standings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No standings available yet. Check back after matches have been played.
                </td>
              </tr>
            ) : (
              standings.map((standing) => (
                <tr
                  key={standing.teamId}
                  className={`${
                    standing.isCurrentUser
                      ? 'bg-pickle-50 dark:bg-pickle-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      standing.rank === 1
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : standing.rank === 2
                          ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                          : standing.rank === 3
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {standing.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {standing.teamName}
                        {standing.isCurrentUser && (
                          <span className="ml-2 text-xs text-pickle-600 dark:text-pickle-400">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {standing.players.map(p => p.displayName || p.username).join(' & ')}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-green-600 dark:text-green-400">
                    {standing.wins}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-red-600 dark:text-red-400">
                    {standing.losses}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {standing.pointsFor}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {standing.pointsAgainst}
                  </td>
                  <td className={`px-4 py-3 text-center font-medium ${
                    standing.pointDiff > 0
                      ? 'text-green-600 dark:text-green-400'
                      : standing.pointDiff < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {standing.pointDiff > 0 ? `+${standing.pointDiff}` : standing.pointDiff}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {standing.streak || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Ladder Rankings Component
function LadderRankings({ players }: { players: Standing[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Ladder Rankings</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Challenge players up to 3 positions above you
        </p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {players.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No players ranked yet. Be the first to join!
          </div>
        ) : (
          players.map((player, index) => (
            <div
              key={player.teamId}
              className={`p-4 flex items-center justify-between ${
                player.isCurrentUser ? 'bg-pickle-50 dark:bg-pickle-900/20' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : index === 1
                      ? 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                      : index === 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {player.rank}
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {player.players[0]?.displayName || player.players[0]?.username || player.teamName}
                    {player.isCurrentUser && (
                      <span className="ml-2 text-xs text-pickle-600 dark:text-pickle-400">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {player.wins}W - {player.losses}L
                    {player.players[0]?.rating && ` | Rating: ${player.players[0].rating.toFixed(2)}`}
                  </p>
                </div>
              </div>
              {!player.isCurrentUser && (
                <button className="px-3 py-1.5 text-sm font-medium bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg transition-colors flex items-center gap-1">
                  <Swords className="w-4 h-4" />
                  Challenge
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Schedule Tab Component
function ScheduleTab({
  league,
  matches,
  selectedWeek,
  onWeekChange,
  expandedMatchId,
  onMatchToggle,
}: {
  league: League;
  matches: LeagueMatch[];
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  expandedMatchId: string | null;
  onMatchToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Week Selector */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => onWeekChange(Math.max(1, selectedWeek - 1))}
          disabled={selectedWeek <= 1}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Week {selectedWeek}
          </span>
          {league.currentWeek === selectedWeek && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              Current
            </span>
          )}
        </div>
        <button
          onClick={() => onWeekChange(Math.min(league.totalWeeks, selectedWeek + 1))}
          disabled={selectedWeek >= league.totalWeeks}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {matches.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No matches scheduled for this week</p>
          </div>
        ) : (
          matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              isExpanded={expandedMatchId === match.id}
              onToggle={() => onMatchToggle(match.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Match Card Component
function MatchCard({
  match,
  isExpanded,
  onToggle,
}: {
  match: LeagueMatch;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  const getMatchStatusBadge = (status: MatchStatus) => {
    const styles: Record<MatchStatus, { bg: string; text: string; label: string }> = {
      scheduled: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'Scheduled',
      },
      in_progress: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        label: 'In Progress',
      },
      completed: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        label: 'Completed',
      },
      cancelled: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        label: 'Cancelled',
      },
      forfeited: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        label: 'Forfeited',
      },
    };
    return styles[status];
  };

  const formatScore = () => {
    if (!match.scores || match.scores.length === 0) return null;
    return match.scores.map((s, i) => (
      <span key={i} className="mx-1">
        {s.team1}-{s.team2}
      </span>
    ));
  };

  const { date, time } = formatDateTime(match.scheduledAt);
  const statusBadge = getMatchStatusBadge(match.status);
  const isTeam1Winner = match.winningTeamId === match.team1.id;
  const isTeam2Winner = match.winningTeamId === match.team2.id;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${
      match.isUserMatch ? 'border-pickle-300 dark:border-pickle-700' : 'border-gray-200 dark:border-gray-700'
    } overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
              {match.isUserMatch && (
                <span className="px-2 py-0.5 text-xs font-medium bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full">
                  Your Match
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex-1 ${isTeam1Winner ? 'font-semibold' : ''}`}>
                <p className="text-gray-900 dark:text-white">
                  {match.team1.name}
                  {isTeam1Winner && <Check className="w-4 h-4 inline ml-1 text-green-500" />}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {match.team1.players.map(p => p.displayName || p.username).join(' & ')}
                </p>
              </div>
              <div className="text-center px-4">
                {match.status === 'completed' && match.scores ? (
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatScore()}
                  </p>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500">vs</p>
                )}
              </div>
              <div className={`flex-1 text-right ${isTeam2Winner ? 'font-semibold' : ''}`}>
                <p className="text-gray-900 dark:text-white">
                  {isTeam2Winner && <Check className="w-4 h-4 inline mr-1 text-green-500" />}
                  {match.team2.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {match.team2.players.map(p => p.displayName || p.username).join(' & ')}
                </p>
              </div>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {date}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {time}
          </div>
          {match.court && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {match.court}
            </div>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          {match.status === 'scheduled' && match.isUserMatch ? (
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors">
                Submit Score
              </button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                Report Issue
              </button>
            </div>
          ) : match.status === 'completed' && match.scores ? (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Game Scores</h4>
              <div className="flex gap-2">
                {match.scores.map((score, i) => (
                  <div key={i} className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Game {i + 1}</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{score.team1} - {score.team2}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Match details will be available after the game.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Players Tab Component
function PlayersTab({ league }: { league: League }) {
  const confirmedTeams = league.teams.filter(t => t.registrationStatus === 'confirmed');
  const pendingTeams = league.teams.filter(t => t.registrationStatus === 'pending');
  const waitlistTeams = league.teams.filter(t => t.registrationStatus === 'waitlist');

  const TeamList = ({ teams, title, emptyMessage }: { teams: LeagueTeam[]; title: string; emptyMessage: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{teams.length} {teams.length === 1 ? 'team' : 'teams'}</p>
      </div>
      {teams.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {teams.map((team) => (
            <div key={team.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{team.name}</p>
                  <div className="flex items-center gap-4 mt-1">
                    {team.players.map((player) => (
                      <div key={player.id} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-6 h-6 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center">
                          <span className="text-xs text-pickle-700 dark:text-pickle-400 font-medium">
                            {(player.displayName || player.username).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {player.displayName || player.username}
                        {player.rating && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                            {player.rating.toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <TeamList
        teams={confirmedTeams}
        title="Confirmed Players"
        emptyMessage="No confirmed players yet"
      />
      {pendingTeams.length > 0 && (
        <TeamList
          teams={pendingTeams}
          title="Pending Confirmation"
          emptyMessage="No pending players"
        />
      )}
      {waitlistTeams.length > 0 && (
        <TeamList
          teams={waitlistTeams}
          title="Waitlist"
          emptyMessage="No players on waitlist"
        />
      )}
    </div>
  );
}

// Playoffs Tab Component
function PlayoffsTab({ playoffMatches }: { playoffMatches: PlayoffMatch[] }) {
  // Group matches by round
  const rounds: Record<number, PlayoffMatch[]> = {};
  playoffMatches.forEach((match) => {
    if (!rounds[match.round]) {
      rounds[match.round] = [];
    }
    rounds[match.round]!.push(match);
  });

  const getRoundName = (round: number, totalRounds: number) => {
    if (round === totalRounds) return 'Finals';
    if (round === totalRounds - 1) return 'Semifinals';
    if (round === totalRounds - 2) return 'Quarterfinals';
    return `Round ${round}`;
  };

  const roundKeys = Object.keys(rounds).map(Number);
  const totalRounds = roundKeys.length > 0 ? Math.max(...roundKeys) : 0;

  if (playoffMatches.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Playoffs Coming Soon
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          The playoff bracket will be available once the regular season ends.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Playoff Bracket
      </h3>

      {/* Bracket Visualization */}
      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {Object.keys(rounds).sort((a, b) => Number(a) - Number(b)).map((roundNum) => {
            const roundMatches = rounds[Number(roundNum)] ?? [];
            return (
              <div key={roundNum} className="flex flex-col gap-4">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                  {getRoundName(Number(roundNum), totalRounds)}
                </h4>
                <div className="flex flex-col gap-4 justify-around flex-1">
                  {roundMatches.map((match) => (
                    <PlayoffMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Playoff Match Card Component
function PlayoffMatchCard({ match }: { match: PlayoffMatch }) {
  const isTeam1Winner = match.winnerId === match.team1?.id;
  const isTeam2Winner = match.winnerId === match.team2?.id;

  return (
    <div className="w-48 bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
      {/* Team 1 */}
      <div className={`p-2 border-b border-gray-200 dark:border-gray-600 ${
        isTeam1Winner ? 'bg-green-50 dark:bg-green-900/20' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {match.team1?.seed && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {match.team1.seed}
              </span>
            )}
            <span className={`text-sm ${isTeam1Winner ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              {match.team1?.name || 'TBD'}
            </span>
          </div>
          {isTeam1Winner && <Check className="w-4 h-4 text-green-500" />}
        </div>
      </div>

      {/* Team 2 */}
      <div className={`p-2 ${
        isTeam2Winner ? 'bg-green-50 dark:bg-green-900/20' : ''
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {match.team2?.seed && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {match.team2.seed}
              </span>
            )}
            <span className={`text-sm ${isTeam2Winner ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              {match.team2?.name || 'TBD'}
            </span>
          </div>
          {isTeam2Winner && <Check className="w-4 h-4 text-green-500" />}
        </div>
      </div>

      {/* Score */}
      {match.status === 'completed' && match.scores && (
        <div className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-center">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {match.scores.map(s => `${s.team1}-${s.team2}`).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
}
