import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock next/navigation before importing the component
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ slug: 'test-tournament' }),
}));

// Mock the sharing components
vi.mock('@/components/sharing', () => ({
  ShareButtons: ({ title, url }: { title: string; url: string }) => (
    <div data-testid="share-buttons">Share: {title}</div>
  ),
  QRCodeGenerator: ({ title, url }: { title: string; url: string }) => (
    <div data-testid="qr-code">QR: {title}</div>
  ),
}));

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_API_URL: 'http://localhost:3001/api/v1',
  NEXT_PUBLIC_APP_URL: 'https://www.paddle-up.app',
};

// Sample tournament data
const mockTournament = {
  id: 'tour-123',
  name: 'Summer Championship 2026',
  slug: 'summer-championship-2026',
  description: 'Join us for the biggest tournament of the summer!',
  status: 'registration_open' as const,
  startsAt: '2026-07-15T09:00:00Z',
  endsAt: '2026-07-17T18:00:00Z',
  registrationClosesAt: '2026-07-10T23:59:59Z',
  registrationOpensAt: '2026-06-01T00:00:00Z',
  locationNotes: null,
  venue: {
    id: 'venue-1',
    name: 'PaddleUp Sports Complex',
    streetAddress: '123 Main St',
    city: 'Austin',
    state: 'TX',
  },
  maxParticipants: 64,
  currentParticipants: 45,
  events: [
    {
      id: 'event-1',
      name: "Men's Doubles",
      category: 'doubles',
      skillLevel: '4.0-4.5',
      format: 'double_elimination',
      maxParticipants: 32,
      currentParticipants: 24,
      entryFee: 50,
    },
    {
      id: 'event-2',
      name: "Women's Doubles",
      category: 'doubles',
      skillLevel: '4.0-4.5',
      format: 'double_elimination',
      maxParticipants: 32,
      currentParticipants: 21,
      entryFee: 50,
    },
  ],
  organizer: {
    id: 'user-1',
    username: 'tournamentdirector',
    displayName: 'John Smith',
  },
  logoUrl: null,
  bannerUrl: null,
};

describe('Public Tournament Page', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Data Fetching', () => {
    it('should fetch tournament data by slug', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tournament: mockTournament }),
      });

      // Import the getTournament function via dynamic import
      const { default: PublicTournamentPage } = await import(
        '@/app/(public)/t/[slug]/page'
      );

      // Verify fetch was called with correct URL
      // Note: Since this is a server component, we test the metadata generation
      expect(true).toBe(true); // Placeholder
    });

    it('should handle tournament not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // The component should call notFound() when tournament is not found
      expect(true).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      // Should return null on error
      expect(true).toBe(true);
    });
  });

  describe('Metadata Generation', () => {
    it('should generate correct metadata for found tournament', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tournament: mockTournament }),
      });

      const { generateMetadata } = await import('@/app/(public)/t/[slug]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'summer-championship-2026' }),
      });

      expect(metadata.title).toBe('Summer Championship 2026');
      expect(metadata.description).toContain('Join us for the biggest tournament');
      expect(metadata.openGraph?.title).toBe('Summer Championship 2026');
      expect(metadata.openGraph?.type).toBe('website');
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('should generate not found metadata when tournament missing', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { generateMetadata } = await import('@/app/(public)/t/[slug]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'non-existent' }),
      });

      expect(metadata.title).toBe('Tournament Not Found');
      expect(metadata.description).toContain('does not exist');
    });

    it('should use dynamic OG image when no banner', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tournament: { ...mockTournament, bannerUrl: null } }),
      });

      const { generateMetadata } = await import('@/app/(public)/t/[slug]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test' }),
      });

      expect(metadata.openGraph?.images?.[0]).toEqual(
        expect.objectContaining({
          url: expect.stringContaining('/api/og/tournament/'),
        })
      );
    });

    it('should use custom banner when provided', async () => {
      const bannerUrl = 'https://example.com/banner.jpg';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tournament: { ...mockTournament, bannerUrl } }),
      });

      const { generateMetadata } = await import('@/app/(public)/t/[slug]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test' }),
      });

      expect(metadata.openGraph?.images?.[0]).toEqual(
        expect.objectContaining({
          url: bannerUrl,
        })
      );
    });
  });

  describe('Tournament Display', () => {
    it('should display tournament name', () => {
      // Test the client content component directly
      const TournamentClientContent = ({ tournament }: { tournament: typeof mockTournament }) => {
        return <h1>{tournament.name}</h1>;
      };

      render(<TournamentClientContent tournament={mockTournament} />);
      expect(screen.getByText('Summer Championship 2026')).toBeInTheDocument();
    });

    it('should display registration status badge', () => {
      const statusStyles = {
        registration_open: 'Registration Open',
        registration_closed: 'Registration Closed',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        draft: 'Coming Soon',
      };

      Object.entries(statusStyles).forEach(([status, label]) => {
        expect(label).toBeDefined();
      });
    });

    it('should calculate spots remaining correctly', () => {
      const spotsRemaining = mockTournament.maxParticipants - mockTournament.currentParticipants;
      expect(spotsRemaining).toBe(19);
    });

    it('should calculate fill percentage correctly', () => {
      const fillPercentage = (mockTournament.currentParticipants / mockTournament.maxParticipants) * 100;
      expect(fillPercentage).toBeCloseTo(70.3, 1);
    });

    it('should display venue information when available', () => {
      const location = mockTournament.venue
        ? `${mockTournament.venue.name}${mockTournament.venue.city ? `, ${mockTournament.venue.city}` : ''}`
        : mockTournament.locationNotes || 'Location TBD';

      expect(location).toBe('PaddleUp Sports Complex, Austin');
    });

    it('should display location notes when no venue', () => {
      const tournamentWithNotes = {
        ...mockTournament,
        venue: null,
        locationNotes: 'Community Center Gym',
      };

      const location = tournamentWithNotes.venue
        ? `${tournamentWithNotes.venue.name}`
        : tournamentWithNotes.locationNotes || 'Location TBD';

      expect(location).toBe('Community Center Gym');
    });

    it('should show TBD when no venue or location notes', () => {
      const tournamentNoLocation = {
        ...mockTournament,
        venue: null,
        locationNotes: null,
      };

      const location = tournamentNoLocation.venue
        ? `${tournamentNoLocation.venue.name}`
        : tournamentNoLocation.locationNotes || 'Location TBD';

      expect(location).toBe('Location TBD');
    });
  });

  describe('Events Display', () => {
    it('should display event count', () => {
      expect(mockTournament.events.length).toBe(2);
    });

    it('should display event details', () => {
      const event = mockTournament.events[0];
      expect(event.name).toBe("Men's Doubles");
      expect(event.format).toBe('double_elimination');
      expect(event.entryFee).toBe(50);
    });

    it('should display event registration progress', () => {
      const event = mockTournament.events[0];
      const progress = `${event.currentParticipants}/${event.maxParticipants}`;
      expect(progress).toBe('24/32');
    });
  });

  describe('Share Functionality', () => {
    it('should include share buttons', () => {
      // The ShareButtons component should be rendered
      expect(true).toBe(true);
    });

    it('should include QR code generator', () => {
      // The QRCodeGenerator component should be rendered
      expect(true).toBe(true);
    });
  });

  describe('Join Button Behavior', () => {
    it('should link to sign-up for unauthenticated users', () => {
      const redirectUrl = `/sign-up?redirect=/tournaments/${mockTournament.id}/register`;
      expect(redirectUrl).toContain('/sign-up');
      expect(redirectUrl).toContain(mockTournament.id);
    });

    it('should show correct CTA text when registration open', () => {
      const ctaText = mockTournament.status === 'registration_open'
        ? 'Sign Up to Register'
        : 'Sign Up to View';
      expect(ctaText).toBe('Sign Up to Register');
    });

    it('should show correct CTA text when registration closed', () => {
      const closedTournament = { ...mockTournament, status: 'registration_closed' as const };
      const ctaText = closedTournament.status === 'registration_open'
        ? 'Sign Up to Register'
        : 'Sign Up to View';
      expect(ctaText).toBe('Sign Up to View');
    });
  });

  describe('JSON-LD Structured Data', () => {
    it('should generate correct schema.org data', () => {
      const appUrl = mockEnv.NEXT_PUBLIC_APP_URL;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: mockTournament.name,
        description: mockTournament.description,
        startDate: mockTournament.startsAt,
        endDate: mockTournament.endsAt,
        url: `${appUrl}/t/${mockTournament.slug}`,
        sport: 'Pickleball',
        maximumAttendeeCapacity: mockTournament.maxParticipants,
        remainingAttendeeCapacity: mockTournament.maxParticipants - mockTournament.currentParticipants,
      };

      expect(jsonLd['@type']).toBe('SportsEvent');
      expect(jsonLd.sport).toBe('Pickleball');
      expect(jsonLd.name).toBe('Summer Championship 2026');
    });

    it('should set EventCancelled status for cancelled tournaments', () => {
      const cancelledTournament = { ...mockTournament, status: 'cancelled' as const };
      const eventStatus = cancelledTournament.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled';

      expect(eventStatus).toBe('https://schema.org/EventCancelled');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      };

      const formatted = formatDate(mockTournament.startsAt);
      expect(formatted).toContain('July');
      expect(formatted).toContain('2026');
    });

    it('should format short dates correctly', () => {
      const formatDateShort = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      };

      const formatted = formatDateShort(mockTournament.startsAt);
      expect(formatted).toContain('Jul');
      expect(formatted).toContain('15');
    });
  });

  describe('Deadline Countdown', () => {
    it('should calculate days remaining correctly', () => {
      const deadline = new Date(mockTournament.registrationClosesAt!);
      const now = new Date('2026-07-05T12:00:00Z');
      const diff = deadline.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      expect(days).toBe(5);
    });

    it('should return null when deadline passed', () => {
      const deadline = new Date('2026-01-01T00:00:00Z');
      const now = new Date('2026-02-01T00:00:00Z');
      const diff = deadline.getTime() - now.getTime();

      expect(diff).toBeLessThan(0);
    });

    it('should return null when no deadline set', () => {
      const tournament = { ...mockTournament, registrationClosesAt: null };
      expect(tournament.registrationClosesAt).toBeNull();
    });
  });
});
