'use client';

import { useState, useEffect, useCallback } from 'react';

import { getPendingSyncItems, removeSyncItem, incrementSyncRetry } from '@/lib/db';
import { api } from '@/lib/api';

interface OnlineStatusOptions {
  /**
   * Whether to automatically sync pending items when coming online
   * @default true
   */
  autoSync?: boolean;

  /**
   * Polling interval to check online status (ms)
   * @default 30000
   */
  pollingInterval?: number;
}

export function useOnlineStatus(options: OnlineStatusOptions = {}) {
  const { autoSync = true, pollingInterval = 30000 } = options;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const items = await getPendingSyncItems();
    setPendingCount(items.length);
  }, []);

  // Sync pending items
  const syncPendingItems = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);

    try {
      const items = await getPendingSyncItems();

      for (const item of items) {
        try {
          switch (item.type) {
            case 'game':
              if (item.action === 'create') {
                await api.post('/games', item.data);
              } else if (item.action === 'update') {
                const { id, ...data } = item.data as { id: string; [key: string]: unknown };
                await api.patch(`/games/${id}`, data);
              } else if (item.action === 'delete') {
                const { id } = item.data as { id: string };
                await api.delete(`/games/${id}`);
              }
              break;

            case 'court_review':
              if (item.action === 'create') {
                const { courtId, ...reviewData } = item.data as {
                  courtId: string;
                  [key: string]: unknown;
                };
                await api.post(`/courts/${courtId}/reviews`, reviewData);
              }
              break;

            case 'club_join':
              const { clubId } = item.data as { clubId: string };
              if (item.action === 'create') {
                await api.post(`/clubs/${clubId}/join`);
              }
              break;

            case 'tournament_register':
              if (item.action === 'create') {
                const { tournamentId, ...regData } = item.data as {
                  tournamentId: string;
                  [key: string]: unknown;
                };
                await api.post(`/tournaments/${tournamentId}/register`, regData);
              }
              break;
          }

          // Successfully synced, remove from queue
          await removeSyncItem(item.id);
        } catch (error) {
          // Failed, increment retry counter
          await incrementSyncRetry(item.id);
          console.error(`Failed to sync item ${item.id}:`, error);
        }
      }

      await updatePendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setLastOnline(new Date());

    if (autoSync) {
      syncPendingItems();
    }
  }, [autoSync, syncPendingItems]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      setLastOnline(new Date());
    }

    // Update pending count
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, updatePendingCount]);

  // Polling for more reliable detection
  useEffect(() => {
    if (typeof window === 'undefined' || pollingInterval <= 0) return;

    const checkOnlineStatus = async () => {
      try {
        // Try to fetch a small resource
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (response.ok && !isOnline) {
          handleOnline();
        }
      } catch {
        if (isOnline) {
          handleOffline();
        }
      }
    };

    const intervalId = setInterval(checkOnlineStatus, pollingInterval);

    return () => clearInterval(intervalId);
  }, [pollingInterval, isOnline, handleOnline, handleOffline]);

  return {
    /**
     * Whether the browser is currently online
     */
    isOnline,

    /**
     * Whether the app is currently syncing pending items
     */
    isSyncing,

    /**
     * Last time the app was online
     */
    lastOnline,

    /**
     * Number of items pending sync
     */
    pendingCount,

    /**
     * Manually trigger sync of pending items
     */
    syncPendingItems,

    /**
     * Refresh the pending count
     */
    updatePendingCount,
  };
}

// Hook for showing offline indicator
export function useOfflineIndicator() {
  const { isOnline, pendingCount } = useOnlineStatus();

  return {
    showIndicator: !isOnline || pendingCount > 0,
    message: !isOnline
      ? 'You are offline. Changes will be synced when you reconnect.'
      : pendingCount > 0
      ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} pending sync`
      : null,
    type: !isOnline ? ('warning' as const) : ('info' as const),
  };
}
