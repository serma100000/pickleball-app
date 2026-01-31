'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTrackReferral, useValidateReferralCode } from '@/hooks/use-api';

// Key for storing referral code in localStorage
const REFERRAL_STORAGE_KEY = 'paddleup_referral_code';
const REFERRAL_EXPIRY_KEY = 'paddleup_referral_expiry';
const REFERRAL_TTL_DAYS = 30; // Keep referral code for 30 days

interface ReferralTrackerProps {
  eventType?: 'tournament' | 'league' | 'general';
  eventId?: string;
  children?: React.ReactNode;
}

/**
 * ReferralTracker - Tracks referral visits from URL params
 *
 * Place this component on public pages to track when users arrive via referral links.
 * It reads the ?ref= parameter from the URL and:
 * 1. Validates the referral code
 * 2. Calls the track API to record the visit
 * 3. Stores the code in localStorage for later conversion
 */
export function ReferralTracker({
  eventType = 'general',
  eventId,
  children,
}: ReferralTrackerProps) {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  const hasTracked = useRef(false);

  const { data: validationData } = useValidateReferralCode(referralCode);
  const trackMutation = useTrackReferral();

  useEffect(() => {
    // Only track once per component mount
    if (hasTracked.current || !referralCode) return;

    // Check if code is valid
    if (validationData && !validationData.valid) return;

    // If validation passed or is still loading, track the visit
    if (validationData?.valid || !validationData) {
      hasTracked.current = true;

      // Track the referral visit
      trackMutation.mutate({
        referralCode,
        eventType,
        eventId,
      });

      // Store in localStorage for later conversion
      storeReferralCode(referralCode);
    }
  }, [referralCode, validationData, eventType, eventId, trackMutation]);

  return <>{children}</>;
}

/**
 * Store referral code in localStorage with expiry
 */
function storeReferralCode(code: string): void {
  if (typeof window === 'undefined') return;

  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + REFERRAL_TTL_DAYS);

    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
    localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());
  } catch {
    // localStorage might not be available
  }
}

/**
 * Get stored referral code if not expired
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
    const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);

    if (!code || !expiry) return null;

    const expiryDate = new Date(expiry);
    if (expiryDate < new Date()) {
      // Expired, clear storage
      clearStoredReferralCode();
      return null;
    }

    return code;
  } catch {
    return null;
  }
}

/**
 * Clear stored referral code
 */
export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
  } catch {
    // localStorage might not be available
  }
}

/**
 * Hook to get and use stored referral code
 */
export function useStoredReferralCode() {
  const code = typeof window !== 'undefined' ? getStoredReferralCode() : null;

  return {
    code,
    hasReferralCode: Boolean(code),
    clearCode: clearStoredReferralCode,
  };
}
