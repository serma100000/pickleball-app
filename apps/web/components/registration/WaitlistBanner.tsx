'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Clock, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, apiWithAuth } from '@/lib/api';

interface WaitlistBannerProps {
  eventType: 'tournament' | 'league';
  eventId: string;
  eventName: string;
  maxParticipants?: number | null;
  currentParticipants?: number;
  onJoinWaitlist?: () => void;
  className?: string;
}

interface WaitlistStatusData {
  isFull: boolean;
  currentCount: number;
  maxCount: number | null;
  waitlistEnabled: boolean;
  waitlistCount: number;
}

export function WaitlistBanner({
  eventType,
  eventId,
  eventName: _eventName,
  maxParticipants: _maxParticipants,
  currentParticipants: _currentParticipants,
  onJoinWaitlist,
  className = '',
}: WaitlistBannerProps) {
  // Note: eventName, maxParticipants, currentParticipants are available for future enhancements
  void _eventName;
  void _maxParticipants;
  void _currentParticipants;
  const { isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState<WaitlistStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get<WaitlistStatusData>(
          `/waitlist/status`,
          { eventType, eventId }
        );
        setStatus(response);
      } catch (err) {
        console.error('Failed to fetch waitlist status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [eventType, eventId]);

  const handleJoinWaitlist = async () => {
    if (!isSignedIn) {
      // Redirect to sign in
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setJoinLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      await apiWithAuth.post('/waitlist', token, { eventType, eventId });
      setJoined(true);
      onJoinWaitlist?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join waitlist';
      setError(errorMessage);
      console.error('Join waitlist error:', err);
    } finally {
      setJoinLoading(false);
    }
  };

  // Don't show banner if not full or still loading
  if (loading || !status?.isFull) {
    return null;
  }

  // Successfully joined state
  if (joined) {
    return (
      <div className={`bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              You&apos;re on the waitlist!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              We&apos;ll notify you as soon as a spot opens up. Check your notifications regularly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200">
            Event Full
          </h3>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            {status.maxCount
              ? `${status.currentCount}/${status.maxCount} spots filled.`
              : 'This event has reached capacity.'}
            {status.waitlistCount > 0 && (
              <span className="ml-1">
                {status.waitlistCount} {status.waitlistCount === 1 ? 'person is' : 'people are'} on the waitlist.
              </span>
            )}
          </p>

          {status.waitlistEnabled && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
              <Button
                onClick={handleJoinWaitlist}
                disabled={joinLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                {joinLoading ? 'Joining...' : 'Join Waitlist'}
              </Button>
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                <span>Get notified when a spot opens</span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default WaitlistBanner;
