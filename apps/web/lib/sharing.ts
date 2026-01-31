/**
 * Sharing utilities for social media, analytics, and deep linking
 */

export interface ShareUrlOptions {
  /** UTM source parameter (e.g., 'facebook', 'twitter') */
  utmSource?: string;
  /** UTM medium parameter (e.g., 'social', 'email') */
  utmMedium?: string;
  /** UTM campaign parameter (e.g., 'tournament_promo') */
  utmCampaign?: string;
  /** UTM content parameter for A/B testing */
  utmContent?: string;
  /** Referral code for tracking */
  referralCode?: string;
}

export interface SocialShareUrls {
  facebook: string;
  twitter: string;
  whatsapp: string;
  linkedin: string;
  email: string;
}

/**
 * Build a shareable URL with UTM parameters and referral codes
 */
export function buildShareUrl(baseUrl: string, options: ShareUrlOptions = {}): string {
  const url = new URL(baseUrl);

  if (options.utmSource) {
    url.searchParams.set('utm_source', options.utmSource);
  }
  if (options.utmMedium) {
    url.searchParams.set('utm_medium', options.utmMedium);
  }
  if (options.utmCampaign) {
    url.searchParams.set('utm_campaign', options.utmCampaign);
  }
  if (options.utmContent) {
    url.searchParams.set('utm_content', options.utmContent);
  }
  if (options.referralCode) {
    url.searchParams.set('ref', options.referralCode);
  }

  return url.toString();
}

/**
 * Generate platform-specific share URLs for social media
 */
export function getSocialShareUrls(
  url: string,
  title: string,
  description?: string,
  hashtags?: string[]
): SocialShareUrls {
  const encodedTitle = encodeURIComponent(title);
  const hashtagString = hashtags?.map(tag => tag.replace('#', '')).join(',') || '';

  // Facebook Share URL with UTM tracking
  const facebookUrl = buildShareUrl(url, {
    utmSource: 'facebook',
    utmMedium: 'social',
    utmCampaign: 'share',
  });

  // Twitter/X Share URL with UTM tracking
  const twitterUrl = buildShareUrl(url, {
    utmSource: 'twitter',
    utmMedium: 'social',
    utmCampaign: 'share',
  });

  // WhatsApp Share URL with UTM tracking
  const whatsappUrl = buildShareUrl(url, {
    utmSource: 'whatsapp',
    utmMedium: 'social',
    utmCampaign: 'share',
  });

  // LinkedIn Share URL with UTM tracking
  const linkedinUrl = buildShareUrl(url, {
    utmSource: 'linkedin',
    utmMedium: 'social',
    utmCampaign: 'share',
  });

  // Email Share URL with UTM tracking
  const emailShareUrl = buildShareUrl(url, {
    utmSource: 'email',
    utmMedium: 'email',
    utmCampaign: 'share',
  });

  return {
    // Facebook uses sharer.php
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(facebookUrl)}`,

    // Twitter/X intent with text, url, and hashtags
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodeURIComponent(twitterUrl)}${hashtagString ? `&hashtags=${hashtagString}` : ''}`,

    // WhatsApp with message containing title, description, and URL
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}${description ? `\n\n${description}` : ''}\n\n${whatsappUrl}`)}`,

    // LinkedIn share with URL only (LinkedIn fetches OG data)
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(linkedinUrl)}`,

    // Email with subject and body
    email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${description ? `${description}\n\n` : ''}${emailShareUrl}`)}`,
  };
}

/**
 * Track a share event for analytics
 */
export async function trackShare(
  platform: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'email' | 'copy' | 'native',
  url: string,
  metadata?: {
    eventType?: 'tournament' | 'league';
    eventId?: string;
    eventName?: string;
  }
): Promise<void> {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Share Analytics]', { platform, url, metadata });
  }

  // Send to analytics endpoint (if configured)
  const analyticsUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  if (analyticsUrl) {
    try {
      await fetch(`${analyticsUrl}/events/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          url,
          ...metadata,
          timestamp: new Date().toISOString(),
        }),
        // Don't wait for response
        keepalive: true,
      });
    } catch (error) {
      // Silently fail - analytics should not break the app
      console.error('[Share Analytics] Failed to track:', error);
    }
  }

  // Also track via gtag if available (Google Analytics 4)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'share', {
      method: platform,
      content_type: metadata?.eventType || 'page',
      item_id: metadata?.eventId,
      content_id: url,
    });
  }
}

/**
 * Check if native share API is available
 */
export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' &&
         typeof navigator.share === 'function' &&
         typeof navigator.canShare === 'function';
}

/**
 * Share using the native Web Share API
 */
export async function nativeShare(
  title: string,
  text: string,
  url: string
): Promise<boolean> {
  if (!canUseNativeShare()) {
    return false;
  }

  try {
    const shareData = { title, text, url };

    // Check if the data can be shared
    if (navigator.canShare && !navigator.canShare(shareData)) {
      return false;
    }

    await navigator.share(shareData);
    return true;
  } catch (error) {
    // User cancelled or share failed
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled - not an error
      return false;
    }
    console.error('[Native Share] Failed:', error);
    return false;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error('[Copy to Clipboard] Failed:', error);
    return false;
  }
}

/**
 * Default hashtags for pickleball events
 */
export const DEFAULT_HASHTAGS = ['pickleball', 'PaddleUp'];

/**
 * Generate a QR code URL (for use with img src or QR code libraries)
 * This uses Google Charts API as a simple fallback
 */
export function getQrCodeUrl(data: string, size: number = 200): string {
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(data)}&choe=UTF-8`;
}

// Type augmentation for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
