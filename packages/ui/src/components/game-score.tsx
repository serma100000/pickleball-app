import * as React from 'react';

import { cn } from '../lib/utils';

export interface GameScoreProps extends React.HTMLAttributes<HTMLDivElement> {
  team1Score: number;
  team2Score: number;
  team1Name?: string;
  team2Name?: string;
  gameNumber?: number;
  isComplete?: boolean;
  winningTeam?: 1 | 2;
}

const GameScore = React.forwardRef<HTMLDivElement, GameScoreProps>(
  (
    {
      className,
      team1Score,
      team2Score,
      team1Name = 'Team 1',
      team2Name = 'Team 2',
      gameNumber,
      isComplete = false,
      winningTeam,
      ...props
    },
    ref
  ) => {
    const winner = winningTeam || (isComplete && team1Score > team2Score ? 1 : isComplete && team2Score > team1Score ? 2 : undefined);

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card p-4 shadow-sm',
          className
        )}
        {...props}
      >
        {gameNumber && (
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Game {gameNumber}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center space-y-1">
            <span
              className={cn(
                'text-sm font-medium',
                winner === 1 && 'text-primary font-bold'
              )}
            >
              {team1Name}
            </span>
            <span
              className={cn(
                'text-3xl font-bold',
                winner === 1 && 'text-primary'
              )}
            >
              {team1Score}
            </span>
          </div>
          <div className="text-muted-foreground font-medium">vs</div>
          <div className="flex flex-col items-center space-y-1">
            <span
              className={cn(
                'text-sm font-medium',
                winner === 2 && 'text-primary font-bold'
              )}
            >
              {team2Name}
            </span>
            <span
              className={cn(
                'text-3xl font-bold',
                winner === 2 && 'text-primary'
              )}
            >
              {team2Score}
            </span>
          </div>
        </div>
        {isComplete && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {winner ? `${winner === 1 ? team1Name : team2Name} wins!` : 'Final'}
          </div>
        )}
      </div>
    );
  }
);
GameScore.displayName = 'GameScore';

export interface MatchScoreProps extends React.HTMLAttributes<HTMLDivElement> {
  games: Array<{
    team1Score: number;
    team2Score: number;
  }>;
  team1Name?: string;
  team2Name?: string;
  bestOf?: number;
}

const MatchScore = React.forwardRef<HTMLDivElement, MatchScoreProps>(
  (
    {
      className,
      games,
      team1Name = 'Team 1',
      team2Name = 'Team 2',
      bestOf = 3,
      ...props
    },
    ref
  ) => {
    const team1Wins = games.filter((g) => g.team1Score > g.team2Score).length;
    const team2Wins = games.filter((g) => g.team2Score > g.team1Score).length;
    const winsNeeded = Math.ceil(bestOf / 2);
    const isMatchComplete = team1Wins >= winsNeeded || team2Wins >= winsNeeded;
    const matchWinner = team1Wins >= winsNeeded ? 1 : team2Wins >= winsNeeded ? 2 : undefined;

    return (
      <div
        ref={ref}
        className={cn('rounded-lg border bg-card shadow-sm', className)}
        {...props}
      >
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start space-y-1">
              <span
                className={cn(
                  'text-base font-semibold',
                  matchWinner === 1 && 'text-primary'
                )}
              >
                {team1Name}
              </span>
              <span className="text-2xl font-bold">{team1Wins}</span>
            </div>
            <div className="text-lg font-medium text-muted-foreground">-</div>
            <div className="flex flex-col items-end space-y-1">
              <span
                className={cn(
                  'text-base font-semibold',
                  matchWinner === 2 && 'text-primary'
                )}
              >
                {team2Name}
              </span>
              <span className="text-2xl font-bold">{team2Wins}</span>
            </div>
          </div>
          {isMatchComplete && (
            <div className="mt-2 text-center text-sm font-medium text-primary">
              {matchWinner === 1 ? team1Name : team2Name} wins the match!
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Game Scores
          </div>
          <div className="space-y-2">
            {games.map((game, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">Game {index + 1}</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={cn(
                      'font-medium',
                      game.team1Score > game.team2Score && 'text-primary'
                    )}
                  >
                    {game.team1Score}
                  </span>
                  <span className="text-muted-foreground">-</span>
                  <span
                    className={cn(
                      'font-medium',
                      game.team2Score > game.team1Score && 'text-primary'
                    )}
                  >
                    {game.team2Score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);
MatchScore.displayName = 'MatchScore';

export { GameScore, MatchScore };
