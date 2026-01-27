import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

// DUPR Rating levels
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';

// Get skill level from DUPR rating
export function getSkillLevel(rating: number): SkillLevel {
  if (rating < 3.0) return 'beginner';
  if (rating < 4.0) return 'intermediate';
  if (rating < 5.0) return 'advanced';
  return 'pro';
}

// Get skill level label
export function getSkillLevelLabel(level: SkillLevel): string {
  const labels: Record<SkillLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    pro: 'Pro',
  };
  return labels[level];
}

const ratingBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold',
  {
    variants: {
      level: {
        beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
        intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
        advanced: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
        pro: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        default: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
      },
    },
    defaultVariants: {
      level: 'beginner',
      size: 'default',
    },
  }
);

export interface RatingBadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    Omit<VariantProps<typeof ratingBadgeVariants>, 'level'> {
  rating: number;
  showLevel?: boolean;
}

const RatingBadge = React.forwardRef<HTMLDivElement, RatingBadgeProps>(
  ({ className, rating, size, showLevel = false, ...props }, ref) => {
    const level = getSkillLevel(rating);
    const formattedRating = rating.toFixed(2);

    return (
      <div
        ref={ref}
        className={cn(ratingBadgeVariants({ level, size }), className)}
        {...props}
      >
        <span>{formattedRating}</span>
        {showLevel && (
          <span className="ml-1.5 opacity-80">
            ({getSkillLevelLabel(level)})
          </span>
        )}
      </div>
    );
  }
);
RatingBadge.displayName = 'RatingBadge';

export interface SkillLevelBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof ratingBadgeVariants>, 'level'> {
  level: SkillLevel;
}

const SkillLevelBadge = React.forwardRef<HTMLDivElement, SkillLevelBadgeProps>(
  ({ className, level, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(ratingBadgeVariants({ level, size }), className)}
        {...props}
      >
        {getSkillLevelLabel(level)}
      </div>
    );
  }
);
SkillLevelBadge.displayName = 'SkillLevelBadge';

export { RatingBadge, SkillLevelBadge, ratingBadgeVariants };
