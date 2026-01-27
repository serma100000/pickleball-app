'use client';

import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiWithAuth } from '@/lib/api';
import { getSocket, onSocketEvent } from '@/lib/socket';
import { useAuth } from './use-auth';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'game_invite'
  | 'game_reminder'
  | 'game_cancelled'
  | 'tournament_registration'
  | 'tournament_reminder'
  | 'tournament_result'
  | 'league_update'
  | 'club_invite'
  | 'club_announcement'
  | 'achievement'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: NotificationPagination;
  unreadCount: number;
}

export interface UseNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  pagination: NotificationPagination | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => void;
  isMarkingAsRead: boolean;
  isMarkingAllAsRead: boolean;
}

// ============================================================================
// Query Keys Extension
// ============================================================================

// Extend query keys for notifications (add to queryClient.ts if needed)
const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    [...notificationKeys.all, 'list', filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function fetchNotifications(
  token: string,
  params: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }
): Promise<NotificationsResponse> {
  return apiWithAuth.get('/social/notifications', token, {
    page: params.page,
    limit: params.limit,
    unreadOnly: params.unreadOnly,
  }) as Promise<NotificationsResponse>;
}

async function markNotificationAsRead(token: string, notificationId: string): Promise<void> {
  return apiWithAuth.patch(`/social/notifications/${notificationId}/read`, token);
}

async function markAllNotificationsAsRead(token: string): Promise<void> {
  return apiWithAuth.post('/social/notifications/read-all', token);
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { page = 1, limit = 20, unreadOnly = false, enabled = true } = options;
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useAuth();

  // Determine if queries should be enabled
  const isEnabled = enabled && isSignedIn;

  // Fetch notifications list
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: notificationKeys.list({ page, limit, unreadOnly }),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      return fetchNotifications(token, { page, limit, unreadOnly });
    },
    enabled: isEnabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      return markNotificationAsRead(token, notificationId);
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Snapshot previous values
      const previousData = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: notificationKeys.list({ page, limit, unreadOnly }),
      });

      // Optimistically update the notification
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.list({ page, limit, unreadOnly }) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === notificationId
                ? { ...n, isRead: true, readAt: new Date().toISOString() }
                : n
            ),
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _notificationId, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      return markAllNotificationsAsRead(token);
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      // Snapshot previous values
      const previousData = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: notificationKeys.list({ page, limit, unreadOnly }),
      });

      // Optimistically update all notifications
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.list({ page, limit, unreadOnly }) },
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          return {
            ...old,
            notifications: old.notifications.map((n) => ({
              ...n,
              isRead: true,
              readAt: n.readAt || now,
            })),
            unreadCount: 0,
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Subscribe to real-time socket events
  useEffect(() => {
    if (!isEnabled) return;

    const socket = getSocket();
    if (!socket) return;

    // Handle new notification
    const unsubscribeNew = onSocketEvent('notification:new', (newNotification) => {
      // Add new notification to the cache
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.list({ page, limit, unreadOnly }) },
        (old) => {
          if (!old) return old;

          // Don't add if already exists
          if (old.notifications.some((n) => n.id === newNotification.id)) {
            return old;
          }

          return {
            ...old,
            notifications: [
              {
                id: newNotification.id,
                type: newNotification.type as NotificationType,
                title: newNotification.title,
                message: newNotification.message,
                data: newNotification.data as Record<string, unknown> | undefined,
                isRead: false,
                readAt: null,
                createdAt: new Date().toISOString(),
              },
              ...old.notifications,
            ].slice(0, limit), // Keep within limit
            unreadCount: old.unreadCount + 1,
            pagination: {
              ...old.pagination,
              total: old.pagination.total + 1,
            },
          };
        }
      );

      // Also invalidate to ensure full consistency on next refetch
      queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
        refetchType: 'none', // Don't refetch immediately, just mark as stale
      });
    });

    // Handle notification read event (from another device/tab)
    const unsubscribeRead = onSocketEvent('notification:read', ({ notificationId }) => {
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.list({ page, limit, unreadOnly }) },
        (old) => {
          if (!old) return old;

          const notification = old.notifications.find((n) => n.id === notificationId);
          if (!notification || notification.isRead) return old;

          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === notificationId
                ? { ...n, isRead: true, readAt: new Date().toISOString() }
                : n
            ),
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        }
      );
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
    };
  }, [isEnabled, queryClient, page, limit, unreadOnly]);

  // Wrapped mutation functions
  const markAsRead = useCallback(
    async (notificationId: string) => {
      await markAsReadMutation.mutateAsync(notificationId);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    pagination: data?.pagination,
    isLoading,
    isError,
    error: error as Error | null,
    markAsRead,
    markAllAsRead,
    refetch,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

// ============================================================================
// Unread Count Only Hook (for header badge)
// ============================================================================

export interface UseUnreadCountReturn {
  unreadCount: number;
  isLoading: boolean;
  refetch: () => void;
}

export function useUnreadNotificationCount(): UseUnreadCountReturn {
  const queryClient = useQueryClient();
  const { isSignedIn, getToken } = useAuth();

  // Use the main notifications query but only return unread count
  // This shares the cache with useNotifications
  const { data, isLoading, refetch } = useQuery({
    queryKey: notificationKeys.list({ page: 1, limit: 1, unreadOnly: false }),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('No auth token');
      return fetchNotifications(token, { page: 1, limit: 1, unreadOnly: false });
    },
    enabled: isSignedIn,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // More frequent for badge
    select: (data) => data.unreadCount,
  });

  // Subscribe to real-time updates for count
  useEffect(() => {
    if (!isSignedIn) return;

    const socket = getSocket();
    if (!socket) return;

    const unsubscribeNew = onSocketEvent('notification:new', () => {
      // Increment unread count
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: old.unreadCount + 1,
          };
        }
      );
    });

    const unsubscribeRead = onSocketEvent('notification:read', () => {
      // Decrement unread count
      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: notificationKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            unreadCount: Math.max(0, old.unreadCount - 1),
          };
        }
      );
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
    };
  }, [isSignedIn, queryClient]);

  return {
    unreadCount: data ?? 0,
    isLoading,
    refetch,
  };
}

// ============================================================================
// Export query keys for external use
// ============================================================================

export { notificationKeys };
