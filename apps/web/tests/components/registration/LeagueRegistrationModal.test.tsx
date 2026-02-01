import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeagueRegistrationModal } from '@/components/leagues/LeagueRegistrationModal';
import { render, createMockLeague, createMockPlayer } from './test-utils';

// Mock the API hooks
const mockRegisterMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
};

const mockPlayerSearchData = {
  players: [] as ReturnType<typeof createMockPlayer>[],
};

vi.mock('@/hooks/use-api', () => ({
  useRegisterForLeague: () => mockRegisterMutation,
  usePlayerSearch: (query: string) => ({
    data: query.length >= 2 ? mockPlayerSearchData : undefined,
    isLoading: false,
  }),
}));

describe('LeagueRegistrationModal', () => {
  const defaultLeague = createMockLeague();
  const defaultCurrentUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    rating: 3.5,
    ratingSource: 'dupr' as const,
  };

  const defaultProps = {
    league: defaultLeague,
    currentUser: defaultCurrentUser,
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterMutation.mutateAsync.mockReset();
    mockRegisterMutation.isPending = false;
    mockPlayerSearchData.players = [];
  });

  describe('modal opening and closing', () => {
    it('should render when isOpen is true', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByText(`Join ${defaultLeague.name}`)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<LeagueRegistrationModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText(`Join ${defaultLeague.name}`)).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<LeagueRegistrationModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<LeagueRegistrationModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('user rating display', () => {
    it('should display current user rating', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByText('3.50')).toBeInTheDocument();
      expect(screen.getByText('Your Rating')).toBeInTheDocument();
    });

    it('should display rating source badge', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByText('DUPR Verified')).toBeInTheDocument();
    });

    it('should display Not set when no rating', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          currentUser={{ ...defaultCurrentUser, rating: null }}
        />
      );

      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    it('should display required rating range', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByText('3.00 - 4.00')).toBeInTheDocument();
    });

    it('should display All skill levels when no restrictions', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          league={createMockLeague({ skillLevelMin: null, skillLevelMax: null })}
        />
      );

      expect(screen.getByText('All skill levels')).toBeInTheDocument();
    });
  });

  describe('rating eligibility', () => {
    it('should show error when user rating is too low', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          currentUser={{ ...defaultCurrentUser, rating: 2.5 }}
        />
      );

      expect(screen.getByText(/Your rating \(2.50\) is below the minimum requirement/)).toBeInTheDocument();
    });

    it('should show error when user rating is too high', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          currentUser={{ ...defaultCurrentUser, rating: 4.5 }}
        />
      );

      expect(screen.getByText(/Your rating \(4.50\) exceeds the maximum limit/)).toBeInTheDocument();
    });

    it('should show error when user has no rating but league requires one', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          currentUser={{ ...defaultCurrentUser, rating: null }}
        />
      );

      expect(screen.getByText('Your rating is not set. Please update your profile.')).toBeInTheDocument();
    });

    it('should show error when not signed in', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          currentUser={null}
        />
      );

      expect(screen.getByText('Please sign in to register')).toBeInTheDocument();
    });

    it('should disable submit when user is ineligible', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          currentUser={{ ...defaultCurrentUser, rating: 2.5 }}
        />
      );

      expect(screen.getByRole('button', { name: /join league/i })).toBeDisabled();
    });
  });

  describe('singles league (no partner required)', () => {
    it('should not show partner selection for singles leagues', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          league={createMockLeague({ leagueType: 'ladder' })}
        />
      );

      expect(screen.queryByText('Select Partner')).not.toBeInTheDocument();
    });

    it('should allow registration without partner for singles', async () => {
      mockRegisterMutation.mutateAsync.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          league={createMockLeague({ leagueType: 'ladder' })}
        />
      );

      await user.click(screen.getByRole('button', { name: /join league/i }));

      await waitFor(() => {
        expect(mockRegisterMutation.mutateAsync).toHaveBeenCalledWith({
          leagueId: defaultLeague.id,
          data: { partnerId: undefined, teamName: undefined },
        });
      });
    });
  });

  describe('doubles league (partner required)', () => {
    it('should show partner selection for doubles leagues', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByText('Select Partner')).toBeInTheDocument();
    });

    it('should show partner search input', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search for a partner by name...')).toBeInTheDocument();
    });

    it('should disable submit when no partner selected', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /join league/i })).toBeDisabled();
    });
  });

  describe('partner search', () => {
    beforeEach(() => {
      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe', rating: 3.5 }),
        createMockPlayer({ id: 'player-2', username: 'jane', displayName: 'Jane Smith', rating: 3.8 }),
      ];
    });

    it('should show search results when query is entered', async () => {
      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should not show current user in search results', async () => {
      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'user-123', username: 'testuser', displayName: 'Test User' }),
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe' }),
      ];

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        // Should filter out current user
        const searchResults = document.querySelector('.max-h-48');
        expect(within(searchResults as HTMLElement).queryByText('Test User')).not.toBeInTheDocument();
      });
    });

    it('should show No players found when no results', async () => {
      mockPlayerSearchData.players = [];

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'xyz');

      await waitFor(() => {
        expect(screen.getByText('No players found')).toBeInTheDocument();
      });
    });

    it('should select partner when clicked', async () => {
      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Partner should be selected and search cleared
      expect(screen.queryByPlaceholderText('Search for a partner by name...')).not.toBeInTheDocument();
      // Should show selected partner with remove option
      expect(screen.getByRole('button', { name: /remove partner/i })).toBeInTheDocument();
    });

    it('should allow removing selected partner', async () => {
      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Select a partner
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Remove the partner
      await user.click(screen.getByRole('button', { name: /remove partner/i }));

      // Should show search input again
      expect(screen.getByPlaceholderText('Search for a partner by name...')).toBeInTheDocument();
    });

    it('should show ineligible label for partners outside rating range', async () => {
      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe', rating: 2.0 }),
      ];

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('Ineligible')).toBeInTheDocument();
      });
    });
  });

  describe('team name input', () => {
    it('should show team name input when partner is selected', async () => {
      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe' }),
      ];

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Select a partner first
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Team name input should appear
      expect(screen.getByPlaceholderText('e.g., The Dinkers')).toBeInTheDocument();
    });

    it('should not show team name input before partner selection', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.queryByPlaceholderText('e.g., The Dinkers')).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    beforeEach(() => {
      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe' }),
      ];
    });

    it('should submit registration with partner and team name', async () => {
      mockRegisterMutation.mutateAsync.mockResolvedValue({ success: true });

      const onSuccess = vi.fn();
      const user = userEvent.setup();

      render(<LeagueRegistrationModal {...defaultProps} onSuccess={onSuccess} />);

      // Select partner
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Enter team name
      const teamNameInput = screen.getByPlaceholderText('e.g., The Dinkers');
      await user.type(teamNameInput, 'The Aces');

      // Submit
      await user.click(screen.getByRole('button', { name: /join league/i }));

      await waitFor(() => {
        expect(mockRegisterMutation.mutateAsync).toHaveBeenCalledWith({
          leagueId: defaultLeague.id,
          data: { partnerId: 'player-1', teamName: 'The Aces' },
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should show loading state during submission', async () => {
      mockRegisterMutation.isPending = true;

      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe' }),
      ];

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Select partner to enable submit
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Check loading state (button should show registering text and be disabled)
      expect(screen.getByRole('button', { name: /registering/i })).toBeDisabled();
    });

    it('should show error message when registration fails', async () => {
      mockRegisterMutation.mutateAsync.mockRejectedValue(new Error('Registration failed'));

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Select partner
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Submit
      await user.click(screen.getByRole('button', { name: /join league/i }));

      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument();
      });
    });

    it('should show validation error when partner not selected for doubles', async () => {
      // Use a fresh mock that allows checking validation
      mockRegisterMutation.mutateAsync.mockRejectedValue(new Error('Should not be called'));

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Try to submit without partner (button should be disabled)
      const submitButton = screen.getByRole('button', { name: /join league/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('success state', () => {
    beforeEach(() => {
      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe' }),
      ];
    });

    it('should show success message after registration', async () => {
      mockRegisterMutation.mutateAsync.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Select partner
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Submit
      await user.click(screen.getByRole('button', { name: /join league/i }));

      await waitFor(() => {
        expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
        expect(screen.getByText(/You have successfully registered for/)).toBeInTheDocument();
      });
    });

    it('should show team registration message in success state', async () => {
      mockRegisterMutation.mutateAsync.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Select partner
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));

      // Submit
      await user.click(screen.getByRole('button', { name: /join league/i }));

      await waitFor(() => {
        expect(screen.getByText(/You and John Doe are now registered as a team/)).toBeInTheDocument();
      });
    });

    it('should have Done button in success state that closes modal', async () => {
      mockRegisterMutation.mutateAsync.mockResolvedValue({ success: true });
      const onClose = vi.fn();

      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} onClose={onClose} />);

      // Select partner and submit
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('John Doe'));
      await user.click(screen.getByRole('button', { name: /join league/i }));

      await waitFor(() => {
        expect(screen.getByText('Registration Successful!')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('league capacity display', () => {
    it('should display current capacity', () => {
      render(<LeagueRegistrationModal {...defaultProps} />);

      expect(screen.getByText('8 / 16 spots filled')).toBeInTheDocument();
    });
  });

  describe('mixed doubles league', () => {
    it('should require partner for mixed doubles', () => {
      render(
        <LeagueRegistrationModal
          {...defaultProps}
          league={createMockLeague({ leagueType: 'mixed_doubles' })}
        />
      );

      expect(screen.getByText('Select Partner')).toBeInTheDocument();
    });
  });

  describe('partner rating eligibility', () => {
    beforeEach(() => {
      mockPlayerSearchData.players = [
        createMockPlayer({ id: 'player-1', username: 'john', displayName: 'John Doe', rating: 2.5 }),
      ];
    });

    it('should show warning when selected partner is below minimum rating', async () => {
      const user = userEvent.setup();
      render(<LeagueRegistrationModal {...defaultProps} />);

      // Select partner with low rating
      const searchInput = screen.getByPlaceholderText('Search for a partner by name...');
      await user.type(searchInput, 'jo');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // The partner should be disabled/ineligible
      expect(screen.getByText('Ineligible')).toBeInTheDocument();
    });
  });
});
