import { type ClassValue, clsx } from 'clsx';
import {
  format,
  formatDistance,
  formatRelative,
  isAfter,
  isBefore,
  addHours,
  addDays,
  startOfDay,
  endOfDay,
  differenceInYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
} from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { nanoid } from 'nanoid';
import type { GeoLocation } from '@pickle-play/types';

// =============================================================================
// Tailwind CSS Utilities
// =============================================================================

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// =============================================================================
// Date & Time Formatting
// =============================================================================

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string, formatStr = 'PPP'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Format a time to a human-readable string
 */
export function formatTime(date: Date | string, formatStr = 'p'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Format a date and time together
 */
export function formatDateTime(date: Date | string, formatStr = 'PPP p'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Get relative time from now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
}

/**
 * Format relative to a base date
 */
export function formatRelativeDate(date: Date | string, baseDate: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatRelative(d, baseDate);
}

/**
 * Format a date range
 */
export function formatDateRange(
  start: Date | string,
  end: Date | string,
  _locale = 'en-US'
): string {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  const sameDay = sameMonth && startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return format(startDate, 'MMM d, yyyy');
  }

  if (sameMonth) {
    return `${startDate.getDate()}-${endDate.getDate()} ${format(startDate, 'MMM yyyy')}`;
  }

  if (sameYear) {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  }

  return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isBefore(d, new Date());
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isAfter(d, new Date());
}

/**
 * Add hours to a date
 */
export function addHoursToDate(date: Date | string, hours: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return addHours(d, hours);
}

/**
 * Add days to a date
 */
export function addDaysToDate(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return addDays(d, days);
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return startOfDay(d);
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return endOfDay(d);
}

// =============================================================================
// Geographic Utilities
// =============================================================================

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_MILES = 3959;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two geographic points using the Haversine formula
 * @param point1 - First location
 * @param point2 - Second location
 * @param unit - 'km' for kilometers, 'miles' for miles
 */
export function calculateDistance(
  point1: GeoLocation,
  point2: GeoLocation,
  unit: 'km' | 'miles' = 'miles'
): number {
  const radius = unit === 'km' ? EARTH_RADIUS_KM : EARTH_RADIUS_MILES;

  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radius * c;
}

/**
 * Format a distance for display
 */
export function formatDistance_geo(distance: number, unit: 'km' | 'miles' = 'miles'): string {
  if (distance < 0.1) {
    return 'nearby';
  }
  if (distance < 1) {
    return `${(distance * (unit === 'miles' ? 5280 : 1000)).toFixed(0)} ${unit === 'miles' ? 'ft' : 'm'}`;
  }
  return `${distance.toFixed(1)} ${unit}`;
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a unique ID using nanoid
 * @param size - Length of the ID (default: 21)
 */
export function generateId(size = 21): string {
  return nanoid(size);
}

/**
 * Generate a short unique ID
 * @param size - Length of the ID (default: 8)
 */
export function generateShortId(size = 8): string {
  return nanoid(size);
}

/**
 * Generate a URL-friendly slug with optional unique suffix
 */
export function generateSlugId(text: string, uniqueLength = 6): string {
  const slug = slugify(text);
  const uniquePart = nanoid(uniqueLength).toLowerCase();
  return `${slug}-${uniquePart}`;
}

// =============================================================================
// Function Utilities
// =============================================================================

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// =============================================================================
// Rating Utilities
// =============================================================================

/**
 * Format a DUPR rating for display
 * @param rating - DUPR rating (0-8.0)
 * @param includeLabel - Include "DUPR" label
 */
export function formatRating(
  rating: number | undefined | null,
  includeLabel = false
): string {
  if (rating === undefined || rating === null) {
    return includeLabel ? 'DUPR: N/A' : 'N/A';
  }

  const formatted = rating.toFixed(2);
  return includeLabel ? `DUPR: ${formatted}` : formatted;
}

/**
 * Get skill level description from DUPR rating
 */
export function getSkillLevelFromRating(rating: number): string {
  if (rating < 2.0) return 'Beginner';
  if (rating < 3.0) return 'Beginner+';
  if (rating < 3.5) return 'Intermediate';
  if (rating < 4.0) return 'Intermediate+';
  if (rating < 4.5) return 'Advanced';
  if (rating < 5.0) return 'Advanced+';
  if (rating < 5.5) return 'Pro';
  return 'Pro+';
}

/**
 * Calculate rating change indicator
 */
export function formatRatingChange(
  change: number
): { text: string; direction: 'up' | 'down' | 'none' } {
  if (change === 0) {
    return { text: '0.00', direction: 'none' };
  }

  const direction = change > 0 ? 'up' : 'down';
  const text = `${change > 0 ? '+' : ''}${change.toFixed(2)}`;

  return { text, direction };
}

// =============================================================================
// Age Calculation
// =============================================================================

/**
 * Calculate age from birthdate
 */
export function calculateAge(
  birthDate: Date | string,
  referenceDate: Date = new Date()
): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  return differenceInYears(referenceDate, birth);
}

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 */
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Truncate a string to a specified length
 */
export function truncate(str: string, length: number, suffix = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Format a user's full name
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Get initials from a name
 */
export function getInitials(firstName: string, lastName?: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}

// =============================================================================
// Object Utilities
// =============================================================================

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Partial<Record<string, unknown>>
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Check if a value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

// =============================================================================
// Array Utilities
// =============================================================================

/**
 * Group an array by a key
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Sort an array by a key
 */
export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => string | number | Date,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);

    let comparison: number;
    if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = Number(aVal) - Number(bVal);
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Remove duplicates from an array
 */
export function unique<T>(array: T[], keyFn?: (item: T) => unknown): T[] {
  if (!keyFn) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Chunk an array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Shuffle an array randomly
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

// =============================================================================
// Number Utilities
// =============================================================================

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number, locale = 'en-US'): string {
  return num.toLocaleString(locale);
}

/**
 * Format a percentage
 */
export function formatPercent(
  value: number,
  decimals = 0,
  locale = 'en-US'
): string {
  return value.toLocaleString(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string {
  return amount.toLocaleString(locale, {
    style: 'currency',
    currency,
  });
}

// =============================================================================
// Win Rate Utilities
// =============================================================================

/**
 * Calculate win rate percentage
 */
export function calculateWinRate(wins: number, totalGames: number): number {
  if (totalGames === 0) return 0;
  return (wins / totalGames) * 100;
}

/**
 * Format win/loss record
 */
export function formatRecord(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

// =============================================================================
// Validation Utilities
// =============================================================================

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// =============================================================================
// URL Utilities
// =============================================================================

/**
 * Build a URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Parse query parameters from a URL
 */
export function parseQueryParams(url: string): Record<string, string> {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

// =============================================================================
// Sleep/Delay Utilities
// =============================================================================

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelay = 1000, maxDelay = 30000, factor = 2 } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        await sleep(delay);
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }

  throw lastError;
}

// =============================================================================
// Re-export date-fns functions
// =============================================================================

export {
  format,
  formatDistance,
  formatRelative,
  isAfter,
  isBefore,
  addHours,
  addDays,
  startOfDay,
  endOfDay,
  differenceInYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
};
