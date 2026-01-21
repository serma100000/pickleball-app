'use client';

import { ArrowLeft, MapPin, Users, Calendar, Trophy, DollarSign, Clock, Award, Target, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TournamentDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Convert slug back to display name
  const tournamentName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/tournaments"
            className="inline-flex items-center text-sm text-orange-100 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                  Registration Open
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white">
                {tournamentName}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-orange-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Date TBD
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Location TBD
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  -- Registered
                </span>
              </div>
            </div>

            <button className="px-6 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium">
              Register Now
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
                About This Tournament
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Tournament details will be loaded here. This is a placeholder page for the {tournamentName}.
                Full implementation coming soon with brackets, schedules, prize information,
                and player registration details.
              </p>
            </div>

            {/* Divisions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Divisions & Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Singles', 'Doubles', 'Mixed Doubles'].map((division) => (
                  <div
                    key={division}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{division}</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        -- / -- spots
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Target className="w-4 h-4" />
                      All skill levels
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Tournament Schedule
              </h2>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Schedule not yet available</p>
                <p className="text-sm mt-1">Check back closer to the event date</p>
              </div>
            </div>

            {/* Brackets */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Brackets
              </h2>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Brackets will be posted after registration closes</p>
                <p className="text-sm mt-1">Stay tuned for seeding and matchups</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tournament Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Tournament Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Date</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">TBD</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Check-in</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">TBD</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Venue</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Location TBD</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Entry Fee</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">TBD per event</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Prizes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Prizes
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-gray-900 dark:text-white">1st Place</span>
                  </div>
                  <span className="text-yellow-600 font-medium">TBD</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">2nd Place</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">TBD</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-gray-900 dark:text-white">3rd Place</span>
                  </div>
                  <span className="text-orange-600 font-medium">TBD</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  Register Now
                </button>
                <button className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  View Rules
                </button>
                <button className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Contact Organizer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
