'use client';

import * as React from 'react';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BracketMatch, type Match, type Team, type GameScore } from './bracket-match';

// Re-export types for convenience
export type { Match, Team, GameScore };

export type BracketType = 'single_elimination' | 'double_elimination';

export interface Round {
  id: string;
  name: string;
  matches: Match[];
}

export interface Bracket {
  id: string;
  type: BracketType;
  winnersRounds: Round[];
  losersRounds?: Round[];
  grandFinals?: Match;
  resetMatch?: Match; // For double elimination when losers winner beats winners winner
}

export interface BracketViewProps {
  bracket: Bracket;
  onMatchClick?: (matchId: string) => void;
  isEditable?: boolean;
  highlightTeamId?: string;
  className?: string;
}

// Constants for layout calculations
const MATCH_HEIGHT = 76; // Height of a match card in pixels
const MATCH_WIDTH = 208; // Width of a match card (w-52 = 13rem = 208px)
const MATCH_WIDTH_COMPACT = 160; // Compact width (w-40 = 10rem = 160px)
const ROUND_GAP = 48; // Gap between rounds
const MATCH_VERTICAL_GAP = 16; // Vertical gap between matches in first round

// Calculate the Y position for a match
function calculateMatchY(
  roundIndex: number,
  matchIndex: number,
  _totalRounds: number
): number {
  // First round matches are evenly spaced
  const firstRoundSpacing = MATCH_HEIGHT + MATCH_VERTICAL_GAP;

  // For first round, simple linear layout
  if (roundIndex === 0) {
    return matchIndex * firstRoundSpacing;
  }

  // For subsequent rounds, center between the two feeding matches
  const feedingMatchSpacing = firstRoundSpacing * Math.pow(2, roundIndex);
  const offset = (feedingMatchSpacing - MATCH_HEIGHT) / 2;
  return matchIndex * feedingMatchSpacing + offset;
}

// Calculate bracket height based on number of teams
function calculateBracketHeight(numTeams: number): number {
  const rounds = Math.ceil(Math.log2(numTeams));
  const firstRoundMatches = Math.pow(2, rounds - 1);
  return firstRoundMatches * (MATCH_HEIGHT + MATCH_VERTICAL_GAP) - MATCH_VERTICAL_GAP;
}

// SVG connector line between matches
function ConnectorLine({
  fromX,
  fromY,
  toX,
  toY,
  isWinnerPath,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isWinnerPath?: boolean;
}) {
  const midX = fromX + (toX - fromX) / 2;

  return (
    <path
      d={`M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`}
      fill="none"
      stroke={isWinnerPath ? '#22c55e' : '#d1d5db'}
      strokeWidth={isWinnerPath ? 2 : 1.5}
      className={cn(
        'transition-colors',
        isWinnerPath
          ? 'dark:stroke-green-500'
          : 'dark:stroke-gray-600'
      )}
    />
  );
}

// Single elimination bracket component
function SingleEliminationBracket({
  rounds,
  onMatchClick,
  isEditable,
  highlightTeamId,
  compact,
}: {
  rounds: Round[];
  onMatchClick?: (matchId: string) => void;
  isEditable?: boolean;
  highlightTeamId?: string;
  compact?: boolean;
}) {
  const totalRounds = rounds.length;
  const matchWidth = compact ? MATCH_WIDTH_COMPACT : MATCH_WIDTH;
  const bracketHeight = calculateBracketHeight(Math.pow(2, totalRounds));
  const bracketWidth = totalRounds * (matchWidth + ROUND_GAP);

  // Build match positions map for connectors
  const matchPositions = React.useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    rounds.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        const x = roundIndex * (matchWidth + ROUND_GAP);
        const y = calculateMatchY(roundIndex, matchIndex, totalRounds);
        positions[match.id] = { x, y };
      });
    });
    return positions;
  }, [rounds, totalRounds, matchWidth]);

  // Generate connector paths
  const connectors: React.ReactNode[] = [];
  rounds.forEach((round, roundIndex) => {
    if (roundIndex === 0) return; // No connectors for first round

    round.matches.forEach((match, matchIndex) => {
      const toPos = matchPositions[match.id];
      if (!toPos) return;

      // Each match in this round is fed by 2 matches from previous round
      const prevRound = rounds[roundIndex - 1];
      const feedingMatch1Index = matchIndex * 2;
      const feedingMatch2Index = matchIndex * 2 + 1;

      [feedingMatch1Index, feedingMatch2Index].forEach((feedIdx) => {
        const feedingMatch = prevRound?.matches[feedIdx];
        if (!feedingMatch) return;

        const fromPos = matchPositions[feedingMatch.id];
        if (!fromPos) return;

        const fromX = fromPos.x + matchWidth;
        const fromY = fromPos.y + MATCH_HEIGHT / 2;
        const toX = toPos.x;
        const toY = toPos.y + MATCH_HEIGHT / 2;

        // Check if this path is the winner path
        const isWinnerPath = Boolean(
          feedingMatch.winnerId &&
          (feedingMatch.winnerId === match.team1?.id ||
            feedingMatch.winnerId === match.team2?.id)
        );

        connectors.push(
          <ConnectorLine
            key={`${feedingMatch.id}-${match.id}`}
            fromX={fromX}
            fromY={fromY}
            toX={toX}
            toY={toY}
            isWinnerPath={isWinnerPath}
          />
        );
      });
    });
  });

  return (
    <div className="relative" style={{ width: bracketWidth, height: bracketHeight }}>
      {/* SVG layer for connectors */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={bracketWidth}
        height={bracketHeight}
      >
        {connectors}
      </svg>

      {/* Matches layer */}
      {rounds.map((round) => (
        <div key={round.id}>
          {round.matches.map((match) => {
            const pos = matchPositions[match.id];
            if (!pos) return null;

            return (
              <div
                key={match.id}
                className="absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                }}
              >
                <BracketMatch
                  match={match}
                  onMatchClick={onMatchClick}
                  isEditable={isEditable}
                  highlightTeamId={highlightTeamId}
                  compact={compact}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Round header component
function RoundHeader({ name, matchCount }: { name: string; matchCount: number }) {
  return (
    <div className="text-center mb-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{name}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {matchCount} {matchCount === 1 ? 'match' : 'matches'}
      </p>
    </div>
  );
}

// Main bracket view component
export function BracketView({
  bracket,
  onMatchClick,
  isEditable = false,
  highlightTeamId,
  className,
}: BracketViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Check for mobile viewport
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update scroll indicators
  const updateScrollIndicators = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  }, []);

  React.useEffect(() => {
    updateScrollIndicators();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollIndicators);
      window.addEventListener('resize', updateScrollIndicators);
    }
    return () => {
      container?.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators]);

  const scrollLeft = () => {
    containerRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  };

  const scrollRight = () => {
    containerRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
  };

  const matchWidth = isMobile ? MATCH_WIDTH_COMPACT : MATCH_WIDTH;

  return (
    <div className={cn('relative', className)}>
      {/* Scroll controls */}
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Bracket container */}
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pb-4"
      >
        <div className="inline-block min-w-full">
          {/* Round headers */}
          <div
            className="flex mb-2"
            style={{ gap: ROUND_GAP }}
          >
            {bracket.winnersRounds.map((round) => (
              <div
                key={`header-${round.id}`}
                style={{ width: matchWidth }}
              >
                <RoundHeader name={round.name} matchCount={round.matches.length} />
              </div>
            ))}
          </div>

          {/* Main bracket */}
          {bracket.type === 'single_elimination' && (
            <SingleEliminationBracket
              rounds={bracket.winnersRounds}
              onMatchClick={onMatchClick}
              isEditable={isEditable}
              highlightTeamId={highlightTeamId}
              compact={isMobile}
            />
          )}

          {/* Double Elimination - Winners Bracket */}
          {bracket.type === 'double_elimination' && (
            <div className="space-y-8">
              {/* Winners Bracket */}
              <div>
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Winners Bracket
                  </h2>
                </div>
                <SingleEliminationBracket
                  rounds={bracket.winnersRounds}
                  onMatchClick={onMatchClick}
                  isEditable={isEditable}
                  highlightTeamId={highlightTeamId}
                  compact={isMobile}
                />
              </div>

              {/* Losers Bracket */}
              {bracket.losersRounds && bracket.losersRounds.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30">
                      <Trophy className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Losers Bracket
                    </h2>
                  </div>

                  {/* Losers round headers */}
                  <div
                    className="flex mb-2"
                    style={{ gap: ROUND_GAP }}
                  >
                    {bracket.losersRounds.map((round) => (
                      <div
                        key={`header-losers-${round.id}`}
                        style={{ width: matchWidth }}
                      >
                        <RoundHeader name={round.name} matchCount={round.matches.length} />
                      </div>
                    ))}
                  </div>

                  <SingleEliminationBracket
                    rounds={bracket.losersRounds}
                    onMatchClick={onMatchClick}
                    isEditable={isEditable}
                    highlightTeamId={highlightTeamId}
                    compact={isMobile}
                  />
                </div>
              )}

              {/* Grand Finals */}
              {bracket.grandFinals && (
                <div>
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      Grand Finals
                    </h2>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                        Finals
                      </p>
                      <BracketMatch
                        match={bracket.grandFinals}
                        onMatchClick={onMatchClick}
                        isEditable={isEditable}
                        highlightTeamId={highlightTeamId}
                        compact={isMobile}
                      />
                    </div>
                    {bracket.resetMatch && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                          Reset (if needed)
                        </p>
                        <BracketMatch
                          match={bracket.resetMatch}
                          onMatchClick={onMatchClick}
                          isEditable={isEditable}
                          highlightTeamId={highlightTeamId}
                          compact={isMobile}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile hint */}
      {isMobile && (canScrollLeft || canScrollRight) && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          Swipe to see more rounds
        </p>
      )}
    </div>
  );
}

// Helper function to generate bracket structure from teams
export function generateSingleEliminationBracket(
  teams: Team[],
  bracketId: string = 'bracket-1'
): Bracket {
  const numTeams = teams.length;
  const rounds = Math.ceil(Math.log2(numTeams));
  const totalSlots = Math.pow(2, rounds);

  // Pad teams array to power of 2 with byes
  const paddedTeams: (Team | undefined)[] = [...teams];
  while (paddedTeams.length < totalSlots) {
    paddedTeams.push(undefined);
  }

  // Seed teams (1 vs last, 2 vs second-to-last, etc.)
  const seededTeams: (Team | undefined)[] = [];
  for (let i = 0; i < totalSlots / 2; i++) {
    seededTeams.push(paddedTeams[i]);
    seededTeams.push(paddedTeams[totalSlots - 1 - i]);
  }

  const getRoundName = (roundIndex: number, totalRounds: number): string => {
    const fromEnd = totalRounds - roundIndex;
    if (fromEnd === 1) return 'Finals';
    if (fromEnd === 2) return 'Semifinals';
    if (fromEnd === 3) return 'Quarterfinals';
    return `Round ${roundIndex + 1}`;
  };

  // Generate rounds
  const winnersRounds: Round[] = [];

  for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
    const matchesInRound = Math.pow(2, rounds - roundIndex - 1);
    const matches: Match[] = [];

    for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
      const matchId = `${bracketId}-r${roundIndex + 1}-m${matchIndex + 1}`;

      if (roundIndex === 0) {
        // First round - assign teams
        const team1Index = matchIndex * 2;
        const team2Index = matchIndex * 2 + 1;
        const team1 = seededTeams[team1Index];
        const team2 = seededTeams[team2Index];

        const isBye = !team1 || !team2;
        const byeWinner = isBye ? (team1 || team2) : undefined;

        matches.push({
          id: matchId,
          round: roundIndex + 1,
          position: matchIndex + 1,
          team1,
          team2,
          status: isBye ? 'bye' : 'pending',
          winnerId: byeWinner?.id,
        });
      } else {
        // Later rounds - teams TBD
        matches.push({
          id: matchId,
          round: roundIndex + 1,
          position: matchIndex + 1,
          status: 'pending',
        });
      }
    }

    winnersRounds.push({
      id: `${bracketId}-round-${roundIndex + 1}`,
      name: getRoundName(roundIndex, rounds),
      matches,
    });
  }

  // Auto-advance bye winners to next round
  for (let roundIndex = 0; roundIndex < rounds - 1; roundIndex++) {
    const currentRound = winnersRounds[roundIndex];
    const nextRound = winnersRounds[roundIndex + 1];

    if (!currentRound || !nextRound) continue;

    currentRound.matches.forEach((match, matchIndex) => {
      if (match.status === 'bye' && match.winnerId) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = nextRound.matches[nextMatchIndex];
        const isTopSlot = matchIndex % 2 === 0;
        const winner = match.team1 || match.team2;

        if (nextMatch && winner) {
          if (isTopSlot) {
            nextMatch.team1 = winner;
          } else {
            nextMatch.team2 = winner;
          }
        }
      }
    });
  }

  return {
    id: bracketId,
    type: 'single_elimination',
    winnersRounds,
  };
}

// Helper function to generate double elimination bracket
export function generateDoubleEliminationBracket(
  teams: Team[],
  bracketId: string = 'bracket-1'
): Bracket {
  // Generate winners bracket (same as single elimination)
  const singleBracket = generateSingleEliminationBracket(teams, bracketId);
  const winnersRounds = singleBracket.winnersRounds;

  // Generate losers bracket
  // Losers bracket has (2 * winnersRounds - 2) rounds
  const numWinnersRounds = winnersRounds.length;
  const numLosersRounds = (numWinnersRounds - 1) * 2;
  const losersRounds: Round[] = [];

  for (let i = 0; i < numLosersRounds; i++) {
    const matchCount = Math.max(1, Math.pow(2, Math.floor((numLosersRounds - i) / 2) - 1));
    const matches: Match[] = [];

    for (let j = 0; j < matchCount; j++) {
      matches.push({
        id: `${bracketId}-losers-r${i + 1}-m${j + 1}`,
        round: i + 1,
        position: j + 1,
        status: 'pending',
        bracketType: 'losers',
      });
    }

    losersRounds.push({
      id: `${bracketId}-losers-round-${i + 1}`,
      name: `Losers Round ${i + 1}`,
      matches,
    });
  }

  // Grand finals match
  const grandFinals: Match = {
    id: `${bracketId}-grand-finals`,
    round: 1,
    position: 1,
    status: 'pending',
    bracketType: 'finals',
  };

  // Reset match (if losers bracket winner beats winners bracket winner)
  const resetMatch: Match = {
    id: `${bracketId}-reset`,
    round: 1,
    position: 1,
    status: 'pending',
    bracketType: 'finals',
  };

  return {
    id: bracketId,
    type: 'double_elimination',
    winnersRounds,
    losersRounds,
    grandFinals,
    resetMatch,
  };
}

export default BracketView;
