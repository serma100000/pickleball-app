import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import * as React from 'react';


import { cn } from '../lib/utils';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  (
    { className, label, value, change, changeLabel, icon, trend, ...props },
    ref
  ) => {
    const getTrendIcon = () => {
      if (trend === 'up') {
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      }
      if (trend === 'down') {
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      }
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    };

    const getTrendColor = () => {
      if (trend === 'up') return 'text-green-500';
      if (trend === 'down') return 'text-red-500';
      return 'text-muted-foreground';
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1', className)}
        {...props}
      >
        <div className="flex items-center space-x-2">
          {icon && (
            <span className="text-muted-foreground">{icon}</span>
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold">{value}</span>
          {(change !== undefined || trend) && (
            <div className={cn('flex items-center space-x-1', getTrendColor())}>
              {getTrendIcon()}
              {change !== undefined && (
                <span className="text-sm font-medium">
                  {change > 0 ? '+' : ''}
                  {change}%
                </span>
              )}
              {changeLabel && (
                <span className="text-xs text-muted-foreground">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);
Stat.displayName = 'Stat';

export interface StatCardProps extends StatProps {
  cardClassName?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, cardClassName, ...props }, ref) => {
    return (
      <div
        className={cn(
          'rounded-lg border bg-card p-6 shadow-sm',
          cardClassName
        )}
      >
        <Stat ref={ref} className={className} {...props} />
      </div>
    );
  }
);
StatCard.displayName = 'StatCard';

export { Stat, StatCard };
