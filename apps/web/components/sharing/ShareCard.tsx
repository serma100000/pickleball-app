'use client';

import { useState, useEffect } from 'react';
import { Share2, QrCode, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { ShareButtons, CopyLinkButton } from './ShareButtons';
import { QRCodeGenerator } from './QRCodeGenerator';
import { cn } from '@/lib/utils';

export interface ShareCardProps {
  /** URL to share */
  url?: string;
  /** Title for the share */
  title: string;
  /** Description for the share */
  description?: string;
  /** Event type for analytics */
  eventType?: 'tournament' | 'league';
  /** Event ID for analytics */
  eventId?: string;
  /** Additional CSS classes */
  className?: string;
  /** Card title */
  cardTitle?: string;
  /** Show QR code by default */
  defaultShowQR?: boolean;
  /** Collapsible QR section */
  collapsibleQR?: boolean;
  /** Compact mode */
  compact?: boolean;
}

export function ShareCard({
  url,
  title,
  description,
  eventType,
  eventId,
  className,
  cardTitle = 'Share this event',
  defaultShowQR = true,
  collapsibleQR = false,
  compact = false,
}: ShareCardProps) {
  const [showQR, setShowQR] = useState(defaultShowQR);
  const [currentUrl, setCurrentUrl] = useState(url || '');

  // Update URL on client side
  useEffect(() => {
    if (!url && typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    } else if (url) {
      setCurrentUrl(url);
    }
  }, [url]);

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">{cardTitle}</h3>
        </div>
        {!compact && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Help spread the word about this event
          </p>
        )}
      </div>

      {/* Share Buttons */}
      <div className="p-4 sm:p-6">
        <ShareButtons
          url={currentUrl}
          title={title}
          description={description}
          eventType={eventType}
          eventId={eventId}
          variant="default"
        />

        {/* Copy Link Section */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {currentUrl}
              </span>
            </div>
          </div>
          <CopyLinkButton url={currentUrl} />
        </div>
      </div>

      {/* QR Code Section */}
      {collapsibleQR ? (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full px-4 sm:px-6 py-3 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            aria-expanded={showQR}
            aria-controls="qr-section"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </span>
            {showQR ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showQR && (
            <div id="qr-section" className="p-4 sm:p-6 pt-0">
              <QRCodeGenerator
                url={currentUrl}
                title={title}
                size={compact ? 150 : 180}
                variant="default"
              />
            </div>
          )}
        </div>
      ) : showQR ? (
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h4 className="font-medium text-gray-900 dark:text-white">QR Code</h4>
          </div>
          <QRCodeGenerator
            url={currentUrl}
            title={title}
            size={compact ? 150 : 180}
            variant="default"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
            Scan to view event details
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default ShareCard;
