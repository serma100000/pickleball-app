'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, User, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useProfileCompletion,
  getPrimarySettingsPath,
} from '@/hooks/use-profile-completion';
import { cn } from '@/lib/utils';

interface ProfileCompletionBannerProps {
  /** Custom class name */
  className?: string;
  /** Session storage key for dismissal persistence */
  dismissKey?: string;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

/**
 * Compact progress indicator
 */
function MiniProgress({ percentage }: { percentage: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            percentage === 100
              ? 'bg-green-500'
              : percentage >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3ch]">
        {percentage}%
      </span>
    </div>
  );
}

/**
 * Profile Completion Banner Component
 *
 * Non-blocking banner for dashboard that shows completion status
 * and prompts users to complete their profile.
 * Dismissible but reappears if profile is still incomplete on next visit.
 */
export function ProfileCompletionBanner({
  className,
  dismissKey = 'profile-banner-dismissed',
  dismissible = true,
  onDismiss,
  compact = false,
}: ProfileCompletionBannerProps) {
  const {
    isComplete,
    completionPercentage,
    missingFields,
    missingFieldLabels,
    isLoading,
  } = useProfileCompletion();

  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash

  // Check dismissal state on mount
  useEffect(() => {
    const dismissed = sessionStorage.getItem(dismissKey);
    // Only show if not dismissed in this session
    setIsDismissed(Boolean(dismissed));
  }, [dismissKey]);

  // Reset dismissal if profile becomes incomplete again
  useEffect(() => {
    if (!isComplete && !isLoading) {
      // Profile is incomplete, could reset dismissal if desired
      // For now, we respect the session dismissal
    }
  }, [isComplete, isLoading]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(dismissKey, 'true');
    onDismiss?.();
  };

  // Don't render if loading, complete, or dismissed
  if (isLoading || isComplete || isDismissed) {
    return null;
  }

  const settingsPath = getPrimarySettingsPath(missingFields);

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/20',
          'border border-amber-200 dark:border-amber-800 rounded-lg',
          className
        )}
      >
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
          Profile {completionPercentage}% complete
        </span>
        <Link
          href={settingsPath}
          className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
        >
          Complete
        </Link>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative px-4 py-4 sm:px-6 bg-gradient-to-r from-amber-50 to-orange-50',
        'dark:from-amber-900/20 dark:to-orange-900/20',
        'border border-amber-200 dark:border-amber-800 rounded-xl',
        className
      )}
    >
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
            <User className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Complete Your Profile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {missingFields.length === 1 && missingFieldLabels[0]
                  ? `Add your ${missingFieldLabels[0].toLowerCase()} to register for events.`
                  : `Add ${missingFields.length} missing fields to register for events.`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <MiniProgress percentage={completionPercentage} />

              <Button asChild size="sm" className="whitespace-nowrap">
                <Link href={settingsPath}>
                  Complete Profile
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Missing fields list (optional - shown on larger screens) */}
          {missingFields.length > 1 && missingFields.length <= 3 && (
            <div className="hidden sm:flex items-center gap-2 mt-2 text-xs text-amber-700 dark:text-amber-300">
              <span>Missing:</span>
              {missingFieldLabels.map((label, index) => (
                <span key={label}>
                  {label}
                  {index < missingFieldLabels.length - 1 && ','}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileCompletionBanner;
