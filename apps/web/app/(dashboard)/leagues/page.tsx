import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Calendar,
  Users,
  MapPin,
  Trophy,
  Clock,
  ChevronRight,
  Filter,
  Plus,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leagues',
  description: 'Join pickleball leagues and compete',
};

export default function LeaguesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Leagues
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Join organized league play in your area
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Create League
          </button>
        </div>
      </div>

      {/* My Leagues */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          My Leagues
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <LeagueCard
            name="Bay Area Mixed Doubles League"
            season="Spring 2024"
            teams={12}
            location="Multiple Venues"
            nextMatch="Tomorrow vs Team Dink"
            standing="3rd of 12"
            isJoined
          />
          <LeagueCard
            name="SF Recreation League"
            season="Spring 2024"
            teams={8}
            location="Golden Gate Park"
            nextMatch="Saturday vs Net Ninjas"
            standing="5th of 8"
            isJoined
          />
        </div>
      </div>

      {/* Available Leagues */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Leagues
        </h2>
        <div className="grid gap-4">
          <LeagueListItem
            name="Peninsula Summer League"
            season="Summer 2024"
            format="Doubles"
            skillLevel="3.0-4.0"
            teams={16}
            spotsLeft={4}
            startDate="June 1, 2024"
            location="Palo Alto Courts"
            registrationEnds="May 25, 2024"
          />
          <LeagueListItem
            name="East Bay Competitive League"
            season="Summer 2024"
            format="Singles & Doubles"
            skillLevel="4.0+"
            teams={12}
            spotsLeft={2}
            startDate="June 15, 2024"
            location="Berkeley Tennis Center"
            registrationEnds="June 8, 2024"
          />
          <LeagueListItem
            name="Beginner Friendly League"
            season="Summer 2024"
            format="Doubles"
            skillLevel="2.5-3.5"
            teams={10}
            spotsLeft={6}
            startDate="July 1, 2024"
            location="Community Center"
            registrationEnds="June 24, 2024"
          />
        </div>
      </div>

      {/* Past Leagues */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Past Leagues
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <LeagueCard
            name="Winter Mixed League"
            season="Winter 2024"
            teams={10}
            location="Indoor Courts"
            standing="2nd Place"
            isPast
          />
          <LeagueCard
            name="Fall Singles League"
            season="Fall 2023"
            teams={8}
            location="City Park"
            standing="Champion"
            isPast
          />
        </div>
      </div>
    </div>
  );
}

function LeagueCard({
  name,
  season,
  teams,
  location,
  nextMatch,
  standing,
  isJoined,
  isPast,
}: {
  name: string;
  season: string;
  teams: number;
  location: string;
  nextMatch?: string;
  standing: string;
  isJoined?: boolean;
  isPast?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 ${
        isPast ? 'opacity-75' : 'hover:border-pickle-300 dark:hover:border-pickle-700'
      } transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
            {isPast && standing === 'Champion' && (
              <Trophy className="w-4 h-4 text-yellow-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{season}</p>
        </div>
        {isJoined && !isPast && (
          <span className="px-2 py-1 text-xs font-medium bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full">
            Active
          </span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Users className="w-4 h-4 text-gray-400" />
          {teams} teams
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <MapPin className="w-4 h-4 text-gray-400" />
          {location}
        </div>
        {nextMatch && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-gray-400" />
            {nextMatch}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Trophy className="w-4 h-4 text-gray-400" />
          {standing}
        </div>
      </div>

      <Link
        href={`/leagues/${name.toLowerCase().replace(/\s+/g, '-')}`}
        className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
      >
        {isPast ? 'View Results' : 'View League'}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function LeagueListItem({
  name,
  season,
  format,
  skillLevel,
  teams,
  spotsLeft,
  startDate,
  location,
  registrationEnds,
}: {
  name: string;
  season: string;
  format: string;
  skillLevel: string;
  teams: number;
  spotsLeft: number;
  startDate: string;
  location: string;
  registrationEnds: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-pickle-300 dark:hover:border-pickle-700 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              {season}
            </span>
            {spotsLeft <= 3 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                {spotsLeft} spots left!
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Format</p>
              <p className="text-gray-900 dark:text-white">{format}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Skill Level</p>
              <p className="text-gray-900 dark:text-white">{skillLevel}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Teams</p>
              <p className="text-gray-900 dark:text-white">
                {teams - spotsLeft}/{teams}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Starts</p>
              <p className="text-gray-900 dark:text-white">{startDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {location}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Registration ends {registrationEnds}
            </div>
          </div>
        </div>
        <button className="px-6 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap">
          Register Now
        </button>
      </div>
    </div>
  );
}
