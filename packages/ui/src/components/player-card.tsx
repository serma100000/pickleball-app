import * as React from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { Avatar, AvatarImage, AvatarFallback, getInitials } from './avatar';
import { RatingBadge } from './rating-badge';
import { Badge } from './badge';

export interface PlayerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  avatarUrl?: string;
  rating: number;
  location?: string;
  gamesPlayed?: number;
  winRate?: number;
  isOnline?: boolean;
  badges?: string[];
  compact?: boolean;
}

const PlayerCard = React.forwardRef<HTMLDivElement, PlayerCardProps>(
  (
    {
      className,
      name,
      avatarUrl,
      rating,
      location,
      gamesPlayed,
      winRate,
      isOnline,
      badges,
      compact = false,
      ...props
    },
    ref
  ) => {
    if (compact) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex items-center space-x-3 rounded-lg border bg-card p-3 shadow-sm',
            className
          )}
          {...props}
        >
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="truncate font-medium">{name}</span>
              <RatingBadge rating={rating} size="sm" />
            </div>
            {location && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="mr-1 h-3 w-3" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card p-4 shadow-sm',
          className
        )}
        {...props}
      >
        <div className="flex items-start space-x-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="text-lg">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-green-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="truncate text-lg font-semibold">{name}</h3>
              <RatingBadge rating={rating} />
            </div>
            {location && (
              <div className="mt-1 flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-1 h-4 w-4" />
                <span className="truncate">{location}</span>
              </div>
            )}
            {badges && badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {badges.map((badge, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        {(gamesPlayed !== undefined || winRate !== undefined) && (
          <div className="mt-4 flex justify-around border-t pt-4">
            {gamesPlayed !== undefined && (
              <div className="text-center">
                <div className="text-lg font-semibold">{gamesPlayed}</div>
                <div className="text-xs text-muted-foreground">Games</div>
              </div>
            )}
            {winRate !== undefined && (
              <div className="text-center">
                <div className="text-lg font-semibold">{winRate}%</div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);
PlayerCard.displayName = 'PlayerCard';

export interface PlayerListItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  avatarUrl?: string;
  rating: number;
  subtitle?: string;
  trailing?: React.ReactNode;
}

const PlayerListItem = React.forwardRef<HTMLDivElement, PlayerListItemProps>(
  ({ className, name, avatarUrl, rating, subtitle, trailing, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between py-3',
          className
        )}
        {...props}
      >
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{name}</div>
            {subtitle && (
              <div className="text-sm text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <RatingBadge rating={rating} size="sm" />
          {trailing}
        </div>
      </div>
    );
  }
);
PlayerListItem.displayName = 'PlayerListItem';

export { PlayerCard, PlayerListItem };
