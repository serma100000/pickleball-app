/**
 * Tests for ShareButtons component
 * @file apps/web/tests/components/sharing/ShareButtons.test.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareButtons, CopyLinkButton } from '@/components/sharing/ShareButtons';

// Mock the sharing utility
vi.mock('@/lib/sharing', () => ({
  getSocialShareUrls: vi.fn((url: string) => ({
    facebook: `https://facebook.com/share?u=${encodeURIComponent(url)}&utm_source=facebook`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&utm_source=twitter`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(url)}&utm_source=whatsapp`,
    linkedin: `https://linkedin.com/share?url=${encodeURIComponent(url)}&utm_source=linkedin`,
    email: `mailto:?body=${encodeURIComponent(url)}&utm_source=email`,
  })),
  trackShare: vi.fn().mockResolvedValue(undefined),
  DEFAULT_HASHTAGS: ['pickleball', 'PaddleUp'],
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: [],
  }),
}));

describe('ShareButtons', () => {
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;
  let originalLocation: Location;
  let clipboardWriteTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    // Save original location
    originalLocation = window.location;

    // Mock window.location with a minimal implementation
    delete (window as { location?: Location }).location;
    window.location = {
      ...originalLocation,
      href: 'https://paddleup.com/test',
    } as Location;

    // Mock clipboard
    clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteTextMock },
      writable: true,
      configurable: true,
    });

    // Mock navigator.share (unavailable by default)
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  describe('rendering', () => {
    it('should render a Share button', () => {
      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    });

    it('should render compact variant with share button', () => {
      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
          variant="compact"
        />
      );
      const button = screen.getByRole('button', { name: /share/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Share');
    });

    it('should apply custom className', () => {
      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
          className="custom-class"
        />
      );
      const button = screen.getByRole('button', { name: /share/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('modal behavior (when native share unavailable)', () => {
    it('should open modal when Share button clicked and native share unavailable', async () => {
      const user = userEvent.setup();
      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      // Modal should appear
      expect(screen.getByText('Share Event')).toBeInTheDocument();
    });

    it('should render all social buttons in modal', async () => {
      const user = userEvent.setup();
      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));

      expect(screen.getByRole('button', { name: /share on facebook/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share on x/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share on whatsapp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share on linkedin/i })).toBeInTheDocument();
      expect(screen.getByText(/send via email/i)).toBeInTheDocument();
    });

    it('should close modal when Close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      expect(screen.getByText('Share Event')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByText('Share Event')).not.toBeInTheDocument();
    });

    it('should close modal when backdrop clicked', async () => {
      const user = userEvent.setup();
      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      expect(screen.getByText('Share Event')).toBeInTheDocument();

      // Click the backdrop (first element with aria-hidden)
      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
      if (backdrop) {
        await user.click(backdrop);
      }
      expect(screen.queryByText('Share Event')).not.toBeInTheDocument();
    });
  });

  describe('social sharing', () => {
    it('should open Facebook share URL in popup', async () => {
      const { trackShare } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      await user.click(screen.getByRole('button', { name: /share on facebook/i }));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com'),
        'share-facebook',
        expect.stringContaining('width=600')
      );
      expect(trackShare).toHaveBeenCalledWith(
        'facebook',
        'https://paddleup.com/event/123',
        expect.any(Object)
      );
    });

    it('should open Twitter share URL in popup', async () => {
      const { trackShare } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      await user.click(screen.getByRole('button', { name: /share on x/i }));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com'),
        'share-twitter',
        expect.stringContaining('width=600')
      );
      expect(trackShare).toHaveBeenCalledWith(
        'twitter',
        'https://paddleup.com/event/123',
        expect.any(Object)
      );
    });

    it('should open WhatsApp share URL in popup', async () => {
      const { trackShare } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      await user.click(screen.getByRole('button', { name: /share on whatsapp/i }));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('wa.me'),
        'share-whatsapp',
        expect.stringContaining('width=600')
      );
      expect(trackShare).toHaveBeenCalledWith(
        'whatsapp',
        'https://paddleup.com/event/123',
        expect.any(Object)
      );
    });

    it('should open LinkedIn share URL in popup', async () => {
      const { trackShare } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      await user.click(screen.getByRole('button', { name: /share on linkedin/i }));

      expect(windowOpenSpy).toHaveBeenCalledWith(
        expect.stringContaining('linkedin.com'),
        'share-linkedin',
        expect.stringContaining('width=600')
      );
      expect(trackShare).toHaveBeenCalledWith(
        'linkedin',
        'https://paddleup.com/event/123',
        expect.any(Object)
      );
    });

    it('should open email client with mailto link', async () => {
      const { trackShare } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      await user.click(screen.getByText(/send via email/i));

      // Email should use window.location.href, not window.open
      expect(window.location.href).toContain('mailto:');
      expect(trackShare).toHaveBeenCalledWith(
        'email',
        'https://paddleup.com/event/123',
        expect.any(Object)
      );
    });

    it('should include UTM parameters in share URLs', async () => {
      const { getSocialShareUrls } = await import('@/lib/sharing');

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      expect(getSocialShareUrls).toHaveBeenCalledWith(
        'https://paddleup.com/event/123',
        'Test Event',
        '',
        ['pickleball', 'PaddleUp']
      );
    });
  });

  describe('copy link functionality', () => {
    it('should call trackShare when copy button clicked', async () => {
      const { toast } = await import('@/hooks/use-toast');
      const { trackShare } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));

      // Find and click the copy button
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Verify the copy was attempted and tracked
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Link copied!',
        }));
      });
      expect(trackShare).toHaveBeenCalledWith(
        'copy',
        'https://paddleup.com/event/123',
        expect.any(Object)
      );
    });

    it('should show Copied state after copying', async () => {
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Should show "Copied!" text
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should display current URL in input field', async () => {
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('https://paddleup.com/event/123');
    });
  });

  describe('native share API', () => {
    it('should use native share when available', async () => {
      const { trackShare } = await import('@/lib/sharing');
      const navigatorShareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: navigatorShareMock,
        writable: true,
        configurable: true,
      });
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
          description="Event description"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));

      expect(navigatorShareMock).toHaveBeenCalledWith({
        title: 'Test Event',
        text: 'Event description',
        url: 'https://paddleup.com/event/123',
      });
      await waitFor(() => {
        expect(trackShare).toHaveBeenCalledWith(
          'native',
          'https://paddleup.com/event/123',
          expect.any(Object)
        );
      });
    });

    it('should handle user cancellation gracefully', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const navigatorShareMock = vi.fn().mockRejectedValue(abortError);
      Object.defineProperty(navigator, 'share', {
        value: navigatorShareMock,
        writable: true,
        configurable: true,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));

      // Should not log error for AbortError
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('analytics tracking', () => {
    it('should include eventType and eventId in tracking', async () => {
      const { trackShare } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <ShareButtons
          url="https://paddleup.com/event/123"
          title="Test Event"
          eventType="tournament"
          eventId="tour-123"
        />
      );

      await user.click(screen.getByRole('button', { name: /share/i }));
      await user.click(screen.getByRole('button', { name: /share on facebook/i }));

      expect(trackShare).toHaveBeenCalledWith(
        'facebook',
        'https://paddleup.com/event/123',
        expect.objectContaining({
          eventType: 'tournament',
          eventId: 'tour-123',
          eventName: 'Test Event',
        })
      );
    });
  });
});

describe('CopyLinkButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with Copy Link text', () => {
    render(<CopyLinkButton url="https://example.com" />);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('should show Copied state after clicking', async () => {
    const user = userEvent.setup();

    render(<CopyLinkButton url="https://example.com" />);

    await user.click(screen.getByRole('button', { name: /copy link/i }));

    // jsdom has a built-in clipboard mock that succeeds
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    render(<CopyLinkButton url="https://example.com" className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should have accessible button with aria-label', () => {
    render(<CopyLinkButton url="https://example.com" />);
    const button = screen.getByRole('button', { name: /copy link/i });
    expect(button).toHaveAttribute('aria-label', 'Copy link');
  });

  it('should change to check icon when copied', async () => {
    const user = userEvent.setup();

    render(<CopyLinkButton url="https://example.com" />);

    // Initially shows "Copy Link"
    expect(screen.getByText('Copy Link')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copy link/i }));

    // After clicking, should show "Copied!"
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
      expect(screen.queryByText('Copy Link')).not.toBeInTheDocument();
    });
  });
});
