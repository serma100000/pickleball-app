import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReferralBanner } from '../ReferralBanner';

vi.mock('@/hooks/use-api', () => ({
  useReferralCode: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useReferralCode } from '@/hooks/use-api';
import { toast } from '@/hooks/use-toast';

const mockUseReferralCode = useReferralCode as ReturnType<typeof vi.fn>;

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

const mockCodeData = {
  code: 'PADDLE2024',
  shareableUrl: 'https://paddleup.com/ref/PADDLE2024',
};

describe('ReferralBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders banner when data is loaded', () => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });

      render(<ReferralBanner />, { wrapper: createWrapper() });

      expect(screen.getByText(/invite friends, earn rewards/i)).toBeInTheDocument();
    });

    it('does not render when loading', () => {
      mockUseReferralCode.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<ReferralBanner />, { wrapper: createWrapper() });

      expect(screen.queryByText(/invite friends/i)).not.toBeInTheDocument();
    });

    it('does not render when there is an error', () => {
      mockUseReferralCode.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      render(<ReferralBanner />, { wrapper: createWrapper() });

      expect(screen.queryByText(/invite friends/i)).not.toBeInTheDocument();
    });
  });

  describe('Content', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
    });

    it('displays banner title', () => {
      render(<ReferralBanner />, { wrapper: createWrapper() });

      expect(screen.getByText('Invite Friends, Earn Rewards')).toBeInTheDocument();
    });

    it('displays reward description', () => {
      render(<ReferralBanner />, { wrapper: createWrapper() });

      expect(screen.getByText(/get \$5 credit for each friend/i)).toBeInTheDocument();
    });

    it('displays copy link button', () => {
      render(<ReferralBanner />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });
  });

  describe('Copy Link', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
    });

    it('shows success toast after copying', async () => {
      const user = userEvent.setup();

      render(<ReferralBanner />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Link copied!',
          })
        );
      });
    });

    it('changes button text to Copied! after copying', async () => {
      const user = userEvent.setup();

      render(<ReferralBanner />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(screen.getByText(/copied!/i)).toBeInTheDocument();
      });
    });

    it('disables button when no shareable URL', () => {
      mockUseReferralCode.mockReturnValue({
        data: { code: 'TEST', shareableUrl: null },
        isLoading: false,
        error: null,
      });

      render(<ReferralBanner />, { wrapper: createWrapper() });

      const button = screen.getByRole('button', { name: /copy link/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Dismissible', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
    });

    it('shows dismiss button by default', () => {
      render(<ReferralBanner />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('hides dismiss button when dismissible is false', () => {
      render(<ReferralBanner dismissible={false} />, { wrapper: createWrapper() });

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('hides banner when dismiss is clicked', async () => {
      const user = userEvent.setup();

      render(<ReferralBanner />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /dismiss/i }));

      expect(screen.queryByText(/invite friends/i)).not.toBeInTheDocument();
    });

    it('calls onDismiss callback when dismissed', async () => {
      const user = userEvent.setup();
      const mockOnDismiss = vi.fn();

      render(<ReferralBanner onDismiss={mockOnDismiss} />, {
        wrapper: createWrapper(),
      });

      await user.click(screen.getByRole('button', { name: /dismiss/i }));

      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Event Parameters', () => {
    it('passes eventType to useReferralCode hook', () => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });

      render(<ReferralBanner eventType="tournament" />, {
        wrapper: createWrapper(),
      });

      expect(mockUseReferralCode).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'tournament',
        })
      );
    });

    it('passes eventId to useReferralCode hook', () => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });

      render(<ReferralBanner eventType="tournament" eventId="event-123" />, {
        wrapper: createWrapper(),
      });

      expect(mockUseReferralCode).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'tournament',
          eventId: 'event-123',
        })
      );
    });
  });

  describe('Styling', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
    });

    it('applies custom className', () => {
      const { container } = render(
        <ReferralBanner className="my-custom-class" />,
        { wrapper: createWrapper() }
      );

      const banner = container.firstChild as HTMLElement;
      expect(banner).toHaveClass('my-custom-class');
    });
  });
});
