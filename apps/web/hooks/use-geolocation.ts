'use client';

import { useState, useEffect, useCallback } from 'react';

import { useAppStore } from '@/lib/store';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationError | null;
  loading: boolean;
  timestamp: number | null;
}

interface GeolocationError {
  code: number;
  message: string;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1 minute
  watch: false,
};

export function useGeolocation(options: GeolocationOptions = {}) {
  const mergedOptions = { ...defaultOptions, ...options };
  const { setLocation, setLocationLoading, setLocationError } = useAppStore();

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    timestamp: null,
  });

  const handleSuccess = useCallback(
    (position: GeolocationPosition) => {
      const newState: GeolocationState = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
        timestamp: position.timestamp,
      };
      setState(newState);

      // Update global store
      setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      setLocationLoading(false);
    },
    [setLocation, setLocationLoading]
  );

  const handleError = useCallback(
    (error: GeolocationPositionError) => {
      let message: string;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied. Please enable location services.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location unavailable. Please try again.';
          break;
        case error.TIMEOUT:
          message = 'Location request timed out. Please try again.';
          break;
        default:
          message = 'An unknown error occurred while getting location.';
      }

      setState((prev) => ({
        ...prev,
        error: { code: error.code, message },
        loading: false,
      }));

      setLocationError(message);
    },
    [setLocationError]
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const message = 'Geolocation is not supported by this browser.';
      setState((prev) => ({
        ...prev,
        error: { code: -1, message },
        loading: false,
      }));
      setLocationError(message);
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: mergedOptions.enableHighAccuracy,
      timeout: mergedOptions.timeout,
      maximumAge: mergedOptions.maximumAge,
    });
  }, [handleSuccess, handleError, mergedOptions, setLocationLoading, setLocationError]);

  // Watch position if enabled
  useEffect(() => {
    if (!mergedOptions.watch || !navigator.geolocation) return;

    setState((prev) => ({ ...prev, loading: true }));
    setLocationLoading(true);

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: mergedOptions.enableHighAccuracy,
      timeout: mergedOptions.timeout,
      maximumAge: mergedOptions.maximumAge,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [mergedOptions.watch, handleSuccess, handleError, setLocationLoading]);

  // Check if location permission is already granted
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        }
      });
    }
  }, [requestLocation]);

  return {
    ...state,
    requestLocation,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  };
}

// Hook for getting distance from user's location to a point
export function useDistanceFromUser(lat: number, lng: number) {
  const { location } = useAppStore();

  if (!location) {
    return null;
  }

  // Haversine formula
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat - location.lat);
  const dLng = toRad(lng - location.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(location.lat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
