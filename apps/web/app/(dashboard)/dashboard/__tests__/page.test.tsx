/**
 * Unit Tests for Dashboard Page
 *
 * Tests cover:
 * - Stats card rendering with real data
 * - Stats loading skeleton state
 * - Stats error state
 * - Recent games section
 * - Upcoming tournaments section
 * - My leagues section
 * - Quick actions rendering
 * - Empty states for each section
 * - Greeting based on time of day
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../page';

// Mock the hooks
const mockUseAuth = vi.fn();
const mockUseUserStats = vi.fn();
const mockUseRecentGames = vi.fn();
const mockUseLeagues = vi.fn();
const mockUseUpcomingTournaments = vi.fn();

vi.mock('@/hooks', () => ({
  useAuth: () => mockUseAuth(),
  useUserStats: () => mockUseUserStats(),
  useRecentGames: () => mockUseRecentGames(),
  useLeagues: () => mockUseLeagues(),
  useUpcomingTournaments: () => mockUseUpcomingTournaments(),
}));

describe('DashboardPage', () => {
  const defaultAuthReturn = {
    profile: { id: 'user-1', firstName: 'John' },
    fullName: 'John Doe',
    isLoaded: true,
  };

  const defaultStatsReturn = {
    data: {
      gamesPlayed: 25,
      gamesPlayedThisWeek: 3,
      wins: 15,
      losses: 10,
      winRate: 0.6,
      winRateChange: 0.05,
      skillRating: 3.45,
      skillRatingChange: 0.15,
      playingPartners: 8,
      newPartnersThisMonth: 2,
      tournamentsParticipated: 4,
      tournamentsThisYear: 2,
    },
    isLoading: false,
    error: null,
  };

  const defaultGamesReturn = {
    data: {
      data: [
        {
          id: 'game-1',
          gameType: 'singles' as const,
          result: 'won' as const,
          scores: [{ team1: 11, team2: 8 }, { team1: 11, team2: 6 }],
          opponent: 'Jane Smith',
          playedAt: new Date().toISOString(),
        },
        {
          id: 'game-2',
          gameType: 'doubles' as const,
          result: 'lost' as const,
          scores: [{ team1: 8, team2: 11 }, { team1: 9, team2: 11 }],
          opponents: ['Alice', 'Bob'],
          playedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        },
      ],
    },
    isLoading: false,
    error: null,
  };

  const defaultLeaguesReturn = {
    data: {
      leagues: [
        {
          id: 'league-1',
          name: 'City League',
          leagueType: 'round_robin',
          status: 'active',
          currentWeek: 3,
          totalWeeks: 8,
          currentTeams: 12,
          maxTeams: 16,
          startDate: '2024-01-15',
          isUserRegistered: true,
        },
      ],
      total: 1,
    },
    isLoading: false,
    error: null,
  };

  const defaultTournamentsReturn = {
    data: {
      tournaments: [
        {
          id: 'tournament-1',
          name: 'Spring Championship',
          description: 'Annual spring tournament',
          startDate: '2024-04-15',
          location: 'Central Park',
          status: 'registration' as const,
          currentParticipants: 24,
          maxParticipants: 32,
          entryFee: 25,
          isUserRegistered: false,
        },
      ],
      total: 1,
    },
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthReturn);
    mockUseUserStats.mockReturnValue(defaultStatsReturn);
    mockUseRecentGames.mockReturnValue(defaultGamesReturn);
    mockUseLeagues.mockReturnValue(defaultLeaguesReturn);
    mockUseUpcomingTournaments.mockReturnValue(defaultTournamentsReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Welcome Section', () => {
    it('should display user name in greeting', () => {
      render(<DashboardPage />);

      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    });

    it('should display fallback when no full name', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthReturn,
        fullName: null,
        profile: { id: 'user-1', firstName: 'John' },
      });

      render(<DashboardPage />);

      expect(screen.getByText(/john/i)).toBeInTheDocument();
    });

    it('should display Player when no name available', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthReturn,
        fullName: null,
        profile: { id: 'user-1' },
      });

      render(<DashboardPage />);

      // Use getAllByText since "players" appears in multiple places
      const playerTexts = screen.getAllByText(/player/i);
      expect(playerTexts.length).toBeGreaterThan(0);
      // Check the heading specifically
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/player/i);
    });

    it('should have Log New Game button', () => {
      render(<DashboardPage />);

      expect(screen.getByRole('link', { name: /log new game/i })).toBeInTheDocument();
    });

    it('should link to games/new', () => {
      render(<DashboardPage />);

      expect(screen.getByRole('link', { name: /log new game/i })).toHaveAttribute(
        'href',
        '/games/new'
      );
    });
  });

  describe('Stats Cards', () => {
    it('should render games played stat', () => {
      render(<DashboardPage />);

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Games Played')).toBeInTheDocument();
    });

    it('should render win/loss stat', () => {
      render(<DashboardPage />);

      expect(screen.getByText('15-10')).toBeInTheDocument();
      expect(screen.getByText('Win/Loss')).toBeInTheDocument();
    });

    it('should render skill rating', () => {
      render(<DashboardPage />);

      expect(screen.getByText('3.45')).toBeInTheDocument();
      expect(screen.getByText('Skill Rating')).toBeInTheDocument();
    });

    it('should render tournaments stat', () => {
      render(<DashboardPage />);

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Tournaments')).toBeInTheDocument();
    });

    it('should show loading skeletons when loading', () => {
      mockUseUserStats.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<DashboardPage />);

      // Should have skeleton elements with animate-pulse
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('should show error state when stats fail to load', () => {
      mockUseUserStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
      });

      render(<DashboardPage />);

      expect(screen.getByText('Start playing!')).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('should render Log Game action', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Log Game')).toBeInTheDocument();
      expect(screen.getByText('Record your latest match')).toBeInTheDocument();
    });

    it('should render Create Tournament action', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Create Tournament')).toBeInTheDocument();
    });

    it('should render Browse Tournaments action', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Browse Tournaments')).toBeInTheDocument();
    });

    it('should render Join League action', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Join League')).toBeInTheDocument();
    });

    it('should have correct links for quick actions', () => {
      render(<DashboardPage />);

      const links = screen.getAllByRole('link');
      const hrefs = links.map((link) => link.getAttribute('href'));

      expect(hrefs).toContain('/games/new');
      expect(hrefs).toContain('/tournaments/new');
      expect(hrefs).toContain('/tournaments');
      expect(hrefs).toContain('/leagues');
    });
  });

  describe('Recent Games Section', () => {
    it('should render section header', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Recent Games')).toBeInTheDocument();
    });

    it('should render View all link', () => {
      render(<DashboardPage />);

      const viewAllLinks = screen.getAllByText('View all');
      expect(viewAllLinks.length).toBeGreaterThan(0);
    });

    it('should render game rows', () => {
      render(<DashboardPage />);

      expect(screen.getByText(/vs\. jane smith/i)).toBeInTheDocument();
    });

    it('should render game result', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Won')).toBeInTheDocument();
      expect(screen.getByText('Lost')).toBeInTheDocument();
    });

    it('should render game score', () => {
      render(<DashboardPage />);

      expect(screen.getByText(/11-8, 11-6/)).toBeInTheDocument();
    });

    it('should show loading skeletons when loading', () => {
      mockUseRecentGames.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<DashboardPage />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show empty state when no games', () => {
      mockUseRecentGames.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        error: null,
      });

      render(<DashboardPage />);

      expect(screen.getByText('No games yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log your first game/i })).toBeInTheDocument();
    });

    it('should show error state when fetch fails', () => {
      mockUseRecentGames.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed'),
      });

      render(<DashboardPage />);

      expect(screen.getByText(/couldn't load games/i)).toBeInTheDocument();
    });
  });

  describe('Upcoming Tournaments Section', () => {
    it('should render section header', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Upcoming Tournaments')).toBeInTheDocument();
    });

    it('should render tournament rows', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Spring Championship')).toBeInTheDocument();
    });

    it('should render tournament status badge', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('should render tournament location', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Central Park')).toBeInTheDocument();
    });

    it('should show empty state when no tournaments', () => {
      mockUseUpcomingTournaments.mockReturnValue({
        data: { tournaments: [], total: 0 },
        isLoading: false,
        error: null,
      });

      render(<DashboardPage />);

      expect(screen.getByText('No upcoming tournaments')).toBeInTheDocument();
    });
  });

  describe('My Leagues Section', () => {
    it('should render section header', () => {
      render(<DashboardPage />);

      expect(screen.getByText('My Leagues')).toBeInTheDocument();
    });

    it('should render league rows', () => {
      render(<DashboardPage />);

      expect(screen.getByText('City League')).toBeInTheDocument();
    });

    it('should render league status', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render league progress', () => {
      render(<DashboardPage />);

      expect(screen.getByText(/week 3\/8/i)).toBeInTheDocument();
    });

    it('should show empty state when no leagues', () => {
      mockUseLeagues.mockReturnValue({
        data: { leagues: [], total: 0 },
        isLoading: false,
        error: null,
      });

      render(<DashboardPage />);

      expect(screen.getByText('No leagues yet')).toBeInTheDocument();
    });
  });

  describe('Tips Section', () => {
    it('should render tips section', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Get More from Paddle Up')).toBeInTheDocument();
    });

    it('should render Track Your Progress tip', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Track Your Progress')).toBeInTheDocument();
    });

    it('should render Compete in Tournaments tip', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Compete in Tournaments')).toBeInTheDocument();
    });

    it('should render Find Your Crew tip', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Find Your Crew')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have heading structure', () => {
      render(<DashboardPage />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    });

    it('should have accessible links', () => {
      render(<DashboardPage />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        // Either has text content or an aria-label
        const hasAccessibleName =
          link.textContent?.trim() !== '' || link.getAttribute('aria-label');
        expect(hasAccessibleName).toBe(true);
      });
    });
  });

  describe('Date Formatting', () => {
    it('should show Today for current date games', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('should show Yesterday for yesterday games', () => {
      render(<DashboardPage />);

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });
  });

  describe('Doubles Games', () => {
    it('should format opponents correctly for doubles', () => {
      render(<DashboardPage />);

      expect(screen.getByText(/vs\. alice & bob/i)).toBeInTheDocument();
    });

    it('should show Doubles type', () => {
      render(<DashboardPage />);

      expect(screen.getByText(/doubles/i)).toBeInTheDocument();
    });
  });
});
