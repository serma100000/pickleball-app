import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
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
          {/* 404 Illustration */}
          <div className="mb-8">
            <svg
              className="mx-auto w-48 h-48 text-brand-500 dark:text-brand-400"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Paddle */}
              <rect x="60" y="40" width="40" height="60" rx="15" fill="currentColor" opacity="0.2" />
              <rect x="73" y="95" width="14" height="30" rx="4" fill="currentColor" opacity="0.2" />
              {/* Bouncing ball with motion trail */}
              <circle cx="130" cy="70" r="10" fill="currentColor" opacity="0.1" />
              <circle cx="140" cy="90" r="10" fill="currentColor" opacity="0.15" />
              <circle cx="145" cy="115" r="10" fill="currentColor" opacity="0.2" />
              {/* Main ball - "lost" position */}
              <circle cx="145" cy="145" r="12" fill="currentColor" opacity="0.4" />
              {/* Question mark */}
              <text x="100" y="175" textAnchor="middle" fill="currentColor" opacity="0.3" fontSize="24" fontWeight="bold">?</text>
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            404
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Looks like the ball went out of bounds! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/">
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                Dashboard
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
