import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileCompletionGate } from '@/components/registration/ProfileCompletionGate';
import { render } from './test-utils';

// Mock the useProfileCompletion hook
const mockUseProfileCompletion = vi.fn();
vi.mock('@/hooks/use-profile-completion', () => ({
  useProfileCompletion: () => mockUseProfileCompletion(),
  FIELD_LABELS: {
    displayName: 'Display Name',
    email: 'Email Address',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    skillLevel: 'Skill Level / Rating',
  },
  getPrimarySettingsPath: (missingFields: string[]) => {
    if (missingFields.length === 0) return '/profile/settings';
    if (missingFields.length === 1 && missingFields[0] === 'skillLevel') {
      return '/profile/dupr-settings';
    }
    return '/profile/settings';
  },
}));

describe('ProfileCompletionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading skeleton when profile is loading', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 0,
        missingFields: [],
        requiredFields: {},
        isLoading: true,
        missingFieldLabels: [],
      });

      render(
        <ProfileCompletionGate>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      // Should show loading skeleton
      expect(screen.queryByText('Child content')).not.toBeInTheDocument();
      // Check for skeleton elements (they have animate-pulse class)
      const skeletonContainer = document.querySelector('.animate-pulse');
      expect(skeletonContainer).toBeInTheDocument();
    });
  });

  describe('complete profile', () => {
    it('should render children when profile is complete', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: true,
        completionPercentage: 100,
        missingFields: [],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: true,
          gender: true,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: [],
      });

      render(
        <ProfileCompletionGate>
          <div data-testid="child-content">Protected content</div>
        </ProfileCompletionGate>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
  });

  describe('incomplete profile - blocking mode', () => {
    it('should show completion gate when profile is incomplete', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth', 'gender'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: false,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: ['Date of Birth', 'Gender'],
      });

      render(
        <ProfileCompletionGate>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      // Should not show children
      expect(screen.queryByText('Child content')).not.toBeInTheDocument();
      // Should show completion card
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    });

    it('should display completion percentage', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth', 'gender'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: false,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: ['Date of Birth', 'Gender'],
      });

      render(
        <ProfileCompletionGate>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should display required fields with their completion status', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth', 'gender'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: false,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: ['Date of Birth', 'Gender'],
      });

      render(
        <ProfileCompletionGate>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      expect(screen.getByText('Display Name')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      expect(screen.getByText('Date of Birth')).toBeInTheDocument();
      expect(screen.getByText('Gender')).toBeInTheDocument();
      expect(screen.getByText('Skill Level / Rating')).toBeInTheDocument();
    });

    it('should have a link to complete profile', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 40,
        missingFields: ['dateOfBirth', 'gender', 'skillLevel'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: false,
          skillLevel: false,
        },
        isLoading: false,
        missingFieldLabels: ['Date of Birth', 'Gender', 'Skill Level / Rating'],
      });

      render(
        <ProfileCompletionGate>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      const link = screen.getByRole('link', { name: /Complete Profile/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/profile/settings');
    });

    it('should use custom title and description', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: true,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: ['Date of Birth'],
      });

      render(
        <ProfileCompletionGate
          title="Custom Title"
          description="Custom description text"
        >
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom description text')).toBeInTheDocument();
    });
  });

  describe('incomplete profile - non-blocking mode', () => {
    it('should show both warning and children in non-blocking mode', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth', 'gender'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: false,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: ['Date of Birth', 'Gender'],
      });

      render(
        <ProfileCompletionGate blocking={false}>
          <div data-testid="child-content">Child content</div>
        </ProfileCompletionGate>
      );

      // Should show both the warning and children (children may be dimmed)
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('should show Continue Anyway button when onIncompleteAttempt is provided', async () => {
      const onIncompleteAttempt = vi.fn();
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: true,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: ['Date of Birth'],
      });

      render(
        <ProfileCompletionGate blocking={false} onIncompleteAttempt={onIncompleteAttempt}>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      const continueButton = screen.getByRole('button', { name: /Continue Anyway/i });
      expect(continueButton).toBeInTheDocument();

      await userEvent.click(continueButton);
      expect(onIncompleteAttempt).toHaveBeenCalled();
    });
  });

  describe('progress bar colors', () => {
    it('should show red progress bar for low completion', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 20,
        missingFields: ['dateOfBirth', 'gender', 'skillLevel', 'email'],
        requiredFields: {
          displayName: true,
          email: false,
          dateOfBirth: false,
          gender: false,
          skillLevel: false,
        },
        isLoading: false,
        missingFieldLabels: [],
      });

      render(
        <ProfileCompletionGate>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      // Check for progress bar with red color class
      const progressBar = document.querySelector('[style*="width: 20%"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveClass('bg-red-500');
    });

    it('should show yellow progress bar for medium completion', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth', 'gender'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: false,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: [],
      });

      render(
        <ProfileCompletionGate>
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      const progressBar = document.querySelector('[style*="width: 60%"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveClass('bg-yellow-500');
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      mockUseProfileCompletion.mockReturnValue({
        isComplete: false,
        completionPercentage: 60,
        missingFields: ['dateOfBirth'],
        requiredFields: {
          displayName: true,
          email: true,
          dateOfBirth: false,
          gender: true,
          skillLevel: true,
        },
        isLoading: false,
        missingFieldLabels: [],
      });

      const { container } = render(
        <ProfileCompletionGate className="custom-class">
          <div>Child content</div>
        </ProfileCompletionGate>
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });
});
