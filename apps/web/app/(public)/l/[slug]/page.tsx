import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  Clock,
  Star,
  TrendingUp,
  Play,
} from 'lucide-react';
import { ShareButtons, QRCodeGenerator } from '@/components/sharing';

// Type definitions
type LeagueType = 'ladder' | 'doubles' | 'king_of_court' | 'pool_play' | 'hybrid' | 'round_robin' | 'mixed_doubles' | 'singles';
type LeagueStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled' | 'registration' | 'active' | 'playoffs';

interface League {
  id: string;
  name: string;
  slug?: string;
  description: string | null;
  leagueType: LeagueType;
  status: LeagueStatus;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  totalWeeks: number;
  maxTeams: number;
  currentTeams: number;
  isDuprRated: boolean;
  hasPlayoffs: boolean;
  playoffTeams: number | null;
  skillLevelMin: number | null;
  skillLevelMax: number | null;
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state?: string | null;
  } | null;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
  };
  rules: string | null;
}

// Server-side data fetching
async function getLeague(slugOrId: string): Promise<League | null> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  try {
    // The API currently accepts UUID as the id param
    // Note: API could be extended to support slug lookup in the future
    const response = await fetch(`${API_BASE_URL}/leagues/${slugOrId}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.league || null;
  } catch (error) {
    console.error('Error fetching league:', error);
    return null;
  }
}

// Generate dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const league = await getLeague(slug);

  if (!league) {
    return {
      title: 'League Not Found',
      description: 'The league you are looking for does not exist.',
    };
  }

  const startDate = new Date(league.startDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const location = league.venue
    ? `${league.venue.name}${league.venue.city ? `, ${league.venue.city}` : ''}`
    : 'Location TBD';

  const spotsRemaining = league.maxTeams - league.currentTeams;
  const description = league.description ||
    `Join ${league.name} starting ${startDate} at ${location}. ${spotsRemaining > 0 ? `${spotsRemaining} spots remaining!` : 'Registration full.'}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.paddle-up.app';

  // Use dynamic OG image
  const ogImageUrl = `${appUrl}/api/og/league/${league.slug || league.id}`;

  return {
    title: league.name,
    description,
    openGraph: {
      title: league.name,
      description,
      type: 'website',
      url: `${appUrl}/l/${league.slug || league.id}`,
      siteName: 'PaddleUp',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: league.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: league.name,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `${appUrl}/l/${league.slug || league.id}`,
    },
  };
}

// Client component for interactive elements
function LeagueClientContent({ league }: { league: League }) {
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

  const formatLeagueType = (type: LeagueType): string => {
    const typeLabels: Record<LeagueType, string> = {
      ladder: 'Ladder',
      doubles: 'Doubles',
      king_of_court: 'King of the Court',
      pool_play: 'Pool Play',
      hybrid: 'Hybrid',
      round_robin: 'Round Robin',
      mixed_doubles: 'Mixed Doubles',
      singles: 'Singles',
    };
    return typeLabels[type] || type;
  };

  const getFormatExplanation = (type: LeagueType): string => {
    const explanations: Record<LeagueType, string> = {
      ladder: 'Players are ranked and can challenge those above them. Win a challenge to swap positions.',
      doubles: 'Teams of two compete in a bracket or round-robin format throughout the season.',
      king_of_court: 'Fast-paced format where the winner stays on court. Players rotate through and compete for the most wins.',
      pool_play: 'Teams are divided into pools and play round-robin within their pool. Top teams advance to playoffs.',
      hybrid: 'Combines multiple formats like pool play followed by playoffs.',
      round_robin: 'Every team plays against every other team. Final standings determined by total wins.',
      mixed_doubles: 'Teams consist of one male and one female player with standard doubles rules.',
      singles: 'Individual players compete against each other with no partners.',
    };
    return explanations[type] || 'Standard league format.';
  };

  const getStatusBadge = (status: LeagueStatus): { bg: string; text: string; label: string } => {
    const defaultStyle = {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      label: 'Coming Soon',
    };
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      draft: defaultStyle,
      registration_open: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        label: 'Registration Open',
      },
      registration: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        label: 'Registration Open',
      },
      registration_closed: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        label: 'Registration Closed',
      },
      in_progress: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'In Progress',
      },
      active: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'Active',
      },
      playoffs: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        label: 'Playoffs',
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
    return styles[status] || defaultStyle;
  };

  // Calculate deadline countdown
  const getDeadlineCountdown = () => {
    if (!league.registrationDeadline) return null;
    const deadline = new Date(league.registrationDeadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} left`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  };

  const isRegistrationOpen = league.status === 'registration_open' || league.status === 'registration';
  const spotsRemaining = league.maxTeams - league.currentTeams;
  const fillPercentage = league.maxTeams > 0
    ? (league.currentTeams / league.maxTeams) * 100
    : 0;
  const statusBadge = getStatusBadge(league.status);
  const deadlineCountdown = getDeadlineCountdown();
  const entityName = league.leagueType === 'singles' || league.leagueType === 'ladder' ? 'players' : 'teams';

  const location = league.venue
    ? `${league.venue.name}${league.venue.city ? `, ${league.venue.city}` : ''}`
    : 'Location TBD';

  return (
    <>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
              <span className="px-3 py-1 text-sm font-medium bg-white/20 text-white rounded-full">
                {formatLeagueType(league.leagueType)}
              </span>
              {league.isDuprRated && (
                <span className="px-3 py-1 text-sm font-medium bg-yellow-400/20 text-yellow-200 rounded-full flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  DUPR Rated
                </span>
              )}
            </div>

            {/* League Name */}
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {league.name}
            </h1>

            {/* Key Details */}
            <div className="flex flex-wrap items-center gap-4 text-white/90 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>
                  {formatDateShort(league.startDate)} - {formatDateShort(league.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{league.totalWeeks} weeks</span>
              </div>
            </div>

            {/* Registration Stats */}
            {isRegistrationOpen && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/80">Registration Progress</span>
                  <span className="text-sm font-medium">
                    {league.currentTeams} / {league.maxTeams} {entityName}
                  </span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      fillPercentage >= 90
                        ? 'bg-red-400'
                        : fillPercentage >= 70
                          ? 'bg-yellow-400'
                          : 'bg-green-400'
                    }`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className={spotsRemaining <= 5 ? 'text-yellow-300 font-medium' : 'text-white/80'}>
                    {spotsRemaining > 0 ? `${spotsRemaining} spots remaining` : 'Registration full'}
                  </span>
                  {deadlineCountdown && (
                    <span className="flex items-center gap-1 text-white/80">
                      <Clock className="w-4 h-4" />
                      {deadlineCountdown}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/sign-up?redirect=/leagues/${league.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="w-5 h-5" />
                {isRegistrationOpen
                  ? 'Sign Up to Join'
                  : 'Sign Up to View'}
              </Link>
              <ShareButtons
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={league.name}
                description={league.description || `Check out ${league.name}!`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {league.description && (
              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  About This League
                </h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {league.description}
                </p>
              </section>
            )}

            {/* Format Explanation */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                League Format: {formatLeagueType(league.leagueType)}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {getFormatExplanation(league.leagueType)}
              </p>
              {league.hasPlayoffs && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Playoffs Included
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Top {league.playoffTeams} {entityName} qualify for the playoff bracket.
                    </p>
                  </div>
                </div>
              )}
              {league.rules && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Additional Rules</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap text-sm">
                    {league.rules}
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Dates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Key Dates
              </h3>
              <div className="space-y-4">
                {league.registrationDeadline && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Registration Deadline</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(league.registrationDeadline)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Play className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Season Start</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(league.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Season End</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(league.endDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* League Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                League Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Capacity</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {league.currentTeams}/{league.maxTeams} {entityName}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Duration</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {league.totalWeeks} weeks
                    </p>
                  </div>
                </div>
                {(league.skillLevelMin || league.skillLevelMax) && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Skill Level</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {league.skillLevelMin && league.skillLevelMax
                          ? `${league.skillLevelMin.toFixed(1)} - ${league.skillLevelMax.toFixed(1)}`
                          : league.skillLevelMin
                            ? `${league.skillLevelMin.toFixed(1)}+`
                            : 'All Levels'}
                      </p>
                    </div>
                  </div>
                )}
                {league.isDuprRated && (
                  <div className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">DUPR Rated</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Games count toward your DUPR rating
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Venue Info */}
            {league.venue && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Venue
                </h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {league.venue.name}
                    </p>
                    {league.venue.address && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {league.venue.address}
                      </p>
                    )}
                    {(league.venue.city || league.venue.state) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {[league.venue.city, league.venue.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Organizer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Organizer
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <span className="text-brand-700 dark:text-brand-400 font-medium">
                    {(league.creator.displayName || league.creator.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {league.creator.displayName || league.creator.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    League Organizer
                  </p>
                </div>
              </div>
            </div>

            {/* Share & QR Code */}
            <div className="hidden lg:block">
              <QRCodeGenerator
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={league.name}
                size={180}
                variant="card"
                colorScheme="brand"
              />
            </div>

            {/* Mobile CTA */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom">
              <Link
                href={`/sign-up?redirect=/leagues/${league.id}`}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Users className="w-5 h-5" />
                {isRegistrationOpen
                  ? 'Sign Up to Join'
                  : 'Sign Up to View'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// JSON-LD Structured Data
function LeagueJsonLd({ league }: { league: League }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.paddle-up.app';

  const location = league.venue
    ? {
        '@type': 'Place',
        name: league.venue.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: league.venue.address || undefined,
          addressLocality: league.venue.city || undefined,
          addressRegion: league.venue.state || undefined,
        },
      }
    : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: league.name,
    description: league.description || `${league.name} pickleball league`,
    startDate: league.startDate,
    endDate: league.endDate,
    eventStatus: league.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location,
    organizer: {
      '@type': 'Person',
      name: league.creator.displayName || league.creator.username,
    },
    url: `${appUrl}/l/${league.slug || league.id}`,
    sport: 'Pickleball',
    maximumAttendeeCapacity: league.maxTeams,
    remainingAttendeeCapacity: league.maxTeams - league.currentTeams,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Main Page Component
export default async function PublicLeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const league = await getLeague(slug);

  if (!league) {
    notFound();
  }

  return (
    <>
      <LeagueJsonLd league={league} />
      <LeagueClientContent league={league} />
    </>
  );
}
