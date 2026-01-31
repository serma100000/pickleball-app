import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Trophy,
  Clock,
} from 'lucide-react';
import { ShareButtons, QRCodeGenerator } from '@/components/sharing';

// Type definitions
type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';

interface TournamentEvent {
  id: string;
  name: string | null;
  category: string;
  skillLevel: string;
  format: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFee: number | string;
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
    streetAddress: string | null;
    city: string | null;
    state: string | null;
  } | null;
  maxParticipants: number;
  currentParticipants: number;
  events: TournamentEvent[];
  organizer: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
  logoUrl: string | null;
  bannerUrl: string | null;
}

// Server-side data fetching
async function getTournament(slugOrId: string): Promise<Tournament | null> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  try {
    // The API accepts both UUID and slug at the same endpoint
    const response = await fetch(`${API_BASE_URL}/tournaments/${slugOrId}`, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.tournament || null;
  } catch (error) {
    console.error('Error fetching tournament:', error);
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
  const tournament = await getTournament(slug);

  if (!tournament) {
    return {
      title: 'Tournament Not Found',
      description: 'The tournament you are looking for does not exist.',
    };
  }

  const startDate = new Date(tournament.startsAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const location = tournament.venue
    ? `${tournament.venue.name}${tournament.venue.city ? `, ${tournament.venue.city}` : ''}`
    : tournament.locationNotes || 'Location TBD';

  const spotsRemaining = tournament.maxParticipants - tournament.currentParticipants;
  const description = tournament.description ||
    `Join ${tournament.name} on ${startDate} at ${location}. ${spotsRemaining > 0 ? `${spotsRemaining} spots remaining!` : 'Registration full.'}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.paddle-up.app';

  // Use dynamic OG image if no custom banner
  const ogImageUrl = tournament.bannerUrl
    ? tournament.bannerUrl
    : `${appUrl}/api/og/tournament/${tournament.slug}`;

  return {
    title: tournament.name,
    description,
    openGraph: {
      title: tournament.name,
      description,
      type: 'website',
      url: `${appUrl}/t/${tournament.slug}`,
      siteName: 'PaddleUp',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: tournament.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: tournament.name,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `${appUrl}/t/${tournament.slug}`,
    },
  };
}

// Client component for interactive elements
function TournamentClientContent({ tournament }: { tournament: Tournament }) {
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

  const getStatusBadge = (status: TournamentStatus) => {
    const styles: Record<TournamentStatus, { bg: string; text: string; label: string }> = {
      draft: {
        bg: 'bg-gray-100 dark:bg-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        label: 'Coming Soon',
      },
      registration_open: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        label: 'Registration Open',
      },
      registration_closed: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        label: 'Registration Closed',
      },
      in_progress: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'In Progress',
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
    return styles[status];
  };

  // Calculate deadline countdown
  const getDeadlineCountdown = () => {
    if (!tournament.registrationClosesAt) return null;
    const deadline = new Date(tournament.registrationClosesAt);
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

  const spotsRemaining = tournament.maxParticipants - tournament.currentParticipants;
  const fillPercentage = tournament.maxParticipants > 0
    ? (tournament.currentParticipants / tournament.maxParticipants) * 100
    : 0;
  const statusBadge = getStatusBadge(tournament.status);
  const deadlineCountdown = getDeadlineCountdown();

  const location = tournament.venue
    ? `${tournament.venue.name}${tournament.venue.city ? `, ${tournament.venue.city}` : ''}`
    : tournament.locationNotes || 'Location TBD';

  return (
    <>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        {tournament.bannerUrl && (
          <div className="absolute inset-0 opacity-20">
            <img
              src={tournament.bannerUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            {/* Status Badge */}
            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full mb-4 ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>

            {/* Tournament Name */}
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              {tournament.name}
            </h1>

            {/* Key Details */}
            <div className="flex flex-wrap items-center gap-4 text-white/90 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>
                  {formatDateShort(tournament.startsAt)} - {formatDateShort(tournament.endsAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span>{location}</span>
              </div>
            </div>

            {/* Registration Stats */}
            {tournament.status === 'registration_open' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/80">Registration Progress</span>
                  <span className="text-sm font-medium">
                    {tournament.currentParticipants} / {tournament.maxParticipants} registered
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
                href={`/sign-up?redirect=/tournaments/${tournament.id}/register`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Trophy className="w-5 h-5" />
                {tournament.status === 'registration_open'
                  ? 'Sign Up to Register'
                  : 'Sign Up to View'}
              </Link>
              <ShareButtons
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={tournament.name}
                description={tournament.description || `Check out ${tournament.name}!`}
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
            {tournament.description && (
              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  About This Tournament
                </h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {tournament.description}
                </p>
              </section>
            )}

            {/* Events */}
            {tournament.events && tournament.events.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Events ({tournament.events.length})
                </h2>
                <div className="space-y-4">
                  {tournament.events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {event.name || `${event.category} - ${event.skillLevel}`}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {event.format} | {event.currentParticipants}/{event.maxParticipants} registered
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${event.entryFee}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Entry Fee
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Dates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Key Dates
              </h3>
              <div className="space-y-4">
                {tournament.registrationClosesAt && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Registration Deadline</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(tournament.registrationClosesAt)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tournament Start</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(tournament.startsAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tournament End</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(tournament.endsAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Info */}
            {tournament.venue && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Venue
                </h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {tournament.venue.name}
                    </p>
                    {tournament.venue.streetAddress && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {tournament.venue.streetAddress}
                      </p>
                    )}
                    {(tournament.venue.city || tournament.venue.state) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {[tournament.venue.city, tournament.venue.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Organizer */}
            {tournament.organizer && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Organizer
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                    <span className="text-brand-700 dark:text-brand-400 font-medium">
                      {(tournament.organizer.displayName || tournament.organizer.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {tournament.organizer.displayName || tournament.organizer.username}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tournament Director
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Share & QR Code */}
            <div className="hidden lg:block">
              <QRCodeGenerator
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={tournament.name}
                size={180}
                variant="card"
                colorScheme="brand"
              />
            </div>

            {/* Mobile CTA */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom">
              <Link
                href={`/sign-up?redirect=/tournaments/${tournament.id}/register`}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Trophy className="w-5 h-5" />
                {tournament.status === 'registration_open'
                  ? 'Sign Up to Register'
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
function TournamentJsonLd({ tournament }: { tournament: Tournament }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.paddle-up.app';

  const location = tournament.venue
    ? {
        '@type': 'Place',
        name: tournament.venue.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: tournament.venue.streetAddress || undefined,
          addressLocality: tournament.venue.city || undefined,
          addressRegion: tournament.venue.state || undefined,
        },
      }
    : tournament.locationNotes
    ? {
        '@type': 'Place',
        name: tournament.locationNotes,
      }
    : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.name,
    description: tournament.description || `${tournament.name} pickleball tournament`,
    startDate: tournament.startsAt,
    endDate: tournament.endsAt,
    eventStatus: tournament.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location,
    organizer: tournament.organizer
      ? {
          '@type': 'Person',
          name: tournament.organizer.displayName || tournament.organizer.username,
        }
      : undefined,
    url: `${appUrl}/t/${tournament.slug}`,
    image: tournament.bannerUrl || undefined,
    sport: 'Pickleball',
    maximumAttendeeCapacity: tournament.maxParticipants,
    remainingAttendeeCapacity: tournament.maxParticipants - tournament.currentParticipants,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Main Page Component
export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await getTournament(slug);

  if (!tournament) {
    notFound();
  }

  return (
    <>
      <TournamentJsonLd tournament={tournament} />
      <TournamentClientContent tournament={tournament} />
    </>
  );
}
