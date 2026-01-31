'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiWithAuth } from '@/lib/api';

interface WaitlistStatusProps {
  eventType: 'tournament' | 'league';
  eventId: string;
  eventName: string;
  onStatusChange?: () => void;
}

interface WaitlistPositionData {
  onWaitlist: boolean;
  position?: number;
  totalWaitlisted?: number;
  estimatedWaitDays?: number;
  status?: string;
  spotOfferedAt?: string | null;
  spotExpiresAt?: string | null;
  message?: string;
}

export function WaitlistStatus({
  eventType,
  eventId,
  eventName,
  onStatusChange,
}: WaitlistStatusProps) {
  const { getToken } = useAuth();
  const [data, setData] = useState<WaitlistPositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate time remaining for spot offer
  const getTimeRemaining = () => {
    if (!data?.spotExpiresAt) return null;
    const expiresAt = new Date(data.spotExpiresAt);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const fetchWaitlistPosition = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiWithAuth.get<WaitlistPositionData>(
        `/waitlist/position`,
        token,
        { eventType, eventId }
      );
      setData(response);
      setError(null);
    } catch (err) {
      setError('Failed to fetch waitlist status');
      console.error('Waitlist status error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlistPosition();
    // Refresh every minute if there's a spot offer
    const interval = setInterval(() => {
      if (data?.status === 'spot_offered') {
        fetchWaitlistPosition();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [eventType, eventId]);

  const handleAcceptSpot = async () => {
    setActionLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      await apiWithAuth.post('/waitlist/accept', token, { eventType, eventId });
      await fetchWaitlistPosition();
      onStatusChange?.();
    } catch (err) {
      setError('Failed to accept spot');
      console.error('Accept spot error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSpot = async () => {
    setActionLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      await apiWithAuth.post('/waitlist/decline', token, { eventType, eventId });
      await fetchWaitlistPosition();
      onStatusChange?.();
    } catch (err) {
      setError('Failed to decline spot');
      console.error('Decline spot error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.onWaitlist) {
    return null;
  }

  // Spot offered state - show accept/decline buttons
  if (data.status === 'spot_offered') {
    const timeRemaining = getTimeRemaining();
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-700 dark:text-green-300">
              A spot opened up!
            </CardTitle>
          </div>
          <CardDescription className="text-green-600 dark:text-green-400">
            You have been offered a spot in {eventName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {timeRemaining && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{timeRemaining}</span>
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Accept your spot within 24 hours or it will be offered to the next person in line.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleAcceptSpot}
              disabled={actionLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? 'Processing...' : 'Accept Spot'}
            </Button>
            <Button
              onClick={handleDeclineSpot}
              disabled={actionLoading}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              Decline
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Waitlisted state
  return (
    <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-amber-700 dark:text-amber-300">
            You&apos;re on the waitlist
          </CardTitle>
        </div>
        <CardDescription className="text-amber-600 dark:text-amber-400">
          {eventName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <span className="text-3xl font-bold text-amber-600">
              #{data.position}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Your Position
            </span>
          </div>
          <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-1">
              <Users className="h-5 w-5 text-gray-400" />
              <span className="text-3xl font-bold text-gray-600 dark:text-gray-300">
                {data.totalWaitlisted}
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Waiting
            </span>
          </div>
        </div>

        {data.estimatedWaitDays && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Estimated wait: ~{data.estimatedWaitDays} days
            </span>
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-300">
          We&apos;ll notify you immediately when a spot opens up. Keep an eye on your notifications!
        </p>
      </CardContent>
    </Card>
  );
}

export default WaitlistStatus;
