'use client';

import { ArrowLeft, MapPin, Users, Calendar, Trophy, Star, TrendingUp, Clock, Award } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LeagueDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Convert slug back to display name
  const leagueName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/leagues"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leagues
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {leagueName}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Location TBD
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  -- Teams
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Season Active
                </span>
              </div>
            </div>

            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Join League
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                About This League
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                League details will be loaded here. This is a placeholder page for the {leagueName}.
                Full implementation coming soon with team standings, match schedules, player stats,
                and registration information.
              </p>
            </div>

            {/* Standings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Current Standings
              </h2>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No standings data available</p>
                <p className="text-sm mt-1">Standings will appear once the season starts</p>
              </div>
            </div>

            {/* Upcoming Matches */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Upcoming Matches
              </h2>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming matches scheduled</p>
                <p className="text-sm mt-1">Check back later for match schedule</p>
              </div>
            </div>

            {/* Recent Results */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Results
              </h2>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent results</p>
                <p className="text-sm mt-1">Match results will appear here</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* League Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                League Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Season</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Spring 2025</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Match Days</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">TBD</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Division</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Open Registration</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Skill Level</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">All Levels Welcome</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Register Team
                </button>
                <button className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  View Full Schedule
                </button>
                <button className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  League Rules
                </button>
              </div>
            </div>

            {/* Top Players */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Players
              </h3>
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <Star className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Player rankings coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
