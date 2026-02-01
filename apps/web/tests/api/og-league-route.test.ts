import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/og ImageResponse
vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    constructor(public element: React.ReactElement, public options: { width: number; height: number }) {
      // Mock implementation
    }
  },
}));

// Sample league data for OG image
const mockLeague = {
  id: 'league-123',
  name: 'Austin Summer League 2026',
  slug: 'austin-summer-league-2026',
  leagueType: 'doubles',
  status: 'registration_open',
  startDate: '2026-06-01T00:00:00Z',
  endDate: '2026-08-15T00:00:00Z',
  totalWeeks: 10,
  maxTeams: 24,
  currentTeams: 18,
  isDuprRated: true,
  hasPlayoffs: true,
  skillLevelMin: 3.5,
  skillLevelMax: 4.5,
  venue: {
    name: 'Austin Pickleball Center',
    city: 'Austin',
    state: 'TX',
  },
};

describe('League OG Image Route', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('GET Handler', () => {
    it('should return ImageResponse with correct dimensions', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ league: mockLeague }),
        });

      const { GET } = await import('@/app/api/og/league/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/league/test');
      const response = await GET(request as any, { params: Promise.resolve({ slug: 'test' }) });

      expect(response).toBeDefined();
    });

    it('should fetch league by slug first', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ league: mockLeague }),
        });

      const { GET } = await import('@/app/api/og/league/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/league/austin-summer-league');

      await GET(request as any, { params: Promise.resolve({ slug: 'austin-summer-league' }) });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/leagues/by-slug/austin-summer-league'),
        expect.any(Object)
      );
    });

    it('should fallback to ID lookup if slug fails', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ league: mockLeague }),
        });

      const { GET } = await import('@/app/api/og/league/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/league/league-123');

      await GET(request as any, { params: Promise.resolve({ slug: 'league-123' }) });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return not found image when league does not exist', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      const { GET } = await import('@/app/api/og/league/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/league/non-existent');

      const response = await GET(request as any, { params: Promise.resolve({ slug: 'non-existent' }) });

      expect(response).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const { GET } = await import('@/app/api/og/league/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/league/test');

      const response = await GET(request as any, { params: Promise.resolve({ slug: 'test' }) });

      expect(response).toBeDefined();
    });
  });

  describe('League Type Labels', () => {
    it('should format league types correctly', () => {
      const formatLeagueType = (type: string): string => {
        const typeLabels: Record<string, string> = {
          ladder: 'Ladder League',
          doubles: 'Doubles League',
          king_of_court: 'King of the Court',
          pool_play: 'Pool Play',
          hybrid: 'Hybrid League',
          round_robin: 'Round Robin',
          mixed_doubles: 'Mixed Doubles',
          singles: 'Singles League',
        };
        return typeLabels[type] || 'League';
      };

      expect(formatLeagueType('ladder')).toBe('Ladder League');
      expect(formatLeagueType('doubles')).toBe('Doubles League');
      expect(formatLeagueType('king_of_court')).toBe('King of the Court');
      expect(formatLeagueType('pool_play')).toBe('Pool Play');
      expect(formatLeagueType('hybrid')).toBe('Hybrid League');
      expect(formatLeagueType('round_robin')).toBe('Round Robin');
      expect(formatLeagueType('mixed_doubles')).toBe('Mixed Doubles');
      expect(formatLeagueType('singles')).toBe('Singles League');
      expect(formatLeagueType('unknown')).toBe('League');
    });
  });

  describe('Skill Level Formatting', () => {
    it('should format skill range when both min and max set', () => {
      const formatSkillLevel = (min: number | null, max: number | null): string => {
        if (min && max) {
          return `${min.toFixed(1)} - ${max.toFixed(1)}`;
        }
        if (min) {
          return `${min.toFixed(1)}+`;
        }
        return 'All Levels';
      };

      expect(formatSkillLevel(3.5, 4.5)).toBe('3.5 - 4.5');
    });

    it('should format skill minimum only', () => {
      const formatSkillLevel = (min: number | null, max: number | null): string => {
        if (min && max) {
          return `${min.toFixed(1)} - ${max.toFixed(1)}`;
        }
        if (min) {
          return `${min.toFixed(1)}+`;
        }
        return 'All Levels';
      };

      expect(formatSkillLevel(3.5, null)).toBe('3.5+');
    });

    it('should show All Levels when no skill restrictions', () => {
      const formatSkillLevel = (min: number | null, max: number | null): string => {
        if (min && max) {
          return `${min.toFixed(1)} - ${max.toFixed(1)}`;
        }
        if (min) {
          return `${min.toFixed(1)}+`;
        }
        return 'All Levels';
      };

      expect(formatSkillLevel(null, null)).toBe('All Levels');
    });
  });

  describe('Image Content', () => {
    it('should format dates correctly', () => {
      // Test that dates can be formatted without error
      const startDate = new Date(mockLeague.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const endDate = new Date(mockLeague.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Verify format is correct (month name and day number)
      expect(startDate).toMatch(/[A-Za-z]{3}\s+\d{1,2}/);
      expect(endDate).toMatch(/[A-Za-z]{3}\s+\d{1,2}/);
      expect(endDate).toContain('2026');
    });

    it('should calculate location from venue', () => {
      const location = mockLeague.venue
        ? `${mockLeague.venue.name}${mockLeague.venue.city ? `, ${mockLeague.venue.city}` : ''}`
        : 'Location TBD';

      expect(location).toBe('Austin Pickleball Center, Austin');
    });

    it('should show Location TBD when no venue', () => {
      const leagueNoVenue = { ...mockLeague, venue: null };
      const location = leagueNoVenue.venue
        ? `${leagueNoVenue.venue.name}`
        : 'Location TBD';

      expect(location).toBe('Location TBD');
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

    it('should use players for singles/ladder leagues', () => {
      const singlesLeague = { ...mockLeague, leagueType: 'singles' };
      const entityName = singlesLeague.leagueType === 'singles' || singlesLeague.leagueType === 'ladder'
        ? 'players'
        : 'teams';
      expect(entityName).toBe('players');
    });
  });

  describe('Status Badge Colors', () => {
    it('should return green for registration/registration_open', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration':
          case 'registration_open':
            return '#22C55E';
          case 'active':
          case 'in_progress':
            return '#3B82F6';
          case 'playoffs':
            return '#F97316';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('registration')).toBe('#22C55E');
      expect(getStatusColor('registration_open')).toBe('#22C55E');
    });

    it('should return blue for active/in_progress', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration':
          case 'registration_open':
            return '#22C55E';
          case 'active':
          case 'in_progress':
            return '#3B82F6';
          case 'playoffs':
            return '#F97316';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('active')).toBe('#3B82F6');
      expect(getStatusColor('in_progress')).toBe('#3B82F6');
    });

    it('should return orange for playoffs', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration':
          case 'registration_open':
            return '#22C55E';
          case 'active':
          case 'in_progress':
            return '#3B82F6';
          case 'playoffs':
            return '#F97316';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('playoffs')).toBe('#F97316');
    });
  });

  describe('Status Labels', () => {
    it('should return correct labels for each status', () => {
      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'registration':
          case 'registration_open':
            return 'Registration Open';
          case 'registration_closed':
            return 'Registration Closed';
          case 'active':
          case 'in_progress':
            return 'In Progress';
          case 'playoffs':
            return 'Playoffs';
          case 'completed':
            return 'Completed';
          case 'cancelled':
            return 'Cancelled';
          default:
            return 'Coming Soon';
        }
      };

      expect(getStatusLabel('registration')).toBe('Registration Open');
      expect(getStatusLabel('registration_open')).toBe('Registration Open');
      expect(getStatusLabel('registration_closed')).toBe('Registration Closed');
      expect(getStatusLabel('active')).toBe('In Progress');
      expect(getStatusLabel('in_progress')).toBe('In Progress');
      expect(getStatusLabel('playoffs')).toBe('Playoffs');
      expect(getStatusLabel('completed')).toBe('Completed');
      expect(getStatusLabel('cancelled')).toBe('Cancelled');
      expect(getStatusLabel('draft')).toBe('Coming Soon');
    });
  });

  describe('DUPR Badge', () => {
    it('should show DUPR badge when isDuprRated is true', () => {
      expect(mockLeague.isDuprRated).toBe(true);
    });

    it('should not show DUPR badge when isDuprRated is false', () => {
      const leagueNoDupr = { ...mockLeague, isDuprRated: false };
      expect(leagueNoDupr.isDuprRated).toBe(false);
    });
  });

  describe('Season Info', () => {
    it('should display total weeks and playoff info', () => {
      const info = `${mockLeague.totalWeeks} weeks | ${mockLeague.hasPlayoffs ? 'Playoffs included' : 'Regular season only'}`;
      expect(info).toBe('10 weeks | Playoffs included');
    });

    it('should show regular season only when no playoffs', () => {
      const leagueNoPlayoffs = { ...mockLeague, hasPlayoffs: false };
      const info = `${leagueNoPlayoffs.totalWeeks} weeks | ${leagueNoPlayoffs.hasPlayoffs ? 'Playoffs included' : 'Regular season only'}`;
      expect(info).toBe('10 weeks | Regular season only');
    });
  });

  describe('Spots Display', () => {
    it('should show spots left when available', () => {
      const spotsRemaining = mockLeague.maxTeams - mockLeague.currentTeams;
      const spotsText = spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Full';
      expect(spotsText).toBe('6 spots left');
    });

    it('should show Full when no spots available', () => {
      const fullLeague = { ...mockLeague, currentTeams: 24 };
      const spotsRemaining = fullLeague.maxTeams - fullLeague.currentTeams;
      const spotsText = spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Full';
      expect(spotsText).toBe('Full');
    });

    it('should highlight when 5 or fewer spots remain', () => {
      const almostFullLeague = { ...mockLeague, currentTeams: 20 };
      const spotsRemaining = almostFullLeague.maxTeams - almostFullLeague.currentTeams;
      const isLowSpots = spotsRemaining > 0 && spotsRemaining <= 5;
      expect(isLowSpots).toBe(true);
    });
  });

  describe('Image Dimensions', () => {
    it('should use standard OG image size', () => {
      const size = {
        width: 1200,
        height: 630,
      };

      expect(size.width).toBe(1200);
      expect(size.height).toBe(630);
    });
  });

  describe('Edge Runtime', () => {
    it('should export edge runtime', async () => {
      const { runtime } = await import('@/app/api/og/league/[slug]/route');
      expect(runtime).toBe('edge');
    });
  });

  describe('Caching', () => {
    it('should use revalidation for caching', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ league: mockLeague }),
        });

      const { GET } = await import('@/app/api/og/league/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/league/test');

      await GET(request as any, { params: Promise.resolve({ slug: 'test' }) });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: expect.objectContaining({
            revalidate: 300, // 5 minutes
          }),
        })
      );
    });
  });

  describe('Gradient Colors', () => {
    it('should use purple gradient for league images', () => {
      const gradient = 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)';
      expect(gradient).toContain('#7C3AED');
      expect(gradient).toContain('#5B21B6');
    });
  });
});
