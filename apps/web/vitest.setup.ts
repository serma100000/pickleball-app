import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));


// Mock Clerk auth
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isSignedIn: true,
    isLoaded: true,
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
  useUser: () => ({
    user: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      primaryEmailAddress: { emailAddress: 'test@example.com' },
      imageUrl: 'https://example.com/avatar.jpg',
      unsafeMetadata: {},
      publicMetadata: {},
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useClerk: () => ({
    openSignIn: vi.fn(),
    openSignUp: vi.fn(),
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));
