'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-brand-50 via-white to-brand-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
        <div className="w-full max-w-md text-center">
          {/* Error Illustration */}
          <div className="mb-8">
            <svg
              className="mx-auto w-48 h-48 text-red-500 dark:text-red-400"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Broken paddle */}
              <rect x="55" y="40" width="40" height="30" rx="10" fill="currentColor" opacity="0.2" transform="rotate(-10 75 55)" />
              <rect x="70" y="65" width="35" height="30" rx="10" fill="currentColor" opacity="0.2" transform="rotate(15 87.5 80)" />
              {/* Crack lines */}
              <path d="M75 60 L80 70 L75 80" stroke="currentColor" strokeWidth="2" opacity="0.4" />
              {/* Ball with X */}
              <circle cx="130" cy="100" r="20" fill="currentColor" opacity="0.2" />
              <path d="M120 90 L140 110" stroke="currentColor" strokeWidth="3" opacity="0.4" />
              <path d="M140 90 L120 110" stroke="currentColor" strokeWidth="3" opacity="0.4" />
              {/* Exclamation */}
              <circle cx="100" cy="150" r="25" fill="currentColor" opacity="0.1" />
              <text x="100" y="158" textAnchor="middle" fill="currentColor" opacity="0.4" fontSize="30" fontWeight="bold">!</text>
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Something Went Wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            We hit an unexpected error. Don&apos;t worry, it&apos;s not your fault. Please try again or return home.
          </p>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
              <p className="text-sm font-mono text-red-700 dark:text-red-300 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs font-mono text-red-500 dark:text-red-400 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset}>
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 sm:py-6 text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} PaddleUp. All rights reserved.</p>
      </footer>
    </div>
  );
}
