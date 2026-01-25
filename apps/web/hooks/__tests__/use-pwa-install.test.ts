/**
 * Unit Tests for usePWAInstall Hook
 *
 * Tests cover:
 * - Initial state detection (installed, iOS, supported)
 * - beforeinstallprompt event handling
 * - promptInstall functionality
 * - dismissPrompt with localStorage persistence
 * - iOS detection
 * - Standalone mode detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePWAInstall, useIsStandalone } from '../use-pwa-install';

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

describe('usePWAInstall', () => {
  const mockMatchMedia = (matches: boolean = false) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset navigator to default state
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    window.matchMedia = mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return correct initial state when not installed', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(false);
      expect(result.current.canInstall).toBe(false);
      expect(result.current.isDismissed).toBe(false);
    });

    it('should detect when app is in standalone mode', () => {
      window.matchMedia = mockMatchMedia(true);

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(true);
    });

    it('should detect iOS standalone mode', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(true);
    });
  });

  describe('iOS Detection', () => {
    it('should detect iPhone', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isIOS).toBe(true);
    });

    it('should detect iPad', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isIOS).toBe(true);
    });

    it('should not detect iOS on Windows Chrome', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isIOS).toBe(false);
    });
  });

  describe('Browser Support Detection', () => {
    it('should detect supported browser (Chrome)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isSupported).toBe(true);
    });

    it('should detect supported browser (Edge)', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120.0.0.0',
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('beforeinstallprompt Event', () => {
    it('should set canInstall to true when beforeinstallprompt fires', async () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.canInstall).toBe(false);

      const mockPromptEvent = {
        preventDefault: vi.fn(),
        platforms: ['web'],
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
      } as unknown as BeforeInstallPromptEvent;

      act(() => {
        window.dispatchEvent(
          Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
        );
      });

      await waitFor(() => {
        expect(result.current.canInstall).toBe(true);
      });
    });

    it('should prevent default on beforeinstallprompt', async () => {
      renderHook(() => usePWAInstall());

      const preventDefault = vi.fn();
      const mockPromptEvent = new Event('beforeinstallprompt');
      mockPromptEvent.preventDefault = preventDefault;

      act(() => {
        window.dispatchEvent(mockPromptEvent);
      });

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('promptInstall', () => {
    it('should return false when no deferred prompt exists', async () => {
      const { result } = renderHook(() => usePWAInstall());

      let installResult: boolean = false;
      await act(async () => {
        installResult = await result.current.promptInstall();
      });

      expect(installResult).toBe(false);
    });
  });

  describe('dismissPrompt', () => {
    it('should set isDismissed to true', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(false);

      act(() => {
        result.current.dismissPrompt();
      });

      expect(result.current.isDismissed).toBe(true);
    });

    it('should persist dismiss to localStorage', () => {
      // Get the actual localStorage (not the mock from setup)
      const originalSetItem = window.localStorage.setItem;
      const setItemSpy = vi.fn();
      window.localStorage.setItem = setItemSpy;

      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        result.current.dismissPrompt();
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        'pwa-install-dismissed',
        expect.stringContaining('timestamp')
      );

      // Restore
      window.localStorage.setItem = originalSetItem;
    });

    it('should restore dismissed state from localStorage', () => {
      const dismissedData = JSON.stringify({ timestamp: Date.now() });
      const originalGetItem = window.localStorage.getItem;
      window.localStorage.getItem = vi.fn().mockReturnValue(dismissedData);

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(true);

      // Restore
      window.localStorage.getItem = originalGetItem;
    });

    it('should not restore dismissed state if expired (older than 7 days)', () => {
      const expiredTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      const dismissedData = JSON.stringify({ timestamp: expiredTimestamp });
      const originalGetItem = window.localStorage.getItem;
      const originalRemoveItem = window.localStorage.removeItem;

      const getItemMock = vi.fn().mockReturnValue(dismissedData);
      const removeItemMock = vi.fn();
      window.localStorage.getItem = getItemMock;
      window.localStorage.removeItem = removeItemMock;

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(false);
      expect(removeItemMock).toHaveBeenCalledWith('pwa-install-dismissed');

      // Restore
      window.localStorage.getItem = originalGetItem;
      window.localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('appinstalled Event', () => {
    it('should set isInstalled to true when appinstalled fires', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      expect(result.current.isInstalled).toBe(true);
    });

    it('should clear deferred prompt when appinstalled fires', () => {
      const { result } = renderHook(() => usePWAInstall());

      // First, trigger beforeinstallprompt to set canInstall
      const mockPromptEvent = new Event('beforeinstallprompt');
      (mockPromptEvent as any).preventDefault = vi.fn();
      act(() => {
        window.dispatchEvent(mockPromptEvent);
      });

      // Then trigger appinstalled
      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      expect(result.current.canInstall).toBe(false);
    });
  });
});

describe('useIsStandalone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('should return false when not in standalone mode', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useIsStandalone());

    expect(result.current).toBe(false);
  });

  it('should return true when in standalone mode', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useIsStandalone());

    expect(result.current).toBe(true);
  });

  it('should return true for iOS standalone', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useIsStandalone());

    expect(result.current).toBe(true);
  });

  it('should update when media query changes', () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn((_, handler) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    }));

    const { result } = renderHook(() => useIsStandalone());

    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });
});
