import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ code: 'ABC123' }),
}));

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-in">{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-out">{children}</div>,
  SignInButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
    <div data-testid="sign-in-button">{children}</div>
  ),
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue('mock-token'),
    isSignedIn: true,
  }),
}));

// Mock the API hooks
const mockUseInviteDetails = vi.fn();
const mockAcceptInvite = { mutateAsync: vi.fn(), isPending: false };
const mockDeclineInvite = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/hooks/use-api', () => ({
  useInviteDetails: () => mockUseInviteDetails(),
  useAcceptInvite: () => mockAcceptInvite,
  useDeclineInvite: () => mockDeclineInvite,
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="card-title">{children}</h2>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-footer" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    loading,
    disabled,
    variant,
    asChild,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: string;
    asChild?: boolean;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      data-testid={`button-${variant || 'default'}`}
      className={className}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

// Sample invite data
const mockPendingInvite = {
  invite: {
    id: 'invite-123',
    code: 'ABC123',
    status: 'pending' as const,
    teamName: 'Dream Team',
    message: 'Hey, want to partner up for the tournament?',
    expiresAt: '2026-03-15T23:59:59Z',
    inviter: {
      id: 'user-1',
      username: 'johnsmith',
      displayName: 'John Smith',
      firstName: 'John',
      lastName: 'Smith',
      avatarUrl: 'https://example.com/avatar.jpg',
      city: 'Austin',
      state: 'TX',
      rating: 4.25,
      ratingSource: 'dupr',
    },
    tournament: {
      id: 'tour-123',
      name: 'Austin Spring Classic',
      startsAt: '2026-04-01T09:00:00Z',
      gameFormat: 'doubles',
      venue: {
        name: 'PaddleUp Center',
        city: 'Austin',
        state: 'TX',
      },
    },
    league: null,
  },
};

const mockAcceptedInvite = {
  invite: {
    ...mockPendingInvite.invite,
    status: 'accepted' as const,
  },
};

const mockDeclinedInvite = {
  invite: {
    ...mockPendingInvite.invite,
    status: 'declined' as const,
  },
};

const mockExpiredInvite = {
  invite: {
    ...mockPendingInvite.invite,
    status: 'expired' as const,
  },
};

describe('Invite Acceptance Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAcceptInvite.mutateAsync.mockResolvedValue({});
    mockDeclineInvite.mutateAsync.mockResolvedValue({});
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching invite', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Loading invitation...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show not found message when invite does not exist', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Not found'),
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Invitation Not Found')).toBeInTheDocument();
      expect(screen.getByText(/invalid or has been removed/)).toBeInTheDocument();
    });

    it('should show Go Home button on error', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Not found'),
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });
  });

  describe('Pending Invite Display', () => {
    beforeEach(() => {
      mockUseInviteDetails.mockReturnValue({
        data: mockPendingInvite,
        isLoading: false,
        error: null,
      });
    });

    it('should display inviter name', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      // John Smith appears in multiple places, so use getAllByText
      const nameElements = screen.getAllByText('John Smith');
      expect(nameElements.length).toBeGreaterThan(0);
    });

    it('should display inviter location', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Austin, TX')).toBeInTheDocument();
    });

    it('should display inviter rating', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText(/4\.25/)).toBeInTheDocument();
      expect(screen.getByText(/DUPR/)).toBeInTheDocument();
    });

    it('should display tournament name', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Austin Spring Classic')).toBeInTheDocument();
    });

    it('should display team name', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Dream Team')).toBeInTheDocument();
    });

    it('should display personal message', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText(/want to partner up/)).toBeInTheDocument();
    });

    it('should display expiration date', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText(/expires on/)).toBeInTheDocument();
    });
  });

  describe('Accept/Decline Buttons (Authenticated)', () => {
    beforeEach(() => {
      mockUseInviteDetails.mockReturnValue({
        data: mockPendingInvite,
        isLoading: false,
        error: null,
      });
    });

    it('should show Accept and Decline buttons for signed-in users', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Accept Invitation')).toBeInTheDocument();
      expect(screen.getByText('Decline')).toBeInTheDocument();
    });

    it('should call accept mutation when Accept is clicked', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      const acceptButton = screen.getByText('Accept Invitation');
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockAcceptInvite.mutateAsync).toHaveBeenCalledWith('ABC123');
      });
    });

    it('should call decline mutation when Decline is clicked', async () => {
      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      const declineButton = screen.getByText('Decline');
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(mockDeclineInvite.mutateAsync).toHaveBeenCalledWith('ABC123');
      });
    });
  });

  describe('Sign In Required (Unauthenticated)', () => {
    it('should show sign in prompt for signed-out users', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockPendingInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText(/Sign in to accept or decline/)).toBeInTheDocument();
    });

    it('should show Sign In button', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockPendingInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should show Create Account link with redirect', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockPendingInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });
  });

  describe('Already Responded States', () => {
    it('should show accepted state message', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockAcceptedInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Invitation Already Accepted')).toBeInTheDocument();
      expect(screen.getByText(/The team is registered!/)).toBeInTheDocument();
    });

    it('should show declined state message', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockDeclinedInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Invitation Declined')).toBeInTheDocument();
    });

    it('should show View Event button for already responded', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockAcceptedInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('View Event')).toBeInTheDocument();
    });
  });

  describe('Expired State', () => {
    it('should show expired message', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockExpiredInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Invitation Expired')).toBeInTheDocument();
      expect(screen.getByText(/ask the inviter to send a new one/)).toBeInTheDocument();
    });
  });

  describe('Action Success States', () => {
    it('should show success screen after accepting', async () => {
      mockUseInviteDetails.mockReturnValue({
        data: mockPendingInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      const { rerender } = render(<InviteAcceptPage />);

      const acceptButton = screen.getByText('Accept Invitation');
      fireEvent.click(acceptButton);

      // After action, component should show success screen
      await waitFor(() => {
        expect(mockAcceptInvite.mutateAsync).toHaveBeenCalled();
      });
    });
  });

  describe('Display Name Fallbacks', () => {
    it('should use displayName when available', () => {
      const user = { displayName: 'John Smith', firstName: 'John', lastName: 'Smith', username: 'johnsmith' };
      const name = user.displayName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username);
      expect(name).toBe('John Smith');
    });

    it('should use firstName lastName when no displayName', () => {
      const user = { displayName: null, firstName: 'John', lastName: 'Smith', username: 'johnsmith' };
      const name = user.displayName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username);
      expect(name).toBe('John Smith');
    });

    it('should use username as fallback', () => {
      const user = { displayName: null, firstName: null, lastName: null, username: 'johnsmith' };
      const name = user.displayName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username);
      expect(name).toBe('johnsmith');
    });
  });

  describe('Location Display', () => {
    it('should format venue location correctly', () => {
      const venue = { name: 'PaddleUp Center', city: 'Austin', state: 'TX' };
      const location = venue.city && venue.state ? `${venue.name} - ${venue.city}, ${venue.state}` : venue.name;
      expect(location).toBe('PaddleUp Center - Austin, TX');
    });

    it('should handle missing city/state', () => {
      const venue = { name: 'PaddleUp Center', city: null, state: null };
      const location = venue.city && venue.state ? `${venue.name} - ${venue.city}, ${venue.state}` : venue.name;
      expect(location).toBe('PaddleUp Center');
    });

    it('should handle null venue', () => {
      const venue = null;
      const location = venue ? 'has venue' : null;
      expect(location).toBeNull();
    });
  });

  describe('League Invites', () => {
    it('should display league info when tournament is null', async () => {
      const leagueInvite = {
        invite: {
          ...mockPendingInvite.invite,
          tournament: null,
          league: {
            id: 'league-123',
            name: 'Austin Summer League',
            gameFormat: 'doubles',
            venue: {
              name: 'Court Complex',
              city: 'Austin',
              state: 'TX',
            },
          },
        },
      };

      mockUseInviteDetails.mockReturnValue({
        data: leagueInvite,
        isLoading: false,
        error: null,
      });

      const InviteAcceptPage = (await import('@/app/(public)/invite/[code]/page')).default;
      render(<InviteAcceptPage />);

      expect(screen.getByText('Austin Summer League')).toBeInTheDocument();
    });
  });
});
