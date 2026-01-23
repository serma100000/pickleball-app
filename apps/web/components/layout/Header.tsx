'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Bell, Menu, Search } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useBreakpoint } from '@/hooks/use-media-query';
import { ThemeToggle } from '@/components/theme-toggle';

interface HeaderProps {
  onMenuClick?: () => void;
  showSearch?: boolean;
}

export function Header({ onMenuClick, showSearch = true }: HeaderProps) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { isDesktop } = useBreakpoint();

  // Get page title from pathname
  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'Home';
    const lastSegment = segments[segments.length - 1] ?? 'Home';
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 lg:px-6">
      {/* Mobile menu button */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Page title - mobile only */}
      <h1 className="lg:hidden text-lg font-semibold text-gray-900 dark:text-white">
        {getPageTitle()}
      </h1>

      {/* Search - desktop */}
      {showSearch && isDesktop && (
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="search"
              placeholder="Search courts, players, games..."
              aria-label="Search courts, players, games"
              className="w-full pl-10 pr-4 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1 lg:flex-none" />

      {/* Right side actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search - mobile */}
        {showSearch && !isDesktop && (
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          </button>
        )}

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        {isSignedIn && (
          <button
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
          </button>
        )}

        {/* User menu */}
        {isSignedIn ? (
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9',
              },
            }}
            afterSignOutUrl="/"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
