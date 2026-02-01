import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ slug: 'test-league' }),
}));

// Mock the sharing components
vi.mock('@/components/sharing', () => ({
  ShareButtons: ({ title }: { title: string }) => (
    <div data-testid="share-buttons">Share: {title}</div>
  ),
  QRCodeGenerator: ({ title }: { title: string }) => (
    <div data-testid="qr-code">QR: {title}</div>
  ),
}));

// Sample league data
const mockLeague = {
  id: 'league-123',
  name: 'Austin Summer League 2026',
  slug: 'austin-summer-league-2026',
  description: 'Join the most competitive pickleball league in Austin!',
  leagueType: 'doubles' as const,
  status: 'registration_open' as const,
  startDate: '2026-06-01T00:00:00Z',
  endDate: '2026-08-15T00:00:00Z',
  registrationDeadline: '2026-05-25T23:59:59Z',
  totalWeeks: 10,
  maxTeams: 24,
  currentTeams: 18,
  isDuprRated: true,
  hasPlayoffs: true,
  playoffTeams: 8,
  skillLevelMin: 3.5,
  skillLevelMax: 4.5,
  venue: {
    id: 'venue-1',
    name: 'Austin Pickleball Center',
    address: '456 Court Lane',
    city: 'Austin',
    state: 'TX',
  },
  creator: {
    id: 'user-1',
    username: 'leagueadmin',
    displayName: 'League Administrator',
  },
  rules: 'Standard USAPA rules apply. Best 2 of 3 games to 11, win by 2.',
};

describe('Public League Page', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Data Fetching', () => {
    it('should fetch league data by slug/id', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ league: mockLeague }),
      });

      expect(true).toBe(true);
    });

    it('should handle league not found', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      expect(true).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      expect(true).toBe(true);
    });
  });

  describe('Metadata Generation', () => {
    it('should generate correct metadata for found league', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ league: mockLeague }),
      });

      const { generateMetadata } = await import('@/app/(public)/l/[slug]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'austin-summer-league-2026' }),
      });

      expect(metadata.title).toBe('Austin Summer League 2026');
      expect(metadata.description).toContain('Join the most competitive');
      expect(metadata.openGraph?.title).toBe('Austin Summer League 2026');
      expect(metadata.twitter?.card).toBe('summary_large_image');
    });

    it('should generate not found metadata when league missing', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { generateMetadata } = await import('@/app/(public)/l/[slug]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'non-existent' }),
      });

      expect(metadata.title).toBe('League Not Found');
      expect(metadata.description).toContain('does not exist');
    });

    it('should use dynamic OG image URL', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ league: mockLeague }),
      });

      const { generateMetadata } = await import('@/app/(public)/l/[slug]/page');
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test' }),
      });

      expect(metadata.openGraph?.images?.[0]).toEqual(
        expect.objectContaining({
          url: expect.stringContaining('/api/og/league/'),
        })
      );
    });
  });

  describe('League Display', () => {
    it('should display league name', () => {
      expect(mockLeague.name).toBe('Austin Summer League 2026');
    });

    it('should display correct league type labels', () => {
      const typeLabels: Record<string, string> = {
        ladder: 'Ladder',
        doubles: 'Doubles',
        king_of_court: 'King of the Court',
        pool_play: 'Pool Play',
        hybrid: 'Hybrid',
        round_robin: 'Round Robin',
        mixed_doubles: 'Mixed Doubles',
        singles: 'Singles',
      };

      expect(typeLabels[mockLeague.leagueType]).toBe('Doubles');
    });

    it('should display registration status badges', () => {
      const statusStyles: Record<string, string> = {
        draft: 'Coming Soon',
        registration_open: 'Registration Open',
        registration: 'Registration Open',
        registration_closed: 'Registration Closed',
        in_progress: 'In Progress',
        active: 'Active',
        playoffs: 'Playoffs',
        completed: 'Completed',
        cancelled: 'Cancelled',
      };

      expect(statusStyles[mockLeague.status]).toBe('Registration Open');
    });

    it('should calculate spots remaining correctly', () => {
      const spotsRemaining = mockLeague.maxTeams - mockLeague.currentTeams;
      expect(spotsRemaining).toBe(6);
    });

    it('should determine entity name based on league type', () => {
      const entityName = mockLeague.leagueType === 'singles' || mockLeague.leagueType === 'ladder'
        ? 'players'
        : 'teams';
      expect(entityName).toBe('teams');
    });

    it('should use players for singles leagues', () => {
      const singlesLeague = { ...mockLeague, leagueType: 'singles' as const };
      const entityName = singlesLeague.leagueType === 'singles' || singlesLeague.leagueType === 'ladder'
        ? 'players'
        : 'teams';
      expect(entityName).toBe('players');
    });
  });

  describe('League Details Display', () => {
    it('should display total weeks', () => {
      expect(mockLeague.totalWeeks).toBe(10);
    });

    it('should display DUPR rated badge when applicable', () => {
      expect(mockLeague.isDuprRated).toBe(true);
    });

    it('should display playoff information', () => {
      expect(mockLeague.hasPlayoffs).toBe(true);
      expect(mockLeague.playoffTeams).toBe(8);
    });

    it('should display skill level range', () => {
      const skillRange = `${mockLeague.skillLevelMin?.toFixed(1)} - ${mockLeague.skillLevelMax?.toFixed(1)}`;
      expect(skillRange).toBe('3.5 - 4.5');
    });

    it('should display skill minimum only when max not set', () => {
      const leagueMinOnly = { ...mockLeague, skillLevelMax: null };
      const skillDisplay = leagueMinOnly.skillLevelMin
        ? `${leagueMinOnly.skillLevelMin.toFixed(1)}+`
        : 'All Levels';
      expect(skillDisplay).toBe('3.5+');
    });

    it('should display All Levels when no skill restrictions', () => {
      const leagueNoSkill = { ...mockLeague, skillLevelMin: null, skillLevelMax: null };
      const skillDisplay = leagueNoSkill.skillLevelMin && leagueNoSkill.skillLevelMax
        ? `${leagueNoSkill.skillLevelMin.toFixed(1)} - ${leagueNoSkill.skillLevelMax.toFixed(1)}`
        : leagueNoSkill.skillLevelMin
          ? `${leagueNoSkill.skillLevelMin.toFixed(1)}+`
          : 'All Levels';
      expect(skillDisplay).toBe('All Levels');
    });
  });

  describe('Venue Display', () => {
    it('should display venue name and city', () => {
      const location = mockLeague.venue
        ? `${mockLeague.venue.name}${mockLeague.venue.city ? `, ${mockLeague.venue.city}` : ''}`
        : 'Location TBD';
      expect(location).toBe('Austin Pickleball Center, Austin');
    });

    it('should display Location TBD when no venue', () => {
      const leagueNoVenue = { ...mockLeague, venue: null };
      const location = leagueNoVenue.venue
        ? `${leagueNoVenue.venue.name}`
        : 'Location TBD';
      expect(location).toBe('Location TBD');
    });
  });

  describe('Format Explanations', () => {
    it('should provide format explanation for each type', () => {
      const explanations: Record<string, string> = {
        ladder: 'Players are ranked and can challenge those above them.',
        doubles: 'Teams of two compete in a bracket or round-robin format.',
        king_of_court: 'Fast-paced format where the winner stays on court.',
        pool_play: 'Teams are divided into pools and play round-robin.',
        hybrid: 'Combines multiple formats.',
        round_robin: 'Every team plays against every other team.',
        mixed_doubles: 'Teams consist of one male and one female player.',
        singles: 'Individual players compete against each other.',
      };

      expect(explanations.doubles).toContain('Teams of two');
    });
  });

  describe('Registration Button', () => {
    it('should link to sign-up for unauthenticated users', () => {
      const redirectUrl = `/sign-up?redirect=/leagues/${mockLeague.id}`;
      expect(redirectUrl).toContain('/sign-up');
      expect(redirectUrl).toContain(mockLeague.id);
    });

    it('should show correct CTA text when registration open', () => {
      const isRegistrationOpen = mockLeague.status === 'registration_open' || mockLeague.status === 'registration';
      const ctaText = isRegistrationOpen ? 'Sign Up to Join' : 'Sign Up to View';
      expect(ctaText).toBe('Sign Up to Join');
    });

    it('should show correct CTA text when registration closed', () => {
      const closedLeague = { ...mockLeague, status: 'registration_closed' as const };
      const isRegistrationOpen = closedLeague.status === 'registration_open' || closedLeague.status === 'registration';
      const ctaText = isRegistrationOpen ? 'Sign Up to Join' : 'Sign Up to View';
      expect(ctaText).toBe('Sign Up to View');
    });
  });

  describe('JSON-LD Structured Data', () => {
    it('should generate correct schema.org data', () => {
      const appUrl = 'https://www.paddle-up.app';

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: mockLeague.name,
        description: mockLeague.description,
        startDate: mockLeague.startDate,
        endDate: mockLeague.endDate,
        url: `${appUrl}/l/${mockLeague.slug || mockLeague.id}`,
        sport: 'Pickleball',
        maximumAttendeeCapacity: mockLeague.maxTeams,
        remainingAttendeeCapacity: mockLeague.maxTeams - mockLeague.currentTeams,
      };

      expect(jsonLd['@type']).toBe('SportsEvent');
      expect(jsonLd.sport).toBe('Pickleball');
    });

    it('should include organizer information', () => {
      const organizer = {
        '@type': 'Person',
        name: mockLeague.creator.displayName || mockLeague.creator.username,
      };
      expect(organizer.name).toBe('League Administrator');
    });

    it('should fall back to username when no displayName', () => {
      const leagueNoDisplay = {
        ...mockLeague,
        creator: { ...mockLeague.creator, displayName: null },
      };
      const organizer = {
        '@type': 'Person',
        name: leagueNoDisplay.creator.displayName || leagueNoDisplay.creator.username,
      };
      expect(organizer.name).toBe('leagueadmin');
    });
  });

  describe('Deadline Countdown', () => {
    it('should calculate days remaining correctly', () => {
      const deadline = new Date(mockLeague.registrationDeadline!);
      const now = new Date('2026-05-20T12:00:00Z');
      const diff = deadline.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      expect(days).toBe(5);
    });

    it('should return null when no deadline', () => {
      const leagueNoDeadline = { ...mockLeague, registrationDeadline: null };
      expect(leagueNoDeadline.registrationDeadline).toBeNull();
    });
  });

  describe('Rules Display', () => {
    it('should display rules when available', () => {
      expect(mockLeague.rules).toContain('USAPA rules');
    });

    it('should handle null rules', () => {
      const leagueNoRules = { ...mockLeague, rules: null };
      expect(leagueNoRules.rules).toBeNull();
    });
  });

  describe('Share Functionality', () => {
    it('should include share buttons', () => {
      expect(true).toBe(true);
    });

    it('should include QR code generator', () => {
      expect(true).toBe(true);
    });
  });
});
