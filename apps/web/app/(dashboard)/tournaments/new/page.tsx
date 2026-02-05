'use client';

import { useState, useCallback, useRef, forwardRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LocationAutocomplete } from '@/components/location-autocomplete';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiEndpoints, ApiClientError } from '@/lib/api';

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
type BracketFormat = 'single_elimination' | 'double_elimination';
type PoolCalculationMethod = 'auto' | 'manual';
type CrossPoolSeedingMethod = 'standard' | 'reverse' | 'snake';

interface PoolPlayConfig {
  enabled: boolean;
  calculationMethod: PoolCalculationMethod;
  numberOfPools: number;
  gamesPerMatch: 1 | 3;
  advancementCount: number;
}

interface SeedingConfig {
  method: SeedingMethod;
  crossPoolSeeding: CrossPoolSeedingMethod;
}

interface BracketConfig {
  format: BracketFormat;
  thirdPlaceMatch: boolean;
  consolationBracket: boolean;
}

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
  // Enhanced configuration
  poolPlayConfig: PoolPlayConfig;
  seedingConfig: SeedingConfig;
  bracketConfig: BracketConfig;
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

const BRACKET_FORMAT_OPTIONS: { value: BracketFormat; label: string; description: string }[] = [
  { value: 'single_elimination', label: 'Single Elimination', description: 'One loss eliminates' },
  { value: 'double_elimination', label: 'Double Elimination', description: 'Two losses to eliminate' },
];

const POOL_CALCULATION_OPTIONS: { value: PoolCalculationMethod; label: string }[] = [
  { value: 'auto', label: 'Auto-calculate' },
  { value: 'manual', label: 'Manual' },
];

const CROSS_POOL_SEEDING_OPTIONS: { value: CrossPoolSeedingMethod; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: '1st from Pool A vs 2nd from Pool B' },
  { value: 'reverse', label: 'Reverse', description: '1st seeds meet later rounds' },
  { value: 'snake', label: 'Snake', description: 'Alternating pattern for fairness' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    // Enhanced configuration defaults
    poolPlayConfig: {
      enabled: false,
      calculationMethod: 'auto',
      numberOfPools: 4,
      gamesPerMatch: 1,
      advancementCount: 2,
    },
    seedingConfig: {
      method: 'skill_based',
      crossPoolSeeding: 'standard',
    },
    bracketConfig: {
      format: 'double_elimination',
      thirdPlaceMatch: false,
      consolationBracket: false,
    },
  };
}

/**
 * Calculate optimal number of pools based on participant count
 */
function calculateOptimalPools(participantCount: number, targetPoolSize: number = 4): number {
  if (participantCount < 6) return 2;
  return Math.max(2, Math.ceil(participantCount / targetPoolSize));
}

/**
 * Get pool distribution text showing how teams are distributed across pools
 * e.g., "3 pools of 4, 1 pool of 3" when 15 teams are split into 4 pools
 */
function getPoolDistributionText(participantCount: number, numberOfPools: number): string {
  if (numberOfPools <= 0 || participantCount <= 0) return '';
  const baseSize = Math.floor(participantCount / numberOfPools);
  const remainder = participantCount % numberOfPools;
  if (remainder === 0) {
    return `${numberOfPools} pools of ${baseSize} teams`;
  }
  const poolsWithBase = numberOfPools - remainder;
  const poolsWithExtra = remainder;
  if (poolsWithBase === 0) {
    return `${poolsWithExtra} pools of ${baseSize + 1} teams`;
  }
  return `${poolsWithBase} pool${poolsWithBase > 1 ? 's' : ''} of ${baseSize}, ${poolsWithExtra} pool${poolsWithExtra > 1 ? 's' : ''} of ${baseSize + 1}`;
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

/**
 * DateInput component that properly handles focus management for native date inputs.
 * This fixes issues where:
 * 1. Values would bleed into other text fields when typing
 * 2. Tab navigation would send focus to wrong fields
 * 3. Browser automation tools couldn't properly fill the fields
 *
 * The fix involves:
 * - Proper label association via htmlFor/id
 * - Event isolation with stopPropagation on keydown/input events
 * - Using a wrapper div to contain the input's focus context
 * - Preventing any bubbling that could interfere with parent form handlers
 */
interface DateInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ id, name, label, value, onChange, required = false, className }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const actualRef = ref || inputRef;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Stop propagation to prevent any parent handlers from interfering
      e.stopPropagation();
      onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Stop propagation for all key events to prevent parent form interference
      // This is critical for preventing keystrokes from bleeding into other fields
      e.stopPropagation();
    };

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      // Stop input event propagation as well
      e.stopPropagation();
    };

    return (
      <div className={className}>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {/* Wrapper div creates a focus containment boundary */}
        <div className="relative">
          <Input
            ref={actualRef as React.Ref<HTMLInputElement>}
            id={id}
            name={name}
            type="date"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
            aria-describedby={`${id}-description`}
            aria-required={required}
            className="w-full"
          />
          {/* Hidden description for screen readers */}
          <span id={`${id}-description`} className="sr-only">
            Enter date in format MM/DD/YYYY
          </span>
        </div>
      </div>
    );
  }
);
DateInput.displayName = 'DateInput';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min: number;
  max: number;
  helpText?: string;
  id?: string;
}

function NumberStepper({ value, onChange, label, min, max, helpText, id }: NumberStepperProps) {
  // Generate a stable id from label if not provided
  const inputId = id || `stepper-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <Input
          id={inputId}
          type="number"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
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
          aria-label={`Increase ${label}`}
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
  id?: string;
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
  id,
}: SelectFieldProps<T>) {
  // Generate a stable id from label if not provided
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-2">
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-required={required}
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

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ label, description, checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pickle-500 focus:ring-offset-2',
          checked ? 'bg-pickle-500' : 'bg-gray-200 dark:bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

interface RadioCardGroupProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; description?: string }[];
}

function RadioCardGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: RadioCardGroupProps<T>) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all',
              value === option.value
                ? 'border-pickle-500 bg-pickle-50 dark:bg-pickle-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            )}
          >
            <span className={cn(
              'font-medium',
              value === option.value
                ? 'text-pickle-700 dark:text-pickle-300'
                : 'text-gray-900 dark:text-white'
            )}>
              {option.label}
            </span>
            {option.description && (
              <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </span>
            )}
          </button>
        ))}
      </div>
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
        <label htmlFor="tournament-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tournament Name <span className="text-red-500">*</span>
        </label>
        <Input
          id="tournament-name"
          type="text"
          placeholder="e.g., Bay Area Spring Championship 2025"
          value={state.name}
          onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
          maxLength={100}
          aria-required="true"
          className={cn('w-full', state.name && state.name.trim().length < 3 && state.name.trim().length > 0 && 'border-red-500 focus-visible:ring-red-500')}
        />
        {state.name && state.name.trim().length > 0 && state.name.trim().length < 3 && (
          <p className="mt-1 text-sm text-red-500">Name must be at least 3 characters</p>
        )}
      </Card>

      {/* Description */}
      <Card className="p-6">
        <label htmlFor="tournament-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          id="tournament-description"
          rows={3}
          placeholder="Describe your tournament..."
          value={state.description}
          onChange={(e) => setState((prev) => ({ ...prev, description: e.target.value }))}
          maxLength={2000}
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
          <DateInput
            id="tournament-start-date"
            name="startDate"
            label="Start Date"
            value={state.startDate}
            onChange={(value) => setState((prev) => ({ ...prev, startDate: value }))}
            required
          />
          <DateInput
            id="tournament-end-date"
            name="endDate"
            label="End Date"
            value={state.endDate}
            onChange={(value) => setState((prev) => ({ ...prev, endDate: value }))}
            required
          />
          <DateInput
            id="tournament-registration-deadline"
            name="registrationDeadline"
            label="Registration Deadline"
            value={state.registrationDeadline}
            onChange={(value) => setState((prev) => ({ ...prev, registrationDeadline: value }))}
            required
          />
        </div>
        {/* Date validation messages */}
        {state.startDate && state.endDate && state.endDate < state.startDate && (
          <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            End date must be on or after start date
          </p>
        )}
        {state.startDate && state.registrationDeadline && state.registrationDeadline > state.startDate && (
          <p className="mt-3 text-sm text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Registration deadline must be before start date
          </p>
        )}
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
            <label htmlFor="director-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="director-name"
              name="directorName"
              type="text"
              placeholder="Director name"
              value={state.directorName}
              onChange={(e) => setState((prev) => ({ ...prev, directorName: e.target.value }))}
              maxLength={100}
              aria-required="true"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="director-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="director-email"
              name="directorEmail"
              type="email"
              placeholder="director@email.com"
              value={state.directorEmail}
              onChange={(e) => setState((prev) => ({ ...prev, directorEmail: e.target.value }))}
              maxLength={255}
              aria-required="true"
              className={cn('w-full', state.directorEmail && !isValidEmail(state.directorEmail) && 'border-red-500 focus-visible:ring-red-500')}
            />
            {state.directorEmail && !isValidEmail(state.directorEmail) && (
              <p className="mt-1 text-sm text-red-500">Please enter a valid email address</p>
            )}
          </div>
          <div>
            <label htmlFor="director-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <Input
              id="director-phone"
              name="directorPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={state.directorPhone}
              onChange={(e) => setState((prev) => ({ ...prev, directorPhone: e.target.value }))}
              maxLength={20}
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
          id="add-event-button"
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

  const updatePoolPlayConfig = (eventId: string, updates: Partial<PoolPlayConfig>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId
          ? { ...e, poolPlayConfig: { ...e.poolPlayConfig, ...updates } }
          : e
      ),
    }));
  };

  const updateSeedingConfig = (eventId: string, updates: Partial<SeedingConfig>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId
          ? { ...e, seedingConfig: { ...e.seedingConfig, ...updates } }
          : e
      ),
    }));
  };

  const updateBracketConfig = (eventId: string, updates: Partial<BracketConfig>) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId
          ? { ...e, bracketConfig: { ...e.bracketConfig, ...updates } }
          : e
      ),
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
      <h2 id="step-format-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-4" tabIndex={-1}>
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
        const showPoolPlayToggle = event.format !== 'round_robin';
        const calculatedPools = calculateOptimalPools(event.maxParticipants);

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

            {/* Pool Play Configuration Section */}
            {showPoolPlayToggle && (
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Pool Play Configuration
                </h4>

                <div className="space-y-4">
                  <ToggleSwitch
                    label="Enable Pool Play"
                    description="Play round robin in pools before bracket stage"
                    checked={event.poolPlayConfig.enabled || needsPoolSettings}
                    onChange={(checked) => {
                      updatePoolPlayConfig(event.id, { enabled: checked });
                      if (checked) {
                        updateEvent(event.id, { format: 'pool_to_bracket' });
                      } else if (event.format === 'pool_to_bracket' || event.format === 'pool_play') {
                        updateEvent(event.id, { format: event.bracketConfig.format });
                      }
                    }}
                    disabled={event.format === 'pool_play' || event.format === 'pool_to_bracket'}
                  />

                  {(event.poolPlayConfig.enabled || needsPoolSettings) && (
                    <div className="pl-4 border-l-2 border-pickle-200 dark:border-pickle-800 space-y-4 mt-4">
                      {/* Pool Calculation Method */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <SelectField
                          label="Pool Calculation"
                          value={event.poolPlayConfig.calculationMethod}
                          onChange={(val) => updatePoolPlayConfig(event.id, { calculationMethod: val })}
                          options={POOL_CALCULATION_OPTIONS}
                        />
                        {event.poolPlayConfig.calculationMethod === 'manual' ? (
                          <NumberStepper
                            value={event.poolPlayConfig.numberOfPools}
                            onChange={(val) => updatePoolPlayConfig(event.id, { numberOfPools: val })}
                            label="Number of Pools"
                            min={2}
                            max={16}
                            helpText="pools"
                          />
                        ) : (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Calculated Pools
                            </label>
                            <div className="flex flex-col h-auto min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg justify-center">
                              <span className="text-gray-900 dark:text-white font-medium">
                                {calculatedPools} pools
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {getPoolDistributionText(event.maxParticipants, calculatedPools)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Games per Pool Match */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Games per Pool Match
                        </label>
                        <div className="flex gap-2">
                          {([1, 3] as const).map((games) => (
                            <button
                              key={games}
                              type="button"
                              onClick={() => updatePoolPlayConfig(event.id, { gamesPerMatch: games })}
                              aria-label={`Best of ${games} ${games === 1 ? 'game' : 'games'} per pool match`}
                              aria-pressed={event.poolPlayConfig.gamesPerMatch === games}
                              className={cn(
                                'flex-1 min-h-[44px] py-3 px-4 rounded-lg font-medium transition-colors',
                                event.poolPlayConfig.gamesPerMatch === games
                                  ? 'bg-pickle-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              )}
                            >
                              {games === 1 ? 'Best of 1' : 'Best of 3'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Advancement Count */}
                      <NumberStepper
                        value={event.poolPlayConfig.advancementCount}
                        onChange={(val) => updatePoolPlayConfig(event.id, { advancementCount: val })}
                        label="Advance from Each Pool"
                        min={1}
                        max={
                          event.poolPlayConfig.calculationMethod === 'manual'
                            ? Math.max(1, Math.floor(event.maxParticipants / event.poolPlayConfig.numberOfPools))
                            : Math.max(1, Math.floor(event.maxParticipants / calculatedPools))
                        }
                        helpText="teams advance to bracket"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seeding Configuration Section */}
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Seeding Configuration
              </h4>

              <div className="space-y-4">
                <RadioCardGroup
                  label="Seeding Method"
                  value={event.seedingConfig.method}
                  onChange={(val) => updateSeedingConfig(event.id, { method: val })}
                  options={[
                    { value: 'random', label: 'Random', description: 'Randomly assign seeds' },
                    { value: 'skill_based', label: 'Skill-Based (DUPR)', description: 'Use player ratings for seeding' },
                    { value: 'manual', label: 'Manual', description: 'Manually assign all seeds' },
                  ]}
                />

                {(event.poolPlayConfig.enabled || needsPoolSettings) && (
                  <SelectField
                    label="Cross-Pool Seeding"
                    value={event.seedingConfig.crossPoolSeeding}
                    onChange={(val) => updateSeedingConfig(event.id, { crossPoolSeeding: val })}
                    options={CROSS_POOL_SEEDING_OPTIONS.map((o) => ({ value: o.value, label: `${o.label} - ${o.description}` }))}
                  />
                )}
              </div>
            </div>

            {/* Bracket Configuration Section */}
            {needsBracketSettings && (
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Bracket Configuration
                </h4>

                <div className="space-y-4">
                  <RadioCardGroup
                    label="Bracket Format"
                    value={event.bracketConfig.format}
                    onChange={(val) => {
                      updateBracketConfig(event.id, { format: val });
                      // Update main format if not using pool play
                      if (!event.poolPlayConfig.enabled && event.format !== 'pool_to_bracket' && event.format !== 'pool_play') {
                        updateEvent(event.id, { format: val });
                      }
                    }}
                    options={BRACKET_FORMAT_OPTIONS}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <ToggleSwitch
                      label="Third Place Match"
                      description="Play a match to determine 3rd place"
                      checked={event.bracketConfig.thirdPlaceMatch}
                      onChange={(checked) => updateBracketConfig(event.id, { thirdPlaceMatch: checked })}
                    />

                    {event.bracketConfig.format === 'single_elimination' && (
                      <ToggleSwitch
                        label="Consolation Bracket"
                        description="Second chance for first-round losers"
                        checked={event.bracketConfig.consolationBracket}
                        onChange={(checked) => updateBracketConfig(event.id, { consolationBracket: checked })}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Scoring Settings Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Scoring Settings
              </h4>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Scoring Format (All formats) */}
                <SelectField
                  label="Bracket Scoring Format"
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
                        aria-label={`Play games to ${points} points`}
                        aria-pressed={event.pointsTo === points}
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
      <h2 id="step-review-heading" className="text-lg font-semibold text-gray-900 dark:text-white mb-4" tabIndex={-1}>
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
                {/* Enhanced Configuration Summary */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      event.poolPlayConfig.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    )} />
                    <span className="text-gray-500 dark:text-gray-400">
                      Pool Play: {event.poolPlayConfig.enabled ? `${event.poolPlayConfig.calculationMethod === 'auto' ? calculateOptimalPools(event.maxParticipants) : event.poolPlayConfig.numberOfPools} pools, top ${event.poolPlayConfig.advancementCount} advance` : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Seeding: {SEEDING_OPTIONS.find((s) => s.value === event.seedingConfig.method)?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Bracket: {event.bracketConfig.format === 'double_elimination' ? 'Double Elim' : 'Single Elim'}
                      {event.bracketConfig.thirdPlaceMatch && ' + 3rd Place'}
                      {event.bracketConfig.consolationBracket && ' + Consolation'}
                    </span>
                  </div>
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
  const router = useRouter();
  const { isSignedIn, getToken, openSignIn } = useAuth();

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [stepAnnouncement, setStepAnnouncement] = useState('');

  const isFirstStep = state.step === 0;
  const isLastStep = state.step === STEPS.length - 1;

  // Map of step index to first focusable element ID
  const STEP_FIRST_FOCUS: Record<number, string> = {
    0: 'tournament-name',
    1: 'add-event-button',
    2: 'step-format-heading',
    3: 'step-review-heading',
  };

  // Focus first element when step changes
  useEffect(() => {
    const focusId = STEP_FIRST_FOCUS[state.step];
    if (focusId) {
      // Small delay to allow DOM to update
      const timer = setTimeout(() => {
        const element = document.getElementById(focusId);
        if (element) {
          element.focus();
          // For headings, we need tabIndex to make them focusable
          if (element.tagName === 'H2' || element.tagName === 'H3') {
            element.setAttribute('tabindex', '-1');
            element.focus();
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.step]);

  // Announce step changes for screen readers
  useEffect(() => {
    setStepAnnouncement(`Step ${state.step + 1} of ${STEPS.length}: ${STEPS[state.step]}`);
  }, [state.step]);

  const handleNext = () => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, STEPS.length - 1) }));
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 0) }));
  };

  const handleSaveDraft = useCallback(async () => {
    setIsSavingDraft(true);

    try {
      const draftData = {
        ...state,
        isDraft: true,
        lastSaved: new Date().toISOString(),
      };

      // Store in localStorage for persistence
      try {
        localStorage.setItem('tournament_draft', JSON.stringify(draftData));
      } catch (storageError) {
        console.error('Failed to save draft to localStorage:', storageError);
        toast.warning({
          title: 'Draft saved temporarily',
          description: 'Could not save to browser storage. Your draft will be lost if you leave this page.',
        });
      }

      setState((prev) => ({
        ...prev,
        isDraft: true,
        lastSaved: new Date().toISOString(),
      }));

      toast.success({
        title: 'Draft saved',
        description: 'Your tournament draft has been saved.',
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error({
        title: 'Could not save draft',
        description: 'Please try again. If the problem persists, check your browser settings.',
      });
    } finally {
      setIsSavingDraft(false);
    }
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields with focus management
    if (!state.name.trim()) {
      toast.error({
        title: 'Tournament name required',
        description: 'Please enter a name for your tournament.',
      });
      // Focus the problematic field
      setTimeout(() => document.getElementById('tournament-name')?.focus(), 100);
      return;
    }

    if (state.events.length === 0) {
      toast.error({
        title: 'Events required',
        description: 'Please add at least one event to your tournament.',
      });
      // Focus the add event button
      setTimeout(() => document.getElementById('add-event-button')?.focus(), 100);
      return;
    }

    // Check if user is signed in
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    setIsSubmitting(true);

    try {
      // Get auth token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const submitData = {
        name: state.name,
        description: state.description || undefined,
        startDate: state.startDate,
        endDate: state.endDate,
        registrationDeadline: state.registrationDeadline,
        venue: state.venue,
        venueCoordinates: state.venueCoordinates,
        numberOfCourts: state.numberOfCourts,
        director: {
          name: state.directorName,
          email: state.directorEmail,
          phone: state.directorPhone || undefined,
        },
        events: state.events.map((event) => ({
          name: event.name || getEventDisplayName(event),
          category: event.category,
          skillLevel: event.skillLevel,
          ageGroup: event.ageGroup,
          format: event.format,
          maxParticipants: event.maxParticipants,
          entryFee: event.entryFee,
          prizeMoney: event.prizeMoney,
          scoringFormat: event.scoringFormat,
          pointsTo: event.pointsTo,
          poolPlayConfig: event.poolPlayConfig,
          seedingConfig: event.seedingConfig,
          bracketConfig: event.bracketConfig,
        })),
      };

      // Call the API
      const response = await apiEndpoints.tournaments.create(token, submitData);

      if (process.env.NODE_ENV === 'development') {
        console.log('Tournament created:', response);
      }

      toast.success({
        title: 'Tournament created',
        description: `"${state.name}" has been created successfully.`,
      });

      // Clear draft from localStorage after successful submission
      try {
        localStorage.removeItem('tournament_draft');
      } catch {
        // Ignore localStorage errors on cleanup
      }

      // Redirect to tournament page
      const tournamentResponse = response as { tournament?: { id?: string; slug?: string } };
      if (tournamentResponse.tournament?.slug) {
        router.push(`/tournaments/${tournamentResponse.tournament.slug}`);
      } else if (tournamentResponse.tournament?.id) {
        router.push(`/tournaments/${tournamentResponse.tournament.id}`);
      } else {
        router.push('/tournaments');
      }
    } catch (error) {
      console.error('Failed to create tournament:', error);

      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          toast.error({
            title: 'Authentication required',
            description: 'Please sign in to create a tournament.',
          });
          openSignIn();
          return;
        }

        // Show detailed validation errors
        let description = error.message || 'Please try again.';
        if (error.details && typeof error.details === 'object') {
          const fieldErrors = Object.entries(error.details)
            .map(([field, errors]) => `${field}: ${(errors as string[]).join(', ')}`)
            .join('\n');
          if (fieldErrors) {
            description = fieldErrors;
          }
        }

        toast.error({
          title: 'Could not create tournament',
          description,
        });
      } else {
        toast.error({
          title: 'Could not create tournament',
          description: 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (state.step) {
      case 0: {
        // Basic required field check
        const hasRequiredFields =
          state.name.trim().length >= 3 &&
          state.startDate !== '' &&
          state.endDate !== '' &&
          state.registrationDeadline !== '' &&
          state.directorName.trim() !== '' &&
          isValidEmail(state.directorEmail);

        // Date validation: end date must be >= start date
        const validEndDate = !state.startDate || !state.endDate || state.endDate >= state.startDate;

        // Date validation: registration deadline must be < start date
        const validDeadline = !state.startDate || !state.registrationDeadline || state.registrationDeadline <= state.startDate;

        return hasRequiredFields && validEndDate && validDeadline;
      }
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
      {/* Skip link for keyboard users */}
      <a
        href="#tournament-form-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-pickle-500 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to form content
      </a>

      {/* Aria-live region for step announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {stepAnnouncement}
      </div>

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
          disabled={isSavingDraft}
          className="hidden sm:flex items-center gap-2"
        >
          {isSavingDraft ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSavingDraft ? 'Saving...' : 'Save Draft'}
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

      <form id="tournament-form-content" onSubmit={handleSubmit} className="space-y-6">
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
              disabled={!canProceed() || isSubmitting}
              className="flex-1 px-6 py-3 rounded-xl font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Tournament'
              )}
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
            disabled={isSavingDraft}
            className="w-full flex items-center justify-center gap-2"
          >
            {isSavingDraft ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSavingDraft ? 'Saving...' : 'Save Draft'}
            {!isSavingDraft && state.lastSaved && (
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
