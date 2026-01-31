'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Share2,
  Copy,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  getSocialShareUrls,
  trackShare,
  DEFAULT_HASHTAGS,
} from '@/lib/sharing';

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
  variant?: 'default' | 'compact';
  /** Hashtags to include (default: ['pickleball', 'PaddleUp']) */
  hashtags?: string[];
  /** Event type for analytics */
  eventType?: 'tournament' | 'league';
  /** Event ID for analytics */
  eventId?: string;
}

export function ShareButtons({
  url,
  title,
  description = '',
  className = '',
  variant = 'default',
  hashtags = DEFAULT_HASHTAGS,
  eventType,
  eventId,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);

  // Update URL on client side
  useEffect(() => {
    if (!url && typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, [url]);

  // Use the sharing library to generate URLs with UTM tracking
  const shareLinks = useMemo(
    () => getSocialShareUrls(currentUrl, title, description, hashtags),
    [currentUrl, title, description, hashtags]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success({
        title: 'Link copied!',
        description: 'The link has been copied to your clipboard.',
      });

      // Track the copy event
      await trackShare('copy', currentUrl, {
        eventType,
        eventId,
        eventName: title,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error({
        title: 'Copy failed',
        description: 'Could not copy the link. Please try again.',
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: currentUrl,
        });

        // Track the native share event
        await trackShare('native', currentUrl, {
          eventType,
          eventId,
          eventName: title,
        });
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      setShowModal(true);
    }
  };

  const openShareLink = async (shareUrl: string, platform: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'email') => {
    // Track the share event
    await trackShare(platform, currentUrl, {
      eventType,
      eventId,
      eventName: title,
    });

    // Email opens in default client
    if (platform === 'email') {
      window.location.href = shareUrl;
      return;
    }

    // Open social share in centered popup
    const width = 600;
    const height = 400;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      shareUrl,
      `share-${platform}`,
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleNativeShare}
        className={`inline-flex items-center gap-2 px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors ${className}`}
        aria-label="Share"
      >
        <Share2 className="w-5 h-5" />
        <span>Share</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleNativeShare}
        className={`inline-flex items-center gap-2 px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors ${className}`}
        aria-label="Share this event"
      >
        <Share2 className="w-5 h-5" />
        <span>Share</span>
      </button>

      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Share Event
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => openShareLink(shareLinks.facebook, 'facebook')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Share on Facebook"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-blue-600 rounded-full text-white">
                  <Facebook className="w-6 h-6" />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Facebook</span>
              </button>

              <button
                onClick={() => openShareLink(shareLinks.twitter, 'twitter')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Share on X (Twitter)"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-black rounded-full text-white">
                  <Twitter className="w-6 h-6" />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">X</span>
              </button>

              <button
                onClick={() => openShareLink(shareLinks.whatsapp, 'whatsapp')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Share on WhatsApp"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-green-500 rounded-full text-white">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">WhatsApp</span>
              </button>

              <button
                onClick={() => openShareLink(shareLinks.linkedin, 'linkedin')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Share on LinkedIn"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-blue-700 rounded-full text-white">
                  <Linkedin className="w-6 h-6" />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">LinkedIn</span>
              </button>
            </div>

            {/* Email Share */}
            <button
              onClick={() => openShareLink(shareLinks.email, 'email')}
              className="w-full flex items-center gap-3 p-3 mb-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full">
                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">Send via Email</span>
            </button>

            {/* Copy Link */}
            <div className="relative">
              <input
                type="text"
                value={currentUrl}
                readOnly
                className="w-full px-4 py-3 pr-24 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={handleCopy}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-900/50'
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Copy className="w-4 h-4" />
                    Copy
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Export standalone copy link button
export function CopyLinkButton({ url, className = '' }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${className}`}
      aria-label="Copy link"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Copy Link</span>
        </>
      )}
    </button>
  );
}
