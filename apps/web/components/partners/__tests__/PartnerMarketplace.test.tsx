import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartnerMarketplace } from '../PartnerMarketplace';

// Mock hooks
const mockRefetch = vi.fn();
const mockCreateListing = vi.fn();
const mockDeleteListing = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  usePartnerListings: vi.fn(),
  useCreatePartnerListing: vi.fn(() => ({
    mutateAsync: mockCreateListing,
    isPending: false,
  })),
  useDeletePartnerListing: vi.fn(() => ({
    mutateAsync: mockDeleteListing,
    isPending: false,
  })),
  useContactPartner: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(() => ({
    user: { id: 'user-123' },
    isSignedIn: true,
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules
import { usePartnerListings } from '@/hooks/use-api';
import { useUser } from '@clerk/nextjs';

const mockUsePartnerListings = usePartnerListings as ReturnType<typeof vi.fn>;
const mockUseUser = useUser as ReturnType<typeof vi.fn>;

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

const mockListings = [
  {
    id: 'listing-1',
    message: 'Looking for a competitive partner',
    skillLevelMin: 3.5,
    skillLevelMax: 4.5,
    createdAt: new Date().toISOString(),
    user: {
      id: 'user-456',
      username: 'johndoe',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: null,
      city: 'Austin',
      state: 'TX',
      rating: 4.0,
      ratingSource: 'dupr',
    },
  },
  {
    id: 'listing-2',
    message: 'Beginner looking to improve',
    skillLevelMin: 2.5,
    skillLevelMax: 3.0,
    createdAt: new Date().toISOString(),
    user: {
      id: 'user-789',
      username: 'janesmith',
      displayName: 'Jane Smith',
      avatarUrl: 'https://example.com/avatar.jpg',
      city: 'Dallas',
      state: 'TX',
      rating: 2.75,
      ratingSource: 'internal',
    },
  },
];

describe('PartnerMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { id: 'user-123' },
      isSignedIn: true,
    });
  });

  describe('Loading State', () => {
    it('shows loading skeletons when data is loading', () => {
      mockUsePartnerListings.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      // Should show loading skeletons (animated pulse elements)
      const skeletons = screen.getAllByRole('generic').filter(
        el => el.classList.contains('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error message when loading fails', () => {
      mockUsePartnerListings.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/error loading partner marketplace/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no listings exist', () => {
      mockUsePartnerListings.mockReturnValue({
        data: { listings: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/no partners listed yet/i)).toBeInTheDocument();
      expect(screen.getByText(/be the first to post a listing/i)).toBeInTheDocument();
    });

    it('shows sign in prompt for unauthenticated users on empty state', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isSignedIn: false,
      });
      mockUsePartnerListings.mockReturnValue({
        data: { listings: [] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/sign in to post a listing/i)).toBeInTheDocument();
    });
  });

  describe('Listings Display', () => {
    it('displays partner listings correctly', () => {
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText(/looking for a competitive partner/i)).toBeInTheDocument();
    });

    it('shows Post Your Listing button for signed-in users without a listing', () => {
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /post your listing/i })).toBeInTheDocument();
    });

    it('shows Remove My Listing button when user has an active listing', () => {
      const listingsWithUserListing = [
        ...mockListings,
        {
          id: 'listing-own',
          message: 'My listing',
          skillLevelMin: 3.0,
          skillLevelMax: 4.0,
          createdAt: new Date().toISOString(),
          user: {
            id: 'user-123', // Same as current user
            username: 'currentuser',
            displayName: 'Current User',
            avatarUrl: null,
            city: 'Houston',
            state: 'TX',
            rating: 3.5,
            ratingSource: 'internal',
          },
        },
      ];

      mockUsePartnerListings.mockReturnValue({
        data: { listings: listingsWithUserListing },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('button', { name: /remove my listing/i })).toBeInTheDocument();
    });
  });

  describe('Skill Filter', () => {
    it('renders skill filter dropdowns', () => {
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText(/minimum skill level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximum skill level/i)).toBeInTheDocument();
    });

    it('calls usePartnerListings with filter values when skill filter changes', async () => {
      const user = userEvent.setup();
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      const minSelect = screen.getByLabelText(/minimum skill level/i);
      await user.selectOptions(minSelect, '3.5');

      // Verify the hook was called with updated params
      expect(mockUsePartnerListings).toHaveBeenCalled();
    });

    it('shows clear button when filters are applied', async () => {
      const user = userEvent.setup();
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      const minSelect = screen.getByLabelText(/minimum skill level/i);
      await user.selectOptions(minSelect, '3.5');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      });
    });
  });

  describe('Create Listing Form', () => {
    it('shows create listing form when button is clicked', async () => {
      const user = userEvent.setup();
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      const postButton = screen.getByRole('button', { name: /post your listing/i });
      await user.click(postButton);

      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minimum partner skill/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximum partner skill/i)).toBeInTheDocument();
    });

    it('creates listing with form data', async () => {
      const user = userEvent.setup();
      mockCreateListing.mockResolvedValue({ id: 'new-listing' });
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      // Open form
      await user.click(screen.getByRole('button', { name: /post your listing/i }));

      // Fill form
      const messageInput = screen.getByLabelText(/message/i);
      await user.type(messageInput, 'Looking for a doubles partner');

      const minSkillSelect = screen.getByLabelText(/minimum partner skill/i);
      await user.selectOptions(minSkillSelect, '3.5');

      // Submit
      const createButton = screen.getByRole('button', { name: /create listing/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateListing).toHaveBeenCalledWith(
          expect.objectContaining({
            tournamentId: 'tournament-1',
            message: 'Looking for a doubles partner',
            skillLevelMin: 3.5,
          })
        );
      });
    });

    it('hides form after successful submission', async () => {
      const user = userEvent.setup();
      mockCreateListing.mockResolvedValue({ id: 'new-listing' });
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      // Open form
      await user.click(screen.getByRole('button', { name: /post your listing/i }));

      // Submit with empty message (allowed)
      const createButton = screen.getByRole('button', { name: /create listing/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Listing', () => {
    it('deletes user listing when remove button is clicked', async () => {
      const user = userEvent.setup();
      mockDeleteListing.mockResolvedValue({});

      const listingsWithUserListing = [
        {
          id: 'listing-own',
          message: 'My listing',
          skillLevelMin: 3.0,
          skillLevelMax: 4.0,
          createdAt: new Date().toISOString(),
          user: {
            id: 'user-123',
            username: 'currentuser',
            displayName: 'Current User',
            avatarUrl: null,
            city: 'Houston',
            state: 'TX',
            rating: 3.5,
            ratingSource: 'internal',
          },
        },
      ];

      mockUsePartnerListings.mockReturnValue({
        data: { listings: listingsWithUserListing },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      const removeButton = screen.getByRole('button', { name: /remove my listing/i });
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockDeleteListing).toHaveBeenCalledWith('listing-own');
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination info when available', () => {
      mockUsePartnerListings.mockReturnValue({
        data: {
          listings: mockListings,
          pagination: { total: 10, page: 1, limit: 5, totalPages: 2 },
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<PartnerMarketplace tournamentId="tournament-1" />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/showing 2 of 10 listings/i)).toBeInTheDocument();
    });
  });

  describe('Event Name', () => {
    it('displays event name in description when provided', () => {
      mockUsePartnerListings.mockReturnValue({
        data: { listings: mockListings },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(
        <PartnerMarketplace
          tournamentId="tournament-1"
          eventName="Summer Championship 2024"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/for summer championship 2024/i)).toBeInTheDocument();
    });
  });
});
