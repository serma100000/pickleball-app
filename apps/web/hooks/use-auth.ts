'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiEndpoints } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { initSocket, connectSocket, disconnectSocket } from '@/lib/socket';

// Check if Clerk is configured
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface UserProfile {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  skillLevel: number;
  gamesPlayed: number;
  createdAt: string;
  updatedAt: string;
}

interface UseAuthReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  isSignedIn: boolean | undefined;
  isLoaded: boolean;
  profile: UserProfile | undefined;
  isProfileLoading: boolean;
  profileError: Error | null;
  fullName: string | null;
  initials: string | null;
  avatarUrl: string | undefined;
  email: string | undefined;
  signOut: () => Promise<void>;
  openSignIn: () => void;
  openSignUp: () => void;
  getToken: (options?: { template?: string }) => Promise<string | null>;
  isSyncing: boolean;
  syncError: Error | null;
}

// Mock auth state for development without Clerk
function useMockAuth(): UseAuthReturn {
  return {
    user: null,
    isSignedIn: false,
    isLoaded: true,
    profile: undefined,
    isProfileLoading: false,
    profileError: null,
    fullName: 'Demo User',
    initials: 'DU',
    avatarUrl: undefined,
    email: undefined,
    signOut: async () => {},
    openSignIn: () => console.log('Sign in not available - Clerk not configured'),
    openSignUp: () => console.log('Sign up not available - Clerk not configured'),
    getToken: async () => null,
    isSyncing: false,
    syncError: null,
  };
}

// Clerk-based auth hook
function useClerkAuth(): UseAuthReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clerkHooks, setClerkHooks] = useState<any>(null);
  const queryClient = useQueryClient();

  // Dynamically load Clerk hooks
  useEffect(() => {
    if (isClerkConfigured) {
      import('@clerk/nextjs').then((clerk) => {
        setClerkHooks(clerk);
      });
    }
  }, []);

  // If Clerk hooks aren't loaded yet, return loading state
  if (!clerkHooks) {
    return {
      user: null,
      isSignedIn: undefined,
      isLoaded: false,
      profile: undefined,
      isProfileLoading: true,
      profileError: null,
      fullName: null,
      initials: null,
      avatarUrl: undefined,
      email: undefined,
      signOut: async () => {},
      openSignIn: () => {},
      openSignUp: () => {},
      getToken: async () => null,
      isSyncing: false,
      syncError: null,
    };
  }

  // This will be called after hooks are loaded
  return useClerkAuthInternal(clerkHooks, queryClient);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useClerkAuthInternal(clerkHooks: any, queryClient: any): UseAuthReturn {
  const { useUser, useAuth: useClerkAuthHook, useClerk } = clerkHooks;
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken, signOut: clerkSignOut } = useClerkAuthHook();
  const { openSignIn, openSignUp } = useClerk();

  // Sync user with backend on sign in
  const syncUserMutation = useMutation({
    mutationFn: (clerkId: string) => apiEndpoints.auth.syncUser({ clerkId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
    },
  });

  // Fetch user profile from backend
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery<UserProfile>({
    queryKey: queryKeys.auth.user(),
    queryFn: () => apiEndpoints.auth.me() as Promise<UserProfile>,
    enabled: isSignedIn && isClerkLoaded,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize socket connection when signed in
  useEffect(() => {
    if (isSignedIn && isClerkLoaded) {
      getToken().then((token: string | null) => {
        if (token) {
          initSocket(token);
          connectSocket();
        }
      });

      if (clerkUser?.id) {
        syncUserMutation.mutate(clerkUser.id);
      }
    }

    return () => {
      if (!isSignedIn) {
        disconnectSocket();
      }
    };
  }, [isSignedIn, isClerkLoaded, clerkUser?.id]);

  const signOut = useCallback(async () => {
    disconnectSocket();
    queryClient.clear();
    await clerkSignOut();
  }, [clerkSignOut, queryClient]);

  const fullName = clerkUser
    ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
      clerkUser.username ||
      'User'
    : null;

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null;

  return {
    user: clerkUser,
    isSignedIn,
    isLoaded: isClerkLoaded,
    profile,
    isProfileLoading,
    profileError,
    fullName,
    initials,
    avatarUrl: clerkUser?.imageUrl,
    email: clerkUser?.primaryEmailAddress?.emailAddress,
    signOut,
    openSignIn,
    openSignUp,
    getToken,
    isSyncing: syncUserMutation.isPending,
    syncError: syncUserMutation.error,
  };
}

export function useAuth(): UseAuthReturn {
  if (!isClerkConfigured) {
    return useMockAuth();
  }
  return useClerkAuth();
}

// Hook for checking specific permissions
export function useAuthPermission(_permission: string) {
  const { profile, isSignedIn } = useAuth();

  return {
    hasPermission: isSignedIn && !!profile,
    isLoading: !profile,
  };
}

// Hook for protected actions
export function useProtectedAction<T extends (...args: Parameters<T>) => ReturnType<T>>(
  action: T
) {
  const { isSignedIn, openSignIn } = useAuth();

  return useCallback(
    (...args: Parameters<T>) => {
      if (!isSignedIn) {
        openSignIn();
        return;
      }
      return action(...args);
    },
    [isSignedIn, openSignIn, action]
  );
}
