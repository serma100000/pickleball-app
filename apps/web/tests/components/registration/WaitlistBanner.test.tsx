import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaitlistBanner } from '@/components/registration/WaitlistBanner';
import { render, createMockWaitlistStatus } from './test-utils';

// Mock the api module
const mockApiGet = vi.fn();
const mockApiWithAuthPost = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
  apiWithAuth: {
    post: (...args: unknown[]) => mockApiWithAuthPost(...args),
  },
}));

// Mock Clerk auth
const mockGetToken = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: true,
    getToken: mockGetToken,
  }),
}));

describe('WaitlistBanner', () => {
  const defaultProps = {
    eventType: 'tournament' as const,
    eventId: 'event-123',
    eventName: 'Test Tournament',
    maxParticipants: 16,
    currentParticipants: 16,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue('mock-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('should not render while loading', async () => {
      mockApiGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = render(<WaitlistBanner {...defaultProps} />);

      // Should not render anything while loading
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('not full state', () => {
    it('should not render when event is not full', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus({ isFull: false }));

      const { container } = render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });

  describe('event full state', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus());
    });

    it('should render banner when event is full', async () => {
      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Event Full')).toBeInTheDocument();
      });
    });

    it('should display current capacity', async () => {
      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/16\/16 spots filled/)).toBeInTheDocument();
      });
    });

    it('should display waitlist count', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus({ waitlistCount: 5 }));

      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/5 people are on the waitlist/)).toBeInTheDocument();
      });
    });

    it('should display singular text for 1 person on waitlist', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus({ waitlistCount: 1 }));

      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/1 person is on the waitlist/)).toBeInTheDocument();
      });
    });

    it('should show Join Waitlist button when waitlist is enabled', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus({ waitlistEnabled: true }));

      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument();
      });
    });

    it('should not show Join Waitlist button when waitlist is disabled', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus({ waitlistEnabled: false }));

      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Join Waitlist' })).not.toBeInTheDocument();
      });
    });
  });

  describe('join waitlist functionality', () => {
    beforeEach(() => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus({ waitlistEnabled: true }));
    });

    it('should call onJoinWaitlist and show success when join succeeds', async () => {
      const onJoinWaitlist = vi.fn();
      mockApiWithAuthPost.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<WaitlistBanner {...defaultProps} onJoinWaitlist={onJoinWaitlist} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Join Waitlist' }));

      await waitFor(() => {
        expect(mockApiWithAuthPost).toHaveBeenCalledWith(
          '/waitlist',
          'mock-token',
          { eventType: 'tournament', eventId: 'event-123' }
        );
        expect(onJoinWaitlist).toHaveBeenCalled();
      });
    });

    it('should show success state after joining waitlist', async () => {
      mockApiWithAuthPost.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Join Waitlist' }));

      await waitFor(() => {
        expect(screen.getByText("You're on the waitlist!")).toBeInTheDocument();
        expect(screen.getByText(/We'll notify you as soon as a spot opens up/)).toBeInTheDocument();
      });
    });

    it('should show loading state while joining', async () => {
      mockApiWithAuthPost.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const user = userEvent.setup();
      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Join Waitlist' }));

      expect(screen.getByRole('button', { name: 'Joining...' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Joining...' })).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText("You're on the waitlist!")).toBeInTheDocument();
      });
    });

    it('should show error message when join fails', async () => {
      mockApiWithAuthPost.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Join Waitlist' }));

      await waitFor(() => {
        // Error message should be displayed
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    // Note: The "redirect to sign in" scenario is difficult to test
    // because vi.mock is hoisted and can't be changed mid-test.
    // This functionality is covered by integration/e2e tests.
  });

  describe('event types', () => {
    it('should work with league event type', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus());

      render(
        <WaitlistBanner
          eventType="league"
          eventId="league-123"
          eventName="Test League"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Event Full')).toBeInTheDocument();
        expect(mockApiGet).toHaveBeenCalledWith(
          '/waitlist/status',
          { eventType: 'league', eventId: 'league-123' }
        );
      });
    });
  });

  describe('className prop', () => {
    it('should apply custom className', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus());

      const { container } = render(<WaitlistBanner {...defaultProps} className="custom-class" />);

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });

  describe('capacity display', () => {
    it('should show capacity message when maxCount is not available', async () => {
      mockApiGet.mockResolvedValue(createMockWaitlistStatus({ maxCount: null }));

      render(<WaitlistBanner {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/This event has reached capacity/)).toBeInTheDocument();
      });
    });
  });
});
