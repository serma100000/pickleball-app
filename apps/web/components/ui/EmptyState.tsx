import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  /** Icon to display at the top */
  icon: LucideIcon;
  /** Icon background color variant */
  iconVariant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Main title text */
  title: string;
  /** Description text */
  description: string;
  /** Primary CTA button text */
  primaryActionLabel?: string;
  /** Primary CTA button href (use for Link) */
  primaryActionHref?: string;
  /** Primary CTA button onClick (use for button) */
  primaryActionOnClick?: () => void;
  /** Secondary action label */
  secondaryActionLabel?: string;
  /** Secondary action href */
  secondaryActionHref?: string;
  /** Secondary action onClick */
  secondaryActionOnClick?: () => void;
  /** Additional content to render below actions */
  children?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Compact mode with less padding */
  compact?: boolean;
}

const iconVariants = {
  default: 'bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
};

export function EmptyState({
  icon: Icon,
  iconVariant = 'default',
  title,
  description,
  primaryActionLabel,
  primaryActionHref,
  primaryActionOnClick,
  secondaryActionLabel,
  secondaryActionHref,
  secondaryActionOnClick,
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  const hasPrimaryAction = primaryActionLabel && (primaryActionHref || primaryActionOnClick);
  const hasSecondaryAction = secondaryActionLabel && (secondaryActionHref || secondaryActionOnClick);

  const renderPrimaryAction = () => {
    if (!hasPrimaryAction) return null;

    if (primaryActionHref) {
      return (
        <Button asChild size={compact ? 'default' : 'lg'}>
          <Link href={primaryActionHref}>{primaryActionLabel}</Link>
        </Button>
      );
    }

    return (
      <Button onClick={primaryActionOnClick} size={compact ? 'default' : 'lg'}>
        {primaryActionLabel}
      </Button>
    );
  };

  const renderSecondaryAction = () => {
    if (!hasSecondaryAction) return null;

    if (secondaryActionHref) {
      return (
        <Button asChild variant="outline" size={compact ? 'default' : 'lg'}>
          <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
        </Button>
      );
    }

    return (
      <Button onClick={secondaryActionOnClick} variant="outline" size={compact ? 'default' : 'lg'}>
        {secondaryActionLabel}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
        compact ? 'p-8' : 'p-12',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div
          className={cn(
            'rounded-full flex items-center justify-center mb-4',
            compact ? 'w-12 h-12' : 'w-16 h-16',
            iconVariants[iconVariant]
          )}
        >
          <Icon className={compact ? 'w-6 h-6' : 'w-8 h-8'} aria-hidden="true" />
        </div>

        {/* Title */}
        <h3
          className={cn(
            'font-semibold text-gray-900 dark:text-white mb-2',
            compact ? 'text-base' : 'text-lg'
          )}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className={cn(
            'text-gray-600 dark:text-gray-300 max-w-md',
            compact ? 'mb-4 text-sm' : 'mb-6'
          )}
        >
          {description}
        </p>

        {/* Actions */}
        {(hasPrimaryAction || hasSecondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {renderPrimaryAction()}
            {renderSecondaryAction()}
          </div>
        )}

        {/* Additional content */}
        {children}
      </div>
    </div>
  );
}
