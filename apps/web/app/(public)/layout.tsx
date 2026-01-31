'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <Logo size="sm" />
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <ThemeToggle />

              <SignedIn>
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-9 h-9',
                      userButtonPopoverCard: 'dark:bg-gray-800 dark:border-gray-700',
                      userButtonPopoverActionButton: 'dark:text-gray-200 dark:hover:bg-gray-700',
                      userButtonPopoverActionButtonText: 'dark:text-gray-200',
                      userButtonPopoverActionButtonIcon: 'dark:text-gray-400',
                      userButtonPopoverFooter: 'dark:bg-gray-800 dark:border-gray-700',
                    },
                  }}
                  afterSignOutUrl="/"
                />
              </SignedIn>

              <SignedOut>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </SignedOut>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-gray-700 dark:hover:text-gray-300">
                Contact
              </Link>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              &copy; {new Date().getFullYear()} PaddleUp
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
