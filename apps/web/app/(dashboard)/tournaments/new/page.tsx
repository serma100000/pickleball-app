'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Settings,
  Plus,
  Trash2,
  DollarSign,
  ClipboardList,
  Save,
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

type EventCategory = 'singles' | 'doubles' | 'mixed';
type SkillLevel = '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0+';
type AgeGroup = 'open' | 'junior' | 'senior_50' | 'senior_60' | 'senior_70';
type EventFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'pool_play' | 'pool_to_bracket';
type SeedingMethod = 'random' | 'skill_based' | 'manual';
type ScoringFormat = 'best_of_1' | 'best_of_3';
type PointsTo = 11 | 15 | 21;

interface TournamentEvent {
  id: string;
  name: string;
  category: EventCategory;
  skillLevel: SkillLevel;
  ageGroup: AgeGroup;
  format: EventFormat;
  maxParticipants: number;
  entryFee: number;
  prizeMoney: number;
  // Format-specific settings
  numberOfPools?: number;
  teamsPerPool?: number;
  gamesPerPoolMatch?: number;
  seedingMethod: SeedingMethod;
  advanceFromPool?: number;
  scoringFormat: ScoringFormat;
  pointsTo: PointsTo;
}

interface TournamentFormState {
  step: number;
  // Step 1: Basic Info
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  venue: string;
  venueCoordinates?: { lat: number; lng: number };
  numberOfCourts: number;
  directorName: string;
  directorEmail: string;
  directorPhone: string;
  // Step 2: Events
  events: TournamentEvent[];
  // Draft saving
  isDraft: boolean;
  lastSaved?: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS = ['Basic Info', 'Events', 'Format Settings', 'Review'];

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: 'singles', label: 'Singles' },
  { value: 'doubles', label: 'Doubles' },
  { value: 'mixed', label: 'Mixed Doubles' },
];

const SKILL_LEVEL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: '2.5', label: '2.5' },
  { value: '3.0', label: '3.0' },
  { value: '3.5', label: '3.5' },
  { value: '4.0', label: '4.0' },
  { value: '4.5', label: '4.5' },
  { value: '5.0+', label: '5.0+' },
];

const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'junior', label: 'Junior (U18)' },
  { value: 'senior_50', label: 'Senior 50+' },
  { value: 'senior_60', label: 'Senior 60+' },
  { value: 'senior_70', label: 'Senior 70+' },
];

const FORMAT_OPTIONS: { value: EventFormat; label: string; description: string }[] = [
  { value: 'single_elimination', label: 'Single Elimination', description: 'One loss and you\'re out' },
  { value: 'double_elimination', label: 'Double Elimination', description: 'Two losses before elimination' },
  { value: 'round_robin', label: 'Round Robin', description: 'Everyone plays everyone' },
  { value: 'pool_play', label: 'Pool Play', description: 'Group stage with round robin pools' },
  { value: 'pool_to_bracket', label: 'Pool to Bracket', description: 'Pool play then elimination bracket' },
];

const SEEDING_OPTIONS: { value: SeedingMethod; label: string }[] = [
  { value: 'random', label: 'Random' },
  { value: 'skill_based', label: 'Skill-Based (DUPR)' },
  { value: 'manual', label: 'Manual' },
];

const SCORING_OPTIONS: { value: ScoringFormat; label: string }[] = [
  { value: 'best_of_1', label: 'Best of 1' },
  { value: 'best_of_3', label: 'Best of 3' },
];

const POINTS_TO_OPTIONS: PointsTo[] = [11, 15, 21];

// ============================================================================
// Helper Functions
// ============================================================================

function generateEventId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultEvent(): TournamentEvent {
  return {
    id: generateEventId(),
    name: '',
    category: 'doubles',
    skillLevel: '3.5',
    ageGroup: 'open',
    format: 'double_elimination',
    maxParticipants: 32,
    entryFee: 50,
    prizeMoney: 0,
    numberOfPools: 4,
    teamsPerPool: 4,
    gamesPerPoolMatch: 1,
    seedingMethod: 'skill_based',
    advanceFromPool: 2,
    scoringFormat: 'best_of_1',
    pointsTo: 11,
  };
}

function getEventDisplayName(event: TournamentEvent): string {
  if (event.name) return event.name;

  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.value === event.category)?.label || '';
  const ageLabel = AGE_GROUP_OPTIONS.find((a) => a.value === event.ageGroup)?.label || '';
  return `${ageLabel !== 'Open' ? ageLabel + ' ' : ''}${categoryLabel} ${event.skillLevel}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// Helper Components
// ============================================================================

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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          onClick={() => value < max && onChange(value + 1)}
          disabled={value >= max}
          className={cn(
            'min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center font-bold text-lg transition-colors',
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
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{helpText}</span>
        )}
      </div>
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  required?: boolean;
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
}: SelectFieldProps<T>) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="flex h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-base text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pickle-500 focus-visible:ring-offset-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  state: TournamentFormState;
  setState: React.Dispatch<React.SetStateAction<TournamentFormState>>;
}

function BasicInfoStep({ state, setState }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Tournament Details
      </h2>

      {/* Tournament Name */}
      <Card className="p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tournament Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g., Bay Area Spring Championship 2025"
          value={state.name}
          onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full"
        />
      </Card>

      {/* Description */}
      <Card className="p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          rows={3}
          placeholder="Describe your tournament..."
          value={state.description}
          onChange={(e) => setState((prev) => ({ ...prev, description: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-pickle-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
      </Card>

      {/* Dates */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Dates
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={state.startDate}
              onChange={(e) => setState((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={state.endDate}
              onChange={(e) => setState((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Registration Deadline <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={state.registrationDeadline}
              onChange={(e) => setState((prev) => ({ ...prev, registrationDeadline: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Venue */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Venue / Location
        </h3>
        <div className="space-y-4">
          <LocationAutocomplete
            value={state.venue}
            onChange={(value, coordinates) =>
              setState((prev) => ({
                ...prev,
                venue: value,
                venueCoordinates: coordinates,
              }))
            }
            placeholder="Search for a venue..."
            className="w-full"
          />
          <NumberStepper
            value={state.numberOfCourts}
            onChange={(val) => setState((prev) => ({ ...prev, numberOfCourts: val }))}
            label="Number of Courts Available"
            min={1}
            max={50}
            helpText="courts"
          />
        </div>
      </Card>

      {/* Tournament Director */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Tournament Director
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Director name"
              value={state.directorName}
              onChange={(e) => setState((prev) => ({ ...prev, directorName: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="director@email.com"
              value={state.directorEmail}
              onChange={(e) => setState((prev) => ({ ...prev, directorEmail: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={state.directorPhone}
              onChange={(e) => setState((prev) => ({ ...prev, directorPhone: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function EventsConfigStep({ state, setState }: StepProps) {
  const addEvent = () => {
    setState((prev) => ({
      ...prev,
      events: [...prev.events, createDefaultEvent()],
    }));
  };

  const removeEvent = (eventId: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== eventId),
    }));
  };

  const updateEvent = (eventId: string, updates: Partial<TournamentEvent>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Events Configuration
        </h2>
        <Button
          type="button"
          onClick={addEvent}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </Button>
      </div>

      {state.events.length === 0 ? (
        <Card className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No events added yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add events like Men&apos;s Singles, Women&apos;s Doubles, Mixed Doubles, etc.
          </p>
          <Button type="button" onClick={addEvent}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Event
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {state.events.map((event, index) => (
            <Card key={event.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 font-semibold text-sm">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {getEventDisplayName(event) || `Event ${index + 1}`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {FORMAT_OPTIONS.find((f) => f.value === event.format)?.label}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeEvent(event.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  aria-label="Remove event"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Event Name (Optional Override) */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Event Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder={getEventDisplayName({ ...event, name: '' })}
                    value={event.name}
                    onChange={(e) => updateEvent(event.id, { name: e.target.value })}
                    className="w-full"
                  />
                </div>

                {/* Category */}
                <SelectField
                  label="Category"
                  value={event.category}
                  onChange={(val) => updateEvent(event.id, { category: val })}
                  options={CATEGORY_OPTIONS}
                  required
                />

                {/* Skill Level */}
                <SelectField
                  label="Skill Level"
                  value={event.skillLevel}
                  onChange={(val) => updateEvent(event.id, { skillLevel: val })}
                  options={SKILL_LEVEL_OPTIONS}
                  required
                />

                {/* Age Group */}
                <SelectField
                  label="Age Group"
                  value={event.ageGroup}
                  onChange={(val) => updateEvent(event.id, { ageGroup: val })}
                  options={AGE_GROUP_OPTIONS}
                  required
                />

                {/* Format */}
                <SelectField
                  label="Format"
                  value={event.format}
                  onChange={(val) => updateEvent(event.id, { format: val })}
                  options={FORMAT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
                  required
                />

                {/* Max Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Participants <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={2}
                    max={256}
                    value={event.maxParticipants}
                    onChange={(e) =>
                      updateEvent(event.id, {
                        maxParticipants: Math.max(2, Math.min(256, parseInt(e.target.value) || 2)),
                      })
                    }
                    className="w-full"
                  />
                </div>

                {/* Entry Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Entry Fee <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      min={0}
                      max={500}
                      value={event.entryFee}
                      onChange={(e) =>
                        updateEvent(event.id, {
                          entryFee: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full pl-9"
                    />
                  </div>
                </div>

                {/* Prize Money */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prize Money (Optional)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      min={0}
                      value={event.prizeMoney}
                      onChange={(e) =>
                        updateEvent(event.id, {
                          prizeMoney: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full pl-9"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FormatSettingsStep({ state, setState }: StepProps) {
  const updateEvent = (eventId: string, updates: Partial<TournamentEvent>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
    }));
  };

  if (state.events.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Format Settings
        </h2>
        <Card className="p-8 text-center">
          <Settings className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No events to configure
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Go back and add events to configure their format settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Format Settings
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 mb-4">
        Configure the detailed format settings for each event.
      </p>

      {state.events.map((event, index) => {
        const needsPoolSettings = event.format === 'pool_play' || event.format === 'pool_to_bracket';
        const needsBracketSettings =
          event.format === 'single_elimination' ||
          event.format === 'double_elimination' ||
          event.format === 'pool_to_bracket';

        return (
          <Card key={event.id} className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 font-semibold text-sm">
                {index + 1}
              </span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {getEventDisplayName(event)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {FORMAT_OPTIONS.find((f) => f.value === event.format)?.description}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pool Play Settings */}
              {needsPoolSettings && (
                <>
                  <NumberStepper
                    value={event.numberOfPools || 4}
                    onChange={(val) => updateEvent(event.id, { numberOfPools: val })}
                    label="Number of Pools"
                    min={2}
                    max={16}
                    helpText="pools"
                  />
                  <NumberStepper
                    value={event.teamsPerPool || 4}
                    onChange={(val) => updateEvent(event.id, { teamsPerPool: val })}
                    label="Teams per Pool"
                    min={3}
                    max={8}
                    helpText="teams"
                  />
                  <NumberStepper
                    value={event.gamesPerPoolMatch || 1}
                    onChange={(val) => updateEvent(event.id, { gamesPerPoolMatch: val })}
                    label="Games per Pool Match"
                    min={1}
                    max={3}
                    helpText="games"
                  />
                </>
              )}

              {/* Pool to Bracket: Advance Settings */}
              {event.format === 'pool_to_bracket' && (
                <NumberStepper
                  value={event.advanceFromPool || 2}
                  onChange={(val) => updateEvent(event.id, { advanceFromPool: val })}
                  label="Advance from Each Pool"
                  min={1}
                  max={4}
                  helpText="teams"
                />
              )}

              {/* Bracket Settings */}
              {needsBracketSettings && (
                <SelectField
                  label="Seeding Method"
                  value={event.seedingMethod}
                  onChange={(val) => updateEvent(event.id, { seedingMethod: val })}
                  options={SEEDING_OPTIONS}
                />
              )}

              {/* Scoring Format (All formats) */}
              <SelectField
                label="Scoring Format"
                value={event.scoringFormat}
                onChange={(val) => updateEvent(event.id, { scoringFormat: val })}
                options={SCORING_OPTIONS}
              />

              {/* Points To */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Games to
                </label>
                <div className="flex gap-2">
                  {POINTS_TO_OPTIONS.map((points) => (
                    <button
                      key={points}
                      type="button"
                      onClick={() => updateEvent(event.id, { pointsTo: points })}
                      className={cn(
                        'flex-1 min-h-[44px] py-3 px-4 rounded-lg font-medium transition-colors',
                        event.pointsTo === points
                          ? 'bg-pickle-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      {points}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ReviewStep({ state }: { state: TournamentFormState }) {
  const totalEntryFees =
    state.events.reduce((sum, e) => sum + e.entryFee * e.maxParticipants, 0) / 2;
  const totalPrizeMoney = state.events.reduce((sum, e) => sum + e.prizeMoney, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Review & Create
      </h2>

      {/* Tournament Summary */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Tournament Summary
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Name</dt>
            <dd className="font-medium text-gray-900 dark:text-white text-right">
              {state.name || 'Not specified'}
            </dd>
          </div>
          {state.description && (
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Description</dt>
              <dd className="font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">
                {state.description}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Dates</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.startDate && state.endDate
                ? `${state.startDate} to ${state.endDate}`
                : 'Not specified'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Registration Deadline</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.registrationDeadline || 'Not specified'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Venue</dt>
            <dd className="font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">
              {state.venue || 'Not specified'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Courts</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{state.numberOfCourts}</dd>
          </div>
        </dl>
      </Card>

      {/* Director Info */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Tournament Director
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Name</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.directorName || 'Not specified'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600 dark:text-gray-400">Email</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {state.directorEmail || 'Not specified'}
            </dd>
          </div>
          {state.directorPhone && (
            <div className="flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Phone</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{state.directorPhone}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Events Summary */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Events ({state.events.length})
        </h3>
        {state.events.length > 0 ? (
          <div className="space-y-4">
            {state.events.map((event, index) => (
              <div
                key={event.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 font-semibold text-xs">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getEventDisplayName(event)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-pickle-600 dark:text-pickle-400">
                    {formatCurrency(event.entryFee)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="text-gray-400 dark:text-gray-500">Format: </span>
                    {FORMAT_OPTIONS.find((f) => f.value === event.format)?.label}
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500">Max: </span>
                    {event.maxParticipants} {event.category === 'singles' ? 'players' : 'teams'}
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500">Scoring: </span>
                    {event.scoringFormat === 'best_of_3' ? 'Best of 3' : 'Best of 1'} to {event.pointsTo}
                  </div>
                  {event.prizeMoney > 0 && (
                    <div>
                      <span className="text-gray-400 dark:text-gray-500">Prize: </span>
                      {formatCurrency(event.prizeMoney)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalEntryFees)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Est. Entry Revenue (50% capacity)
                  </p>
                </div>
                {totalPrizeMoney > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-pickle-600 dark:text-pickle-400">
                      {formatCurrency(totalPrizeMoney)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Prize Pool</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-amber-800 dark:text-amber-200">
              No events have been added. Go back to add events.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function NewTournamentPage() {
  const [state, setState] = useState<TournamentFormState>({
    step: 0,
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    venue: '',
    venueCoordinates: undefined,
    numberOfCourts: 4,
    directorName: '',
    directorEmail: '',
    directorPhone: '',
    events: [],
    isDraft: false,
    lastSaved: undefined,
  });

  const isFirstStep = state.step === 0;
  const isLastStep = state.step === STEPS.length - 1;

  const handleNext = () => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, STEPS.length - 1) }));
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) }));
  };

  const handleSaveDraft = useCallback(() => {
    const draftData = {
      ...state,
      isDraft: true,
      lastSaved: new Date().toISOString(),
    };

    // In a real app, this would save to an API or localStorage
    if (process.env.NODE_ENV === 'development') {
      console.log('Saving draft:', draftData);
    }

    setState((prev) => ({
      ...prev,
      isDraft: true,
      lastSaved: new Date().toISOString(),
    }));

    // Store in localStorage for persistence
    try {
      localStorage.setItem('tournament_draft', JSON.stringify(draftData));
    } catch {
      // Silently fail if localStorage is not available
    }
  }, [state]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      name: state.name,
      description: state.description,
      startDate: state.startDate,
      endDate: state.endDate,
      registrationDeadline: state.registrationDeadline,
      venue: state.venue,
      venueCoordinates: state.venueCoordinates,
      numberOfCourts: state.numberOfCourts,
      director: {
        name: state.directorName,
        email: state.directorEmail,
        phone: state.directorPhone,
      },
      events: state.events.map((event) => ({
        ...event,
        displayName: getEventDisplayName(event),
      })),
      createdAt: new Date().toISOString(),
    };

    // TODO: Implement actual API submission
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating tournament:', submitData);
    }
    alert('Tournament creation not yet implemented');
  };

  const canProceed = () => {
    switch (state.step) {
      case 0:
        return (
          state.name.trim() !== '' &&
          state.startDate !== '' &&
          state.endDate !== '' &&
          state.registrationDeadline !== '' &&
          state.directorName.trim() !== '' &&
          state.directorEmail.trim() !== ''
        );
      case 1:
        return state.events.length > 0;
      case 2:
        return true;
      case 3:
        return state.events.length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (state.step) {
      case 0:
        return <BasicInfoStep state={state} setState={setState} />;
      case 1:
        return <EventsConfigStep state={state} setState={setState} />;
      case 2:
        return <FormatSettingsStep state={state} setState={setState} />;
      case 3:
        return <ReviewStep state={state} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/tournaments"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Back to tournaments"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Tournament
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Set up a new tournament</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          className="hidden sm:flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </Button>
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
                    ? 'bg-pickle-500 text-white'
                    : index === state.step
                      ? 'bg-pickle-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}
              >
                {index < state.step ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 sm:w-16 lg:w-24 h-1 mx-1',
                    index < state.step ? 'bg-pickle-500' : 'bg-gray-200 dark:bg-gray-700'
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
        <div className="flex items-center gap-4 pt-4">
          {isFirstStep ? (
            <Link
              href="/tournaments"
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
              disabled={!canProceed()}
              className="flex-1 px-6 py-3 rounded-xl font-medium"
            >
              Create Tournament
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors',
                canProceed()
                  ? 'bg-pickle-500 hover:bg-pickle-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Save Draft Button */}
        <div className="sm:hidden pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className="w-full flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
            {state.lastSaved && (
              <span className="text-xs text-gray-500">
                (Last saved: {new Date(state.lastSaved).toLocaleTimeString()})
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
