import * as React from 'react';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { Avatar, AvatarImage, AvatarFallback, getInitials } from './avatar';
import { Badge } from './badge';
import { RatingBadge } from './rating-badge';

export type MatchStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type MatchType = 'singles' | 'doubles' | 'mixed-doubles';

export interface MatchPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  rating: number;
}

export interface MatchTeam {
  players: MatchPlayer[];
  score?: number;
  isWinner?: boolean;
}

export interface MatchCardProps extends React.HTMLAttributes<HTMLDivElement> {
  team1: MatchTeam;
  team2: MatchTeam;
  matchType?: MatchType;
  status?: MatchStatus;
  date?: Date;
  time?: string;
  location?: string;
  courtNumber?: string;
  games?: Array<{ team1Score: number; team2Score: number }>;
  compact?: boolean;
}

const statusColors: Record<MatchStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  'in-progress': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

const statusLabels: Record<MatchStatus, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const matchTypeLabels: Record<MatchType, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  'mixed-doubles': 'Mixed Doubles',
};

const TeamDisplay: React.FC<{
  team: MatchTeam;
  isCompact?: boolean;
  showScore?: boolean;
}> = ({ team, isCompact = false, showScore = false }) => {
  const { players, score, isWinner } = team;

  if (isCompact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex -space-x-2">
          {players.map((player) => (
            <Avatar key={player.id} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={player.avatarUrl} alt={player.name} />
              <AvatarFallback className="text-xs">
                {getInitials(player.name)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('truncate text-sm font-medium', isWinner && 'text-primary')}>
            {players.map((p) => p.name).join(' & ')}
          </div>
        </div>
        {showScore && score !== undefined && (
          <span className={cn('text-xl font-bold', isWinner && 'text-primary')}>
            {score}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div key={player.id} className="flex items-center space-x-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={player.avatarUrl} alt={player.name} />
            <AvatarFallback>{getInitials(player.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className={cn('truncate font-medium', isWinner && 'text-primary')}>
              {player.name}
            </div>
            <RatingBadge rating={player.rating} size="sm" />
          </div>
        </div>
      ))}
      {showScore && score !== undefined && (
        <div className={cn('text-center text-3xl font-bold', isWinner && 'text-primary')}>
          {score}
        </div>
      )}
    </div>
  );
};

const MatchCard = React.forwardRef<HTMLDivElement, MatchCardProps>(
  (
    {
      className,
      team1,
      team2,
      matchType = 'doubles',
      status = 'scheduled',
      date,
      time,
      location,
      courtNumber,
      games,
      compact = false,
      ...props
    },
    ref
  ) => {
    const showScore = status === 'completed' || status === 'in-progress';

    if (compact) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-lg border bg-card p-3 shadow-sm',
            className
          )}
          {...props}
        >
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs">
              {matchTypeLabels[matchType]}
            </Badge>
            <Badge className={cn('text-xs', statusColors[status])}>
              {statusLabels[status]}
            </Badge>
          </div>
          <div className="space-y-2">
            <TeamDisplay team={team1} isCompact showScore={showScore} />
            <div className="text-center text-xs text-muted-foreground">vs</div>
            <TeamDisplay team={team2} isCompact showScore={showScore} />
          </div>
          {(date || time || location) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {date && (
                <span className="flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  {date.toLocaleDateString()}
                </span>
              )}
              {time && (
                <span className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {time}
                </span>
              )}
              {location && (
                <span className="flex items-center">
                  <MapPin className="mr-1 h-3 w-3" />
                  {location}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card shadow-sm',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              <Users className="mr-1 h-3 w-3" />
              {matchTypeLabels[matchType]}
            </Badge>
            {courtNumber && (
              <Badge variant="outline">Court {courtNumber}</Badge>
            )}
          </div>
          <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <TeamDisplay team={team1} showScore={showScore} />
            </div>
            <div className="mx-4 flex flex-col items-center">
              <span className="text-lg font-medium text-muted-foreground">vs</span>
              {showScore && games && games.length > 0 && (
                <div className="mt-2 space-y-1">
                  {games.map((game, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-xs text-muted-foreground"
                    >
                      <span className={cn(game.team1Score > game.team2Score && 'font-bold text-primary')}>
                        {game.team1Score}
                      </span>
                      <span>-</span>
                      <span className={cn(game.team2Score > game.team1Score && 'font-bold text-primary')}>
                        {game.team2Score}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1">
              <TeamDisplay team={team2} showScore={showScore} />
            </div>
          </div>
        </div>

        {(date || time || location) && (
          <div className="border-t p-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {date && (
                <span className="flex items-center">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  {date.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
              {time && (
                <span className="flex items-center">
                  <Clock className="mr-1.5 h-4 w-4" />
                  {time}
                </span>
              )}
              {location && (
                <span className="flex items-center">
                  <MapPin className="mr-1.5 h-4 w-4" />
                  {location}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
MatchCard.displayName = 'MatchCard';

export { MatchCard };
