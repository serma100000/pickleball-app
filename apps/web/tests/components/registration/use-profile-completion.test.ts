import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useProfileCompletion,
  FIELD_LABELS,
  getSettingsPathForField,
  getPrimarySettingsPath,
  type ProfileRequiredFields,
} from '@/hooks/use-profile-completion';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useProfileCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('completion calculation', () => {
    it('should return 100% complete when all fields are filled', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          primaryEmailAddress: { emailAddress: 'john@example.com' },
          unsafeMetadata: { dateOfBirth: '1990-01-01', gender: 'male', skillLevel: 3.5 },
          publicMetadata: {},
        },
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          skillLevel: 3.5,
        },
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.isComplete).toBe(true);
      expect(result.current.completionPercentage).toBe(100);
      expect(result.current.missingFields).toHaveLength(0);
    });

    it('should return 0% complete when all fields are missing', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: null,
          lastName: null,
          username: null,
          primaryEmailAddress: null,
          unsafeMetadata: {},
          publicMetadata: {},
        },
        profile: null,
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.isComplete).toBe(false);
      expect(result.current.completionPercentage).toBe(0);
      expect(result.current.missingFields).toHaveLength(5);
    });

    it('should calculate partial completion correctly', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: 'John',
          lastName: 'Doe',
          primaryEmailAddress: { emailAddress: 'john@example.com' },
          unsafeMetadata: {},
          publicMetadata: {},
        },
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      // displayName and email are complete, others are missing
      expect(result.current.isComplete).toBe(false);
      expect(result.current.completionPercentage).toBe(40); // 2 out of 5
      expect(result.current.missingFields).toContain('dateOfBirth');
      expect(result.current.missingFields).toContain('gender');
      expect(result.current.missingFields).toContain('skillLevel');
    });

    it('should recognize displayName from username when first/last name missing', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: null,
          lastName: null,
          username: 'johndoe',
          primaryEmailAddress: { emailAddress: 'john@example.com' },
          unsafeMetadata: {},
          publicMetadata: {},
        },
        profile: null,
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.requiredFields.displayName).toBe(true);
    });

    it('should recognize skillLevel from profile', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: 'John',
          lastName: 'Doe',
          primaryEmailAddress: { emailAddress: 'john@example.com' },
          unsafeMetadata: {},
          publicMetadata: {},
        },
        profile: {
          skillLevel: 3.5,
        },
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.requiredFields.skillLevel).toBe(true);
    });

    it('should not count skillLevel of 0 as complete', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: 'John',
          lastName: 'Doe',
          primaryEmailAddress: { emailAddress: 'john@example.com' },
          unsafeMetadata: {},
          publicMetadata: {},
        },
        profile: {
          skillLevel: 0,
        },
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.requiredFields.skillLevel).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should return isLoading true when user is not loaded', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        isLoaded: false,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading true when profile is loading', () => {
      mockUseAuth.mockReturnValue({
        user: { firstName: 'John' },
        profile: null,
        isLoaded: true,
        isProfileLoading: true,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading false when both are loaded', () => {
      mockUseAuth.mockReturnValue({
        user: { firstName: 'John' },
        profile: {},
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('missingFieldLabels', () => {
    it('should return human-readable labels for missing fields', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: 'John',
          lastName: 'Doe',
          primaryEmailAddress: { emailAddress: 'john@example.com' },
          unsafeMetadata: {},
          publicMetadata: {},
        },
        profile: {},
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.missingFieldLabels).toContain('Date of Birth');
      expect(result.current.missingFieldLabels).toContain('Gender');
      expect(result.current.missingFieldLabels).toContain('Skill Level / Rating');
    });
  });

  describe('totalRequiredFields and completedFieldsCount', () => {
    it('should return correct counts', () => {
      mockUseAuth.mockReturnValue({
        user: {
          firstName: 'John',
          lastName: 'Doe',
          primaryEmailAddress: { emailAddress: 'john@example.com' },
          unsafeMetadata: { dateOfBirth: '1990-01-01' },
          publicMetadata: {},
        },
        profile: {},
        isLoaded: true,
        isProfileLoading: false,
      });

      const { result } = renderHook(() => useProfileCompletion());

      expect(result.current.totalRequiredFields).toBe(5);
      expect(result.current.completedFieldsCount).toBe(3); // displayName, email, dateOfBirth
    });
  });
});

describe('FIELD_LABELS', () => {
  it('should have labels for all required fields', () => {
    const requiredFieldKeys: (keyof ProfileRequiredFields)[] = [
      'displayName',
      'email',
      'dateOfBirth',
      'gender',
      'skillLevel',
    ];

    requiredFieldKeys.forEach((key) => {
      expect(FIELD_LABELS[key]).toBeDefined();
      expect(typeof FIELD_LABELS[key]).toBe('string');
      expect(FIELD_LABELS[key].length).toBeGreaterThan(0);
    });
  });
});

describe('getSettingsPathForField', () => {
  it('should return /profile/settings for most fields', () => {
    expect(getSettingsPathForField('displayName')).toBe('/profile/settings');
    expect(getSettingsPathForField('email')).toBe('/profile/settings');
    expect(getSettingsPathForField('dateOfBirth')).toBe('/profile/settings');
    expect(getSettingsPathForField('gender')).toBe('/profile/settings');
  });

  it('should return /profile/dupr-settings for skillLevel', () => {
    expect(getSettingsPathForField('skillLevel')).toBe('/profile/dupr-settings');
  });
});

describe('getPrimarySettingsPath', () => {
  it('should return /profile/settings when no fields are missing', () => {
    expect(getPrimarySettingsPath([])).toBe('/profile/settings');
  });

  it('should return /profile/settings when non-skill fields are missing', () => {
    expect(getPrimarySettingsPath(['displayName'])).toBe('/profile/settings');
    expect(getPrimarySettingsPath(['email', 'gender'])).toBe('/profile/settings');
    expect(getPrimarySettingsPath(['dateOfBirth', 'skillLevel'])).toBe('/profile/settings');
  });

  it('should return /profile/dupr-settings when only skillLevel is missing', () => {
    expect(getPrimarySettingsPath(['skillLevel'])).toBe('/profile/dupr-settings');
  });
});
