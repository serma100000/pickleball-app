'use client';

import { useState } from 'react';
import { useReferralCode, useReferralStats } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  Copy,
  Share2,
  Gift,
  Users,
  Eye,
  TrendingUp,
  CheckCircle,
  Trophy,
  Target,
} from 'lucide-react';

interface ReferralDashboardProps {
  eventType?: 'tournament' | 'league' | 'general';
  eventId?: string;
  className?: string;
}

export function ReferralDashboard({
  eventType,
  eventId,
  className = '',
}: ReferralDashboardProps) {
  const [copied, setCopied] = useState(false);

  const {
    data: codeData,
    isLoading: isLoadingCode,
    error: codeError,
  } = useReferralCode({ eventType, eventId });

  const {
    data: statsData,
    isLoading: isLoadingStats,
    error: statsError,
  } = useReferralStats();

  const handleCopyLink = async () => {
    if (!codeData?.shareableUrl) return;

    try {
      await navigator.clipboard.writeText(codeData.shareableUrl);
      setCopied(true);
      toast.success({
        title: 'Link copied!',
        description: 'Your referral link has been copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error({
        title: 'Failed to copy',
        description: 'Please try copying the link manually.',
      });
    }
  };

  const handleShare = async () => {
    if (!codeData?.shareableUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join PaddleUp!',
          text: 'Check out PaddleUp - the best app for pickleball players!',
          url: codeData.shareableUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareToSocial = (platform: string) => {
    if (!codeData?.shareableUrl) return;

    const text = encodeURIComponent('Join me on PaddleUp - the best app for pickleball players!');
    const url = encodeURIComponent(codeData.shareableUrl);

    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (isLoadingCode || isLoadingStats) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (codeError || statsError) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Unable to load referral information.</p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: 'Link Views', value: statsData?.totalViews || 0, icon: Eye },
    { label: 'Sign-ups', value: statsData?.totalSignups || 0, icon: Users },
    { label: 'Registrations', value: statsData?.totalRegistrations || 0, icon: CheckCircle },
    { label: 'Total Conversions', value: statsData?.successfulConversions || 0, icon: TrendingUp },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link with friends and earn rewards when they join!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral Code Display */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <code className="flex-1 text-lg font-semibold tracking-wider">
              {codeData?.code}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="shrink-0"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="ml-2">{copied ? 'Copied!' : 'Copy Link'}</span>
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share via:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareToSocial('facebook')}
              >
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareToSocial('twitter')}
              >
                X / Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareToSocial('whatsapp')}
              >
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShareToSocial('linkedin')}
              >
                LinkedIn
              </Button>
              <Button variant="default" size="sm" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rewards Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Rewards
          </CardTitle>
          <CardDescription>
            Earn rewards as your friends join and register for events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Earned Rewards */}
          {statsData?.rewards?.earned && statsData.rewards.earned.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Earned Rewards</h4>
              <div className="space-y-2">
                {statsData.rewards.earned.map((reward, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950"
                  >
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">{reward.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Milestone */}
          {statsData?.rewards?.nextMilestone && (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-medium">
                <Target className="h-4 w-4" />
                Next Reward
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{statsData.rewards.nextMilestone.description}</span>
                  <span className="text-muted-foreground">
                    {statsData.successfulConversions} / {statsData.rewards.nextMilestone.count} referrals
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${statsData.rewards.nextMilestone.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reward Tiers */}
          <div className="space-y-3">
            <h4 className="font-medium">Reward Tiers</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <RewardTierCard
                count={1}
                reward="$5 Account Credit"
                earned={(statsData?.successfulConversions || 0) >= 1}
              />
              <RewardTierCard
                count={5}
                reward="50% Off Next Entry"
                earned={(statsData?.successfulConversions || 0) >= 5}
              />
              <RewardTierCard
                count={10}
                reward="Free Event Entry"
                earned={(statsData?.successfulConversions || 0) >= 10}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Conversions */}
      {statsData?.recentConversions && statsData.recentConversions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statsData.recentConversions.map((conversion, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {conversion.user.avatarUrl ? (
                      <img
                        src={conversion.user.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {conversion.user.displayName || 'Anonymous User'}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {conversion.type}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(conversion.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RewardTierCard({
  count,
  reward,
  earned,
}: {
  count: number;
  reward: string;
  earned: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 text-center ${
        earned
          ? 'border-green-500 bg-green-50 dark:bg-green-950'
          : 'border-muted bg-muted/30'
      }`}
    >
      <div className="mb-2 text-2xl font-bold">{count}</div>
      <div className="text-sm text-muted-foreground">
        {count === 1 ? 'Referral' : 'Referrals'}
      </div>
      <div className={`mt-2 text-sm font-medium ${earned ? 'text-green-600' : ''}`}>
        {reward}
      </div>
      {earned && (
        <CheckCircle className="mx-auto mt-2 h-5 w-5 text-green-600" />
      )}
    </div>
  );
}
