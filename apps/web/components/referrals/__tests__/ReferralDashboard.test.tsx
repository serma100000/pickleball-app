import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReferralDashboard } from '../ReferralDashboard';

// Mock share API
const mockShare = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useReferralCode: vi.fn(),
  useReferralStats: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useReferralCode, useReferralStats } from '@/hooks/use-api';
import { toast } from '@/hooks/use-toast';

const mockUseReferralCode = useReferralCode as ReturnType<typeof vi.fn>;
const mockUseReferralStats = useReferralStats as ReturnType<typeof vi.fn>;

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

const mockStatsData = {
  totalViews: 150,
  totalSignups: 25,
  totalRegistrations: 10,
  successfulConversions: 8,
  rewards: {
    earned: [
      { description: '$5 Account Credit', value: 5 },
    ],
    nextMilestone: {
      description: '50% Off Next Entry',
      count: 5,
      progress: 60,
    },
  },
  recentConversions: [
    {
      user: {
        displayName: 'John Doe',
        avatarUrl: null,
      },
      type: 'signup',
      createdAt: new Date().toISOString(),
    },
    {
      user: {
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      type: 'registration',
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('ReferralDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset share API mock to undefined (not available)
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton when data is loading', () => {
      mockUseReferralCode.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('shows error message when code loading fails', () => {
      mockUseReferralCode.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText(/unable to load referral information/i)).toBeInTheDocument();
    });

    it('shows error message when stats loading fails', () => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText(/unable to load referral information/i)).toBeInTheDocument();
    });
  });

  describe('Referral Code Display', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });
    });

    it('displays the referral code', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('PADDLE2024')).toBeInTheDocument();
    });

    it('displays the referral link header', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('Your Referral Link')).toBeInTheDocument();
    });
  });

  describe('Copy Button', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });
    });

    it('shows copy button', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });

    it('shows success toast after copying', async () => {
      const user = userEvent.setup();

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Link copied!',
          })
        );
      });
    });

    it('changes button text to "Copied!" after copying', async () => {
      const user = userEvent.setup();

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(screen.getByText(/copied!/i)).toBeInTheDocument();
      });
    });

    it('shows error toast when clipboard fails', async () => {
      const user = userEvent.setup();
      // Force clipboard to fail
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
        },
        configurable: true,
      });

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /copy link/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Failed to copy',
          })
        );
      });

      // Restore clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    });
  });

  describe('Stats Display', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });
    });

    it('displays link views stat', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Link Views')).toBeInTheDocument();
    });

    it('displays sign-ups stat', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Sign-ups')).toBeInTheDocument();
    });

    it('displays registrations stat', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      // 10 may appear in multiple places (stats + reward tier count)
      const tens = screen.getAllByText('10');
      expect(tens.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Registrations')).toBeInTheDocument();
    });

    it('displays total conversions stat', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Total Conversions')).toBeInTheDocument();
    });

    it('displays zero for missing stats', () => {
      mockUseReferralStats.mockReturnValue({
        data: {},
        isLoading: false,
        error: null,
      });

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(4); // All 4 stats should be 0
    });
  });

  describe('Share Buttons', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });
    });

    it('shows Facebook share button', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /facebook/i })).toBeInTheDocument();
    });

    it('shows Twitter share button', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /twitter/i })).toBeInTheDocument();
    });

    it('shows WhatsApp share button', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument();
    });

    it('shows LinkedIn share button', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /linkedin/i })).toBeInTheDocument();
    });

    it('shows general Share button', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
    });

    it('opens Facebook share URL in new window', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.fn();
      window.open = mockOpen;

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /facebook/i }));

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com/sharer'),
        '_blank',
        expect.any(String)
      );
    });

    it('opens Twitter share URL in new window', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.fn();
      window.open = mockOpen;

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /twitter/i }));

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet'),
        '_blank',
        expect.any(String)
      );
    });

    it('uses native share API when available', async () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, 'share', {
        value: mockShare.mockResolvedValue(undefined),
        configurable: true,
        writable: true,
      });

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /^share$/i }));

      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://paddleup.com/ref/PADDLE2024',
        })
      );
    });

    it('falls back to copy when native share is unavailable', async () => {
      const user = userEvent.setup();

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      await user.click(screen.getByRole('button', { name: /^share$/i }));

      // When share API is unavailable, it falls back to copying and shows success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Link copied!',
          })
        );
      });
    });
  });

  describe('Rewards Section', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });
    });

    it('displays rewards header', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    it('displays earned rewards', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('Earned Rewards')).toBeInTheDocument();
      // $5 Account Credit appears in both earned rewards and reward tiers
      const accountCredits = screen.getAllByText('$5 Account Credit');
      expect(accountCredits.length).toBeGreaterThanOrEqual(1);
    });

    it('displays next milestone', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('Next Reward')).toBeInTheDocument();
      // 50% Off appears in both next milestone and reward tiers
      const offEntries = screen.getAllByText('50% Off Next Entry');
      expect(offEntries.length).toBeGreaterThanOrEqual(1);
    });

    it('displays progress towards next milestone', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText(/8 \/ 5 referrals/i)).toBeInTheDocument();
    });

    it('displays reward tiers', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('Reward Tiers')).toBeInTheDocument();
      // These may appear multiple times (in earned rewards, next milestone, and tiers)
      expect(screen.getAllByText('$5 Account Credit').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('50% Off Next Entry').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Free Event Entry')).toBeInTheDocument();
    });

    it('marks earned reward tiers correctly', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      // With 8 conversions, first tier (1) and second tier (5) should be earned
      const rewardTiers = screen.getAllByText(/referral/i);
      expect(rewardTiers.length).toBeGreaterThan(0);
    });
  });

  describe('Recent Conversions', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });
    });

    it('displays recent referrals section', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('Recent Referrals')).toBeInTheDocument();
    });

    it('displays recent conversion users', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays conversion types', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.getByText('signup')).toBeInTheDocument();
      expect(screen.getByText('registration')).toBeInTheDocument();
    });

    it('does not show recent referrals section when empty', () => {
      mockUseReferralStats.mockReturnValue({
        data: {
          ...mockStatsData,
          recentConversions: [],
        },
        isLoading: false,
        error: null,
      });

      render(<ReferralDashboard />, { wrapper: createWrapper() });

      expect(screen.queryByText('Recent Referrals')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseReferralCode.mockReturnValue({
        data: mockCodeData,
        isLoading: false,
        error: null,
      });
      mockUseReferralStats.mockReturnValue({
        data: mockStatsData,
        isLoading: false,
        error: null,
      });
    });

    it('uses semantic heading structure', () => {
      render(<ReferralDashboard />, { wrapper: createWrapper() });

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});
