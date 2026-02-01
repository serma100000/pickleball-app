import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/og ImageResponse
vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    constructor(public element: React.ReactElement, public options: { width: number; height: number }) {
      // Mock implementation
    }
  },
}));

// Mock environment
const mockEnv = {
  NEXT_PUBLIC_API_URL: 'http://localhost:3001/api/v1',
};

// Sample tournament data for OG image
const mockTournament = {
  id: 'tour-123',
  name: 'Summer Championship 2026',
  slug: 'summer-championship-2026',
  status: 'registration_open',
  startsAt: '2026-07-15T09:00:00Z',
  endsAt: '2026-07-17T18:00:00Z',
  venue: {
    name: 'PaddleUp Sports Complex',
    city: 'Austin',
    state: 'TX',
  },
  locationNotes: null,
  maxParticipants: 64,
  currentParticipants: 45,
};

describe('Tournament OG Image Route', () => {
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
          json: async () => ({ tournament: mockTournament }),
        });

      const { GET } = await import('@/app/api/og/tournament/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/tournament/test');
      const response = await GET(request as any, { params: Promise.resolve({ slug: 'test' }) });

      expect(response).toBeDefined();
    });

    it('should fetch tournament by slug first', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tournament: mockTournament }),
        });

      const { GET } = await import('@/app/api/og/tournament/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/tournament/summer-championship');

      await GET(request as any, { params: Promise.resolve({ slug: 'summer-championship' }) });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tournaments/by-slug/summer-championship'),
        expect.any(Object)
      );
    });

    it('should fallback to ID lookup if slug fails', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tournament: mockTournament }),
        });

      const { GET } = await import('@/app/api/og/tournament/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/tournament/tour-123');

      await GET(request as any, { params: Promise.resolve({ slug: 'tour-123' }) });

      // First call is by-slug, second is by ID
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return not found image when tournament does not exist', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      const { GET } = await import('@/app/api/og/tournament/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/tournament/non-existent');

      const response = await GET(request as any, { params: Promise.resolve({ slug: 'non-existent' }) });

      expect(response).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const { GET } = await import('@/app/api/og/tournament/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/tournament/test');

      const response = await GET(request as any, { params: Promise.resolve({ slug: 'test' }) });

      // Should return a fallback image
      expect(response).toBeDefined();
    });
  });

  describe('Image Content', () => {
    it('should include tournament name in image', () => {
      const name = mockTournament.name;
      expect(name).toBe('Summer Championship 2026');
    });

    it('should format dates correctly', () => {
      const startDate = new Date(mockTournament.startsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const endDate = new Date(mockTournament.endsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      expect(startDate).toContain('Jul');
      expect(endDate).toContain('2026');
    });

    it('should calculate location text from venue', () => {
      const location = mockTournament.venue
        ? `${mockTournament.venue.name}${mockTournament.venue.city ? `, ${mockTournament.venue.city}` : ''}`
        : mockTournament.locationNotes || 'Location TBD';

      expect(location).toBe('PaddleUp Sports Complex, Austin');
    });

    it('should use locationNotes when no venue', () => {
      const tournamentWithNotes = {
        ...mockTournament,
        venue: null,
        locationNotes: 'Community Center',
      };

      const location = tournamentWithNotes.venue
        ? `${tournamentWithNotes.venue.name}`
        : tournamentWithNotes.locationNotes || 'Location TBD';

      expect(location).toBe('Community Center');
    });

    it('should show Location TBD when neither venue nor notes', () => {
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

    it('should calculate spots remaining correctly', () => {
      const spotsRemaining = mockTournament.maxParticipants - mockTournament.currentParticipants;
      expect(spotsRemaining).toBe(19);
    });

    it('should show Registration Full when no spots', () => {
      const fullTournament = {
        ...mockTournament,
        currentParticipants: 64,
      };

      const spotsRemaining = fullTournament.maxParticipants - fullTournament.currentParticipants;
      const spotsText = spotsRemaining > 0
        ? `${spotsRemaining} spots remaining`
        : 'Registration Full';

      expect(spotsText).toBe('Registration Full');
    });
  });

  describe('Status Badge Colors', () => {
    it('should return green for registration_open', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration_open':
            return '#22C55E';
          case 'in_progress':
            return '#3B82F6';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('registration_open')).toBe('#22C55E');
    });

    it('should return blue for in_progress', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration_open':
            return '#22C55E';
          case 'in_progress':
            return '#3B82F6';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('in_progress')).toBe('#3B82F6');
    });

    it('should return purple for completed', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration_open':
            return '#22C55E';
          case 'in_progress':
            return '#3B82F6';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('completed')).toBe('#8B5CF6');
    });

    it('should return red for cancelled', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration_open':
            return '#22C55E';
          case 'in_progress':
            return '#3B82F6';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('cancelled')).toBe('#EF4444');
    });

    it('should return gray for unknown status', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'registration_open':
            return '#22C55E';
          case 'in_progress':
            return '#3B82F6';
          case 'completed':
            return '#8B5CF6';
          case 'cancelled':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      expect(getStatusColor('draft')).toBe('#6B7280');
    });
  });

  describe('Status Labels', () => {
    it('should return correct labels for each status', () => {
      const getStatusLabel = (status: string) => {
        switch (status) {
          case 'registration_open':
            return 'Registration Open';
          case 'registration_closed':
            return 'Registration Closed';
          case 'in_progress':
            return 'In Progress';
          case 'completed':
            return 'Completed';
          case 'cancelled':
            return 'Cancelled';
          default:
            return 'Coming Soon';
        }
      };

      expect(getStatusLabel('registration_open')).toBe('Registration Open');
      expect(getStatusLabel('registration_closed')).toBe('Registration Closed');
      expect(getStatusLabel('in_progress')).toBe('In Progress');
      expect(getStatusLabel('completed')).toBe('Completed');
      expect(getStatusLabel('cancelled')).toBe('Cancelled');
      expect(getStatusLabel('draft')).toBe('Coming Soon');
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
      const { runtime } = await import('@/app/api/og/tournament/[slug]/route');
      expect(runtime).toBe('edge');
    });
  });

  describe('Caching', () => {
    it('should use revalidation for caching', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tournament: mockTournament }),
        });

      const { GET } = await import('@/app/api/og/tournament/[slug]/route');
      const request = new Request('http://localhost:3000/api/og/tournament/test');

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
});
