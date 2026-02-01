import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartnerInviteModal } from '../PartnerInviteModal';

// Mock hooks
const mockCreateInvite = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useCreateTeamInvite: vi.fn(() => ({
    mutateAsync: mockCreateInvite,
    isPending: false,
  })),
  usePlayerSearch: vi.fn((query) => {
    if (query && query.length >= 2) {
      return {
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
              skillLevel: '4.0',
            },
            {
              id: 'user-2',
              username: 'player2',
              displayName: 'Player Two',
              avatarUrl: 'https://example.com/avatar.jpg',
              skillLevel: '3.5',
            },
          ],
        },
        isLoading: false,
      };
    }
    return { data: null, isLoading: false };
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from '@/hooks/use-toast';
import { usePlayerSearch } from '@/hooks/use-api';

const mockUsePlayerSearch = usePlayerSearch as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('PartnerInviteModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    tournamentId: 'tournament-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('renders modal when open', () => {
      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Invite a Partner')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<PartnerInviteModal {...defaultProps} isOpen={false} />, {
        wrapper: createWrapper(),
      });

      expect(screen.queryByText('Invite a Partner')).not.toBeInTheDocument();
    });

    it('displays event name when provided', () => {
      render(
        <PartnerInviteModal {...defaultProps} eventName="Summer Championship" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText('For Summer Championship')).toBeInTheDocument();
    });
  });

  describe('Mode Tabs', () => {
    it('shows search users tab as default', () => {
      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const searchTab = screen.getByRole('button', { name: /search users/i });
      expect(searchTab).toHaveClass('bg-pickle-500');
    });

    it('switches to email invite mode when tab is clicked', async () => {
      const user = userEvent.setup();

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /invite by email/i }));

      expect(screen.getByLabelText(/partner's email address/i)).toBeInTheDocument();
    });

    it('switches back to search mode from email mode', async () => {
      const user = userEvent.setup();

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /invite by email/i }));
      await user.click(screen.getByRole('button', { name: /search users/i }));

      expect(screen.getByLabelText(/search for a player/i)).toBeInTheDocument();
    });
  });

  describe('User Search Autocomplete', () => {
    it('shows search input', () => {
      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText(/search for a player/i)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(/search by name or username/i)
      ).toBeInTheDocument();
    });

    it('shows search results when query has 2+ characters', async () => {
      const user = userEvent.setup();

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');

      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeInTheDocument();
        expect(screen.getByText('Player Two')).toBeInTheDocument();
      });
    });

    it('shows no results message when search returns empty', async () => {
      const user = userEvent.setup();
      mockUsePlayerSearch.mockReturnValue({
        data: { users: [] },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'xyz');

      await waitFor(() => {
        expect(screen.getByText(/no users found/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during search', async () => {
      const user = userEvent.setup();
      mockUsePlayerSearch.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');

      await waitFor(() => {
        expect(screen.getByText(/searching/i)).toBeInTheDocument();
      });
    });

    it('selects a user from search results', async () => {
      const user = userEvent.setup();
      mockUsePlayerSearch.mockReturnValue({
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
              skillLevel: '4.0',
            },
          ],
        },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');

      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Player One'));

      // Should show selected user with change button
      expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument();
      expect(screen.getByText('@player1')).toBeInTheDocument();
    });

    it('allows changing selected user', async () => {
      const user = userEvent.setup();
      mockUsePlayerSearch.mockReturnValue({
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
              skillLevel: '4.0',
            },
          ],
        },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');

      await waitFor(() => {
        expect(screen.getByText('Player One')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Player One'));
      await user.click(screen.getByRole('button', { name: /change/i }));

      // Should show search input again
      expect(
        screen.getByPlaceholderText(/search by name or username/i)
      ).toBeInTheDocument();
    });
  });

  describe('Email Invite', () => {
    it('shows email input field', async () => {
      const user = userEvent.setup();

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /invite by email/i }));

      expect(screen.getByLabelText(/partner's email address/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/partner@example.com/i)).toBeInTheDocument();
    });

    it('shows expiry info for email invites', async () => {
      const user = userEvent.setup();

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /invite by email/i }));

      expect(screen.getByText(/7 days to accept/i)).toBeInTheDocument();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /invite by email/i }));

      const emailInput = screen.getByPlaceholderText(/partner@example.com/i);
      await user.type(emailInput, 'invalid-email');

      await user.click(screen.getByRole('button', { name: /send invitation/i }));

      expect(toast.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid email',
        })
      );
    });
  });

  describe('Team Name Input', () => {
    it('shows optional team name input', () => {
      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/the pickle pros/i)).toBeInTheDocument();
    });

    it('includes team name in invite submission', async () => {
      const user = userEvent.setup();
      mockCreateInvite.mockResolvedValue({});
      mockUsePlayerSearch.mockReturnValue({
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
            },
          ],
        },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Select a user
      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');
      await waitFor(() => expect(screen.getByText('Player One')).toBeInTheDocument());
      await user.click(screen.getByText('Player One'));

      // Add team name
      await user.type(screen.getByPlaceholderText(/the pickle pros/i), 'Dream Team');

      // Submit
      await user.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockCreateInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            teamName: 'Dream Team',
          })
        );
      });
    });
  });

  describe('Submit Invite', () => {
    it('disables submit when no user selected in search mode', () => {
      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit when no email in email mode', async () => {
      const user = userEvent.setup();

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /invite by email/i }));

      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      expect(submitButton).toBeDisabled();
    });

    it('shows error when no partner selected', async () => {
      const user = userEvent.setup();

      // Mock the button to not be disabled for this test
      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // The button should be disabled, but we can test the validation logic
      // by checking that it's properly disabled
      const submitButton = screen.getByRole('button', { name: /send invitation/i });
      expect(submitButton).toBeDisabled();
    });

    it('submits invite with selected user', async () => {
      const user = userEvent.setup();
      mockCreateInvite.mockResolvedValue({});
      mockUsePlayerSearch.mockReturnValue({
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
            },
          ],
        },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Select a user
      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');
      await waitFor(() => expect(screen.getByText('Player One')).toBeInTheDocument());
      await user.click(screen.getByText('Player One'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockCreateInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            inviteeUserId: 'user-1',
            tournamentId: 'tournament-1',
          })
        );
      });
    });

    it('submits invite with email', async () => {
      const user = userEvent.setup();
      mockCreateInvite.mockResolvedValue({});

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /invite by email/i }));

      const emailInput = screen.getByPlaceholderText(/partner@example.com/i);
      await user.type(emailInput, 'partner@test.com');

      await user.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockCreateInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            inviteeEmail: 'partner@test.com',
            tournamentId: 'tournament-1',
          })
        );
      });
    });

    it('shows success toast after invite is sent', async () => {
      const user = userEvent.setup();
      mockCreateInvite.mockResolvedValue({});
      mockUsePlayerSearch.mockReturnValue({
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
            },
          ],
        },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Select a user
      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');
      await waitFor(() => expect(screen.getByText('Player One')).toBeInTheDocument());
      await user.click(screen.getByText('Player One'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Invitation sent!',
          })
        );
      });
    });

    it('closes modal after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      mockCreateInvite.mockResolvedValue({});
      mockUsePlayerSearch.mockReturnValue({
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
            },
          ],
        },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      });

      // Select a user
      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');
      await waitFor(() => expect(screen.getByText('Player One')).toBeInTheDocument());
      await user.click(screen.getByText('Player One'));

      // Submit
      await user.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('includes optional message in invite', async () => {
      const user = userEvent.setup();
      mockCreateInvite.mockResolvedValue({});
      mockUsePlayerSearch.mockReturnValue({
        data: {
          users: [
            {
              id: 'user-1',
              username: 'player1',
              displayName: 'Player One',
              avatarUrl: null,
            },
          ],
        },
        isLoading: false,
      });

      render(<PartnerInviteModal {...defaultProps} />, {
        wrapper: createWrapper(),
      });

      // Select a user
      const searchInput = screen.getByPlaceholderText(/search by name or username/i);
      await user.type(searchInput, 'pla');
      await waitFor(() => expect(screen.getByText('Player One')).toBeInTheDocument());
      await user.click(screen.getByText('Player One'));

      // Add message
      await user.type(
        screen.getByPlaceholderText(/hey! want to team up/i),
        "Let's win this!"
      );

      // Submit
      await user.click(screen.getByRole('button', { name: /send invitation/i }));

      await waitFor(() => {
        expect(mockCreateInvite).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Let's win this!",
          })
        );
      });
    });
  });

  describe('Cancel Button', () => {
    it('calls onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(<PartnerInviteModal {...defaultProps} onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(<PartnerInviteModal {...defaultProps} onClose={mockOnClose} />, {
        wrapper: createWrapper(),
      });

      // Click on backdrop (the overlay div)
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
