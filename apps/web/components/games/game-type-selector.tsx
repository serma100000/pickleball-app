'use client';

import * as React from 'react';
import { Users, Trophy, RotateCcw, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// ============================================================================
// Types
// ============================================================================

export type GameEventType = 'single_match' | 'round_robin' | 'set_partner_round_robin';
export type GameFormat = 'singles' | 'doubles';

export interface GameTypeConfig {
  type: GameEventType;
  gameFormat?: GameFormat; // singles (1v1) or doubles (2v2)
  playerCount?: number; // for round robin (3-24 players)
  teamCount?: number; // for set partner round robin (3-24 teams)
  numberOfRounds?: number; // for round robins (1-10 rounds)
  reportToDupr: boolean;
}

interface GameTypeOption {
  type: GameEventType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  showPlayerCount?: boolean;
  showTeamCount?: boolean;
}

interface GameTypeSelectorProps {
  value: GameTypeConfig;
  onChange: (config: GameTypeConfig) => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const GAME_TYPE_OPTIONS: GameTypeOption[] = [
  {
    type: 'single_match',
    title: 'Single Match',
    description: 'A standard 1v1 or 2v2 game. Quick and simple.',
    icon: Trophy,
  },
  {
    type: 'round_robin',
    title: 'Round Robin',
    description: 'Multiple players rotating through matches. Everyone plays everyone.',
    icon: RotateCcw,
    showPlayerCount: true,
  },
  {
    type: 'set_partner_round_robin',
    title: 'Set Partner Round Robin',
    description: 'Teams stay together and rotate against other teams.',
    icon: Users,
    showTeamCount: true,
  },
];

const MIN_PLAYERS = 4; // Regular round robin needs at least 4 players
const MIN_TEAMS = 3;   // Set partner round robin can have 3 teams
const MAX_COUNT = 24;
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 10;
const DEFAULT_ROUNDS = 1;

// ============================================================================
// Toggle Switch Component
// ============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function ToggleSwitch({ checked, onChange, label, description, icon: Icon }: ToggleSwitchProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
        'bg-white dark:bg-gray-800',
        checked
          ? 'border-brand-500 dark:border-brand-400'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      )}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              'p-2 rounded-lg',
              checked
                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      <div
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Count Input Component
// ============================================================================

interface CountInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
}

function CountInput({ value, onChange, label, min = MIN_PLAYERS, max = MAX_COUNT }: CountInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => value > min && onChange(value - 1)}
          disabled={value <= min}
          className={cn(
            'min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center font-bold text-lg transition-colors',
            'border border-gray-300 dark:border-gray-600',
            value <= min
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          aria-label="Decrease count"
        >
          -
        </button>
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseInt(e.target.value, 10);
            if (!isNaN(newValue)) {
              onChange(Math.max(min, Math.min(max, newValue)));
            }
          }}
          min={min}
          max={max}
          className="w-20 min-h-[44px] text-center text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => value < max && onChange(value + 1)}
          disabled={value >= max}
          className={cn(
            'min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center font-bold text-lg transition-colors',
            'border border-gray-300 dark:border-gray-600',
            value >= max
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          aria-label="Increase count"
        >
          +
        </button>
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          ({min}-{max})
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Game Type Card Component
// ============================================================================

interface GameTypeCardProps {
  option: GameTypeOption;
  selected: boolean;
  onSelect: () => void;
  gameFormat?: GameFormat;
  playerCount?: number;
  teamCount?: number;
  numberOfRounds?: number;
  onGameFormatChange?: (format: GameFormat) => void;
  onPlayerCountChange?: (count: number) => void;
  onTeamCountChange?: (count: number) => void;
  onNumberOfRoundsChange?: (count: number) => void;
}

function GameTypeCard({
  option,
  selected,
  onSelect,
  gameFormat,
  playerCount,
  teamCount,
  numberOfRounds,
  onGameFormatChange,
  onPlayerCountChange,
  onTeamCountChange,
  onNumberOfRoundsChange,
}: GameTypeCardProps) {
  const Icon = option.icon;
  const hasConfigInputs = selected && (option.showPlayerCount || option.showTeamCount);

  return (
    <div className="space-y-0">
      {/* Clickable selection part */}
      <Card
        className={cn(
          'p-4 cursor-pointer transition-all',
          selected
            ? 'ring-2 ring-brand-500 dark:ring-brand-400 border-brand-500 dark:border-brand-400'
            : 'hover:border-gray-300 dark:hover:border-gray-600',
          // Remove bottom corners if showing inputs
          hasConfigInputs && 'rounded-b-none border-b-0'
        )}
        onClick={onSelect}
        role="radio"
        aria-checked={selected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'p-3 rounded-xl transition-colors',
              selected
                ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{option.title}</h3>
              {selected && (
                <div className="h-2 w-2 rounded-full bg-brand-500 dark:bg-brand-400" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{option.description}</p>
          </div>
        </div>
      </Card>

      {/* Config inputs - OUTSIDE the Card, not clickable for selection */}
      {hasConfigInputs && (
        <div className="border-2 border-t-0 border-brand-500 dark:border-brand-400 rounded-b-xl bg-gray-50 dark:bg-gray-900/50 p-4 space-y-4">
          {/* Game format selector (singles/doubles) - for round robin only */}
          {option.showPlayerCount && onGameFormatChange && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Game Format
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onGameFormatChange('singles')}
                  className={cn(
                    'flex-1 min-h-[44px] py-3 px-4 rounded-lg font-medium text-sm transition-colors',
                    gameFormat === 'singles'
                      ? 'bg-brand-500 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  Singles (1v1)
                </button>
                <button
                  type="button"
                  onClick={() => onGameFormatChange('doubles')}
                  className={cn(
                    'flex-1 min-h-[44px] py-3 px-4 rounded-lg font-medium text-sm transition-colors',
                    gameFormat === 'doubles'
                      ? 'bg-brand-500 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  Doubles (2v2)
                </button>
              </div>
            </div>
          )}

          {/* Player count input for round robin */}
          {option.showPlayerCount && onPlayerCountChange && (
            <>
              <CountInput
                value={playerCount ?? MIN_PLAYERS}
                onChange={onPlayerCountChange}
                label="Number of Players"
                min={MIN_PLAYERS}
                max={MAX_COUNT}
              />
              {onNumberOfRoundsChange && (
                <CountInput
                  value={numberOfRounds ?? DEFAULT_ROUNDS}
                  onChange={onNumberOfRoundsChange}
                  label="Number of Rounds"
                  min={MIN_ROUNDS}
                  max={MAX_ROUNDS}
                />
              )}
            </>
          )}

          {/* Team count input for set partner round robin (always doubles) */}
          {option.showTeamCount && onTeamCountChange && (
            <>
              <CountInput
                value={teamCount ?? MIN_TEAMS}
                onChange={onTeamCountChange}
                label="Number of Teams"
                min={MIN_TEAMS}
                max={MAX_COUNT}
              />
              {onNumberOfRoundsChange && (
                <CountInput
                  value={numberOfRounds ?? DEFAULT_ROUNDS}
                  onChange={onNumberOfRoundsChange}
                  label="Number of Rounds"
                  min={MIN_ROUNDS}
                  max={MAX_ROUNDS}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GameTypeSelector({ value, onChange, className }: GameTypeSelectorProps) {
  const handleTypeSelect = (type: GameEventType) => {
    const newConfig: GameTypeConfig = {
      ...value,
      type,
    };

    // Set defaults for count fields based on type
    if (type === 'round_robin') {
      newConfig.playerCount = value.playerCount ?? MIN_PLAYERS;
      newConfig.numberOfRounds = value.numberOfRounds ?? DEFAULT_ROUNDS;
      newConfig.gameFormat = value.gameFormat ?? 'doubles'; // Default to doubles
      delete newConfig.teamCount;
    } else if (type === 'set_partner_round_robin') {
      newConfig.teamCount = value.teamCount ?? MIN_TEAMS;
      newConfig.numberOfRounds = value.numberOfRounds ?? DEFAULT_ROUNDS;
      newConfig.gameFormat = 'doubles'; // Set partner is always doubles
      delete newConfig.playerCount;
    } else {
      delete newConfig.playerCount;
      delete newConfig.teamCount;
      delete newConfig.numberOfRounds;
      delete newConfig.gameFormat;
    }

    onChange(newConfig);
  };

  const handlePlayerCountChange = (count: number) => {
    onChange({
      ...value,
      playerCount: count,
    });
  };

  const handleTeamCountChange = (count: number) => {
    onChange({
      ...value,
      teamCount: count,
    });
  };

  const handleNumberOfRoundsChange = (count: number) => {
    onChange({
      ...value,
      numberOfRounds: count,
    });
  };

  const handleGameFormatChange = (format: GameFormat) => {
    onChange({
      ...value,
      gameFormat: format,
    });
  };

  const handleDuprToggle = (checked: boolean) => {
    onChange({
      ...value,
      reportToDupr: checked,
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Game Type Selection */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Game Type
        </h2>
        <div className="space-y-3" role="radiogroup" aria-label="Game type selection">
          {GAME_TYPE_OPTIONS.map((option) => (
            <GameTypeCard
              key={option.type}
              option={option}
              selected={value.type === option.type}
              onSelect={() => handleTypeSelect(option.type)}
              gameFormat={value.gameFormat}
              playerCount={value.playerCount}
              teamCount={value.teamCount}
              numberOfRounds={value.numberOfRounds}
              onGameFormatChange={handleGameFormatChange}
              onPlayerCountChange={handlePlayerCountChange}
              onTeamCountChange={handleTeamCountChange}
              onNumberOfRoundsChange={handleNumberOfRoundsChange}
            />
          ))}
        </div>
      </div>

      {/* DUPR Toggle */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rating Options
        </h2>
        <ToggleSwitch
          checked={value.reportToDupr}
          onChange={handleDuprToggle}
          label="Report to DUPR"
          description="Automatically submit match results to update DUPR ratings"
          icon={Shield}
        />
        {value.reportToDupr && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 pl-1">
            All players must have their DUPR accounts linked. Scores will require verification from both teams before submission.
          </p>
        )}
      </div>
    </div>
  );
}

// Default export for convenience
export default GameTypeSelector;
