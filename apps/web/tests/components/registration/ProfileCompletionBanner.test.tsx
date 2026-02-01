import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileCompletionBanner } from '@/components/registration/ProfileCompletionBanner';
import { render } from './test-utils';

// Mock the useProfileCompletion hook
const mockUseProfileCompletion = vi.fn();
vi.mock('@/hooks/use-profile-completion', () => ({
  useProfileCompletion: () => mockUseProfileCompletion(),
  getPrimarySettingsPath: (missingFields: string[]) => {
    if (missingFields.length === 0) return '/profile/settings';
    if (missingFields.length === 1 && missingFields[0] === 'skillLevel') {
      return '/profile/dupr-settings';
    }
    return '/profile/settings';
  },
}));

// Get sessionStorage mock
const sessionStorageMock = window.sessionStorage as {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

describe('ProfileCompletionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  describe('visibility conditions', () => {
    it('should not render when loading', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        missingFieldLabels: ['Date of Birth'],
        isLoading: true,
      });

      const { container } = render(<ProfileCompletionBanner />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when profile is complete', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: true,
        completionPercentage: 100,
        missingFields: [],
        missingFieldLabels: [],
        isLoading: false,
      });

      const { container } = render(<ProfileCompletionBanner />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when dismissed in session', async () => {
      sessionStorageMock.getItem.mockReturnValue('true');

      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        missingFieldLabels: ['Date of Birth'],
        isLoading: false,
      });

      const { container } = render(<ProfileCompletionBanner />);

      // Wait for useEffect to run
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it('should render when profile is incomplete and not dismissed', async () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        missingFieldLabels: ['Date of Birth'],
        isLoading: false,
      });

      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });
    });
  });

  describe('content display', () => {
    beforeEach(() => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth', 'gender'],
        missingFieldLabels: ['Date of Birth', 'Gender'],
        isLoading: false,
      });
    });

    it('should display completion percentage', async () => {
      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        expect(screen.getByText('60%')).toBeInTheDocument();
      });
    });

    it('should display message about missing fields count', async () => {
      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        expect(screen.getByText(/Add 2 missing fields to register for events/)).toBeInTheDocument();
      });
    });

    it('should display single field message when only one missing', async () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 80,
        missingFields: ['dateOfBirth'],
        missingFieldLabels: ['Date of Birth'],
        isLoading: false,
      });

      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        expect(screen.getByText(/Add your date of birth to register for events/i)).toBeInTheDocument();
      });
    });

    it('should display missing fields list for 2-3 missing fields', async () => {
      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        expect(screen.getByText('Missing:')).toBeInTheDocument();
        expect(screen.getByText(/Date of Birth/)).toBeInTheDocument();
        expect(screen.getByText(/Gender/)).toBeInTheDocument();
      });
    });

    it('should have link to complete profile', async () => {
      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Complete Profile/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/profile/settings');
      });
    });
  });

  describe('dismiss functionality', () => {
    beforeEach(() => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        missingFieldLabels: ['Date of Birth'],
        isLoading: false,
      });
    });

    it('should have dismiss button when dismissible', async () => {
      render(<ProfileCompletionBanner dismissible={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Dismiss banner/i })).toBeInTheDocument();
      });
    });

    it('should not have dismiss button when not dismissible', async () => {
      render(<ProfileCompletionBanner dismissible={false} />);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Dismiss banner/i })).not.toBeInTheDocument();
      });
    });

    it('should hide banner and save to session storage when dismissed', async () => {
      const user = userEvent.setup();
      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i });
      await user.click(dismissButton);

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('profile-banner-dismissed', 'true');
      await waitFor(() => {
        expect(screen.queryByText('Complete Your Profile')).not.toBeInTheDocument();
      });
    });

    it('should use custom dismissKey', async () => {
      const user = userEvent.setup();
      render(<ProfileCompletionBanner dismissKey="custom-dismiss-key" />);

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i });
      await user.click(dismissButton);

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith('custom-dismiss-key', 'true');
    });

    it('should call onDismiss callback when dismissed', async () => {
      const onDismiss = vi.fn();
      const user = userEvent.setup();

      render(<ProfileCompletionBanner onDismiss={onDismiss} />);

      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /Dismiss banner/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('compact mode', () => {
    beforeEach(() => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        missingFieldLabels: ['Date of Birth'],
        isLoading: false,
      });
    });

    it('should render compact version when compact prop is true', async () => {
      render(<ProfileCompletionBanner compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('Profile 60% complete')).toBeInTheDocument();
        // Compact version uses "Complete" link text
        expect(screen.getByRole('link', { name: 'Complete' })).toBeInTheDocument();
      });
    });

    it('should not show expanded content in compact mode', async () => {
      render(<ProfileCompletionBanner compact={true} />);

      await waitFor(() => {
        expect(screen.queryByText('Complete Your Profile')).not.toBeInTheDocument();
      });
    });
  });

  describe('progress bar', () => {
    it('should show red progress bar for low percentage', async () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 20,
        missingFields: ['dateOfBirth', 'gender', 'skillLevel', 'email'],
        missingFieldLabels: [],
        isLoading: false,
      });

      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        const progressBar = document.querySelector('[style*="width: 20%"]');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveClass('bg-red-500');
      });
    });

    it('should show yellow progress bar for medium percentage', async () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth', 'gender'],
        missingFieldLabels: [],
        isLoading: false,
      });

      render(<ProfileCompletionBanner />);

      await waitFor(() => {
        const progressBar = document.querySelector('[style*="width: 60%"]');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveClass('bg-yellow-500');
      });
    });
  });

  describe('className prop', () => {
    it('should apply custom className', async () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        missingFieldLabels: ['Date of Birth'],
        isLoading: false,
      });

      const { container } = render(<ProfileCompletionBanner className="custom-class" />);

      await waitFor(() => {
        expect(container.querySelector('.custom-class')).toBeInTheDocument();
      });
    });
  });
});
