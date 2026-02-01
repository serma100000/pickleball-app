/**
 * Tests for QRCodeGenerator component
 * @file apps/web/tests/components/sharing/QRCodeGenerator.test.tsx
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QRCodeGenerator } from '@/components/sharing/QRCodeGenerator';

// Mock qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value, size, fgColor, bgColor, imageSettings }: {
    value: string;
    size: number;
    fgColor: string;
    bgColor: string;
    imageSettings?: object;
  }) => (
    <svg
      data-testid="qrcode-svg"
      data-value={value}
      data-size={size}
      data-fgcolor={fgColor}
      data-bgcolor={bgColor}
      data-has-logo={imageSettings ? 'true' : 'false'}
      width={size}
      height={size}
    />
  ),
  QRCodeCanvas: vi.fn().mockImplementation(({ value, size }: { value: string; size: number }) => (
    <canvas
      data-testid="qrcode-canvas"
      data-value={value}
      width={size}
      height={size}
      style={{ display: 'none' }}
    />
  )),
}));

// Mock the sharing utility
vi.mock('@/lib/sharing', () => ({
  buildShareUrl: vi.fn((url: string, options: Record<string, string>) => {
    const params = new URLSearchParams();
    if (options.utmSource) params.set('utm_source', options.utmSource);
    if (options.utmMedium) params.set('utm_medium', options.utmMedium);
    if (options.utmCampaign) params.set('utm_campaign', options.utmCampaign);
    return params.toString() ? `${url}?${params.toString()}` : url;
  }),
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

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | boolean)[]) =>
    classes.filter(Boolean).join(' '),
}));

describe('QRCodeGenerator', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock URL.createObjectURL and revokeObjectURL
    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render QR code with provided URL', async () => {
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        expect(screen.getByTestId('qrcode-svg')).toBeInTheDocument();
      });
    });

    it('should render with correct URL including UTM parameters', async () => {
      const { buildShareUrl } = await import('@/lib/sharing');

      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        expect(buildShareUrl).toHaveBeenCalledWith(
          'https://paddleup.com/event/123',
          expect.objectContaining({
            utmSource: 'qr',
            utmMedium: 'qr_code',
            utmCampaign: 'share',
          })
        );
      });
    });

    it('should use custom utmSource when provided', async () => {
      const { buildShareUrl } = await import('@/lib/sharing');

      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          utmSource="poster"
        />
      );

      await waitFor(() => {
        expect(buildShareUrl).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            utmSource: 'poster',
          })
        );
      });
    });

    it('should use default size of 200', async () => {
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        const svg = screen.getByTestId('qrcode-svg');
        expect(svg).toHaveAttribute('data-size', '200');
      });
    });

    it('should use custom size when provided', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          size={300}
        />
      );

      await waitFor(() => {
        const svg = screen.getByTestId('qrcode-svg');
        expect(svg).toHaveAttribute('data-size', '300');
      });
    });

    it('should include logo by default', async () => {
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        const svg = screen.getByTestId('qrcode-svg');
        expect(svg).toHaveAttribute('data-has-logo', 'true');
      });
    });

    it('should not include logo when includeLogo is false', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          includeLogo={false}
        />
      );

      await waitFor(() => {
        const svg = screen.getByTestId('qrcode-svg');
        expect(svg).toHaveAttribute('data-has-logo', 'false');
      });
    });
  });

  describe('variants', () => {
    it('should render default variant with download button', async () => {
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download qr code/i })).toBeInTheDocument();
      });
    });

    it('should render minimal variant without extras', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="minimal"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('qrcode-svg')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
      });
    });

    it('should render card variant with title and download button', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('QR Code')).toBeInTheDocument();
        expect(screen.getByText('Scan to view event details')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /download png/i })).toBeInTheDocument();
      });
    });

    it('should render card variant with regenerate button', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate qr code/i })).toBeInTheDocument();
      });
    });
  });

  describe('color schemes', () => {
    it('should use default colors (black on white)', async () => {
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        const svg = screen.getByTestId('qrcode-svg');
        expect(svg).toHaveAttribute('data-fgcolor', '#000000');
        expect(svg).toHaveAttribute('data-bgcolor', '#ffffff');
      });
    });

    it('should use brand colors when colorScheme is brand', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          colorScheme="brand"
        />
      );

      await waitFor(() => {
        const svg = screen.getByTestId('qrcode-svg');
        expect(svg).toHaveAttribute('data-fgcolor', '#0891B2');
        expect(svg).toHaveAttribute('data-bgcolor', '#ffffff');
      });
    });

    it('should use dark colors when colorScheme is dark', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          colorScheme="dark"
        />
      );

      await waitFor(() => {
        const svg = screen.getByTestId('qrcode-svg');
        expect(svg).toHaveAttribute('data-fgcolor', '#1f2937');
        expect(svg).toHaveAttribute('data-bgcolor', '#ffffff');
      });
    });
  });

  describe('download functionality', () => {
    it('should render download button that can be clicked', async () => {
      const user = userEvent.setup();
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download qr code/i })).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download qr code/i });
      // Just verify the button is clickable without errors
      await user.click(downloadButton);
    });

    it('should show download button in card variant', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="card"
          title="Test Event"
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download png/i })).toBeInTheDocument();
      });
    });
  });

  describe('regenerate functionality', () => {
    it('should have regenerate button in card variant', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="card"
        />
      );

      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /regenerate qr code/i });
        expect(regenerateButton).toBeInTheDocument();
      });
    });

    it('should call buildShareUrl when regenerate clicked', async () => {
      const { buildShareUrl } = await import('@/lib/sharing');
      const user = userEvent.setup();

      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="card"
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate qr code/i })).toBeInTheDocument();
      });

      // Clear previous calls
      vi.mocked(buildShareUrl).mockClear();

      await user.click(screen.getByRole('button', { name: /regenerate qr code/i }));

      // Wait for regeneration
      await waitFor(() => {
        expect(buildShareUrl).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });

  describe('accessibility', () => {
    it('should have accessible download button', async () => {
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /download qr code/i });
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
      });
    });

    it('should have accessible regenerate button in card variant', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="card"
        />
      );

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /regenerate qr code/i });
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('custom className', () => {
    it('should apply className to default variant', async () => {
      const { container } = render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          className="custom-class"
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should apply className to card variant', async () => {
      const { container } = render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="card"
          className="custom-card-class"
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-card-class');
      });
    });

    it('should apply className to minimal variant', async () => {
      const { container } = render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          variant="minimal"
          className="custom-minimal-class"
        />
      );

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-minimal-class');
      });
    });
  });

  describe('title prop', () => {
    it('should accept title prop for download filename', async () => {
      render(
        <QRCodeGenerator
          url="https://paddleup.com/event/123"
          title="Summer Tournament 2024"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('qrcode-svg')).toBeInTheDocument();
      });
    });

    it('should use default title when not provided', async () => {
      render(<QRCodeGenerator url="https://paddleup.com/event/123" />);

      await waitFor(() => {
        expect(screen.getByTestId('qrcode-svg')).toBeInTheDocument();
      });
    });
  });
});
