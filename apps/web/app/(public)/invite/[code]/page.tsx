'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInviteDetails, useAcceptInvite, useDeclineInvite } from '@/hooks/use-api';
import { toast } from '@/hooks/use-toast';

// Type for invite response from API
interface InviteData {
  invite: {
    id: string;
    code: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    teamName?: string | null;
    message?: string | null;
    expiresAt?: string | null;
    inviter: {
      id: string;
      username: string;
      displayName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
      city?: string | null;
      state?: string | null;
      rating?: number | null;
      ratingSource?: string | null;
    };
    tournament?: {
      id: string;
      name: string;
      startsAt?: string;
      gameFormat?: string;
      venue?: {
        name: string;
        city?: string | null;
        state?: string | null;
      } | null;
    } | null;
    league?: {
      id: string;
      name: string;
      gameFormat?: string;
      venue?: {
        name: string;
        city?: string | null;
        state?: string | null;
      } | null;
    } | null;
  };
}

export default function InviteAcceptPage() {
  const params = useParams();
  const code = params.code as string;

  const { data, isLoading, error } = useInviteDetails(code);
  const acceptInvite = useAcceptInvite();
  const declineInvite = useDeclineInvite();

  const [actionTaken, setActionTaken] = useState<'accepted' | 'declined' | null>(null);

  const invite = (data as InviteData | undefined)?.invite;

  const handleAccept = async () => {
    try {
      await acceptInvite.mutateAsync(code);
      setActionTaken('accepted');
      toast.success({
        title: 'Invitation accepted!',
        description: 'You are now registered as a team.',
      });
    } catch (error) {
      // Error toast handled by mutation cache
    }
  };

  const handleDecline = async () => {
    try {
      await declineInvite.mutateAsync(code);
      setActionTaken('declined');
      toast.success({
        title: 'Invitation declined',
        description: 'The inviter has been notified.',
      });
    } catch (error) {
      // Error toast handled by mutation cache
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDisplayName = (user: { displayName?: string | null; firstName?: string | null; lastName?: string | null; username: string; [key: string]: unknown }) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.username;
  };

  const getLocation = (venue: { name: string; city?: string | null; state?: string | null } | null | undefined) => {
    if (!venue) return null;
    if (venue.city && venue.state) return `${venue.name} - ${venue.city}, ${venue.state}`;
    return venue.name;
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pickle-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invitation Not Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              This invitation link may be invalid or has been removed.
            </p>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle expired or already actioned invites
  if (invite.status !== 'pending') {
    const statusMessages = {
      accepted: {
        icon: (
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        title: 'Invitation Already Accepted',
        message: 'This invitation has already been accepted. The team is registered!',
      },
      declined: {
        icon: (
          <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        title: 'Invitation Declined',
        message: 'This invitation has been declined.',
      },
      expired: {
        icon: (
          <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        title: 'Invitation Expired',
        message: 'This invitation has expired. Please ask the inviter to send a new one.',
      },
    };

    const status = statusMessages[invite.status as keyof typeof statusMessages] || statusMessages.expired;

    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full ${status.bgColor} flex items-center justify-center mx-auto mb-4`}>
              {status.icon}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {status.title}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {status.message}
            </p>
            <Button asChild>
              <Link href={invite.tournament ? `/tournaments/${invite.tournament.id}` : invite.league ? `/leagues/${invite.league.id}` : '/'}>
                View Event
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success screen after action
  if (actionTaken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className={`w-16 h-16 rounded-full ${actionTaken === 'accepted' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'} flex items-center justify-center mx-auto mb-4`}>
              {actionTaken === 'accepted' ? (
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {actionTaken === 'accepted' ? 'You\'re Registered!' : 'Invitation Declined'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {actionTaken === 'accepted'
                ? `You and ${getDisplayName(invite.inviter)} are now registered as a team${invite.teamName ? ` (${invite.teamName})` : ''}.`
                : `${getDisplayName(invite.inviter)} has been notified.`}
            </p>
            <Button asChild>
              <Link href={invite.tournament ? `/tournaments/${invite.tournament.id}` : invite.league ? `/leagues/${invite.league.id}` : '/dashboard'}>
                {actionTaken === 'accepted' ? 'View Event' : 'Go to Dashboard'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const event = invite.tournament || invite.league;
  const eventType = invite.tournament ? 'tournament' : 'league';

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <Card>
        <CardHeader className="text-center border-b border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-pickle-100 dark:bg-pickle-900/20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-pickle-600 dark:text-pickle-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <CardTitle>Partner Invitation</CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Inviter Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            {invite.inviter.avatarUrl ? (
              <img
                src={invite.inviter.avatarUrl}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-pickle-100 dark:bg-pickle-800 flex items-center justify-center">
                <span className="text-pickle-600 dark:text-pickle-300 font-semibold text-xl">
                  {getDisplayName(invite.inviter).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {getDisplayName(invite.inviter)}
              </p>
              {invite.inviter.city && invite.inviter.state && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {invite.inviter.city}, {invite.inviter.state}
                </p>
              )}
              {invite.inviter.rating && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Rating: {invite.inviter.rating.toFixed(2)}
                  {invite.inviter.ratingSource === 'dupr' && ' DUPR'}
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-gray-600 dark:text-gray-300">
            <strong>{getDisplayName(invite.inviter)}</strong> has invited you to be their partner!
          </p>

          {/* Event Info */}
          {event && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {event.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {eventType} - {event.gameFormat?.replace('_', ' ')}
              </p>
              {invite.tournament?.startsAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(invite.tournament.startsAt)}
                </p>
              )}
              {(invite.tournament?.venue || invite.league?.venue) && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getLocation(invite.tournament?.venue || invite.league?.venue)}
                </p>
              )}
            </div>
          )}

          {/* Team Name */}
          {invite.teamName && (
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Team Name</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {invite.teamName}
              </p>
            </div>
          )}

          {/* Personal Message */}
          {invite.message && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Personal message:
              </p>
              <p className="text-gray-700 dark:text-gray-300 italic">
                &ldquo;{invite.message}&rdquo;
              </p>
            </div>
          )}

          {/* Expiration */}
          {invite.expiresAt && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              This invitation expires on {formatDate(invite.expiresAt)}
            </p>
          )}
        </CardContent>

        <CardFooter className="border-t border-gray-200 dark:border-gray-700 flex flex-col gap-4 p-6">
          <SignedIn>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDecline}
                loading={declineInvite.isPending}
                disabled={acceptInvite.isPending}
              >
                Decline
              </Button>
              <Button
                className="flex-1"
                onClick={handleAccept}
                loading={acceptInvite.isPending}
                disabled={declineInvite.isPending}
              >
                Accept Invitation
              </Button>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sign in to accept or decline this invitation
              </p>
              <div className="flex gap-3 justify-center">
                <SignInButton mode="modal">
                  <Button>Sign In</Button>
                </SignInButton>
                <Button variant="outline" asChild>
                  <Link href={`/sign-up?redirect_url=/invite/${code}`}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </div>
          </SignedOut>
        </CardFooter>
      </Card>
    </div>
  );
}
