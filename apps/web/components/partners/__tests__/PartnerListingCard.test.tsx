import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartnerListingCard } from '../PartnerListingCard';

// Mock hooks
const mockContactPartner = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useContactPartner: vi.fn(() => ({
    mutateAsync: mockContactPartner,
    isPending: false,
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from '@/hooks/use-toast';

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

const baseListing = {
  id: 'listing-1',
  message: 'Looking for a competitive doubles partner for tournaments',
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
    skillLevel: '4.0',
    rating: 4.0,
    ratingSource: 'dupr',
  },
};

describe('PartnerListingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Info Display', () => {
    it('displays user display name', () => {
      render(<PartnerListingCard listing={baseListing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('falls back to username when no display name', () => {
      const listing = {
        ...baseListing,
        user: {
          ...baseListing.user,
          displayName: null,
          firstName: null,
          lastName: null,
        },
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('johndoe')).toBeInTheDocument();
    });

    it('uses first and last name when no display name', () => {
      const listing = {
        ...baseListing,
        user: {
          ...baseListing.user,
          displayName: null,
        },
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays user location', () => {
      render(<PartnerListingCard listing={baseListing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Austin, TX')).toBeInTheDocument();
    });

    it('displays city only when state is missing', () => {
      const listing = {
        ...baseListing,
        user: {
          ...baseListing.user,
          state: null,
        },
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('Austin')).toBeInTheDocument();
    });

    it('displays rating with DUPR badge', () => {
      render(<PartnerListingCard listing={baseListing} />, {
        wrapper: createWrapper(),
      });

      // The rating is displayed as "4.00 DUPR" in a single span
      expect(screen.getByText('4.00 DUPR')).toBeInTheDocument();
    });

    it('displays rating without DUPR badge for other sources', () => {
      const listing = {
        ...baseListing,
        user: {
          ...baseListing.user,
          ratingSource: 'internal',
        },
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('4.00')).toBeInTheDocument();
      expect(screen.queryByText('DUPR')).not.toBeInTheDocument();
    });

    it('displays avatar image when provided', () => {
      const listing = {
        ...baseListing,
        user: {
          ...baseListing.user,
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      const avatar = screen.getByRole('img', { name: /john doe/i });
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('displays initial placeholder when no avatar', () => {
      render(<PartnerListingCard listing={baseListing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  describe('Skill Level Display', () => {
    it('displays skill range when both min and max are set', () => {
      render(<PartnerListingCard listing={baseListing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/looking for:/i)).toBeInTheDocument();
      expect(screen.getByText(/3\.5 - 4\.5/)).toBeInTheDocument();
    });

    it('displays single skill level when min equals max', () => {
      const listing = {
        ...baseListing,
        skillLevelMin: 4.0,
        skillLevelMax: 4.0,
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/4\.0$/)).toBeInTheDocument();
    });

    it('displays minimum only skill range', () => {
      const listing = {
        ...baseListing,
        skillLevelMin: 3.5,
        skillLevelMax: null,
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/3\.5\+/)).toBeInTheDocument();
    });

    it('displays maximum only skill range', () => {
      const listing = {
        ...baseListing,
        skillLevelMin: null,
        skillLevelMax: 4.0,
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/up to 4\.0/i)).toBeInTheDocument();
    });

    it('displays any level when no skill constraints', () => {
      const listing = {
        ...baseListing,
        skillLevelMin: null,
        skillLevelMax: null,
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/any level/i)).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('displays the listing message', () => {
      render(<PartnerListingCard listing={baseListing} />, {
        wrapper: createWrapper(),
      });

      expect(
        screen.getByText(/looking for a competitive doubles partner/i)
      ).toBeInTheDocument();
    });

    it('does not show message section when message is empty', () => {
      const listing = {
        ...baseListing,
        message: null,
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      // Should not have quote marks indicating a message
      expect(screen.queryByText(/"/)).not.toBeInTheDocument();
    });
  });

  describe('Date Display', () => {
    it('displays "Today" for listings created today', () => {
      render(<PartnerListingCard listing={baseListing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/posted today/i)).toBeInTheDocument();
    });

    it('displays "Yesterday" for listings created yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const listing = {
        ...baseListing,
        createdAt: yesterday.toISOString(),
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/posted yesterday/i)).toBeInTheDocument();
    });

    it('displays days ago for recent listings', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const listing = {
        ...baseListing,
        createdAt: threeDaysAgo.toISOString(),
      };

      render(<PartnerListingCard listing={listing} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(/posted 3 days ago/i)).toBeInTheDocument();
    });
  });

  describe('Contact Button', () => {
    it('shows contact button for other users listings', () => {
      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-123" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /contact/i })).toBeInTheDocument();
    });

    it('does not show contact button for own listing', () => {
      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-456" />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('button', { name: /contact/i })).not.toBeInTheDocument();
      expect(screen.getByText(/your listing/i)).toBeInTheDocument();
    });

    it('opens contact form when contact button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-123" />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /contact/i }));

      expect(screen.getByLabelText(/your message to john doe/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/hi! i'm interested/i)).toBeInTheDocument();
    });

    it('shows cancel button when contact form is open', async () => {
      const user = userEvent.setup();

      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-123" />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /contact/i }));

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('closes contact form when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-123" />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /contact/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByLabelText(/your message/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /contact/i })).toBeInTheDocument();
    });
  });

  describe('Contact Form Submission', () => {
    it('sends contact message when form is submitted', async () => {
      const user = userEvent.setup();
      const mockOnContact = vi.fn();
      mockContactPartner.mockResolvedValue({});

      render(
        <PartnerListingCard
          listing={baseListing}
          currentUserId="user-123"
          onContact={mockOnContact}
        />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /contact/i }));

      const textarea = screen.getByPlaceholderText(/hi! i'm interested/i);
      await user.type(textarea, 'Would love to partner up for the tournament!');

      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(mockContactPartner).toHaveBeenCalledWith({
          listingId: 'listing-1',
          message: 'Would love to partner up for the tournament!',
        });
      });

      expect(mockOnContact).toHaveBeenCalledWith('listing-1');
    });

    it('shows error when trying to send empty message', async () => {
      const user = userEvent.setup();

      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-123" />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /contact/i }));
      await user.click(screen.getByRole('button', { name: /send message/i }));

      expect(toast.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Message required',
        })
      );
      expect(mockContactPartner).not.toHaveBeenCalled();
    });

    it('closes form after successful submission', async () => {
      const user = userEvent.setup();
      mockContactPartner.mockResolvedValue({});

      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-123" />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /contact/i }));
      await user.type(
        screen.getByPlaceholderText(/hi! i'm interested/i),
        'Test message'
      );
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.queryByLabelText(/your message/i)).not.toBeInTheDocument();
      });
    });

    it('shows success toast after sending message', async () => {
      const user = userEvent.setup();
      mockContactPartner.mockResolvedValue({});

      render(
        <PartnerListingCard listing={baseListing} currentUserId="user-123" />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /contact/i }));
      await user.type(
        screen.getByPlaceholderText(/hi! i'm interested/i),
        'Test message'
      );
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Message sent',
          })
        );
      });
    });
  });
});
