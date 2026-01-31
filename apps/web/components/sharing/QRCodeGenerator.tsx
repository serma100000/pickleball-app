'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode, Loader2, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { buildShareUrl } from '@/lib/sharing';
import { cn } from '@/lib/utils';

export interface QRCodeGeneratorProps {
  /** URL to encode in the QR code */
  url: string;
  /** Size of the QR code in pixels */
  size?: number;
  /** Title for the QR code (shown in download filename) */
  title?: string;
  /** Whether to include PaddleUp logo in center */
  includeLogo?: boolean;
  /** UTM source for tracking */
  utmSource?: string;
  /** Additional CSS classes */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'minimal' | 'card';
  /** Color scheme */
  colorScheme?: 'default' | 'brand' | 'dark';
}

// PaddleUp logo SVG data URL for QR code embedding
const PADDLE_UP_LOGO_SVG = `
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="white"/>
    <rect x="10" y="6" width="20" height="26" rx="8" fill="#0891B2"/>
    <rect x="17" y="30" width="6" height="12" rx="2" fill="#0891B2"/>
    <circle cx="36" cy="12" r="8" fill="#F97316"/>
  </svg>
`;

export function QRCodeGenerator({
  url,
  size = 200,
  title = 'PaddleUp Event',
  includeLogo = true,
  utmSource = 'qr',
  className,
  variant = 'default',
  colorScheme = 'default',
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  // Build URL with UTM tracking on client side
  useEffect(() => {
    const baseUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const trackedUrl = buildShareUrl(baseUrl, {
      utmSource,
      utmMedium: 'qr_code',
      utmCampaign: 'share',
    });
    setCurrentUrl(trackedUrl);
  }, [url, utmSource]);

  // Get colors based on scheme
  const getColors = () => {
    switch (colorScheme) {
      case 'brand':
        return { fgColor: '#0891B2', bgColor: '#ffffff' };
      case 'dark':
        return { fgColor: '#1f2937', bgColor: '#ffffff' };
      default:
        return { fgColor: '#000000', bgColor: '#ffffff' };
    }
  };

  const colors = getColors();

  // Download QR code as PNG
  const handleDownload = useCallback(async () => {
    if (!canvasRef.current || !currentUrl) return;

    setIsDownloading(true);

    try {
      // Create a new canvas to draw on
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set canvas size with padding
      const padding = 20;
      const canvasSize = size + padding * 2;
      canvas.width = canvasSize;
      canvas.height = canvasSize;

      // Fill background
      ctx.fillStyle = colors.bgColor;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Draw the QR code from the hidden canvas
      const qrCanvas = canvasRef.current;
      ctx.drawImage(qrCanvas, padding, padding, size, size);

      // Add branding text at bottom
      ctx.fillStyle = colors.fgColor;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to view event', canvasSize / 2, canvasSize - 6);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Could not create image blob');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Clean filename
        const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `paddleup_${cleanTitle}_qr.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloaded(true);
        toast.success({
          title: 'QR code downloaded!',
          description: 'The QR code has been saved to your downloads.',
        });

        setTimeout(() => setDownloaded(false), 3000);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      toast.error({
        title: 'Download failed',
        description: 'Could not download the QR code. Please try again.',
      });
    } finally {
      setIsDownloading(false);
    }
  }, [currentUrl, size, title, colors]);

  // Regenerate URL
  const handleRegenerate = () => {
    setCurrentUrl('');
    setTimeout(() => {
      const baseUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
      const trackedUrl = buildShareUrl(baseUrl, {
        utmSource,
        utmMedium: 'qr_code',
        utmCampaign: 'share',
      });
      setCurrentUrl(trackedUrl);
    }, 100);
  };

  // Don't render until we have a URL
  if (!currentUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          variant === 'card' && 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
          className
        )}
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const logoDataUrl = 'data:image/svg+xml,' + encodeURIComponent(PADDLE_UP_LOGO_SVG.trim());

  const qrCodeContent = (
    <div className="relative inline-block">
      {/* Display QR Code (SVG for better rendering) */}
      <QRCodeSVG
        value={currentUrl}
        size={size}
        level="H" // High error correction for logo overlay
        fgColor={colors.fgColor}
        bgColor={colors.bgColor}
        imageSettings={
          includeLogo
            ? {
                src: logoDataUrl,
                x: undefined,
                y: undefined,
                height: size * 0.2,
                width: size * 0.2,
                excavate: true,
              }
            : undefined
        }
      />

      {/* Hidden Canvas for downloading */}
      <QRCodeCanvas
        ref={canvasRef}
        value={currentUrl}
        size={size}
        level="H"
        fgColor={colors.fgColor}
        bgColor={colors.bgColor}
        style={{ display: 'none' }}
        imageSettings={
          includeLogo
            ? {
                src: logoDataUrl,
                x: undefined,
                y: undefined,
                height: size * 0.2,
                width: size * 0.2,
                excavate: true,
              }
            : undefined
        }
      />
    </div>
  );

  // Minimal variant - just the QR code
  if (variant === 'minimal') {
    return (
      <div className={cn('inline-block', className)}>
        {qrCodeContent}
      </div>
    );
  }

  // Card variant - QR code with download button in a card
  if (variant === 'card') {
    return (
      <div
        className={cn(
          'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">QR Code</h3>
        </div>

        <div className="flex flex-col items-center">
          {qrCodeContent}

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
            Scan to view event details
          </p>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              variant="outline"
              size="sm"
              className={cn(
                downloaded && 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
              )}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : downloaded ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Downloaded
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PNG
                </>
              )}
            </Button>

            <Button
              onClick={handleRegenerate}
              variant="ghost"
              size="sm"
              aria-label="Regenerate QR code"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default variant - QR code with download button
  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {qrCodeContent}

      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        variant="outline"
        size="sm"
        className={cn(
          downloaded && 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
        )}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Downloading...
          </>
        ) : downloaded ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Downloaded
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </>
        )}
      </Button>
    </div>
  );
}

export default QRCodeGenerator;
