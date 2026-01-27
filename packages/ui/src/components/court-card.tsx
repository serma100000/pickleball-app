import { MapPin, Clock, Users, Star, Wifi, Car, Lightbulb, Droplets } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

import { Badge } from './badge';

export type CourtAmenity =
  | 'wifi'
  | 'parking'
  | 'lights'
  | 'restrooms'
  | 'water'
  | 'pro-shop'
  | 'lessons';

const amenityIcons: Record<CourtAmenity, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  parking: Car,
  lights: Lightbulb,
  restrooms: Users,
  water: Droplets,
  'pro-shop': Star,
  lessons: Users,
};

const amenityLabels: Record<CourtAmenity, string> = {
  wifi: 'WiFi',
  parking: 'Parking',
  lights: 'Lights',
  restrooms: 'Restrooms',
  water: 'Water',
  'pro-shop': 'Pro Shop',
  lessons: 'Lessons',
};

export interface CourtCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  imageUrl?: string;
  address?: string;
  distance?: string;
  courtCount?: number;
  amenities?: CourtAmenity[];
  rating?: number;
  reviewCount?: number;
  hours?: string;
  isOpen?: boolean;
  priceRange?: string;
  compact?: boolean;
}

const CourtCard = React.forwardRef<HTMLDivElement, CourtCardProps>(
  (
    {
      className,
      name,
      imageUrl,
      address,
      distance,
      courtCount,
      amenities,
      rating,
      reviewCount,
      hours,
      isOpen,
      priceRange,
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
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="h-16 w-16 rounded-md object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="truncate font-medium">{name}</h3>
              {isOpen !== undefined && (
                <Badge variant={isOpen ? 'success' : 'secondary'} className="ml-2">
                  {isOpen ? 'Open' : 'Closed'}
                </Badge>
              )}
            </div>
            {distance && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="mr-1 h-3 w-3" />
                <span>{distance}</span>
              </div>
            )}
            {courtCount && (
              <div className="text-xs text-muted-foreground">
                {courtCount} courts
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
          'overflow-hidden rounded-lg border bg-card shadow-sm',
          className
        )}
        {...props}
      >
        {imageUrl && (
          <div className="relative h-40 w-full">
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
            {isOpen !== undefined && (
              <div className="absolute right-2 top-2">
                <Badge variant={isOpen ? 'success' : 'secondary'}>
                  {isOpen ? 'Open' : 'Closed'}
                </Badge>
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{name}</h3>
              {address && (
                <div className="mt-1 flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-1 h-4 w-4" />
                  <span>{address}</span>
                </div>
              )}
            </div>
            {rating && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{rating.toFixed(1)}</span>
                {reviewCount && (
                  <span className="text-sm text-muted-foreground">
                    ({reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {distance && (
              <Badge variant="outline">
                <MapPin className="mr-1 h-3 w-3" />
                {distance}
              </Badge>
            )}
            {courtCount && (
              <Badge variant="outline">
                {courtCount} courts
              </Badge>
            )}
            {priceRange && (
              <Badge variant="outline">
                {priceRange}
              </Badge>
            )}
          </div>

          {hours && (
            <div className="mt-3 flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>{hours}</span>
            </div>
          )}

          {amenities && amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {amenities.map((amenity) => {
                const Icon = amenityIcons[amenity];
                return (
                  <div
                    key={amenity}
                    className="flex items-center text-xs text-muted-foreground"
                    title={amenityLabels[amenity]}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
);
CourtCard.displayName = 'CourtCard';

export interface CourtListItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  imageUrl?: string;
  distance?: string;
  courtCount?: number;
  rating?: number;
  isOpen?: boolean;
  trailing?: React.ReactNode;
}

const CourtListItem = React.forwardRef<HTMLDivElement, CourtListItemProps>(
  (
    { className, name, imageUrl, distance, courtCount, rating, isOpen, trailing, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between py-3', className)}
        {...props}
      >
        <div className="flex items-center space-x-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="h-12 w-12 rounded-md object-cover"
            />
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{name}</span>
              {isOpen !== undefined && (
                <Badge
                  variant={isOpen ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {isOpen ? 'Open' : 'Closed'}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {distance && <span>{distance}</span>}
              {distance && courtCount && <span>-</span>}
              {courtCount && <span>{courtCount} courts</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {rating && (
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
            </div>
          )}
          {trailing}
        </div>
      </div>
    );
  }
);
CourtListItem.displayName = 'CourtListItem';

export { CourtCard, CourtListItem };
