'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Trophy,
  Clock,
  Settings,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Edit,
  Share2,
  Eye,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Copy,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import {
  useTournament,
  useTournamentBracket,
  useTournamentEvents,
  useTournamentRegistrations,
  useTournamentSchedule,
  useUnregisterFromTournament,
  useCheckInRegistration,
  usePublishTournament,
  useDeleteTournament,
} from '@/hooks/use-api';
import { BracketMatch, type Match } from '@/components/tournaments/bracket-match';

// Type definitions
type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
type EventFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play' | 'pool_to_bracket';
type EventCategory = 'singles' | 'doubles' | 'mixed_doubles';
type RegistrationStatus = 'registered' | 'waitlisted' | 'confirmed' | 'withdrawn' | 'disqualified';

interface TournamentEvent {
  id: string;
  name: string | null;
  category: EventCategory;
  skillLevel: string;
  ageGroup: string;
  format: EventFormat;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number | string;
  prizeMoney: number | string;
  scoringFormat: string;
  pointsTo: number;
  poolPlayConfig: unknown;
  seedingConfig: unknown;
  bracketConfig: unknown;
  status: string;
  sortOrder: number;
}

interface Registration {
  id: string;
  eventId: string;
  eventName: string;
  status: RegistrationStatus;
  checkedInAt: string | null;
  createdAt: string;
  player1: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    rating: number | null;
  };
  player2?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    rating: number | null;
  };
  teamName?: string;
  seed?: number;
}

interface ScheduleSlot {
  id: string;
  court: string;
  startTime: string;
  endTime: string;
  matchId?: string;
  match?: {
    id: string;
    eventName: string;
    round: number;
    team1Name: string;
    team2Name: string;
    status: 'pending' | 'in_progress' | 'completed';
  };
}

interface Tournament {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: TournamentStatus;
  startsAt: string;
  endsAt: string;
  registrationClosesAt: string | null;
  registrationOpensAt: string | null;
  locationNotes: string | null;
  venue: {
    id: string;
    name: string;
    slug: string;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
  } | null;
  maxParticipants: number;
  currentParticipants: number;
  gameFormat: string;
  tournamentFormat: string;
  pointsToWin: number;
  winBy: number;
  bestOf: number;
  isRated: boolean;
  minRating: string | null;
  maxRating: string | null;
  organizer: {
    id: string;
    username: string;
    displayName: string | null;
    email: string;
  } | null;
  events: TournamentEvent[];
  rules: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields for UI (these may need to be added to API or computed client-side)
  isUserOwner?: boolean;
  isUserAdmin?: boolean;
  isUserRegistered?: boolean;
  userRegistrationId?: string | null;
}

type Tab = 'overview' | 'events' | 'registrations' | 'brackets' | 'schedule' | 'settings';

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const tournamentId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');

  // Queries
  const { data: tournament, isLoading, isError, error } = useTournament(tournamentId);
  const { data: events } = useTournamentEvents(tournamentId);
  const { data: registrations } = useTournamentRegistrations(tournamentId);
  const { data: bracket } = useTournamentBracket(tournamentId);
  const { data: schedule } = useTournamentSchedule(tournamentId);

  // Mutations
  const unregisterMutation = useUnregisterFromTournament();
  const checkInMutation = useCheckInRegistration();
  const publishMutation = usePublishTournament();
  const deleteMutation = useDeleteTournament();

  // Cast data to expected types - API returns nested objects like { tournament: {...} }
  const tournamentData = (tournament as { tournament: Tournament } | undefined)?.tournament;
  const eventsData = events as { events: TournamentEvent[] } | undefined;
  const registrationsData = registrations as { registrations: Registration[] } | undefined;
  const bracketData = bracket as { bracket: { rounds: Array<{ round: number; matches: Match[] }> } } | undefined;
  // Schedule API returns { schedule: { tournamentId, matches: [...] } }
  // Transform to expected format for ScheduleTab
  const rawScheduleData = schedule as { schedule: { tournamentId: string; matches: Array<{ id: string; courtNumber?: string; scheduledAt?: string; status: string; [key: string]: unknown }> } } | undefined;
  const scheduleData = rawScheduleData?.schedule ? {
    slots: rawScheduleData.schedule.matches.map(m => ({
      id: m.id,
      court: m.courtNumber || 'TBD',
      startTime: m.scheduledAt || '',
      endTime: '',
      matchId: m.id,
      match: m.status ? {
        id: m.id,
        eventName: '',
        round: (m as { roundNumber?: number }).roundNumber || 0,
        team1Name: 'TBD',
        team2Name: 'TBD',
        status: m.status as 'pending' | 'in_progress' | 'completed',
      } : undefined,
    })).filter(s => s.startTime),
    courts: [...new Set(rawScheduleData.schedule.matches.map(m => m.courtNumber || 'TBD').filter(Boolean))] as string[],
  } : undefined;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-pickle-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !tournamentData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Tournament not found
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error instanceof Error ? error.message : 'The tournament you are looking for does not exist or has been removed.'}
          </p>
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: tournamentData.name,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      // TODO: Show toast notification
    }
  };

  const handlePublish = async () => {
    if (confirm('Are you sure you want to publish this tournament? This will make it visible to all users.')) {
      await publishMutation.mutateAsync(tournamentId);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      const token = await getToken();
      if (!token) {
        return;
      }
      await deleteMutation.mutateAsync({ token, id: tournamentId });
      router.push('/tournaments');
    }
  };

  const statusBadge = getStatusBadge(tournamentData.status);
  const canEdit = Boolean(tournamentData.isUserOwner || tournamentData.isUserAdmin);

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Determine available tabs
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'events', label: 'Events', show: true },
    { key: 'registrations', label: 'Registrations', show: canEdit || tournamentData.status !== 'draft' },
    { key: 'brackets', label: 'Brackets', show: tournamentData.status === 'in_progress' || tournamentData.status === 'completed' },
    { key: 'schedule', label: 'Schedule', show: tournamentData.status !== 'draft' },
    { key: 'settings', label: 'Settings', show: canEdit },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/tournaments"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tournaments
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {tournamentData.name}
              </h1>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDateShort(tournamentData.startsAt)} - {formatDateShort(tournamentData.endsAt)}
              </div>
              {tournamentData.venue && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {tournamentData.venue.name}{tournamentData.venue.city && `, ${tournamentData.venue.city}`}
                </div>
              )}
              {tournamentData.locationNotes && !tournamentData.venue && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {tournamentData.locationNotes}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {tournamentData.events?.length || 0} events
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {tournamentData.currentParticipants || 0} registered
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleShare}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              aria-label="Share tournament"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {tournamentData.status === 'draft' && canEdit && (
              <button
                onClick={handlePublish}
                disabled={publishMutation.isPending}
                className="px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {publishMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Publish
              </button>
            )}

            {tournamentData.status === 'registration_open' && !tournamentData.isUserRegistered && (
              <Link
                href={`/tournaments/${tournamentId}/register`}
                className="px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </Link>
            )}

            {canEdit && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                  aria-expanded={showAdminMenu}
                  aria-haspopup="true"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showAdminMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowAdminMenu(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                      <Link
                        href={`/tournaments/${tournamentId}/edit`}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        onClick={() => setShowAdminMenu(false)}
                      >
                        <Edit className="w-4 h-4" />
                        Edit Tournament
                      </Link>
                      <button
                        onClick={() => {
                          setShowAdminMenu(false);
                          navigator.clipboard.writeText(window.location.href);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </button>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => {
                          setShowAdminMenu(false);
                          handleDelete();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Tournament
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
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
          <OverviewTab
            tournament={tournamentData}
            events={eventsData?.events ?? []}
          />
        )}

        {activeTab === 'events' && (
          <EventsTab
            tournament={tournamentData}
            events={eventsData?.events ?? []}
          />
        )}

        {activeTab === 'registrations' && (
          <RegistrationsTab
            tournament={tournamentData}
            registrations={registrationsData?.registrations ?? []}
            events={eventsData?.events ?? []}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterEvent={filterEvent}
            onFilterChange={setFilterEvent}
            onCheckIn={(registrationId) =>
              checkInMutation.mutate({ tournamentId, registrationId })
            }
            onRemove={(registrationId) =>
              unregisterMutation.mutate({ tournamentId, registrationId })
            }
            isCheckingIn={checkInMutation.isPending}
          />
        )}

        {activeTab === 'brackets' && (
          <BracketsTab
            bracket={bracketData?.bracket}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            tournament={tournamentData}
            schedule={scheduleData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            tournament={tournamentData}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  tournament,
  events,
}: {
  tournament: Tournament;
  events: TournamentEvent[];
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate totals
  const totalSpots = events.reduce((sum, e) => sum + e.maxParticipants, 0);
  const totalRegistered = events.reduce((sum, e) => sum + e.currentParticipants, 0);
  const registrationPercentage = totalSpots > 0 ? (totalRegistered / totalSpots) * 100 : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Registrations</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{tournament.currentParticipants || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Events</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{tournament.events?.length || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Max Participants</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{tournament.maxParticipants || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Fill Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(registrationPercentage)}%</p>
          </div>
        </div>

        {/* Registration Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Registration Progress
          </h2>
          <div className="space-y-4">
            {events.map((event) => {
              const fillPercentage = event.maxParticipants > 0
                ? (event.currentParticipants / event.maxParticipants) * 100
                : 0;
              return (
                <div key={event.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {event.currentParticipants}/{event.maxParticipants}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fillPercentage >= 90
                          ? 'bg-red-500'
                          : fillPercentage >= 70
                            ? 'bg-yellow-500'
                            : 'bg-pickle-500'
                      }`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No events configured yet
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              About This Tournament
            </h2>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {tournament.description}
            </p>
          </div>
        )}

        {/* Quick Links to Events */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {events.slice(0, 4).map((event) => (
              <Link
                key={event.id}
                href={`/tournaments/${tournament.id}/events/${event.id}`}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{event.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.currentParticipants}/{event.maxParticipants} registered
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>
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
            {tournament.registrationClosesAt && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Registration Deadline</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(tournament.registrationClosesAt)}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Tournament Start</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(tournament.startsAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Tournament End</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(tournament.endsAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Venue Info */}
        {tournament.venue && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Venue
            </h3>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{tournament.venue.name}</p>
                {tournament.venue.streetAddress && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tournament.venue.streetAddress}</p>
                )}
                {(tournament.venue.city || tournament.venue.state) && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {[tournament.venue.city, tournament.venue.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        {tournament.organizer && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Organizer
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center">
                <span className="text-pickle-700 dark:text-pickle-400 font-medium">
                  {(tournament.organizer.displayName || tournament.organizer.username).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {tournament.organizer.displayName || tournament.organizer.username}
                </p>
                {tournament.organizer.email && (
                  <a
                    href={`mailto:${tournament.organizer.email}`}
                    className="text-sm text-pickle-600 dark:text-pickle-400 hover:underline"
                  >
                    {tournament.organizer.email}
                  </a>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Events Tab Component
function EventsTab({
  tournament,
  events,
}: {
  tournament: Tournament;
  events: TournamentEvent[];
}) {
  const formatCategory = (category: EventCategory | string) => {
    const labels: Record<string, string> = {
      singles: 'Singles',
      doubles: 'Doubles',
      mixed_doubles: 'Mixed Doubles',
    };
    return labels[category] || category;
  };

  const formatFormat = (format: EventFormat | string) => {
    const labels: Record<string, string> = {
      single_elimination: 'Single Elimination',
      double_elimination: 'Double Elimination',
      round_robin: 'Round Robin',
      pool_play: 'Pool Play',
      pool_to_bracket: 'Pool Play → Bracket',
    };
    return labels[format] || format;
  };

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Events Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Events will be added by the tournament organizer.
          </p>
        </div>
      ) : (
        events.map((event) => {
          const fillPercentage = event.maxParticipants > 0
            ? (event.currentParticipants / event.maxParticipants) * 100
            : 0;
          const isFull = event.currentParticipants >= event.maxParticipants;

          return (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {event.name}
                    </h3>
                    {isFull && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                        Full
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Category</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatCategory(event.category)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Format</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatFormat(event.format)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Skill Level</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.skillLevel || 'All Levels'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Entry Fee</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${event.entryFee}
                      </p>
                    </div>
                  </div>

                  {/* Registration Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Registration
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {event.currentParticipants}/{event.maxParticipants} spots filled
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          fillPercentage >= 90
                            ? 'bg-red-500'
                            : fillPercentage >= 70
                              ? 'bg-yellow-500'
                              : 'bg-pickle-500'
                        }`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {tournament.status === 'registration_open' && !isFull && (
                    <Link
                      href={`/tournaments/${tournament.id}/register?event=${event.id}`}
                      className="px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors text-center"
                    >
                      Register
                    </Link>
                  )}
                  <Link
                    href={`/tournaments/${tournament.id}/events/${event.id}`}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Registrations Tab Component
function RegistrationsTab({
  tournament,
  registrations,
  events,
  searchQuery,
  onSearchChange,
  filterEvent,
  onFilterChange,
  onCheckIn,
  onRemove,
  isCheckingIn,
}: {
  tournament: Tournament;
  registrations: Registration[];
  events: TournamentEvent[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterEvent: string;
  onFilterChange: (eventId: string) => void;
  onCheckIn: (registrationId: string) => void;
  onRemove: (registrationId: string) => void;
  isCheckingIn: boolean;
}) {
  const canManage = tournament.isUserOwner || tournament.isUserAdmin;

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch = searchQuery === '' ||
      reg.player1.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.player1.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.player2?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.player2?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.teamName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEvent = filterEvent === 'all' || reg.eventId === filterEvent;

    return matchesSearch && matchesEvent;
  });

  const getStatusBadge = (status: RegistrationStatus) => {
    const styles: Record<RegistrationStatus, { bg: string; text: string; icon: typeof Check }> = {
      registered: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: Check,
      },
      confirmed: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: CheckCircle,
      },
      waitlisted: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        icon: Clock,
      },
      withdrawn: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        icon: XCircle,
      },
      disqualified: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: XCircle,
      },
    };
    return styles[status];
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pickle-500"
          />
        </div>
        <select
          value={filterEvent}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pickle-500"
          aria-label="Filter by event"
        >
          <option value="all">All Events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
      </div>

      {/* Registrations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Player/Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Seed
                </th>
                {canManage && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery || filterEvent !== 'all'
                      ? 'No registrations match your filters'
                      : 'No registrations yet'}
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => {
                  const statusBadge = getStatusBadge(reg.status);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div>
                          {reg.teamName && (
                            <p className="font-medium text-gray-900 dark:text-white">{reg.teamName}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {reg.player1.displayName || reg.player1.username}
                            </span>
                            {reg.player1.rating && (
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                {reg.player1.rating.toFixed(2)}
                              </span>
                            )}
                          </div>
                          {reg.player2 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {reg.player2.displayName || reg.player2.username}
                              </span>
                              {reg.player2.rating && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                  {reg.player2.rating.toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900 dark:text-white">{reg.eventName}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {reg.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {reg.seed || '-'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {reg.status === 'confirmed' && tournament.status === 'in_progress' && (
                              <button
                                onClick={() => onCheckIn(reg.id)}
                                disabled={isCheckingIn}
                                className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                              >
                                Check In
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to remove this registration?')) {
                                  onRemove(reg.id);
                                }
                              }}
                              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              aria-label="Remove registration"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Brackets Tab Component
function BracketsTab({
  bracket,
}: {
  bracket: { format?: string; totalRounds?: number; rounds: Array<{ round: number; matches: Match[] }> } | undefined;
}) {
  // Handle case when bracket data is not available
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Brackets Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Brackets will be generated once the tournament begins.
        </p>
      </div>
    );
  }

  // Group matches by round from the bracket data
  const matchesByRound: Record<number, Match[]> = {};
  bracket.rounds.forEach((roundData) => {
    if (!matchesByRound[roundData.round]) {
      matchesByRound[roundData.round] = [];
    }
    matchesByRound[roundData.round]!.push(...roundData.matches);
  });

  const getRoundName = (round: number, totalRounds: number) => {
    if (round === totalRounds) return 'Finals';
    if (round === totalRounds - 1) return 'Semifinals';
    if (round === totalRounds - 2) return 'Quarterfinals';
    return `Round ${round}`;
  };

  const totalRounds = bracket.totalRounds || Object.keys(matchesByRound).length;
  const hasMatches = Object.values(matchesByRound).some(matches => matches.length > 0);

  return (
    <div className="space-y-4">
      {/* Bracket View */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-x-auto">
        {!hasMatches ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No matches scheduled yet</p>
          </div>
        ) : (
          <div className="flex gap-8 min-w-max">
            {Object.keys(matchesByRound).sort((a, b) => Number(a) - Number(b)).map((roundNum) => {
              const roundMatches = matchesByRound[Number(roundNum)] ?? [];
              return (
                <div key={roundNum} className="flex flex-col gap-4">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                    {getRoundName(Number(roundNum), totalRounds)}
                  </h4>
                  <div className="flex flex-col gap-4 justify-around flex-1">
                    {roundMatches.map((match) => (
                      <BracketMatch key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Schedule Tab Component
function ScheduleTab({
  schedule,
}: {
  tournament: Tournament;
  schedule: { slots: ScheduleSlot[]; courts: string[] } | undefined;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (!schedule || schedule.slots.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Schedule Not Available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          The tournament schedule will be posted soon.
        </p>
      </div>
    );
  }

  // Get unique dates from schedule
  const dates = [...new Set(schedule.slots.map(s => new Date(s.startTime).toDateString()))];
  const currentDate = selectedDate || dates[0];

  // Filter slots by selected date
  const daySlots = schedule.slots.filter(
    s => new Date(s.startTime).toDateString() === currentDate
  );

  // Get unique time slots for the grid
  const timeSlots = [...new Set(daySlots.map(s => s.startTime))].sort();

  // Create grid data
  const gridData: Record<string, Record<string, ScheduleSlot | undefined>> = {};
  schedule.courts.forEach(court => {
    gridData[court] = {};
    daySlots.filter(s => s.court === court).forEach(slot => {
      gridData[court]![slot.startTime] = slot;
    });
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => {
            const idx = dates.indexOf(currentDate!);
            if (idx > 0) setSelectedDate(dates[idx - 1]!);
          }}
          disabled={dates.indexOf(currentDate!) === 0}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex gap-2 overflow-x-auto justify-center">
          {dates.map(date => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                date === currentDate
                  ? 'bg-pickle-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const idx = dates.indexOf(currentDate!);
            if (idx < dates.length - 1) setSelectedDate(dates[idx + 1]!);
          }}
          disabled={dates.indexOf(currentDate!) === dates.length - 1}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700/50">
                  Time
                </th>
                {schedule.courts.map(court => (
                  <th key={court} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[150px]">
                    Court {court}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {timeSlots.map(time => (
                <tr key={time}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800">
                    {formatTime(time)}
                  </td>
                  {schedule.courts.map(court => {
                    const slot = gridData[court]?.[time];
                    return (
                      <td key={court} className="px-2 py-2">
                        {slot?.match ? (
                          <div className={`p-2 rounded-lg text-sm ${
                            slot.match.status === 'in_progress'
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                              : slot.match.status === 'completed'
                                ? 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          }`}>
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {slot.match.team1Name} vs {slot.match.team2Name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {slot.match.eventName} - Round {slot.match.round}
                            </p>
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center text-gray-400 dark:text-gray-600">
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({
  tournament,
  onDelete,
  isDeleting,
}: {
  tournament: Tournament;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Tournament Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tournament Settings
        </h2>
        <div className="space-y-4">
          <Link
            href={`/tournaments/${tournament.id}/edit`}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Edit className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Edit Tournament Details</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update name, dates, venue, and description</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/events/manage`}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Manage Events</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add, edit, or remove tournament events</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          <Link
            href={`/tournaments/${tournament.id}/admins`}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Manage Admins</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add or remove tournament administrators</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900/50 p-6">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h2>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Delete Tournament</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Permanently delete this tournament and all its data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Tournament
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
