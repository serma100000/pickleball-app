'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useAuth as useClerkAuthHook, useClerk } from '@clerk/nextjs';

import { apiEndpoints } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { initSocket, connectSocket, disconnectSocket } from '@/lib/socket';

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

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
