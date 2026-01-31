'use client';

import { useMemo } from 'react';
import { useAuth } from './use-auth';

/**
 * Required fields for registration eligibility
 */
export interface ProfileRequiredFields {
  displayName: boolean;
  email: boolean;
  dateOfBirth: boolean;
  gender: boolean;
  skillLevel: boolean;
}

/**
 * Field display names for user-friendly messages
 */
export const FIELD_LABELS: Record<keyof ProfileRequiredFields, string> = {
  displayName: 'Display Name',
  email: 'Email Address',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  skillLevel: 'Skill Level / Rating',
};

/**
 * Field paths for navigation/linking
 */
export const FIELD_SETTINGS_PATHS: Record<keyof ProfileRequiredFields, string> = {
  displayName: '/profile/settings',
  email: '/profile/settings',
  dateOfBirth: '/profile/settings',
  gender: '/profile/settings',
  skillLevel: '/profile/dupr-settings',
};

export interface UseProfileCompletionReturn {
  /** Whether the profile has all required fields completed */
  isComplete: boolean;
  /** Percentage of required fields completed (0-100) */
  completionPercentage: number;
  /** List of missing field keys */
  missingFields: (keyof ProfileRequiredFields)[];
  /** Object showing which fields are completed */
  requiredFields: ProfileRequiredFields;
  /** Whether the profile data is still loading */
  isLoading: boolean;
  /** Human-readable labels for missing fields */
  missingFieldLabels: string[];
  /** Total number of required fields */
  totalRequiredFields: number;
  /** Number of completed required fields */
  completedFieldsCount: number;
}

/**
 * Hook to check user profile completion status
 * Used to gate registration flows and prompt users to complete their profiles
 */
export function useProfileCompletion(): UseProfileCompletionReturn {
  const { user, profile, isLoaded, isProfileLoading } = useAuth();

  const result = useMemo(() => {
    // Check each required field
    const requiredFields: ProfileRequiredFields = {
      displayName: Boolean(
        user?.firstName || user?.lastName || user?.username || profile?.firstName || profile?.lastName
      ),
      email: Boolean(user?.primaryEmailAddress?.emailAddress || profile?.email),
      // Date of birth - check Clerk user metadata or profile
      // For now, we check if the user has verified their account (as a proxy)
      dateOfBirth: Boolean(
        user?.unsafeMetadata?.dateOfBirth ||
        user?.publicMetadata?.dateOfBirth ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profile as any)?.dateOfBirth
      ),
      // Gender - check user metadata or profile
      gender: Boolean(
        user?.unsafeMetadata?.gender ||
        user?.publicMetadata?.gender ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profile as any)?.gender
      ),
      // Skill level / rating
      skillLevel: Boolean(
        (profile?.skillLevel && profile.skillLevel > 0) ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profile as any)?.duprRating ||
        user?.unsafeMetadata?.skillLevel ||
        user?.publicMetadata?.skillLevel
      ),
    };

    // Calculate missing fields
    const missingFields = (Object.keys(requiredFields) as (keyof ProfileRequiredFields)[]).filter(
      (field) => !requiredFields[field]
    );

    const totalRequiredFields = Object.keys(requiredFields).length;
    const completedFieldsCount = totalRequiredFields - missingFields.length;
    const completionPercentage = Math.round((completedFieldsCount / totalRequiredFields) * 100);

    return {
      isComplete: missingFields.length === 0,
      completionPercentage,
      missingFields,
      requiredFields,
      missingFieldLabels: missingFields.map((field) => FIELD_LABELS[field]),
      totalRequiredFields,
      completedFieldsCount,
    };
  }, [user, profile]);

  return {
    ...result,
    isLoading: !isLoaded || isProfileLoading,
  };
}

/**
 * Helper to get the primary settings path for a missing field
 */
export function getSettingsPathForField(field: keyof ProfileRequiredFields): string {
  return FIELD_SETTINGS_PATHS[field];
}

/**
 * Get the primary settings path based on missing fields
 * Prioritizes general settings over DUPR settings
 */
export function getPrimarySettingsPath(missingFields: (keyof ProfileRequiredFields)[]): string {
  if (missingFields.length === 0) return '/profile/settings';

  // Check if any non-skillLevel fields are missing
  const hasNonSkillMissing = missingFields.some((f) => f !== 'skillLevel');

  if (hasNonSkillMissing) {
    return '/profile/settings';
  }

  // Only skillLevel is missing
  return '/profile/dupr-settings';
}
