'use client';

import { useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useIsMobile } from '@/hooks/use-media-query';

/**
 * PWA Install Prompt Banner
 *
 * Shows a non-intrusive bottom banner when the app is installable.
 * - On Android/Chrome: Shows install button that triggers native prompt
 * - On iOS: Shows instructions for manual installation via Safari
 */
export function InstallPrompt() {
  const {
    canInstall,
    isInstalled,
    isIOS,
    isDismissed,
    isSupported,
    promptInstall,
    dismissPrompt,
  } = usePWAInstall();

  const isMobile = useIsMobile();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't show if:
  // - Already installed
  // - User dismissed the prompt
  // - Not supported browser
  // - Not installable (no beforeinstallprompt) AND not iOS
  const shouldShow =
    !isInstalled &&
    !isDismissed &&
    isSupported &&
    (canInstall || isIOS) &&
    isMobile;

  if (!shouldShow) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    setIsInstalling(true);
    const accepted = await promptInstall();
    setIsInstalling(false);

    if (!accepted) {
      // User declined, don't dismiss - they might change their mind
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
    setShowIOSInstructions(false);
  };

  return (
    <>
      {/* Main Install Banner */}
      <div
        role="region"
        aria-label="Install app prompt"
        className={cn(
          'fixed bottom-20 left-4 right-4 z-50 lg:hidden',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'rounded-xl shadow-lg',
          'animate-in slide-in-from-bottom-4 duration-300'
        )}
      >
        <div className="flex items-start gap-3 p-4">
          {/* App Icon */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-pickle-500 to-pickle-600 flex items-center justify-center"
            aria-hidden="true"
          >
            <Download className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Install Paddle Up
            </h3>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              Add to your home screen for quick access and offline features
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  'bg-pickle-500 text-white hover:bg-pickle-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pickle-500 focus-visible:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                aria-label={isIOS ? 'Show install instructions' : 'Install app'}
              >
                {isInstalling ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Install
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  'text-gray-600 dark:text-gray-400',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
                )}
              >
                Not now
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1.5 rounded-lg transition-colors',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500'
            )}
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowIOSInstructions(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-white dark:bg-gray-800',
              'rounded-t-2xl shadow-xl',
              'animate-in slide-in-from-bottom duration-300',
              'max-h-[80vh] overflow-y-auto'
            )}
          >
            <div className="p-6">
              {/* Handle bar */}
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="ios-install-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Install Paddle Up
                </h2>
                <button
                  onClick={() => setShowIOSInstructions(false)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500'
                  )}
                  aria-label="Close instructions"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Instructions */}
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Tap the Share button
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      Located at the bottom of your Safari browser
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700">
                      <Share className="w-4 h-4 text-blue-500" aria-hidden="true" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Share</span>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Scroll down and tap &quot;Add to Home Screen&quot;
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700">
                      <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Add to Home Screen
                      </span>
                    </div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-pickle-100 dark:bg-pickle-900/30 text-pickle-600 dark:text-pickle-400 flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Tap &quot;Add&quot; to confirm
                    </p>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      Paddle Up will appear on your home screen
                    </p>
                  </div>
                </li>
              </ol>

              {/* Done button */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleDismiss}
                  className={cn(
                    'w-full py-3 text-sm font-medium rounded-lg transition-colors',
                    'bg-pickle-500 text-white hover:bg-pickle-600',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pickle-500 focus-visible:ring-offset-2'
                  )}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
