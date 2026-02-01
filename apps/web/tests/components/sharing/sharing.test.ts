/**
 * Tests for sharing utility functions
 * @file apps/web/tests/components/sharing/sharing.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildShareUrl,
  getSocialShareUrls,
  trackShare,
  canUseNativeShare,
  nativeShare,
  copyToClipboard,
  getQrCodeUrl,
  DEFAULT_HASHTAGS,
} from '@/lib/sharing';

describe('sharing utility', () => {
  describe('buildShareUrl', () => {
    it('should return the base URL when no options provided', () => {
      const result = buildShareUrl('https://example.com/event/123');
      expect(result).toBe('https://example.com/event/123');
    });

    it('should add utm_source parameter', () => {
      const result = buildShareUrl('https://example.com/event/123', {
        utmSource: 'facebook',
      });
      expect(result).toBe('https://example.com/event/123?utm_source=facebook');
    });

    it('should add utm_medium parameter', () => {
      const result = buildShareUrl('https://example.com/event/123', {
        utmMedium: 'social',
      });
      expect(result).toBe('https://example.com/event/123?utm_medium=social');
    });

    it('should add utm_campaign parameter', () => {
      const result = buildShareUrl('https://example.com/event/123', {
        utmCampaign: 'summer_promo',
      });
      expect(result).toBe('https://example.com/event/123?utm_campaign=summer_promo');
    });

    it('should add utm_content parameter', () => {
      const result = buildShareUrl('https://example.com/event/123', {
        utmContent: 'variant_a',
      });
      expect(result).toBe('https://example.com/event/123?utm_content=variant_a');
    });

    it('should add referral code parameter', () => {
      const result = buildShareUrl('https://example.com/event/123', {
        referralCode: 'ABC123',
      });
      expect(result).toBe('https://example.com/event/123?ref=ABC123');
    });

    it('should combine multiple UTM parameters', () => {
      const result = buildShareUrl('https://example.com/event/123', {
        utmSource: 'twitter',
        utmMedium: 'social',
        utmCampaign: 'share',
      });
      const url = new URL(result);
      expect(url.searchParams.get('utm_source')).toBe('twitter');
      expect(url.searchParams.get('utm_medium')).toBe('social');
      expect(url.searchParams.get('utm_campaign')).toBe('share');
    });

    it('should handle URLs that already have query parameters', () => {
      const result = buildShareUrl('https://example.com/event/123?existing=param', {
        utmSource: 'facebook',
      });
      const url = new URL(result);
      expect(url.searchParams.get('existing')).toBe('param');
      expect(url.searchParams.get('utm_source')).toBe('facebook');
    });

    it('should handle all parameters together', () => {
      const result = buildShareUrl('https://example.com/event/123', {
        utmSource: 'facebook',
        utmMedium: 'social',
        utmCampaign: 'tournament',
        utmContent: 'banner',
        referralCode: 'USER123',
      });
      const url = new URL(result);
      expect(url.searchParams.get('utm_source')).toBe('facebook');
      expect(url.searchParams.get('utm_medium')).toBe('social');
      expect(url.searchParams.get('utm_campaign')).toBe('tournament');
      expect(url.searchParams.get('utm_content')).toBe('banner');
      expect(url.searchParams.get('ref')).toBe('USER123');
    });

    it('should handle special characters in URL', () => {
      const result = buildShareUrl('https://example.com/event/My Event Name', {
        utmSource: 'facebook',
      });
      expect(result).toContain('utm_source=facebook');
    });
  });

  describe('getSocialShareUrls', () => {
    const testUrl = 'https://paddleup.com/tournament/123';
    const testTitle = 'Summer Pickleball Championship';
    const testDescription = 'Join us for the best pickleball tournament!';
    const testHashtags = ['pickleball', 'tournament'];

    it('should generate Facebook share URL with UTM tracking', () => {
      const urls = getSocialShareUrls(testUrl, testTitle);
      expect(urls.facebook).toContain('https://www.facebook.com/sharer/sharer.php');
      // UTM params are URL-encoded within the share URL
      expect(urls.facebook).toContain(encodeURIComponent('utm_source=facebook'));
      expect(urls.facebook).toContain(encodeURIComponent('utm_medium=social'));
      expect(urls.facebook).toContain(encodeURIComponent('utm_campaign=share'));
    });

    it('should generate Twitter share URL with text and hashtags', () => {
      const urls = getSocialShareUrls(testUrl, testTitle, testDescription, testHashtags);
      expect(urls.twitter).toContain('https://twitter.com/intent/tweet');
      expect(urls.twitter).toContain('text=' + encodeURIComponent(testTitle));
      // UTM params are URL-encoded within the share URL
      expect(urls.twitter).toContain(encodeURIComponent('utm_source=twitter'));
      expect(urls.twitter).toContain('hashtags=pickleball,tournament');
    });

    it('should generate Twitter URL without hashtags when none provided', () => {
      const urls = getSocialShareUrls(testUrl, testTitle);
      expect(urls.twitter).toContain('https://twitter.com/intent/tweet');
      expect(urls.twitter).not.toContain('hashtags=');
    });

    it('should generate WhatsApp share URL with message', () => {
      const urls = getSocialShareUrls(testUrl, testTitle, testDescription);
      expect(urls.whatsapp).toContain('https://wa.me/');
      expect(urls.whatsapp).toContain('text=');
      expect(urls.whatsapp).toContain(encodeURIComponent(testTitle));
      // UTM params are double-encoded (inside the message text)
      expect(urls.whatsapp).toContain('utm_source');
    });

    it('should generate WhatsApp URL with description when provided', () => {
      const urls = getSocialShareUrls(testUrl, testTitle, testDescription);
      expect(urls.whatsapp).toContain(encodeURIComponent(testDescription));
    });

    it('should generate WhatsApp URL without description when not provided', () => {
      const urls = getSocialShareUrls(testUrl, testTitle);
      expect(urls.whatsapp).toContain(encodeURIComponent(testTitle));
    });

    it('should generate LinkedIn share URL', () => {
      const urls = getSocialShareUrls(testUrl, testTitle);
      expect(urls.linkedin).toContain('https://www.linkedin.com/sharing/share-offsite/');
      // UTM params are URL-encoded within the share URL
      expect(urls.linkedin).toContain(encodeURIComponent('utm_source=linkedin'));
      expect(urls.linkedin).toContain(encodeURIComponent('utm_medium=social'));
    });

    it('should generate email mailto link with subject and body', () => {
      const urls = getSocialShareUrls(testUrl, testTitle, testDescription);
      expect(urls.email).toContain('mailto:');
      expect(urls.email).toContain('subject=' + encodeURIComponent(testTitle));
      expect(urls.email).toContain(encodeURIComponent(testDescription));
      // UTM params are URL-encoded within the email body
      expect(urls.email).toContain('utm_source');
      expect(urls.email).toContain('utm_medium');
    });

    it('should strip # from hashtags', () => {
      const urls = getSocialShareUrls(testUrl, testTitle, undefined, ['#pickleball', '#fun']);
      expect(urls.twitter).toContain('hashtags=pickleball,fun');
      expect(urls.twitter).not.toContain('%23'); // encoded #
    });

    it('should return all required platforms', () => {
      const urls = getSocialShareUrls(testUrl, testTitle);
      expect(urls).toHaveProperty('facebook');
      expect(urls).toHaveProperty('twitter');
      expect(urls).toHaveProperty('whatsapp');
      expect(urls).toHaveProperty('linkedin');
      expect(urls).toHaveProperty('email');
    });
  });

  describe('trackShare', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let fetchSpy: ReturnType<typeof vi.spyOn>;
    let originalEnv: string | undefined;
    let originalGtag: typeof window.gtag;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response());
      originalEnv = process.env.NODE_ENV;
      originalGtag = window.gtag;
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.env.NODE_ENV = originalEnv;
      window.gtag = originalGtag;
      delete process.env.NEXT_PUBLIC_ANALYTICS_URL;
    });

    it('should log to console in development mode', async () => {
      process.env.NODE_ENV = 'development';
      await trackShare('facebook', 'https://example.com');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Share Analytics]',
        expect.objectContaining({
          platform: 'facebook',
          url: 'https://example.com',
        })
      );
    });

    it('should include metadata in console log', async () => {
      process.env.NODE_ENV = 'development';
      await trackShare('twitter', 'https://example.com', {
        eventType: 'tournament',
        eventId: '123',
        eventName: 'Test Tournament',
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Share Analytics]',
        expect.objectContaining({
          platform: 'twitter',
          url: 'https://example.com',
          metadata: {
            eventType: 'tournament',
            eventId: '123',
            eventName: 'Test Tournament',
          },
        })
      );
    });

    it('should call analytics endpoint when configured', async () => {
      process.env.NEXT_PUBLIC_ANALYTICS_URL = 'https://analytics.example.com';
      await trackShare('linkedin', 'https://example.com', {
        eventType: 'league',
        eventId: '456',
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://analytics.example.com/events/share',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        })
      );
    });

    it('should include timestamp in analytics payload', async () => {
      process.env.NEXT_PUBLIC_ANALYTICS_URL = 'https://analytics.example.com';
      await trackShare('whatsapp', 'https://example.com');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('timestamp'),
        })
      );
    });

    it('should handle analytics endpoint failure silently', async () => {
      process.env.NEXT_PUBLIC_ANALYTICS_URL = 'https://analytics.example.com';
      fetchSpy.mockRejectedValue(new Error('Network error'));
      await expect(trackShare('email', 'https://example.com')).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Share Analytics] Failed to track:',
        expect.any(Error)
      );
    });

    it('should call gtag when available', async () => {
      const gtagMock = vi.fn();
      window.gtag = gtagMock;
      await trackShare('copy', 'https://example.com', {
        eventType: 'tournament',
        eventId: '789',
      });
      expect(gtagMock).toHaveBeenCalledWith('event', 'share', {
        method: 'copy',
        content_type: 'tournament',
        item_id: '789',
        content_id: 'https://example.com',
      });
    });

    it('should use "page" as default content_type when eventType not provided', async () => {
      const gtagMock = vi.fn();
      window.gtag = gtagMock;
      await trackShare('native', 'https://example.com');
      expect(gtagMock).toHaveBeenCalledWith('event', 'share', expect.objectContaining({
        content_type: 'page',
      }));
    });

    it('should handle all platform types', async () => {
      const platforms: Array<'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'email' | 'copy' | 'native'> = [
        'facebook', 'twitter', 'whatsapp', 'linkedin', 'email', 'copy', 'native'
      ];
      for (const platform of platforms) {
        await expect(trackShare(platform, 'https://example.com')).resolves.not.toThrow();
      }
    });
  });

  describe('canUseNativeShare', () => {
    let originalNavigator: Navigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should return true when navigator.share and navigator.canShare are available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          share: vi.fn(),
          canShare: vi.fn(),
        },
        writable: true,
      });
      expect(canUseNativeShare()).toBe(true);
    });

    it('should return false when navigator.share is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          canShare: vi.fn(),
        },
        writable: true,
      });
      expect(canUseNativeShare()).toBe(false);
    });

    it('should return false when navigator.canShare is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          share: vi.fn(),
        },
        writable: true,
      });
      expect(canUseNativeShare()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
      });
      expect(canUseNativeShare()).toBe(false);
    });
  });

  describe('nativeShare', () => {
    let originalNavigator: Navigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should return false when native share is not available', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      const result = await nativeShare('Title', 'Text', 'https://example.com');
      expect(result).toBe(false);
    });

    it('should return true when share succeeds', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      const canShareMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(global, 'navigator', {
        value: {
          share: shareMock,
          canShare: canShareMock,
        },
        writable: true,
      });
      const result = await nativeShare('Title', 'Text', 'https://example.com');
      expect(result).toBe(true);
      expect(shareMock).toHaveBeenCalledWith({
        title: 'Title',
        text: 'Text',
        url: 'https://example.com',
      });
    });

    it('should return false when canShare returns false', async () => {
      const shareMock = vi.fn();
      const canShareMock = vi.fn().mockReturnValue(false);
      Object.defineProperty(global, 'navigator', {
        value: {
          share: shareMock,
          canShare: canShareMock,
        },
        writable: true,
      });
      const result = await nativeShare('Title', 'Text', 'https://example.com');
      expect(result).toBe(false);
      expect(shareMock).not.toHaveBeenCalled();
    });

    it('should return false when user cancels share (AbortError)', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const shareMock = vi.fn().mockRejectedValue(abortError);
      const canShareMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(global, 'navigator', {
        value: {
          share: shareMock,
          canShare: canShareMock,
        },
        writable: true,
      });
      const result = await nativeShare('Title', 'Text', 'https://example.com');
      expect(result).toBe(false);
    });

    it('should return false and log error when share fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const shareMock = vi.fn().mockRejectedValue(new Error('Share failed'));
      const canShareMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(global, 'navigator', {
        value: {
          share: shareMock,
          canShare: canShareMock,
        },
        writable: true,
      });
      const result = await nativeShare('Title', 'Text', 'https://example.com');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('copyToClipboard', () => {
    let writeTextMock: ReturnType<typeof vi.fn>;
    let originalNavigator: Navigator;

    beforeEach(() => {
      originalNavigator = global.navigator;
      writeTextMock = vi.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });

    it('should return true when clipboard.writeText succeeds', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: writeTextMock,
          },
        },
        writable: true,
      });
      const result = await copyToClipboard('test text');
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('test text');
    });

    it('should return false when clipboard API fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeTextMock.mockRejectedValue(new Error('Clipboard error'));
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: writeTextMock,
          },
        },
        writable: true,
      });
      const result = await copyToClipboard('test text');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should use fallback when clipboard API is not available', async () => {
      const execCommandMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      document.execCommand = execCommandMock;
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const result = await copyToClipboard('fallback text');

      expect(result).toBe(true);
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('getQrCodeUrl', () => {
    it('should generate Google Charts QR code URL', () => {
      const result = getQrCodeUrl('https://example.com');
      expect(result).toContain('https://chart.googleapis.com/chart');
      expect(result).toContain('cht=qr');
      expect(result).toContain(encodeURIComponent('https://example.com'));
    });

    it('should use default size of 200', () => {
      const result = getQrCodeUrl('https://example.com');
      expect(result).toContain('chs=200x200');
    });

    it('should accept custom size', () => {
      const result = getQrCodeUrl('https://example.com', 300);
      expect(result).toContain('chs=300x300');
    });

    it('should include UTF-8 encoding', () => {
      const result = getQrCodeUrl('https://example.com');
      expect(result).toContain('choe=UTF-8');
    });
  });

  describe('DEFAULT_HASHTAGS', () => {
    it('should contain pickleball hashtag', () => {
      expect(DEFAULT_HASHTAGS).toContain('pickleball');
    });

    it('should contain PaddleUp hashtag', () => {
      expect(DEFAULT_HASHTAGS).toContain('PaddleUp');
    });

    it('should be an array with at least 2 items', () => {
      expect(Array.isArray(DEFAULT_HASHTAGS)).toBe(true);
      expect(DEFAULT_HASHTAGS.length).toBeGreaterThanOrEqual(2);
    });
  });
});
