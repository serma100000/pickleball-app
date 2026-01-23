'use client';

import * as React from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, coordinates?: Coordinates) => void;
  placeholder?: string;
  className?: string;
}

// Mapbox Search API suggestion
interface MapboxSuggestion {
  name: string;
  mapbox_id: string;
  feature_type: string;
  address?: string;
  full_address?: string;
  place_formatted?: string;
}

// Mapbox Search API response
interface MapboxSuggestResponse {
  suggestions: MapboxSuggestion[];
}

// Mapbox Retrieve API response
interface MapboxRetrieveResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number]; // [lng, lat]
    };
    properties: {
      name: string;
      full_address?: string;
    };
  }>;
}

// ============================================================================
// Session Token (required by Mapbox Search API)
// ============================================================================

let sessionToken: string | null = null;

function getSessionToken(): string {
  if (!sessionToken) {
    sessionToken = crypto.randomUUID();
  }
  return sessionToken;
}

function resetSessionToken(): void {
  sessionToken = null;
}

// ============================================================================
// Custom Hook: Debounce
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Custom Hook: Click Outside
// ============================================================================

function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void
): void {
  React.useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// ============================================================================
// Mapbox Search API
// ============================================================================

async function searchLocations(query: string): Promise<MapboxSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('Mapbox access token is not configured');
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const token = getSessionToken();
    // Use Mapbox Search API for better POI/business results (parks, venues, etc)
    const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodedQuery}&access_token=${accessToken}&session_token=${token}&limit=8&types=poi,place,neighborhood,address&country=us&language=en`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxSuggestResponse = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

async function retrieveLocation(mapboxId: string): Promise<{ name: string; fullAddress: string; coordinates: Coordinates } | null> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    return null;
  }

  try {
    const token = getSessionToken();
    const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?access_token=${accessToken}&session_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxRetrieveResponse = await response.json();
    const feature = data.features[0];

    if (!feature) {
      return null;
    }

    // Reset session token after retrieval (as per Mapbox billing best practices)
    resetSessionToken();

    return {
      name: feature.properties.name,
      fullAddress: feature.properties.full_address || feature.properties.name,
      coordinates: {
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
      },
    };
  } catch (error) {
    console.error('Error retrieving location:', error);
    return null;
  }
}

// ============================================================================
// Result Item Component
// ============================================================================

interface ResultItemProps {
  suggestion: MapboxSuggestion;
  isActive: boolean;
  onClick: () => void;
}

function ResultItem({ suggestion, isActive, onClick }: ResultItemProps) {
  const mainName = suggestion.name;
  const secondaryInfo = suggestion.place_formatted || suggestion.full_address || suggestion.address;

  return (
    <button
      type="button"
      className={cn(
        'w-full px-4 py-3 text-left flex items-start gap-3 transition-colors',
        isActive
          ? 'bg-brand-50 dark:bg-brand-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      )}
      onClick={onClick}
      role="option"
      aria-selected={isActive}
    >
      <MapPin
        className={cn(
          'h-5 w-5 mt-0.5 flex-shrink-0',
          isActive
            ? 'text-brand-500 dark:text-brand-400'
            : 'text-gray-400 dark:text-gray-500'
        )}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium truncate',
            isActive
              ? 'text-brand-700 dark:text-brand-300'
              : 'text-gray-900 dark:text-white'
          )}
        >
          {mainName}
        </p>
        {secondaryInfo && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {secondaryInfo}
          </p>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a location...',
  className,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [results, setResults] = React.useState<MapboxSuggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRetrieving, setIsRetrieving] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(inputValue, 300);

  // Close dropdown when clicking outside
  useClickOutside(containerRef as React.RefObject<HTMLElement>, () => {
    setIsOpen(false);
    setActiveIndex(-1);
  });

  // Sync external value changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch results when debounced query changes
  React.useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      const suggestions = await searchLocations(debouncedQuery);
      setResults(suggestions);
      setIsOpen(suggestions.length > 0 || debouncedQuery.length >= 2);
      setIsLoading(false);
      setActiveIndex(-1);
    };

    fetchResults();
  }, [debouncedQuery]);

  // Scroll active item into view
  React.useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue, undefined);
  };

  const handleSelectResult = async (suggestion: MapboxSuggestion) => {
    setIsRetrieving(true);
    setIsOpen(false);

    // Retrieve full location details with coordinates
    const location = await retrieveLocation(suggestion.mapbox_id);

    if (location) {
      setInputValue(location.fullAddress);
      onChange(location.fullAddress, location.coordinates);
    } else {
      // Fallback to suggestion data without coordinates
      const displayName = suggestion.full_address || suggestion.name;
      setInputValue(displayName);
      onChange(displayName, undefined);
    }

    setIsRetrieving(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue('');
    onChange('', undefined);
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          const selectedResult = results[activeIndex];
          if (selectedResult) {
            handleSelectResult(selectedResult);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (results.length > 0 || inputValue.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isLoading || isRetrieving ? (
            <Loader2 className="h-5 w-5 text-gray-400 dark:text-gray-500 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(
            'flex h-12 w-full rounded-lg border bg-white pl-10 pr-10 py-2.5 text-base',
            'text-gray-900 dark:text-white',
            'placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:bg-gray-800 border-gray-300 dark:border-gray-600'
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="location-listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `location-option-${activeIndex}` : undefined
          }
          autoComplete="off"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear location"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg',
            'dark:bg-gray-800 dark:border-gray-600',
            'max-h-72 overflow-auto'
          )}
        >
          <ul
            ref={listRef}
            id="location-listbox"
            role="listbox"
            className="py-1"
          >
            {isLoading ? (
              <li className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                <span className="sr-only">Loading locations...</span>
              </li>
            ) : results.length > 0 ? (
              results.map((suggestion, index) => (
                <li key={suggestion.mapbox_id} id={`location-option-${index}`}>
                  <ResultItem
                    suggestion={suggestion}
                    isActive={index === activeIndex}
                    onClick={() => handleSelectResult(suggestion)}
                  />
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                <MapPin className="h-5 w-5 mx-auto mb-1 opacity-50" />
                <p>No locations found</p>
                <p className="text-xs mt-1">Try searching for a park, venue, or address</p>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LocationAutocomplete;
