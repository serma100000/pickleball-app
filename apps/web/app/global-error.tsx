'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="p-4 sm:p-6">
            <a href="/" className="inline-flex items-center gap-2">
              <svg
                width={40}
                height={40}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="paddleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0891B2" />
                    <stop offset="100%" stopColor="#0E7490" />
                  </linearGradient>
                  <linearGradient id="ballGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EA580C" />
                  </linearGradient>
                </defs>
                <rect x="10" y="6" width="20" height="26" rx="8" fill="url(#paddleGrad)" />
                <rect x="17" y="30" width="6" height="12" rx="2" fill="url(#paddleGrad)" />
                <circle cx="36" cy="12" r="8" fill="url(#ballGrad)" />
              </svg>
              <span className="font-extrabold text-xl">
                <span className="text-cyan-600">Paddle</span>
                <span className="text-orange-500">Up</span>
              </span>
            </a>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
            <div className="w-full max-w-md text-center">
              {/* Error Illustration */}
              <div className="mb-8">
                <svg
                  className="mx-auto w-48 h-48 text-red-500"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="100" cy="100" r="60" fill="currentColor" opacity="0.1" />
                  <circle cx="100" cy="100" r="40" fill="currentColor" opacity="0.15" />
                  <text x="100" y="115" textAnchor="middle" fill="currentColor" opacity="0.4" fontSize="50" fontWeight="bold">!</text>
                </svg>
              </div>

              {/* Error Message */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Critical Error
              </h1>
              <p className="text-gray-600 mb-8">
                Something went seriously wrong. We&apos;re working on it. Please try refreshing the page.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center h-11 px-4 py-2.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors"
                >
                  Try Again
                </button>
                <a
                  href="/"
                  className="inline-flex items-center justify-center h-11 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium hover:bg-gray-50 transition-colors"
                >
                  Go Home
                </a>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="text-center py-4 sm:py-6 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} PaddleUp. All rights reserved.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
