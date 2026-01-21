import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  ChevronRight,
  Filter,
  Star,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tournaments',
  description: 'Browse and register for pickleball tournaments',
};

export default function TournamentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tournaments
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Compete in local and regional tournaments
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Featured Tournament */}
      <div className="bg-gradient-to-r from-pickle-600 to-pickle-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-5 h-5 text-ball-300" />
          <span className="text-sm font-medium text-pickle-100">Featured Event</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Bay Area Spring Championship</h2>
        <p className="text-pickle-100 mb-4">
          The premier pickleball tournament in the Bay Area. Join 200+ players competing
          for prizes and bragging rights!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-pickle-200 text-sm">Date</p>
            <p className="font-semibold">April 15-17, 2024</p>
          </div>
          <div>
            <p className="text-pickle-200 text-sm">Location</p>
            <p className="font-semibold">SF Tennis Club</p>
          </div>
          <div>
            <p className="text-pickle-200 text-sm">Entry Fee</p>
            <p className="font-semibold">$75-$125</p>
          </div>
          <div>
            <p className="text-pickle-200 text-sm">Prize Pool</p>
            <p className="font-semibold">$10,000</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/tournaments/bay-area-spring-championship"
            className="px-6 py-3 bg-white text-pickle-600 rounded-lg font-semibold hover:bg-pickle-50 transition-colors"
          >
            Register Now
          </Link>
          <span className="text-pickle-100">
            <Clock className="w-4 h-4 inline mr-1" />
            Registration closes in 5 days
          </span>
        </div>
      </div>

      {/* My Registered Tournaments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          My Tournaments
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <TournamentCard
            name="Downtown Doubles Classic"
            date="March 23, 2024"
            location="Downtown Courts"
            events={['Mixed Doubles 3.5-4.0']}
            status="Registered"
            statusColor="green"
          />
          <TournamentCard
            name="Peninsula Open"
            date="April 6, 2024"
            location="Palo Alto Tennis Center"
            events={["Men's Doubles 3.5", 'Mixed Doubles 3.5']}
            status="Waitlisted"
            statusColor="yellow"
          />
        </div>
      </div>

      {/* Upcoming Tournaments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upcoming Tournaments
        </h2>
        <div className="space-y-4">
          <TournamentListItem
            name="East Bay Open"
            date="March 30-31, 2024"
            location="Berkeley Tennis Club"
            events={['Singles', 'Doubles', 'Mixed']}
            skillLevels={['3.0', '3.5', '4.0', '4.5+']}
            entryFee="$55-$95"
            spotsLeft={45}
            totalSpots={128}
          />
          <TournamentListItem
            name="Golden Gate Challenge"
            date="April 13-14, 2024"
            location="Golden Gate Park"
            events={['Doubles', 'Mixed']}
            skillLevels={['3.5', '4.0', '4.5+']}
            entryFee="$65-$110"
            spotsLeft={28}
            totalSpots={96}
          />
          <TournamentListItem
            name="South Bay Shootout"
            date="April 20-21, 2024"
            location="San Jose Civic Center"
            events={['Singles', 'Doubles', 'Mixed']}
            skillLevels={['2.5', '3.0', '3.5', '4.0']}
            entryFee="$45-$85"
            spotsLeft={72}
            totalSpots={160}
          />
          <TournamentListItem
            name="Marin Masters"
            date="May 4-5, 2024"
            location="San Rafael Community Center"
            events={['Age 50+', 'Age 60+', 'Age 70+']}
            skillLevels={['3.0', '3.5', '4.0']}
            entryFee="$50-$90"
            spotsLeft={54}
            totalSpots={80}
          />
        </div>
      </div>

      {/* Load More */}
      <div className="text-center">
        <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          View More Tournaments
        </button>
      </div>
    </div>
  );
}

function TournamentCard({
  name,
  date,
  location,
  events,
  status,
  statusColor,
}: {
  name: string;
  date: string;
  location: string;
  events: string[];
  status: string;
  statusColor: 'green' | 'yellow' | 'red';
}) {
  const statusColors = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{date}</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[statusColor]}`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <MapPin className="w-4 h-4 text-gray-400" />
          {location}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Trophy className="w-4 h-4 text-gray-400" />
          {events.join(', ')}
        </div>
      </div>

      <Link
        href={`/tournaments/${name.toLowerCase().replace(/\s+/g, '-')}`}
        className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
      >
        View Details
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function TournamentListItem({
  name,
  date,
  location,
  events,
  skillLevels,
  entryFee,
  spotsLeft,
  totalSpots,
}: {
  name: string;
  date: string;
  location: string;
  events: string[];
  skillLevels: string[];
  entryFee: string;
  spotsLeft: number;
  totalSpots: number;
}) {
  const fillPercentage = ((totalSpots - spotsLeft) / totalSpots) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
            {spotsLeft < 30 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                {spotsLeft} spots left!
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">{entryFee}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-300">
                {totalSpots - spotsLeft}/{totalSpots} registered
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {events.map((event) => (
              <span
                key={event}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
              >
                {event}
              </span>
            ))}
            <span className="text-gray-400">|</span>
            {skillLevels.map((level) => (
              <span
                key={level}
                className="px-2 py-0.5 text-xs bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full"
              >
                {level}
              </span>
            ))}
          </div>

          {/* Registration Progress */}
          <div className="mt-3">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  fillPercentage > 80
                    ? 'bg-red-500'
                    : fillPercentage > 60
                    ? 'bg-yellow-500'
                    : 'bg-pickle-500'
                }`}
                style={{ width: `${fillPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <Link
          href={`/tournaments/${name.toLowerCase().replace(/\s+/g, '-')}`}
          className="px-6 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          View & Register
        </Link>
      </div>
    </div>
  );
}
