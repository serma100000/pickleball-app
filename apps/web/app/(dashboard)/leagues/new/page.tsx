'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Trophy,
  Users,
  Crown,
  Grid3X3,
  Layers,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LocationAutocomplete } from '@/components/location-autocomplete';

// ============================================================================
// Types
// ============================================================================

type LeagueType = 'ladder' | 'doubles' | 'king_of_court' | 'pool_play' | 'hybrid' | '';
type PlayoffFormat = 'single_elimination' | 'double_elimination' | 'best_of_3';

interface LeagueFormState {
  step: number;
  leagueType: LeagueType;
  name: string;
  description: string;
  location: string;
  locationCoordinates?: { lat: number; lng: number };
  startDate: string;
  numberOfWeeks: number;
  daysPerWeek: string[];
  minPlayers: number;
  maxPlayers: number;
  numberOfPools?: number;
  challengeRange?: number;
  hasPlayoffs: boolean;
  playoffTeams?: number;
  playoffFormat?: PlayoffFormat;
  reportToDupr: boolean;
}

interface LeagueTypeOption {
  type: LeagueType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================================================
// Constants
// ============================================================================

const LEAGUE_TYPE_OPTIONS: LeagueTypeOption[] = [
  {
    type: 'ladder',
    title: 'Ladder League',
    description: 'Climb the ranks by challenging players above you',
    icon: Trophy,
  },
  {
    type: 'doubles',
    title: 'Doubles League',
    description: 'Fixed teams compete throughout the season',
    icon: Users,
  },
  {
    type: 'king_of_court',
    title: 'King of the Court',
    description: 'Fast-paced games, winner stays on',
    icon: Crown,
  },
  {
    type: 'pool_play',
    title: 'Pool Play',
    description: 'Groups play round robin, top advance to playoffs',
    icon: Grid3X3,
  },
  {
    type: 'hybrid',
    title: 'Hybrid/Custom',
    description: 'Combine formats (pool play -> playoffs)',
    icon: Layers,
  },
];

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
  { label: 'Sun', value: 'sunday' },
];

const STEPS = [
  'League Type',
  'Details',
  'Players',
  'Playoffs',
  'Ratings',
  'Review',
];

const PLAYOFF_TEAM_OPTIONS = [2, 4, 8, 16];
const PLAYOFF_FORMAT_OPTIONS: { value: PlayoffFormat; label: string }[] = [
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'best_of_3', label: 'Best of 3' },
];

// ============================================================================
// Helper Components
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

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min: number;
  max: number;
  helpText?: string;
}

function NumberStepper({ value, onChange, label, min, max, helpText }: NumberStepperProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value > min) {
      onChange(value - 1);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg transition-colors',
            'border border-gray-300 dark:border-gray-600',
            value <= min
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          aria-label="Decrease"
        >
          -
        </button>
        <Input
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg transition-colors',
            'border border-gray-300 dark:border-gray-600',
            value >= max
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          aria-label="Increase"
        >
          +
        </button>
        {helpText && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {helpText}
          </span>
        )}
      </div>
    </div>
  );
}

interface DaySelectorProps {
  selected: string[];
  onChange: (days: string[]) => void;
}

function DaySelector({ selected, onChange }: DaySelectorProps) {
  const toggleDay = (day: string) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Days per Week
      </label>
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => toggleDay(day.value)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              selected.includes(day.value)
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            {day.label}
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Select at least one day
        </p>
      )}
    </div>
  );
}

interface LeagueTypeCardProps {
  option: LeagueTypeOption;
  selected: boolean;
  onSelect: () => void;
}

function LeagueTypeCard({ option, selected, onSelect }: LeagueTypeCardProps) {
  const Icon = option.icon;

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all',
        selected
          ? 'ring-2 ring-brand-500 dark:ring-brand-400 border-brand-500 dark:border-brand-400'
          : 'hover:border-gray-300 dark:hover:border-gray-600'
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
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  state: LeagueFormState;
  setState: React.Dispatch<React.SetStateAction<LeagueFormState>>;
}

function LeagueTypeStep({ state, setState }: StepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Select League Type
      </h2>
      <div className="space-y-3" role="radiogroup" aria-label="League type selection">
        {LEAGUE_TYPE_OPTIONS.map((option) => (
          <LeagueTypeCard
            key={option.type}
            option={option}
            selected={state.leagueType === option.type}
            onSelect={() => setState((prev) => ({ ...prev, leagueType: option.type }))}
          />
        ))}
      </div>
    </div>
  );
}

function LeagueDetailsStep({ state, setState }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        League Details
      </h2>

      {/* League Name */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          League Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g., Summer Doubles League 2025"
          value={state.name}
          onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full"
        />
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          rows={3}
          placeholder="Describe your league..."
          value={state.description}
          onChange={(e) => setState((prev) => ({ ...prev, description: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
      </div>

      {/* Location */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </div>
        </label>
        <LocationAutocomplete
          value={state.location}
          onChange={(value, coordinates) =>
            setState((prev) => ({
              ...prev,
              location: value,
              locationCoordinates: coordinates,
            }))
          }
          placeholder="Search for a court or location..."
          className="w-full"
        />
      </div>

      {/* Start Date and Duration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </div>
            </label>
            <Input
              type="date"
              value={state.startDate}
              onChange={(e) => setState((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full"
            />
          </div>
          <NumberStepper
            value={state.numberOfWeeks}
            onChange={(val) => setState((prev) => ({ ...prev, numberOfWeeks: val }))}
            label="Number of Weeks"
            min={1}
            max={52}
            helpText="(1-52)"
          />
        </div>
      </div>

      {/* Days per Week */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <DaySelector
          selected={state.daysPerWeek}
          onChange={(days) => setState((prev) => ({ ...prev, daysPerWeek: days }))}
        />
      </div>
    </div>
  );
}

function PlayerSettingsStep({ state, setState }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Player Settings
      </h2>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid md:grid-cols-2 gap-6">
          <NumberStepper
            value={state.minPlayers}
            onChange={(val) => setState((prev) => ({ ...prev, minPlayers: val }))}
            label="Minimum Players"
            min={3}
            max={24}
            helpText="(3-24)"
          />
          <NumberStepper
            value={state.maxPlayers}
            onChange={(val) => setState((prev) => ({ ...prev, maxPlayers: val }))}
            label="Maximum Players"
            min={4}
            max={128}
            helpText="(4-128)"
          />
        </div>

        {state.minPlayers > state.maxPlayers && (
          <p className="mt-4 text-sm text-red-500">
            Minimum players cannot exceed maximum players
          </p>
        )}
      </div>

      {/* Pool Play specific settings */}
      {(state.leagueType === 'pool_play' || state.leagueType === 'hybrid') && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <NumberStepper
            value={state.numberOfPools ?? 2}
            onChange={(val) => setState((prev) => ({ ...prev, numberOfPools: val }))}
            label="Number of Pools"
            min={2}
            max={8}
            helpText="(2-8)"
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Players will be divided into {state.numberOfPools ?? 2} pools for round robin play
          </p>
        </div>
      )}

      {/* Ladder specific settings */}
      {state.leagueType === 'ladder' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <NumberStepper
            value={state.challengeRange ?? 3}
            onChange={(val) => setState((prev) => ({ ...prev, challengeRange: val }))}
            label="Challenge Range"
            min={1}
            max={5}
            helpText="(1-5)"
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Players can challenge opponents up to {state.challengeRange ?? 3} spots above them
          </p>
        </div>
      )}
    </div>
  );
}

function PlayoffSettingsStep({ state, setState }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Playoff Settings
      </h2>

      <ToggleSwitch
        checked={state.hasPlayoffs}
        onChange={(checked) => setState((prev) => ({ ...prev, hasPlayoffs: checked }))}
        label="Include Playoffs"
        description="Add a playoff bracket at the end of the regular season"
        icon={Trophy}
      />

      {state.hasPlayoffs && (
        <>
          {/* Number of teams in playoffs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Teams Making Playoffs
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYOFF_TEAM_OPTIONS.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, playoffTeams: num }))}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    state.playoffTeams === num
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Playoff format */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Playoff Format
            </label>
            <div className="space-y-2">
              {PLAYOFF_FORMAT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, playoffFormat: option.value }))}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg border transition-colors',
                    state.playoffFormat === option.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RatingOptionsStep({ state, setState }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Rating Options
      </h2>

      <ToggleSwitch
        checked={state.reportToDupr}
        onChange={(checked) => setState((prev) => ({ ...prev, reportToDupr: checked }))}
        label="Report Results to DUPR"
        description="Automatically submit match results to update DUPR ratings"
        icon={Shield}
      />

      {state.reportToDupr && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                DUPR ID Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                All players participating in this league must have their DUPR accounts linked
                to report results. Players without DUPR IDs will need to create and link their
                accounts before joining.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ state }: { state: LeagueFormState }) {
  const leagueTypeLabel =
    LEAGUE_TYPE_OPTIONS.find((o) => o.type === state.leagueType)?.title ?? 'Not selected';

  const formatDays = (days: string[]) => {
    return days
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
      .join(', ') || 'None selected';
  };

  const formatPlayoffFormat = (format?: PlayoffFormat) => {
    return PLAYOFF_FORMAT_OPTIONS.find((o) => o.value === format)?.label ?? 'Not selected';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Review & Create
      </h2>

      {/* League Type */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          League Type
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-full text-sm font-medium">
            {leagueTypeLabel}
          </span>
          {state.reportToDupr && (
            <span className="px-3 py-1 bg-pickle-100 dark:bg-pickle-900/30 text-pickle-700 dark:text-pickle-400 rounded-full text-sm font-medium">
              DUPR Rated
            </span>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
          League Information
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Name</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.name || 'Not specified'}
            </dd>
          </div>
          {state.description && (
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Description</dt>
              <dd className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
                {state.description}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Location</dt>
            <dd className="font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
              {state.location || 'Not specified'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Start Date</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.startDate || 'Not specified'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Duration</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.numberOfWeeks} weeks
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Days</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {formatDays(state.daysPerWeek)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Player Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
          Player Settings
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Players</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.minPlayers} - {state.maxPlayers}
            </dd>
          </div>
          {(state.leagueType === 'pool_play' || state.leagueType === 'hybrid') && (
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Number of Pools</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {state.numberOfPools ?? 2}
              </dd>
            </div>
          )}
          {state.leagueType === 'ladder' && (
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Challenge Range</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {state.challengeRange ?? 3} spots
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Playoff Settings */}
      {state.hasPlayoffs && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Playoff Settings
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Teams in Playoffs</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {state.playoffTeams ?? 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Format</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {formatPlayoffFormat(state.playoffFormat)}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NewLeaguePage() {
  const [state, setState] = useState<LeagueFormState>({
    step: 0,
    leagueType: '',
    name: '',
    description: '',
    location: '',
    locationCoordinates: undefined,
    startDate: '',
    numberOfWeeks: 8,
    daysPerWeek: [],
    minPlayers: 4,
    maxPlayers: 16,
    numberOfPools: 2,
    challengeRange: 3,
    hasPlayoffs: false,
    playoffTeams: 4,
    playoffFormat: 'single_elimination',
    reportToDupr: false,
  });

  const isFirstStep = state.step === 0;
  const isLastStep = state.step === STEPS.length - 1;

  const handleNext = () => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, STEPS.length - 1) }));
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      leagueType: state.leagueType,
      name: state.name,
      description: state.description,
      location: state.location,
      locationCoordinates: state.locationCoordinates,
      startDate: state.startDate,
      numberOfWeeks: state.numberOfWeeks,
      daysPerWeek: state.daysPerWeek,
      minPlayers: state.minPlayers,
      maxPlayers: state.maxPlayers,
      ...(state.leagueType === 'pool_play' || state.leagueType === 'hybrid'
        ? { numberOfPools: state.numberOfPools }
        : {}),
      ...(state.leagueType === 'ladder' ? { challengeRange: state.challengeRange } : {}),
      hasPlayoffs: state.hasPlayoffs,
      ...(state.hasPlayoffs
        ? {
            playoffTeams: state.playoffTeams,
            playoffFormat: state.playoffFormat,
          }
        : {}),
      reportToDupr: state.reportToDupr,
      createdAt: new Date().toISOString(),
    };

    console.log('Creating league:', submitData);
    alert('League data logged to console!');
  };

  const canProceed = () => {
    switch (state.step) {
      case 0:
        return state.leagueType !== '';
      case 1:
        return state.name.trim() !== '' && state.daysPerWeek.length > 0;
      case 2:
        return state.minPlayers <= state.maxPlayers;
      case 3:
        if (state.hasPlayoffs) {
          return state.playoffTeams !== undefined && state.playoffFormat !== undefined;
        }
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return <LeagueTypeStep state={state} setState={setState} />;
      case 1:
        return <LeagueDetailsStep state={state} setState={setState} />;
      case 2:
        return <PlayerSettingsStep state={state} setState={setState} />;
      case 3:
        return <PlayoffSettingsStep state={state} setState={setState} />;
      case 4:
        return <RatingOptionsStep state={state} setState={setState} />;
      case 5:
        return <ReviewStep state={state} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/leagues"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create League</h1>
          <p className="text-gray-600 dark:text-gray-300">Set up your new league</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  index < state.step
                    ? 'bg-brand-500 text-white'
                    : index === state.step
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}
              >
                {index < state.step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 sm:w-12 lg:w-16 h-1 mx-1',
                    index < state.step ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {STEPS.map((stepName) => (
            <span key={stepName} className="text-center flex-1">
              {stepName}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-4">
          {isFirstStep ? (
            <Link
              href="/leagues"
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-center font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
            >
              Cancel
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {isLastStep ? (
            <Button
              type="submit"
              className="flex-1 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
            >
              Create League
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors',
                canProceed()
                  ? 'bg-brand-500 hover:bg-brand-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
