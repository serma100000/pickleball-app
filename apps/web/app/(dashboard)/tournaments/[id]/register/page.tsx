'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Trophy,
  Users,
  DollarSign,
  Loader2,
  AlertCircle,
  Check,
  Search,
  X,
  UserPlus,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  useTournament,
  useTournamentEvents,
  useRegisterForTournament,
  usePlayerSearch,
} from '@/hooks/use-api';

// Type definitions
type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';
type EventCategory = 'singles' | 'doubles' | 'mixed_doubles';
type EventFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play' | 'pool_to_bracket';

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
  status: string;
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
  events: TournamentEvent[];
  isUserRegistered?: boolean;
}

interface Player {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rating: number | null;
}

export default function TournamentRegistrationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentId = params.id as string;
  const preSelectedEventId = searchParams.get('event');

  // State
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (preSelectedEventId) {
      initial.add(preSelectedEventId);
    }
    return initial;
  });
  const [partners, setPartners] = useState<Map<string, Player>>(new Map());
  const [teamNames, setTeamNames] = useState<Map<string, string>>(new Map());
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [activePartnerSearch, setActivePartnerSearch] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Queries
  const { data: tournament, isLoading, isError, error } = useTournament(tournamentId);
  const { data: eventsResponse } = useTournamentEvents(tournamentId);
  const { data: playerSearchResults, isLoading: isSearchingPlayers } = usePlayerSearch(
    partnerSearchQuery,
    {}
  );

  // Mutations
  const registerMutation = useRegisterForTournament();

  // Cast data to expected types
  const tournamentData = (tournament as { tournament: Tournament } | undefined)?.tournament;
  const eventsData = (eventsResponse as { events: TournamentEvent[] } | undefined)?.events ?? tournamentData?.events ?? [];
  const searchedPlayers = (playerSearchResults as { players: Player[] } | undefined)?.players ?? [];

  // Calculate total fees
  const totalFees = useMemo(() => {
    return eventsData
      .filter((event) => selectedEventIds.has(event.id))
      .reduce((sum, event) => sum + Number(event.entryFee || 0), 0);
  }, [eventsData, selectedEventIds]);

  // Check if event requires partner
  const requiresPartner = useCallback((category: EventCategory) => {
    return category === 'doubles' || category === 'mixed_doubles';
  }, []);

  // Event handlers
  const handleEventToggle = (eventId: string) => {
    const newSelected = new Set(selectedEventIds);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
      // Clear partner selection for this event
      const newPartners = new Map(partners);
      newPartners.delete(eventId);
      setPartners(newPartners);
      const newTeamNames = new Map(teamNames);
      newTeamNames.delete(eventId);
      setTeamNames(newTeamNames);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEventIds(newSelected);
    setRegistrationError(null);
  };

  const handlePartnerSelect = (eventId: string, player: Player) => {
    const newPartners = new Map(partners);
    newPartners.set(eventId, player);
    setPartners(newPartners);
    setActivePartnerSearch(null);
    setPartnerSearchQuery('');
  };

  const handlePartnerRemove = (eventId: string) => {
    const newPartners = new Map(partners);
    newPartners.delete(eventId);
    setPartners(newPartners);
  };

  const handleTeamNameChange = (eventId: string, name: string) => {
    const newTeamNames = new Map(teamNames);
    newTeamNames.set(eventId, name);
    setTeamNames(newTeamNames);
  };

  const handleSubmit = async () => {
    setRegistrationError(null);

    // Validate selections
    if (selectedEventIds.size === 0) {
      setRegistrationError('Please select at least one event to register for.');
      return;
    }

    // Validate partners for doubles events
    for (const eventId of selectedEventIds) {
      const event = eventsData.find((e) => e.id === eventId);
      if (event && requiresPartner(event.category) && !partners.has(eventId)) {
        setRegistrationError(`Please select a partner for ${event.name || formatCategory(event.category)}.`);
        return;
      }
    }

    // Build registration data
    const registrations = Array.from(selectedEventIds).map((eventId) => {
      const partner = partners.get(eventId);
      const teamName = teamNames.get(eventId);

      return {
        eventId,
        partnerId: partner?.id,
        teamName: teamName || undefined,
      };
    });

    try {
      await registerMutation.mutateAsync({
        tournamentId,
        data: { registrations },
      });
      setRegistrationSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setRegistrationError(errorMessage);
    }
  };

  // Format helpers
  const formatCategory = (category: EventCategory) => {
    const labels: Record<EventCategory, string> = {
      singles: 'Singles',
      doubles: 'Doubles',
      mixed_doubles: 'Mixed Doubles',
    };
    return labels[category] || category;
  };

  const formatFormat = (format: EventFormat) => {
    const labels: Record<EventFormat, string> = {
      single_elimination: 'Single Elimination',
      double_elimination: 'Double Elimination',
      round_robin: 'Round Robin',
      pool_play: 'Pool Play',
      pool_to_bracket: 'Pool Play to Bracket',
    };
    return labels[format] || format;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-pickle-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading tournament...</p>
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
            {error instanceof Error ? error.message : 'The tournament you are looking for does not exist.'}
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

  // Check if registration is open
  const isRegistrationClosed = tournamentData.status === 'registration_closed' ||
    tournamentData.status === 'in_progress' ||
    tournamentData.status === 'completed' ||
    tournamentData.status === 'cancelled';

  // Registration success view
  if (registrationSuccess) {
    return (
      <div className="space-y-6">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Registration Successful!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You have been registered for {selectedEventIds.size} event{selectedEventIds.size !== 1 ? 's' : ''} in {tournamentData.name}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/tournaments/${tournamentId}`}
              className="px-6 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
            >
              View Tournament
            </Link>
            <Link
              href="/tournaments"
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Browse More Tournaments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration closed view
  if (isRegistrationClosed) {
    return (
      <div className="space-y-6">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Registration Closed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Registration for {tournamentData.name} is no longer available.
            {tournamentData.status === 'in_progress' && ' The tournament is currently in progress.'}
            {tournamentData.status === 'completed' && ' The tournament has concluded.'}
            {tournamentData.status === 'cancelled' && ' The tournament has been cancelled.'}
          </p>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex items-center gap-2 px-6 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
          >
            View Tournament Details
          </Link>
        </div>
      </div>
    );
  }

  // Already registered view
  if (tournamentData.isUserRegistered) {
    return (
      <div className="space-y-6">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournament
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Already Registered
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You are already registered for this tournament. View the tournament details to see your registration.
          </p>
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex items-center gap-2 px-6 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
          >
            View My Registration
          </Link>
        </div>
      </div>
    );
  }

  // Main registration form
  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href={`/tournaments/${tournamentId}`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tournament
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Register for {tournamentData.name}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
            <Users className="w-4 h-4" />
            {tournamentData.currentParticipants || 0} registered
          </div>
        </div>

        {tournamentData.registrationClosesAt && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Registration deadline:</strong> {formatDate(tournamentData.registrationClosesAt)}
            </p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Events Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Events
            </h2>

            {eventsData.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No events available for registration.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {eventsData.map((event) => {
                  const isSelected = selectedEventIds.has(event.id);
                  const isFull = event.currentParticipants >= event.maxParticipants;
                  const needsPartner = requiresPartner(event.category);
                  const hasPartner = partners.has(event.id);
                  const isSearchingForThisEvent = activePartnerSearch === event.id;

                  return (
                    <div
                      key={event.id}
                      className={`border rounded-lg transition-colors ${
                        isSelected
                          ? 'border-pickle-500 bg-pickle-50 dark:bg-pickle-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      } ${isFull ? 'opacity-60' : ''}`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => !isFull && handleEventToggle(event.id)}
                              disabled={isFull}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-pickle-500 border-pickle-500 text-white'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-pickle-400'
                              } ${isFull ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              aria-label={`Select ${event.name || formatCategory(event.category)}`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Event Details */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {event.name || formatCategory(event.category)}
                              </h3>
                              {isFull && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                                  Full
                                </span>
                              )}
                              {needsPartner && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                                  Partner Required
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Category</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatCategory(event.category)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Format</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatFormat(event.format)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Skill Level</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {event.skillLevel || 'All Levels'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Spots</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {event.currentParticipants}/{event.maxParticipants}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-pickle-600 dark:text-pickle-400 font-semibold">
                                <DollarSign className="w-4 h-4" />
                                {Number(event.entryFee).toFixed(2)}
                              </div>
                              {Number(event.prizeMoney) > 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Prize: ${Number(event.prizeMoney).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Partner Selection (for doubles events when selected) */}
                        {isSelected && needsPartner && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                              <UserPlus className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select Partner
                              </span>
                            </div>

                            {hasPartner ? (
                              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center">
                                    <span className="text-pickle-700 dark:text-pickle-400 font-medium">
                                      {(partners.get(event.id)!.displayName || partners.get(event.id)!.username).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {partners.get(event.id)!.displayName || partners.get(event.id)!.username}
                                    </p>
                                    {partners.get(event.id)!.rating && (
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Rating: {partners.get(event.id)!.rating?.toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handlePartnerRemove(event.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  aria-label="Remove partner"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                  <input
                                    type="text"
                                    placeholder="Search for a partner..."
                                    value={isSearchingForThisEvent ? partnerSearchQuery : ''}
                                    onChange={(e) => {
                                      setPartnerSearchQuery(e.target.value);
                                      setActivePartnerSearch(event.id);
                                    }}
                                    onFocus={() => setActivePartnerSearch(event.id)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pickle-500"
                                  />
                                </div>

                                {/* Search Results */}
                                {isSearchingForThisEvent && partnerSearchQuery.length >= 2 && (
                                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    {isSearchingPlayers ? (
                                      <div className="p-4 text-center">
                                        <Loader2 className="w-5 h-5 text-pickle-500 animate-spin mx-auto" />
                                      </div>
                                    ) : searchedPlayers.length === 0 ? (
                                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                        No players found
                                      </div>
                                    ) : (
                                      <div className="max-h-48 overflow-y-auto">
                                        {searchedPlayers.map((player) => (
                                          <button
                                            key={player.id}
                                            onClick={() => handlePartnerSelect(event.id, player)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                          >
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                                {(player.displayName || player.username).charAt(0).toUpperCase()}
                                              </span>
                                            </div>
                                            <div className="flex-1">
                                              <p className="font-medium text-gray-900 dark:text-white">
                                                {player.displayName || player.username}
                                              </p>
                                              {player.rating && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                  Rating: {player.rating.toFixed(2)}
                                                </p>
                                              )}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Team Name (optional) */}
                            {hasPartner && (
                              <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Team Name (optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., The Dinkers"
                                  value={teamNames.get(event.id) || ''}
                                  onChange={(e) => handleTeamNameChange(event.id, e.target.value)}
                                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pickle-500"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Registration Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Registration Summary
            </h2>

            {selectedEventIds.size === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Select events to register for
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {Array.from(selectedEventIds).map((eventId) => {
                  const event = eventsData.find((e) => e.id === eventId);
                  if (!event) return null;

                  return (
                    <div
                      key={eventId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {event.name || formatCategory(event.category)}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${Number(event.entryFee).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-pickle-600 dark:text-pickle-400">
                  ${totalFees.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {registrationError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {registrationError}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={selectedEventIds.size === 0 || registerMutation.isPending}
              className="w-full px-6 py-3 bg-pickle-500 hover:bg-pickle-600 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Complete Registration
                </>
              )}
            </button>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              By registering, you agree to the tournament rules and regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
