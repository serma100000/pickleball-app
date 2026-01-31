'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Rating source types
 */
export type RatingSource = 'dupr' | 'internal' | 'self_reported';

/**
 * Get display information for a rating source
 */
function getSourceInfo(source: RatingSource): {
  label: string;
  description: string;
  color: string;
  bgColor: string;
} {
  switch (source) {
    case 'dupr':
      return {
        label: 'DUPR',
        description: 'Official DUPR rating synced from your linked account',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      };
    case 'internal':
      return {
        label: 'Internal',
        description: 'Rating calculated from games played within PaddleUp',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      };
    case 'self_reported':
      return {
        label: 'Self-Reported',
        description: 'Rating provided by the player (not verified)',
        color: 'text-gray-700 dark:text-gray-300',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
      };
  }
}

interface RatingBadgeProps {
  /** The rating value (e.g., 3.75) */
  rating: number;
  /** Rating source */
  source: RatingSource;
  /** DUPR reliability percentage (0-1), only applicable for DUPR ratings */
  reliability?: number;
  /** Whether the rating is verified (high reliability for DUPR, or confirmed internal) */
  verified?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the source label */
  showSource?: boolean;
  /** Whether to show reliability percentage */
  showReliability?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * DUPR Logo component (simplified SVG representation)
 */
function DuprLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold text-blue-600 dark:text-blue-400',
        className
      )}
    >
      D
    </span>
  );
}

/**
 * Tooltip component for rating explanations
 */
function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 max-w-xs whitespace-normal shadow-lg">
            {content}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Rating Badge Component
 *
 * Displays a player's rating with source indicator, reliability percentage,
 * and verification status. Includes tooltips explaining the rating source.
 */
export function RatingBadge({
  rating,
  source,
  reliability,
  verified,
  size = 'md',
  showSource = true,
  showReliability = true,
  className,
}: RatingBadgeProps) {
  const sourceInfo = getSourceInfo(source);

  // Determine if verified based on reliability threshold (60%+ for DUPR)
  const isVerified = verified ?? (source === 'dupr' && reliability !== undefined && reliability >= 0.6);

  // Format rating to 2 decimal places
  const formattedRating = rating.toFixed(2);

  // Format reliability as percentage
  const reliabilityPercent = reliability !== undefined ? Math.round(reliability * 100) : null;

  // Size-based classes
  const sizeClasses = {
    sm: {
      container: 'gap-1.5 px-2 py-1',
      rating: 'text-sm font-semibold',
      source: 'text-xs',
      icon: 'w-3.5 h-3.5',
      logo: 'text-xs w-4 h-4',
    },
    md: {
      container: 'gap-2 px-3 py-1.5',
      rating: 'text-base font-bold',
      source: 'text-xs',
      icon: 'w-4 h-4',
      logo: 'text-sm w-5 h-5',
    },
    lg: {
      container: 'gap-2.5 px-4 py-2',
      rating: 'text-xl font-bold',
      source: 'text-sm',
      icon: 'w-5 h-5',
      logo: 'text-base w-6 h-6',
    },
  };

  const classes = sizeClasses[size];

  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <div className="font-medium">{sourceInfo.label} Rating</div>
          <div className="opacity-90">{sourceInfo.description}</div>
          {source === 'dupr' && reliabilityPercent !== null && (
            <div className="opacity-75">Reliability: {reliabilityPercent}%</div>
          )}
          {isVerified && (
            <div className="flex items-center gap-1 text-green-300 dark:text-green-700">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </div>
          )}
        </div>
      }
    >
      <div
        className={cn(
          'inline-flex items-center rounded-lg border transition-colors',
          sourceInfo.bgColor,
          source === 'dupr'
            ? 'border-blue-200 dark:border-blue-700'
            : source === 'internal'
              ? 'border-purple-200 dark:border-purple-700'
              : 'border-gray-200 dark:border-gray-600',
          classes.container,
          className
        )}
        role="img"
        aria-label={`Rating: ${formattedRating}, Source: ${sourceInfo.label}${
          isVerified ? ', Verified' : ''
        }${reliabilityPercent !== null ? `, ${reliabilityPercent}% reliability` : ''}`}
      >
        {/* Source Logo/Icon */}
        {source === 'dupr' ? (
          <DuprLogo className={classes.logo} />
        ) : source === 'internal' ? (
          <div
            className={cn(
              'rounded-full bg-purple-500 text-white flex items-center justify-center',
              classes.logo
            )}
          >
            <span className="text-[0.6em] font-bold">P</span>
          </div>
        ) : (
          <HelpCircle className={cn('text-gray-400', classes.icon)} />
        )}

        {/* Rating Value */}
        <span className={cn('text-gray-900 dark:text-white', classes.rating)}>
          {formattedRating}
        </span>

        {/* Source Label */}
        {showSource && (
          <span className={cn('font-medium', sourceInfo.color, classes.source)}>
            {sourceInfo.label}
          </span>
        )}

        {/* Reliability for DUPR */}
        {source === 'dupr' && showReliability && reliabilityPercent !== null && (
          <span className={cn('text-gray-500 dark:text-gray-400', classes.source)}>
            {reliabilityPercent}%
          </span>
        )}

        {/* Verified Indicator */}
        {isVerified ? (
          <CheckCircle2 className={cn('text-green-500', classes.icon)} aria-hidden="true" />
        ) : source !== 'self_reported' && !isVerified && reliability !== undefined ? (
          <AlertCircle
            className={cn('text-amber-500', classes.icon)}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </Tooltip>
  );
}

/**
 * Compact rating display without badge styling
 */
export function RatingValue({
  rating,
  source,
  verified,
  className,
}: Pick<RatingBadgeProps, 'rating' | 'source' | 'verified' | 'className'>) {
  const isVerified = verified ?? source === 'dupr';

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="font-semibold">{rating.toFixed(2)}</span>
      {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
    </span>
  );
}

export default RatingBadge;
