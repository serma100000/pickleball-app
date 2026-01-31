'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Users,
  TrendingUp,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useRegisterForLeague, usePlayerSearch } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

// Type definitions
type LeagueType = 'ladder' | 'doubles' | 'king_of_court' | 'pool_play' | 'hybrid' | 'round_robin' | 'mixed_doubles' | 'singles';

interface LeaguePlayer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  rating: number | null;
  ratingSource?: 'dupr' | 'internal' | 'self_reported';
}

interface League {
  id: string;
  name: string;
  leagueType: LeagueType;
  skillLevelMin: number | null;
  skillLevelMax: number | null;
  isDuprRated: boolean;
  maxTeams: number;
  currentTeams: number;
}

interface CurrentUser {
  id: string;
  username: string;
  displayName: string | null;
  rating: number | null;
  ratingSource?: 'dupr' | 'internal' | 'self_reported';
}

interface LeagueRegistrationModalProps {
  league: League;
  currentUser: CurrentUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Helper to check if league requires a partner (doubles formats)
function requiresPartner(leagueType: LeagueType): boolean {
  return leagueType === 'doubles' || leagueType === 'mixed_doubles';
}

// Helper to format rating source badge
function getRatingSourceBadge(source?: string): { label: string; bg: string; text: string; icon: typeof Shield } | null {
  if (!source) return null;

  const badges: Record<string, { label: string; bg: string; text: string; icon: typeof Shield }> = {
    dupr: {
      label: 'DUPR Verified',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      icon: Shield,
    },
    internal: {
      label: 'Internal Rating',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      icon: TrendingUp,
    },
    self_reported: {
      label: 'Self-Reported',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: AlertTriangle,
    },
  };

  return badges[source] || null;
}

export function LeagueRegistrationModal({
  league,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}: LeagueRegistrationModalProps) {
  // State
  const [partner, setPartner] = useState<LeaguePlayer | null>(null);
  const [teamName, setTeamName] = useState('');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Queries
  const { data: playerSearchResults, isLoading: isSearchingPlayers } = usePlayerSearch(
    partnerSearchQuery,
    {
      skillMin: league.skillLevelMin ?? undefined,
      skillMax: league.skillLevelMax ?? undefined,
    }
  );

  // Mutations
  const registerMutation = useRegisterForLeague();

  // Search results (excluding current user)
  const searchedPlayers = useMemo(() => {
    const players = (playerSearchResults as { players: LeaguePlayer[] } | undefined)?.players ?? [];
    return players.filter((p) => p.id !== currentUser?.id);
  }, [playerSearchResults, currentUser?.id]);

  // Rating eligibility check
  const ratingEligibility = useMemo(() => {
    if (!currentUser) {
      return { eligible: false, reason: 'Please sign in to register' };
    }

    const userRating = currentUser.rating;

    if (!userRating && (league.skillLevelMin || league.skillLevelMax)) {
      return { eligible: false, reason: 'Your rating is not set. Please update your profile.' };
    }

    if (league.skillLevelMin && userRating && userRating < league.skillLevelMin) {
      return {
        eligible: false,
        reason: `Your rating (${userRating.toFixed(2)}) is below the minimum requirement (${league.skillLevelMin.toFixed(2)})`,
      };
    }

    if (league.skillLevelMax && userRating && userRating > league.skillLevelMax) {
      return {
        eligible: false,
        reason: `Your rating (${userRating.toFixed(2)}) exceeds the maximum limit (${league.skillLevelMax.toFixed(2)})`,
      };
    }

    return { eligible: true, reason: null };
  }, [currentUser, league.skillLevelMin, league.skillLevelMax]);

  // Partner rating eligibility check
  const partnerRatingEligibility = useMemo(() => {
    if (!partner) return { eligible: true, reason: null };

    const partnerRating = partner.rating;

    if (!partnerRating && (league.skillLevelMin || league.skillLevelMax)) {
      return { eligible: false, reason: "Partner's rating is not set" };
    }

    if (league.skillLevelMin && partnerRating && partnerRating < league.skillLevelMin) {
      return {
        eligible: false,
        reason: `Partner rating (${partnerRating.toFixed(2)}) is below minimum (${league.skillLevelMin.toFixed(2)})`,
      };
    }

    if (league.skillLevelMax && partnerRating && partnerRating > league.skillLevelMax) {
      return {
        eligible: false,
        reason: `Partner rating (${partnerRating.toFixed(2)}) exceeds maximum (${league.skillLevelMax.toFixed(2)})`,
      };
    }

    return { eligible: true, reason: null };
  }, [partner, league.skillLevelMin, league.skillLevelMax]);

  // Can submit check
  const canSubmit = useMemo(() => {
    if (!ratingEligibility.eligible) return false;
    if (requiresPartner(league.leagueType) && !partner) return false;
    if (!partnerRatingEligibility.eligible) return false;
    if (registerMutation.isPending) return false;
    return true;
  }, [ratingEligibility.eligible, league.leagueType, partner, partnerRatingEligibility.eligible, registerMutation.isPending]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow close animation
      const timer = setTimeout(() => {
        setPartner(null);
        setTeamName('');
        setPartnerSearchQuery('');
        setRegistrationError(null);
        setRegistrationSuccess(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handlePartnerSelect = (player: LeaguePlayer) => {
    setPartner(player);
    setPartnerSearchQuery('');
  };

  const handlePartnerRemove = () => {
    setPartner(null);
  };

  const handleSubmit = async () => {
    setRegistrationError(null);

    // Validation
    if (!ratingEligibility.eligible) {
      setRegistrationError(ratingEligibility.reason ?? 'Rating check failed');
      return;
    }

    if (requiresPartner(league.leagueType) && !partner) {
      setRegistrationError('Please select a partner for this doubles league.');
      return;
    }

    if (!partnerRatingEligibility.eligible) {
      setRegistrationError(partnerRatingEligibility.reason ?? 'Partner rating check failed');
      return;
    }

    // Build registration data
    const registrationData = {
      partnerId: partner?.id,
      teamName: teamName.trim() || undefined,
    };

    try {
      await registerMutation.mutateAsync({
        leagueId: league.id,
        data: registrationData,
      });
      setRegistrationSuccess(true);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setRegistrationError(errorMessage);
    }
  };

  const needsPartner = requiresPartner(league.leagueType);
  const userRatingBadge = getRatingSourceBadge(currentUser?.ratingSource);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
            'bg-white dark:bg-gray-800 rounded-xl shadow-xl',
            'border border-gray-200 dark:border-gray-700',
            'max-h-[90vh] overflow-y-auto',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200'
          )}
        >
          {/* Success State */}
          {registrationSuccess ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Registration Successful!
              </Dialog.Title>
              <Dialog.Description className="text-gray-600 dark:text-gray-400 mb-6">
                You have successfully registered for {league.name}.
                {partner && (
                  <span> You and {partner.displayName || partner.username} are now registered as a team.</span>
                )}
              </Dialog.Description>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Join {league.name}
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {needsPartner ? 'Select a partner and register for this league' : 'Confirm your registration'}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Your Rating Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Your Rating
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentUser?.rating?.toFixed(2) || 'Not set'}
                      </p>
                      {userRatingBadge && (
                        <div className={cn('inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full', userRatingBadge.bg, userRatingBadge.text)}>
                          <userRatingBadge.icon className="w-3 h-3" />
                          {userRatingBadge.label}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      {(league.skillLevelMin || league.skillLevelMax) ? (
                        <>
                          <p>Required:</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            {league.skillLevelMin?.toFixed(2) ?? '0.00'} - {league.skillLevelMax?.toFixed(2) ?? '5.00'}
                          </p>
                        </>
                      ) : (
                        <p>All skill levels</p>
                      )}
                    </div>
                  </div>

                  {/* Rating Eligibility Message */}
                  {!ratingEligibility.eligible && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">{ratingEligibility.reason}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Partner Selection (for doubles leagues) */}
                {needsPartner && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Select Partner
                    </h3>

                    {partner ? (
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center">
                            <span className="text-pickle-700 dark:text-pickle-400 font-medium">
                              {(partner.displayName || partner.username).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {partner.displayName || partner.username}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              {partner.rating && <span>Rating: {partner.rating.toFixed(2)}</span>}
                              {partner.ratingSource && (
                                <span className={cn(
                                  'px-1.5 py-0.5 text-xs rounded',
                                  getRatingSourceBadge(partner.ratingSource)?.bg,
                                  getRatingSourceBadge(partner.ratingSource)?.text
                                )}>
                                  {getRatingSourceBadge(partner.ratingSource)?.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handlePartnerRemove}
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
                            placeholder="Search for a partner by name..."
                            value={partnerSearchQuery}
                            onChange={(e) => setPartnerSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pickle-500"
                          />
                        </div>

                        {/* Search Results */}
                        {partnerSearchQuery.length >= 2 && (
                          <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            {isSearchingPlayers ? (
                              <div className="p-4 text-center">
                                <Loader2 className="w-5 h-5 text-pickle-500 animate-spin mx-auto" />
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
                              </div>
                            ) : searchedPlayers.length === 0 ? (
                              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                <p className="text-sm">No players found</p>
                                <p className="text-xs mt-1">Try a different search term</p>
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto">
                                {searchedPlayers.map((player) => {
                                  const isEligible = !league.skillLevelMin || !league.skillLevelMax ||
                                    (player.rating && player.rating >= (league.skillLevelMin ?? 0) && player.rating <= (league.skillLevelMax ?? 5));

                                  return (
                                    <button
                                      key={player.id}
                                      onClick={() => handlePartnerSelect(player)}
                                      disabled={!isEligible}
                                      className={cn(
                                        'w-full flex items-center gap-3 p-3 text-left transition-colors',
                                        isEligible
                                          ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                          : 'opacity-50 cursor-not-allowed'
                                      )}
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
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                          {player.rating ? (
                                            <span>Rating: {player.rating.toFixed(2)}</span>
                                          ) : (
                                            <span>No rating</span>
                                          )}
                                          {!isEligible && (
                                            <span className="text-xs text-red-500">Ineligible</span>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Partner Rating Warning */}
                    {partner && !partnerRatingEligibility.eligible && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700 dark:text-red-300">{partnerRatingEligibility.reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Team Name (for doubles leagues with selected partner) */}
                {needsPartner && partner && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Team Name <span className="text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., The Dinkers"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      maxLength={50}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pickle-500"
                    />
                  </div>
                )}

                {/* Error Message */}
                {registrationError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{registrationError}</p>
                    </div>
                  </div>
                )}

                {/* League Capacity Info */}
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {league.currentTeams} / {league.maxTeams} spots filled
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    'px-6 py-2.5 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2',
                    'disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:cursor-not-allowed'
                  )}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Join League
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
