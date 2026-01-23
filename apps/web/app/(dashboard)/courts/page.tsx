'use client';

import { MapPin, Filter, List, Map as MapIcon, Star, Plus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import Link from 'next/link';

// Types based on the API response
interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  averageRating: string | null;
}

interface Court {
  id: string;
  venueId: string;
  name: string;
  courtNumber: number | null;
  surface: string;
  isIndoor: boolean;
  hasLights: boolean;
  isCovered: boolean;
  widthFeet: string;
  lengthFeet: string;
  isReservable: boolean;
  requiresMembership: boolean;
  isActive: boolean;
  hourlyRate: string | null;
  peakHourlyRate: string | null;
  createdAt: string;
  updatedAt: string;
  venue: Venue;
  distance: number | null;
}

interface CourtsResponse {
  courts: Court[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Fetch courts from API
async function fetchCourts(): Promise<CourtsResponse> {
  return api.get<CourtsResponse>('/v1/courts', { limit: 20 });
}

export default function CourtsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.courts.list(),
    queryFn: fetchCourts,
  });

  const courts = data?.courts ?? [];
  const hasCourts = courts.length > 0;

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Find Courts
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Discover pickleball courts near you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button className="flex items-center gap-2 px-4 py-2 bg-pickle-500 text-white">
              <MapIcon className="w-4 h-4" />
              Map
            </button>
            <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <List className="w-4 h-4" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="search"
            placeholder="Search by location, court name, or zip code..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-pickle-500 focus:border-transparent"
          />
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid lg:grid-cols-3 gap-4 min-h-0">
        {/* Map */}
        <div className="lg:col-span-2 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Map will load here with Mapbox
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Enable location services to see nearby courts
              </p>
            </div>
          </div>
          {/* Map controls placeholder */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-xl font-bold">+</span>
            </button>
            <button className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-xl font-bold">-</span>
            </button>
          </div>
          <button className="absolute bottom-4 right-4 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700">
            <MapPin className="w-4 h-4 text-pickle-500" />
            My Location
          </button>
        </div>

        {/* Courts List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Nearby Courts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading
                ? 'Loading courts...'
                : hasCourts
                  ? `${courts.length} court${courts.length !== 1 ? 's' : ''} found`
                  : 'No courts found'}
            </p>
          </div>
          <div className="flex-1 overflow-auto">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Loader2 className="w-8 h-8 text-pickle-500 animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Loading courts...
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Failed to load courts
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  There was an error loading the courts. Please try again.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-pickle-500 text-white rounded-lg hover:bg-pickle-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && !hasCourts && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-16 h-16 bg-pickle-100 dark:bg-pickle-900/20 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-pickle-500" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  No courts found
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  There are no courts in your area yet. Be the first to add one!
                </p>
                <Link
                  href="/courts/new"
                  className="flex items-center gap-2 px-4 py-2 bg-pickle-500 text-white rounded-lg hover:bg-pickle-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add a Court
                </Link>
              </div>
            )}

            {/* Courts List */}
            {!isLoading && !error && hasCourts && (
              <>
                {courts.map((court) => (
                  <CourtListItem
                    key={court.id}
                    id={court.id}
                    name={court.venue.name}
                    courtName={court.name}
                    address={`${court.venue.city}, ${court.venue.state}`}
                    distance={court.distance ? `${court.distance} mi` : undefined}
                    surface={formatSurface(court.surface)}
                    rating={court.venue.averageRating ? parseFloat(court.venue.averageRating) : undefined}
                    isIndoor={court.isIndoor}
                    hasLights={court.hasLights}
                    hourlyRate={court.hourlyRate ? parseFloat(court.hourlyRate) : undefined}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSurface(surface: string): string {
  const surfaces: Record<string, string> = {
    concrete: 'Concrete',
    asphalt: 'Asphalt',
    sport_court: 'Sport Court',
    wood: 'Wood',
    indoor: 'Indoor',
    turf: 'Turf',
  };
  return surfaces[surface] || surface;
}

function CourtListItem({
  id,
  name,
  courtName,
  address,
  distance,
  surface,
  rating,
  isIndoor,
  hasLights,
  hourlyRate,
}: {
  id: string;
  name: string;
  courtName: string;
  address: string;
  distance?: string;
  surface: string;
  rating?: number;
  isIndoor: boolean;
  hasLights: boolean;
  hourlyRate?: number;
}) {
  // Build amenities list
  const amenities: string[] = [];
  if (isIndoor) amenities.push('Indoor');
  if (hasLights) amenities.push('Lights');
  amenities.push(surface);
  if (hourlyRate === undefined || hourlyRate === 0) {
    amenities.push('Free');
  }

  return (
    <Link
      href={`/courts/${id}`}
      className="block p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{courtName} - {address}</p>
        </div>
        {distance && (
          <span className="text-sm font-medium text-pickle-600 dark:text-pickle-400">
            {distance}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 mb-2 text-sm">
        {rating !== undefined && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="font-medium text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
          </div>
        )}
        {hourlyRate !== undefined && hourlyRate > 0 && (
          <span className="text-gray-500 dark:text-gray-400">${hourlyRate}/hr</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {amenities.map((amenity) => (
          <span
            key={amenity}
            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
          >
            {amenity}
          </span>
        ))}
      </div>
    </Link>
  );
}
