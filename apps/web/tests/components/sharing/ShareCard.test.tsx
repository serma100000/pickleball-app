/**
 * Tests for ShareCard component
 * @file apps/web/tests/components/sharing/ShareCard.test.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareCard } from '@/components/sharing/ShareCard';

// Mock child components
vi.mock('@/components/sharing/ShareButtons', () => ({
  ShareButtons: ({ url, title, description, eventType, eventId, variant }: {
    url: string;
    title: string;
    description?: string;
    eventType?: string;
    eventId?: string;
    variant?: string;
  }) => (
    <div
      data-testid="share-buttons"
      data-url={url}
      data-title={title}
      data-description={description}
      data-event-type={eventType}
      data-event-id={eventId}
      data-variant={variant}
    >
      ShareButtons Mock
    </div>
  ),
  CopyLinkButton: ({ url, className }: { url: string; className?: string }) => (
    <button
      data-testid="copy-link-button"
      data-url={url}
      className={className}
    >
      Copy Link
    </button>
  ),
}));

vi.mock('@/components/sharing/QRCodeGenerator', () => ({
  QRCodeGenerator: ({ url, title, size, variant }: {
    url: string;
    title: string;
    size?: number;
    variant?: string;
  }) => (
    <div
      data-testid="qr-code-generator"
      data-url={url}
      data-title={title}
      data-size={size}
      data-variant={variant}
    >
      QRCodeGenerator Mock
    </div>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | boolean)[]) =>
    classes.filter(Boolean).join(' '),
}));

describe('ShareCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: 'https://paddleup.com/default-page' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render with default card title', () => {
      render(<ShareCard title="Test Event" />);
      expect(screen.getByText('Share this event')).toBeInTheDocument();
    });

    it('should render with custom card title', () => {
      render(
        <ShareCard
          title="Test Event"
          cardTitle="Share Tournament"
        />
      );
      expect(screen.getByText('Share Tournament')).toBeInTheDocument();
    });

    it('should render helper text when not compact', () => {
      render(<ShareCard title="Test Event" />);
      expect(screen.getByText('Help spread the word about this event')).toBeInTheDocument();
    });

    it('should not render helper text when compact', () => {
      render(<ShareCard title="Test Event" compact />);
      expect(screen.queryByText('Help spread the word about this event')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ShareCard title="Test Event" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('ShareButtons integration', () => {
    it('should render ShareButtons with correct props', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          description="Event description"
          eventType="tournament"
          eventId="123"
        />
      );

      await waitFor(() => {
        const shareButtons = screen.getByTestId('share-buttons');
        expect(shareButtons).toHaveAttribute('data-url', 'https://paddleup.com/event/123');
        expect(shareButtons).toHaveAttribute('data-title', 'Test Event');
        expect(shareButtons).toHaveAttribute('data-description', 'Event description');
        expect(shareButtons).toHaveAttribute('data-event-type', 'tournament');
        expect(shareButtons).toHaveAttribute('data-event-id', '123');
        expect(shareButtons).toHaveAttribute('data-variant', 'default');
      });
    });

    it('should use window.location.href when url not provided', async () => {
      render(<ShareCard title="Test Event" />);

      await waitFor(() => {
        const shareButtons = screen.getByTestId('share-buttons');
        expect(shareButtons).toHaveAttribute('data-url', 'https://paddleup.com/default-page');
      });
    });
  });

  describe('CopyLinkButton integration', () => {
    it('should render CopyLinkButton with current URL', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await waitFor(() => {
        const copyButton = screen.getByTestId('copy-link-button');
        expect(copyButton).toHaveAttribute('data-url', 'https://paddleup.com/event/123');
      });
    });

    it('should display URL in the link section', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('https://paddleup.com/event/123')).toBeInTheDocument();
      });
    });
  });

  describe('QRCodeGenerator integration', () => {
    it('should render QRCodeGenerator by default', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('qr-code-generator')).toBeInTheDocument();
      });
    });

    it('should pass correct props to QRCodeGenerator', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await waitFor(() => {
        const qrCode = screen.getByTestId('qr-code-generator');
        expect(qrCode).toHaveAttribute('data-url', 'https://paddleup.com/event/123');
        expect(qrCode).toHaveAttribute('data-title', 'Test Event');
        expect(qrCode).toHaveAttribute('data-variant', 'default');
      });
    });

    it('should use size 180 by default', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await waitFor(() => {
        const qrCode = screen.getByTestId('qr-code-generator');
        expect(qrCode).toHaveAttribute('data-size', '180');
      });
    });

    it('should use size 150 when compact', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          compact
        />
      );

      await waitFor(() => {
        const qrCode = screen.getByTestId('qr-code-generator');
        expect(qrCode).toHaveAttribute('data-size', '150');
      });
    });

    it('should not render QRCodeGenerator when defaultShowQR is false', () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          defaultShowQR={false}
        />
      );

      expect(screen.queryByTestId('qr-code-generator')).not.toBeInTheDocument();
    });

    it('should render QR Code section title when not collapsible', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('QR Code')).toBeInTheDocument();
        expect(screen.getByText('Scan to view event details')).toBeInTheDocument();
      });
    });
  });

  describe('collapsible QR section', () => {
    it('should render collapsible QR section when collapsibleQR is true', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          collapsibleQR
        />
      );

      await waitFor(() => {
        const toggleButton = screen.getByRole('button', { expanded: true });
        expect(toggleButton).toHaveTextContent('QR Code');
      });
    });

    it('should toggle QR code visibility when collapse button clicked', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          collapsibleQR
          defaultShowQR
        />
      );

      // Initially visible
      await waitFor(() => {
        expect(screen.getByTestId('qr-code-generator')).toBeInTheDocument();
      });

      // Click to collapse
      const toggleButton = screen.getByRole('button', { expanded: true });
      await userEvent.click(toggleButton);

      // Should be hidden
      expect(screen.queryByTestId('qr-code-generator')).not.toBeInTheDocument();

      // Click to expand
      await userEvent.click(screen.getByRole('button', { expanded: false }));

      // Should be visible again
      await waitFor(() => {
        expect(screen.getByTestId('qr-code-generator')).toBeInTheDocument();
      });
    });

    it('should start collapsed when collapsibleQR is true and defaultShowQR is false', () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          collapsibleQR
          defaultShowQR={false}
        />
      );

      expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
      expect(screen.queryByTestId('qr-code-generator')).not.toBeInTheDocument();
    });

    it('should have correct aria attributes on collapse button', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          collapsibleQR
        />
      );

      const toggleButton = screen.getByRole('button', { expanded: true });
      expect(toggleButton).toHaveAttribute('aria-controls', 'qr-section');
    });
  });

  describe('event types', () => {
    it('should pass tournament eventType to ShareButtons', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          eventType="tournament"
        />
      );

      await waitFor(() => {
        const shareButtons = screen.getByTestId('share-buttons');
        expect(shareButtons).toHaveAttribute('data-event-type', 'tournament');
      });
    });

    it('should pass league eventType to ShareButtons', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          eventType="league"
        />
      );

      await waitFor(() => {
        const shareButtons = screen.getByTestId('share-buttons');
        expect(shareButtons).toHaveAttribute('data-event-type', 'league');
      });
    });
  });

  describe('URL handling', () => {
    it('should update URL when prop changes', async () => {
      const { rerender } = render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('share-buttons')).toHaveAttribute(
          'data-url',
          'https://paddleup.com/event/123'
        );
      });

      rerender(
        <ShareCard
          url="https://paddleup.com/event/456"
          title="Test Event"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('share-buttons')).toHaveAttribute(
          'data-url',
          'https://paddleup.com/event/456'
        );
      });
    });

    it('should handle empty url prop gracefully', async () => {
      render(
        <ShareCard
          url=""
          title="Test Event"
        />
      );

      // Should fall back to window.location.href
      await waitFor(() => {
        const shareButtons = screen.getByTestId('share-buttons');
        expect(shareButtons).toHaveAttribute('data-url', 'https://paddleup.com/default-page');
      });
    });
  });

  describe('styling', () => {
    it('should have proper card styling', () => {
      const { container } = render(
        <ShareCard title="Test Event" />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-white');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('border');
    });

    it('should have proper header styling', () => {
      render(<ShareCard title="Test Event" />);

      const header = screen.getByText('Share this event').closest('div');
      expect(header?.parentElement).toHaveClass('border-b');
    });
  });

  describe('accessibility', () => {
    it('should have accessible collapse button', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          collapsibleQR
        />
      );

      const button = screen.getByRole('button', { expanded: true });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'qr-section');
    });

    it('should update aria-expanded when toggled', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Test Event"
          collapsibleQR
        />
      );

      const button = screen.getByRole('button', { expanded: true });
      expect(button).toHaveAttribute('aria-expanded', 'true');

      await userEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have proper heading structure', () => {
      render(<ShareCard title="Test Event" />);

      // Card title should be present
      const title = screen.getByText('Share this event');
      expect(title.tagName).toBe('H3');
    });
  });

  describe('responsive behavior', () => {
    it('should have responsive padding classes', () => {
      const { container } = render(
        <ShareCard title="Test Event" />
      );

      // Check for responsive padding classes in header and content
      const sections = container.querySelectorAll('.p-4, .sm\\:p-6');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('integration', () => {
    it('should render all components together correctly', async () => {
      render(
        <ShareCard
          url="https://paddleup.com/event/123"
          title="Summer Pickleball Tournament"
          description="Join us for an exciting tournament!"
          eventType="tournament"
          eventId="tour-123"
          cardTitle="Share this Tournament"
        />
      );

      // Header
      expect(screen.getByText('Share this Tournament')).toBeInTheDocument();
      expect(screen.getByText('Help spread the word about this event')).toBeInTheDocument();

      // ShareButtons
      await waitFor(() => {
        const shareButtons = screen.getByTestId('share-buttons');
        expect(shareButtons).toHaveAttribute('data-title', 'Summer Pickleball Tournament');
      });

      // Copy link section
      expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
      expect(screen.getByText('https://paddleup.com/event/123')).toBeInTheDocument();

      // QR Code section
      expect(screen.getByText('QR Code')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code-generator')).toBeInTheDocument();
    });
  });
});
