'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, User, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useProfileCompletion,
  FIELD_LABELS,
  getPrimarySettingsPath,
  type ProfileRequiredFields,
} from '@/hooks/use-profile-completion';
import { cn } from '@/lib/utils';

interface ProfileCompletionGateProps {
  /** Content to render when profile is complete */
  children: React.ReactNode;
  /** Optional custom title for the modal */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Whether to show as a blocking modal (true) or inline alert (false) */
  blocking?: boolean;
  /** Callback when user tries to proceed with incomplete profile */
  onIncompleteAttempt?: () => void;
  /** Custom class name for the container */
  className?: string;
}

/**
 * Progress bar component for profile completion
 */
function CompletionProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-400">Profile Completion</span>
        <span className="font-medium text-gray-900 dark:text-white">{percentage}%</span>
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            percentage === 100
              ? 'bg-green-500'
              : percentage >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * List of required fields with completion status
 */
function RequiredFieldsList({
  requiredFields,
  missingFields,
}: {
  requiredFields: ProfileRequiredFields;
  missingFields: (keyof ProfileRequiredFields)[];
}) {
  const fields = Object.keys(requiredFields) as (keyof ProfileRequiredFields)[];

  return (
    <ul className="space-y-2">
      {fields.map((field) => {
        const isComplete = requiredFields[field];
        const isMissing = missingFields.includes(field);

        return (
          <li
            key={field}
            className={cn(
              'flex items-center gap-3 py-2 px-3 rounded-lg',
              isMissing
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                isMissing
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-green-700 dark:text-green-300'
              )}
            >
              {FIELD_LABELS[field]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Profile Completion Gate Component
 *
 * Wraps registration forms and blocks access if profile is incomplete.
 * Shows a modal/alert with missing fields and links to complete profile.
 */
export function ProfileCompletionGate({
  children,
  title = 'Complete Your Profile',
  description = 'To register for events, please complete the following required information:',
  blocking = true,
  onIncompleteAttempt,
  className,
}: ProfileCompletionGateProps) {
  const {
    isComplete,
    completionPercentage,
    missingFields,
    requiredFields,
    isLoading,
  } = useProfileCompletion();

  // Handle loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  // If profile is complete, render children
  if (isComplete) {
    return <>{children}</>;
  }

  // Profile is incomplete - show blocking UI
  const settingsPath = getPrimarySettingsPath(missingFields);

  const incompleteContent = (
    <Card className={cn('max-w-lg mx-auto', className)}>
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <CompletionProgressBar percentage={completionPercentage} />

        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Required Information
          </h4>
          <RequiredFieldsList requiredFields={requiredFields} missingFields={missingFields} />
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button asChild className="w-full">
            <Link href={settingsPath}>
              <User className="w-4 h-4 mr-2" />
              Complete Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          {!blocking && onIncompleteAttempt && (
            <Button variant="ghost" onClick={onIncompleteAttempt} className="w-full">
              Continue Anyway
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (blocking) {
    // Render as a full blocking overlay
    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        {incompleteContent}
      </div>
    );
  }

  // Non-blocking mode: render both the warning and children
  return (
    <div className="space-y-6">
      {incompleteContent}
      <div className="opacity-50 pointer-events-none">{children}</div>
    </div>
  );
}

export default ProfileCompletionGate;
