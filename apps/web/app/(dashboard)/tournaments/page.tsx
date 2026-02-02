'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Plus,
  Trophy,
  Calendar,
  Users,
  ChevronRight,
  AlertCircle,
  Edit,
  Eye,
  Trash2,
  BarChart3,
  Megaphone,
  FileDown,
  Play,
  Settings,
  Clock,
  CheckCircle2,
  FileEdit,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { useMyTournaments, useDeleteTournament, usePublishTournament } from '@/hooks/use-api';
import { TournamentListSkeleton } from '@/components/skeletons';
import { NoTournaments, NoTournamentsFiltered } from '@/components/empty-states';
import { toast } from '@/hooks/use-toast';

// Type definitions for tournament management
type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  eventsCount: number;
  registeredParticipants: number;
  maxParticipants: number;
  venue: {
    id: string;
    name: string;
    city: string | null;
  } | null;
  isDirector: boolean;
}

interface TournamentsResponse {
  tournaments: Tournament[];
  total: number;
}

type FilterTab = 'all' | 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';

export default function TournamentsPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const limit = 10;

  // Map tab to API status filter
  const getStatusFilter = () => {
    if (activeTab === 'all') return undefined;
    return activeTab;
  };

  const { getToken } = useAuth();

  const { data, isLoading, isError, error, refetch } = useMyTournaments({
    page,
    limit,
    status: getStatusFilter(),
  });

  const deleteMutation = useDeleteTournament();
  const publishMutation = usePublishTournament();

  // Cast the response to our expected type
  const tournamentsData = data as TournamentsResponse | undefined;
  const tournaments = tournamentsData?.tournaments ?? [];
  const total = tournamentsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Calculate stats from all tournaments (not just current page)
  const stats = {
    total: tournaments.length,
    active: tournaments.filter(t => t.status === 'in_progress').length,
    participants: tournaments.reduce((sum, t) => sum + t.registeredParticipants, 0),
    upcoming: tournaments.filter(t =>
      t.status === 'registration_open' || t.status === 'draft'
    ).length,
  };

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Trophy className="w-4 h-4" /> },
    { key: 'draft', label: 'Draft', icon: <FileEdit className="w-4 h-4" /> },
    { key: 'registration_open', label: 'Registration Open', icon: <UserPlus className="w-4 h-4" /> },
    { key: 'in_progress', label: 'In Progress', icon: <Play className="w-4 h-4" /> },
    { key: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const handleDelete = async (tournamentId: string, tournamentName: string) => {
    if (confirm(`Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`)) {
      try {
        const token = await getToken();
        if (!token) {
          toast.error({
            title: 'Authentication required',
            description: 'Please sign in to delete tournaments.',
          });
          return;
        }
        await deleteMutation.mutateAsync({ token, id: tournamentId });
        refetch();
        toast.success({
          title: 'Tournament deleted',
          description: `"${tournamentName}" has been deleted.`,
        });
      } catch (error) {
        console.error('Failed to delete tournament:', error);
        toast.error({
          title: 'Could not delete tournament',
          description: 'Please try again.',
        });
      }
    }
  };

  const handlePublish = async (tournamentId: string, tournamentName: string) => {
    if (confirm(`Are you sure you want to publish "${tournamentName}"? This will open registration.`)) {
      try {
        await publishMutation.mutateAsync(tournamentId);
        refetch();
        toast.success({
          title: 'Tournament published',
          description: `"${tournamentName}" is now open for registration.`,
        });
      } catch (error) {
        console.error('Failed to publish tournament:', error);
        toast.error({
          title: 'Could not publish tournament',
          description: 'Please try again.',
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Tournaments
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage and run your pickleball tournaments
          </p>
        </div>
        <Link
          href="/tournaments/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Tournament
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-pickle-600 dark:text-pickle-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Tournaments</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.total}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Active Now</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.active}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Participants</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.participants}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.upcoming}
              </div>
            </div>
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
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-pickle-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && <TournamentListSkeleton />}

      {/* Error State */}
      {isError && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Failed to load tournaments
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && tournaments.length === 0 && (
        activeTab === 'all' ? (
          <NoTournaments context="manage" />
        ) : (
          <NoTournamentsFiltered
            filterLabel={tabs.find(t => t.key === activeTab)?.label || activeTab}
            onClearFilter={() => {
              setActiveTab('all');
              setPage(1);
            }}
          />
        )
      )}

      {/* Tournaments List */}
      {!isLoading && !isError && tournaments.length > 0 && (
        <>
          <div className="space-y-4">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onDelete={handleDelete}
                onPublish={handlePublish}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} tournaments
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

function TournamentCard({
  tournament,
  onDelete,
  onPublish,
}: {
  tournament: Tournament;
  onDelete: (id: string, name: string) => void;
  onPublish: (id: string, name: string) => void;
}) {
  // Get status badge styling
  const getStatusBadge = (status: TournamentStatus) => {
    const styles: Record<TournamentStatus, { bg: string; text: string; label: string }> = {
      draft: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        label: 'Draft',
      },
      registration_open: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'Registration Open',
      },
      registration_closed: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        label: 'Registration Closed',
      },
      in_progress: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        label: 'In Progress',
      },
      completed: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-400',
        label: 'Completed',
      },
      cancelled: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        label: 'Cancelled',
      },
    };
    return styles[status];
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format date range
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

    if (startMonth === endMonth && start.getFullYear() === end.getFullYear()) {
      return `${startMonth} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Calculate registration progress
  const registrationProgress = tournament.maxParticipants > 0
    ? (tournament.registeredParticipants / tournament.maxParticipants) * 100
    : 0;

  // Get quick actions based on status
  const getQuickActions = (status: TournamentStatus) => {
    switch (status) {
      case 'draft':
        return (
          <>
            <Link
              href={`/tournaments/${tournament.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => onPublish(tournament.id, tournament.name)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-pickle-500 hover:bg-pickle-600 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Publish
            </button>
            <button
              onClick={() => onDelete(tournament.id, tournament.name)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </>
        );
      case 'registration_open':
        return (
          <>
            <Link
              href={`/tournaments/${tournament.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Users className="w-4 h-4" />
              Registrations
            </Link>
            <Link
              href={`/tournaments/${tournament.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <Link
              href={`/tournaments/${tournament.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            >
              <Clock className="w-4 h-4" />
              Close Registration
            </Link>
          </>
        );
      case 'registration_closed':
        return (
          <>
            <Link
              href={`/tournaments/${tournament.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Users className="w-4 h-4" />
              Registrations
            </Link>
            <Link
              href={`/tournaments/${tournament.id}/start`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-pickle-500 hover:bg-pickle-600 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Tournament
            </Link>
          </>
        );
      case 'cancelled':
        return null;
      case 'in_progress':
        return (
          <>
            <Link
              href={`/tournaments/${tournament.id}/brackets`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Brackets
            </Link>
            <Link
              href={`/tournaments/${tournament.id}/scores`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-pickle-500 hover:bg-pickle-600 rounded-lg transition-colors"
            >
              <Trophy className="w-4 h-4" />
              Enter Scores
            </Link>
            <Link
              href={`/tournaments/${tournament.id}/announcements`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              Announce
            </Link>
          </>
        );
      case 'completed':
        return (
          <>
            <Link
              href={`/tournaments/${tournament.id}/results`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Results
            </Link>
            <Link
              href={`/tournaments/${tournament.id}/export`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Export Data
            </Link>
          </>
        );
      default:
        return null;
    }
  };

  const statusBadge = getStatusBadge(tournament.status);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-pickle-300 dark:hover:border-pickle-700 hover:shadow-md transition-all">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link
              href={`/tournaments/${tournament.id}`}
              className="font-semibold text-gray-900 dark:text-white truncate hover:text-pickle-600 dark:hover:text-pickle-400 transition-colors"
            >
              {tournament.name}
            </Link>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDateRange(tournament.startDate, tournament.endDate)}
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              {tournament.eventsCount} {tournament.eventsCount === 1 ? 'event' : 'events'}
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {tournament.registeredParticipants}/{tournament.maxParticipants} participants
            </div>
          </div>

          {/* Registration Progress */}
          {(tournament.status === 'registration_open' || tournament.status === 'in_progress') && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Registration Progress</span>
                <span>{Math.round(registrationProgress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    registrationProgress >= 90
                      ? 'bg-red-500'
                      : registrationProgress >= 70
                      ? 'bg-yellow-500'
                      : 'bg-pickle-500'
                  }`}
                  style={{ width: `${registrationProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {getQuickActions(tournament.status)}
            <Link
              href={`/tournaments/${tournament.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage
            </Link>
          </div>
        </div>

        {/* View Details Arrow */}
        <Link
          href={`/tournaments/${tournament.id}`}
          className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-pickle-100 dark:hover:bg-pickle-900/30 transition-colors flex-shrink-0"
          aria-label="View tournament details"
        >
          <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>
    </div>
  );
}
