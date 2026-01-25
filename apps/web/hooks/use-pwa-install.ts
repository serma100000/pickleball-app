'use client';

import { useState, useEffect, useCallback } from 'react';

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend Window interface
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const STORAGE_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface UsePWAInstallReturn {
  /** Whether the app can be installed (beforeinstallprompt fired) */
  canInstall: boolean;
  /** Whether the app is already installed (standalone mode) */
  isInstalled: boolean;
  /** Whether user is on iOS (requires manual install instructions) */
  isIOS: boolean;
  /** Whether the prompt has been dismissed */
  isDismissed: boolean;
  /** Whether the browser supports PWA installation */
  isSupported: boolean;
  /** Trigger the native install prompt */
  promptInstall: () => Promise<boolean>;
  /** Dismiss the install prompt */
  dismissPrompt: () => void;
}

/**
 * Hook to manage PWA installation state and prompt
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Check if app is already installed (standalone mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check display mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari standalone check
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsInstalled(isStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (userAgent.includes('mac') && 'ontouchend' in document);
    setIsIOS(isIOSDevice);

    // Check browser support (Chrome, Edge, Samsung Internet, Opera, Firefox Android)
    const isSupportedBrowser =
      'BeforeInstallPromptEvent' in window ||
      isIOSDevice || // iOS doesn't support beforeinstallprompt but can show instructions
      /chrome|edg|samsung|opera|firefox/.test(userAgent);
    setIsSupported(isSupportedBrowser);

    // Check if previously dismissed
    try {
      const dismissedData = localStorage.getItem(STORAGE_KEY);
      if (dismissedData) {
        const { timestamp } = JSON.parse(dismissedData);
        if (Date.now() - timestamp < DISMISS_DURATION_MS) {
          setIsDismissed(true);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // localStorage not available or invalid data
    }
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Store the event for later use
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger the install prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt
      setDeferredPrompt(null);

      return outcome === 'accepted';
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss the prompt
  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now() })
      );
    } catch {
      // localStorage not available
    }
  }, []);

  return {
    canInstall: deferredPrompt !== null,
    isInstalled,
    isIOS,
    isDismissed,
    isSupported,
    promptInstall,
    dismissPrompt,
  };
}

/**
 * Check if the app is running in standalone mode (installed)
 */
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(
      mediaQuery.matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );

    const handler = (event: MediaQueryListEvent) => {
      setIsStandalone(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  return isStandalone;
}
