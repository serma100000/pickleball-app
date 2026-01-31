'use client';

import { useState } from 'react';
import { usePartnerListings, useCreatePartnerListing, useDeletePartnerListing } from '@/hooks/use-api';
import { useUser } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PartnerListingCard } from './PartnerListingCard';
import { toast } from '@/hooks/use-toast';

// Types for API response
interface PartnerListing {
  id: string;
  message?: string | null;
  skillLevelMin?: number | null;
  skillLevelMax?: number | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    city?: string | null;
    state?: string | null;
    rating?: number | null;
    ratingSource?: string | null;
  };
}

interface PartnerListingsResponse {
  listings: PartnerListing[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PartnerMarketplaceProps {
  tournamentId?: string;
  leagueId?: string;
  eventId?: string;
  eventName?: string;
}

export function PartnerMarketplace({
  tournamentId,
  leagueId,
  eventId,
  eventName,
}: PartnerMarketplaceProps) {
  const { user, isSignedIn } = useUser();
  const [skillFilter, setSkillFilter] = useState<{ min?: number; max?: number }>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListingMessage, setNewListingMessage] = useState('');
  const [newListingSkillMin, setNewListingSkillMin] = useState('');
  const [newListingSkillMax, setNewListingSkillMax] = useState('');

  const { data, isLoading, error, refetch } = usePartnerListings({
    tournamentId,
    leagueId,
    eventId,
    skillMin: skillFilter.min,
    skillMax: skillFilter.max,
  });

  const createListing = useCreatePartnerListing();
  const deleteListing = useDeletePartnerListing();

  const typedData = data as PartnerListingsResponse | undefined;
  const listings = typedData?.listings || [];

  // Check if current user has an active listing
  const userListing = listings.find((l: PartnerListing) => l.user.id === user?.id);

  const handleCreateListing = async () => {
    if (!tournamentId && !leagueId) {
      toast.error({
        title: 'Error',
        description: 'Missing event information.',
      });
      return;
    }

    try {
      await createListing.mutateAsync({
        tournamentId,
        leagueId,
        eventId,
        skillLevelMin: newListingSkillMin ? parseFloat(newListingSkillMin) : undefined,
        skillLevelMax: newListingSkillMax ? parseFloat(newListingSkillMax) : undefined,
        message: newListingMessage || undefined,
      });

      toast.success({
        title: 'Listing created',
        description: 'You are now listed as looking for a partner!',
      });

      setShowCreateForm(false);
      setNewListingMessage('');
      setNewListingSkillMin('');
      setNewListingSkillMax('');
      refetch();
    } catch (error) {
      // Error toast handled by mutation cache
    }
  };

  const handleDeleteListing = async () => {
    if (!userListing) return;

    try {
      await deleteListing.mutateAsync(userListing.id);

      toast.success({
        title: 'Listing removed',
        description: 'Your partner listing has been removed.',
      });

      refetch();
    } catch (error) {
      // Error toast handled by mutation cache
    }
  };

  const skillLevels = [
    { value: '', label: 'Any' },
    { value: '2.5', label: '2.5' },
    { value: '3.0', label: '3.0' },
    { value: '3.5', label: '3.5' },
    { value: '4.0', label: '4.0' },
    { value: '4.5', label: '4.5' },
    { value: '5.0', label: '5.0' },
    { value: '5.5', label: '5.5+' },
  ];

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600 dark:text-red-400">
            Error loading partner marketplace. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Find a Partner</CardTitle>
              <CardDescription>
                Connect with other players looking for a doubles partner
                {eventName && ` for ${eventName}`}
              </CardDescription>
            </div>
            {isSignedIn && !userListing && (
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant={showCreateForm ? 'outline' : 'default'}
              >
                {showCreateForm ? 'Cancel' : 'Post Your Listing'}
              </Button>
            )}
            {isSignedIn && userListing && (
              <Button
                variant="outline"
                onClick={handleDeleteListing}
                loading={deleteListing.isPending}
              >
                Remove My Listing
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Create Listing Form */}
        {showCreateForm && (
          <CardContent className="border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="listing-message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Message (optional)
                </label>
                <textarea
                  id="listing-message"
                  value={newListingMessage}
                  onChange={(e) => setNewListingMessage(e.target.value)}
                  placeholder="Tell potential partners about yourself and what you're looking for..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="listing-skill-min"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Minimum Partner Skill
                  </label>
                  <select
                    id="listing-skill-min"
                    value={newListingSkillMin}
                    onChange={(e) => setNewListingSkillMin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {skillLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="listing-skill-max"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Maximum Partner Skill
                  </label>
                  <select
                    id="listing-skill-max"
                    value={newListingSkillMax}
                    onChange={(e) => setNewListingSkillMax(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {skillLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleCreateListing}
                  loading={createListing.isPending}
                >
                  Create Listing
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by skill:
        </span>
        <div className="flex gap-2">
          <select
            value={skillFilter.min?.toString() || ''}
            onChange={(e) =>
              setSkillFilter((prev) => ({
                ...prev,
                min: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            aria-label="Minimum skill level"
          >
            <option value="">Min</option>
            {skillLevels.slice(1).map((level) => (
              <option key={level.value} value={level.value}>
                {level.value}
              </option>
            ))}
          </select>
          <span className="text-gray-400">-</span>
          <select
            value={skillFilter.max?.toString() || ''}
            onChange={(e) =>
              setSkillFilter((prev) => ({
                ...prev,
                max: e.target.value ? parseFloat(e.target.value) : undefined,
              }))
            }
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pickle-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            aria-label="Maximum skill level"
          >
            <option value="">Max</option>
            {skillLevels.slice(1).map((level) => (
              <option key={level.value} value={level.value}>
                {level.value}
              </option>
            ))}
          </select>
        </div>
        {(skillFilter.min || skillFilter.max) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSkillFilter({})}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-grow space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No partners listed yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Be the first to post a listing and find your perfect partner!
            </p>
            {isSignedIn && !userListing && (
              <Button onClick={() => setShowCreateForm(true)}>
                Post Your Listing
              </Button>
            )}
            {!isSignedIn && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sign in to post a listing or contact other players.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing: PartnerListing) => (
            <PartnerListingCard
              key={listing.id}
              listing={listing}
              currentUserId={user?.id}
              onContact={() => refetch()}
            />
          ))}
        </div>
      )}

      {/* Pagination info */}
      {typedData?.pagination && typedData.pagination.total > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {listings.length} of {typedData.pagination.total} listings
        </p>
      )}
    </div>
  );
}
