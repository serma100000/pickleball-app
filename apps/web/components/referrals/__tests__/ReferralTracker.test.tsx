import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ReferralTracker,
  getStoredReferralCode,
  clearStoredReferralCode,
  useStoredReferralCode,
} from '../ReferralTracker';

// Mock hooks
const mockTrackMutation = {
  mutate: vi.fn(),
};

vi.mock('@/hooks/use-api', () => ({
  useValidateReferralCode: vi.fn(),
  useTrackReferral: vi.fn(() => mockTrackMutation),
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

import { useValidateReferralCode } from '@/hooks/use-api';

const mockUseValidateReferralCode = useValidateReferralCode as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Storage key constants (matching the component)
const REFERRAL_STORAGE_KEY = 'paddleup_referral_code';
const REFERRAL_EXPIRY_KEY = 'paddleup_referral_expiry';

// Create a real localStorage mock for this test file
const localStorageMock: { [key: string]: string } = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageMock[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
  }),
};

describe('ReferralTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    // Reset search params
    mockSearchParams.delete('ref');
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('Tracking Referrals', () => {
    it('tracks referral when valid code in URL', async () => {
      mockSearchParams.set('ref', 'PADDLE2024');
      mockUseValidateReferralCode.mockReturnValue({
        data: { valid: true },
        isLoading: false,
      });

      render(
        <ReferralTracker>
          <div>Content</div>
        </ReferralTracker>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockTrackMutation.mutate).toHaveBeenCalledWith({
          referralCode: 'PADDLE2024',
          eventType: 'general',
          eventId: undefined,
        });
      });
    });

    it('does not track when no referral code in URL', () => {
      mockUseValidateReferralCode.mockReturnValue({
        data: null,
        isLoading: false,
      });

      render(
        <ReferralTracker>
          <div>Content</div>
        </ReferralTracker>,
        { wrapper: createWrapper() }
      );

      expect(mockTrackMutation.mutate).not.toHaveBeenCalled();
    });

    it('does not track invalid referral codes', async () => {
      mockSearchParams.set('ref', 'INVALID');
      mockUseValidateReferralCode.mockReturnValue({
        data: { valid: false },
        isLoading: false,
      });

      render(
        <ReferralTracker>
          <div>Content</div>
        </ReferralTracker>,
        { wrapper: createWrapper() }
      );

      // Wait a bit to ensure no tracking happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockTrackMutation.mutate).not.toHaveBeenCalled();
    });

    it('passes eventType to track mutation', async () => {
      mockSearchParams.set('ref', 'PADDLE2024');
      mockUseValidateReferralCode.mockReturnValue({
        data: { valid: true },
        isLoading: false,
      });

      render(
        <ReferralTracker eventType="tournament">
          <div>Content</div>
        </ReferralTracker>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockTrackMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'tournament',
          })
        );
      });
    });

    it('passes eventId to track mutation', async () => {
      mockSearchParams.set('ref', 'PADDLE2024');
      mockUseValidateReferralCode.mockReturnValue({
        data: { valid: true },
        isLoading: false,
      });

      render(
        <ReferralTracker eventType="tournament" eventId="event-123">
          <div>Content</div>
        </ReferralTracker>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockTrackMutation.mutate).toHaveBeenCalledWith(
          expect.objectContaining({
            eventId: 'event-123',
          })
        );
      });
    });

    it('only tracks once per component mount', async () => {
      mockSearchParams.set('ref', 'PADDLE2024');
      mockUseValidateReferralCode.mockReturnValue({
        data: { valid: true },
        isLoading: false,
      });

      const { rerender } = render(
        <ReferralTracker>
          <div>Content</div>
        </ReferralTracker>,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockTrackMutation.mutate).toHaveBeenCalledTimes(1);
      });

      // Force rerender
      rerender(
        <ReferralTracker>
          <div>Content Updated</div>
        </ReferralTracker>
      );

      // Should still be just 1 call
      expect(mockTrackMutation.mutate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Renders Children', () => {
    it('renders children content', () => {
      mockUseValidateReferralCode.mockReturnValue({
        data: null,
        isLoading: false,
      });

      render(
        <ReferralTracker>
          <div data-testid="child-content">Hello World</div>
        </ReferralTracker>,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders without children', () => {
      mockUseValidateReferralCode.mockReturnValue({
        data: null,
        isLoading: false,
      });

      const { container } = render(<ReferralTracker />, {
        wrapper: createWrapper(),
      });

      expect(container).toBeTruthy();
    });
  });
});

describe('getStoredReferralCode', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it('returns null when no code is stored', () => {
    expect(getStoredReferralCode()).toBeNull();
  });

  it('returns stored code when valid', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    mockLocalStorage.setItem(REFERRAL_STORAGE_KEY, 'PADDLE2024');
    mockLocalStorage.setItem(REFERRAL_EXPIRY_KEY, futureDate.toISOString());

    expect(getStoredReferralCode()).toBe('PADDLE2024');
  });

  it('returns null when code is expired', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    mockLocalStorage.setItem(REFERRAL_STORAGE_KEY, 'PADDLE2024');
    mockLocalStorage.setItem(REFERRAL_EXPIRY_KEY, pastDate.toISOString());

    expect(getStoredReferralCode()).toBeNull();
  });

  it('clears storage when code is expired', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    mockLocalStorage.setItem(REFERRAL_STORAGE_KEY, 'PADDLE2024');
    mockLocalStorage.setItem(REFERRAL_EXPIRY_KEY, pastDate.toISOString());

    getStoredReferralCode();

    expect(mockLocalStorage.getItem(REFERRAL_STORAGE_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REFERRAL_EXPIRY_KEY)).toBeNull();
  });

  it('returns null when only code is stored without expiry', () => {
    mockLocalStorage.setItem(REFERRAL_STORAGE_KEY, 'PADDLE2024');

    expect(getStoredReferralCode()).toBeNull();
  });
});

describe('clearStoredReferralCode', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it('removes stored referral code', () => {
    mockLocalStorage.setItem(REFERRAL_STORAGE_KEY, 'PADDLE2024');
    mockLocalStorage.setItem(REFERRAL_EXPIRY_KEY, new Date().toISOString());

    clearStoredReferralCode();

    expect(mockLocalStorage.getItem(REFERRAL_STORAGE_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REFERRAL_EXPIRY_KEY)).toBeNull();
  });

  it('handles case when nothing is stored', () => {
    expect(() => clearStoredReferralCode()).not.toThrow();
  });
});

describe('useStoredReferralCode', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it('returns code when stored', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    mockLocalStorage.setItem(REFERRAL_STORAGE_KEY, 'PADDLE2024');
    mockLocalStorage.setItem(REFERRAL_EXPIRY_KEY, futureDate.toISOString());

    // Test the hook by rendering a component that uses it
    let hookResult: ReturnType<typeof useStoredReferralCode> | null = null;

    function TestComponent() {
      hookResult = useStoredReferralCode();
      return null;
    }

    render(<TestComponent />);

    expect(hookResult).toEqual({
      code: 'PADDLE2024',
      hasReferralCode: true,
      clearCode: expect.any(Function),
    });
  });

  it('returns null when no code stored', () => {
    let hookResult: ReturnType<typeof useStoredReferralCode> | null = null;

    function TestComponent() {
      hookResult = useStoredReferralCode();
      return null;
    }

    render(<TestComponent />);

    expect(hookResult).toEqual({
      code: null,
      hasReferralCode: false,
      clearCode: expect.any(Function),
    });
  });

  it('clearCode function works', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    mockLocalStorage.setItem(REFERRAL_STORAGE_KEY, 'PADDLE2024');
    mockLocalStorage.setItem(REFERRAL_EXPIRY_KEY, futureDate.toISOString());

    let hookResult: ReturnType<typeof useStoredReferralCode> | null = null;

    function TestComponent() {
      hookResult = useStoredReferralCode();
      return null;
    }

    render(<TestComponent />);

    hookResult!.clearCode();

    expect(mockLocalStorage.getItem(REFERRAL_STORAGE_KEY)).toBeNull();
  });
});

describe('Local Storage Integration', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    mockSearchParams.delete('ref');
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it('stores referral code in localStorage when tracking', async () => {
    mockSearchParams.set('ref', 'PADDLE2024');
    mockUseValidateReferralCode.mockReturnValue({
      data: { valid: true },
      isLoading: false,
    });

    render(
      <ReferralTracker>
        <div>Content</div>
      </ReferralTracker>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        REFERRAL_STORAGE_KEY,
        'PADDLE2024'
      );
    });
  });

  it('sets expiry date in the future', async () => {
    mockSearchParams.set('ref', 'PADDLE2024');
    mockUseValidateReferralCode.mockReturnValue({
      data: { valid: true },
      isLoading: false,
    });

    render(
      <ReferralTracker>
        <div>Content</div>
      </ReferralTracker>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        REFERRAL_EXPIRY_KEY,
        expect.any(String)
      );

      // Verify an expiry date was set (any future date)
      const calls = mockLocalStorage.setItem.mock.calls;
      const expiryCall = calls.find((c: string[]) => c[0] === REFERRAL_EXPIRY_KEY);
      expect(expiryCall).toBeDefined();
      if (expiryCall) {
        const expiryStr = expiryCall[1];
        const expiry = new Date(expiryStr);
        const now = new Date();
        // Just verify it's a future date
        expect(expiry.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });
});
