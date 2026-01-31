'use client';

import { useState } from 'react';
import { useReferralCode } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Copy, Gift, CheckCircle, X } from 'lucide-react';

interface ReferralBannerProps {
  eventType?: 'tournament' | 'league' | 'general';
  eventId?: string;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function ReferralBanner({
  eventType,
  eventId,
  className = '',
  dismissible = true,
  onDismiss,
}: ReferralBannerProps) {
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading, error } = useReferralCode({ eventType, eventId });

  const handleCopyLink = async () => {
    if (!data?.shareableUrl) return;

    try {
      await navigator.clipboard.writeText(data.shareableUrl);
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

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Don't show if loading, error, or dismissed
  if (isLoading || error || dismissed) {
    return null;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold">Invite Friends, Earn Rewards</h4>
            <p className="text-sm text-muted-foreground">
              Get $5 credit for each friend who joins!
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={handleCopyLink}
            disabled={!data?.shareableUrl}
            className="gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>

          {dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Decorative elements */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5" />
      <div className="pointer-events-none absolute -bottom-4 right-8 h-16 w-16 rounded-full bg-primary/5" />
    </div>
  );
}
