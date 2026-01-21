import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, MapPin, Calendar, Star, ChevronRight, Plus, Filter } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Clubs',
  description: 'Find and join pickleball clubs',
};

export default function ClubsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Clubs
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Find and join pickleball clubs in your area
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Create Club
        </button>
      </div>

      {/* My Clubs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          My Clubs
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ClubCard
            name="Bay Area Pickleball Club"
            members={156}
            location="San Francisco, CA"
            nextEvent="Weekly Meetup - Tomorrow 6PM"
            rating={4.8}
            isJoined
          />
          <ClubCard
            name="Downtown Dink Club"
            members={89}
            location="Oakland, CA"
            nextEvent="Tournament - Saturday 9AM"
            rating={4.6}
            isJoined
          />
        </div>
      </div>

      {/* Discover Clubs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Discover Clubs
          </h2>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ClubCard
            name="Silicon Valley Smashers"
            members={234}
            location="Palo Alto, CA"
            nextEvent="Open Play - Friday 5PM"
            rating={4.9}
          />
          <ClubCard
            name="Golden Gate Picklers"
            members={178}
            location="San Francisco, CA"
            nextEvent="Beginners Night - Wednesday"
            rating={4.7}
          />
          <ClubCard
            name="East Bay Paddle Club"
            members={145}
            location="Berkeley, CA"
            nextEvent="Skills Clinic - Sunday"
            rating={4.5}
          />
          <ClubCard
            name="Peninsula Players"
            members={112}
            location="San Mateo, CA"
            nextEvent="League Night - Thursday"
            rating={4.4}
          />
          <ClubCard
            name="Marin Pickleball Society"
            members={98}
            location="San Rafael, CA"
            nextEvent="Social Mixer - Saturday"
            rating={4.6}
          />
          <ClubCard
            name="South Bay Dinkers"
            members={167}
            location="San Jose, CA"
            nextEvent="Round Robin - Friday"
            rating={4.8}
          />
        </div>
      </div>

      {/* Load More */}
      <div className="text-center">
        <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Load More Clubs
        </button>
      </div>
    </div>
  );
}

function ClubCard({
  name,
  members,
  location,
  nextEvent,
  rating,
  isJoined,
}: {
  name: string;
  members: number;
  location: string;
  nextEvent: string;
  rating: number;
  isJoined?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-pickle-600 dark:text-pickle-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {rating}
            </div>
          </div>
        </div>
        {isJoined && (
          <span className="px-2 py-1 text-xs font-medium bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full">
            Joined
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Users className="w-4 h-4 text-gray-400" />
          {members} members
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <MapPin className="w-4 h-4 text-gray-400" />
          {location}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Calendar className="w-4 h-4 text-gray-400" />
          {nextEvent}
        </div>
      </div>

      <Link
        href={`/clubs/${name.toLowerCase().replace(/\s+/g, '-')}`}
        className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
      >
        View Club
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
