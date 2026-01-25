'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Trophy,
  Calendar,
  User,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/logo';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationDropdown } from '@/components/notifications';
import { InstallPrompt } from '@/components/pwa';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Games', href: '/games', icon: Trophy },
  { name: 'Leagues', href: '/leagues', icon: Calendar },
  { name: 'Tournaments', href: '/tournaments', icon: Trophy },
  { name: 'Profile', href: '/profile', icon: User },
];

const mobileNavigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Log', href: '/games/new', icon: Plus, highlight: true },
  { name: 'Games', href: '/games', icon: Trophy },
  { name: 'Leagues', href: '/leagues', icon: Calendar },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading: isLoadingNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Logo */}
          <div className="flex h-16 flex-shrink-0 items-center px-6 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              <Logo size="sm" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Action */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/games/new"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              Log Game
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            <Logo size="sm" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Search games, leagues, players..."
                className="w-full pl-10 pr-4 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex-1 lg:flex-none" />

          {/* Right side */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              isOpen={isNotificationOpen}
              onToggle={() => setIsNotificationOpen(!isNotificationOpen)}
              onClose={() => setIsNotificationOpen(false)}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              isLoading={isLoadingNotifications}
            />
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
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>

        {/* PWA Install Prompt */}
        <InstallPrompt />

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-bottom">
          <div className="flex items-center justify-around h-16">
            {mobileNavigation.map((item) => {
              const isActive = pathname === item.href;
              if (item.highlight) {
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center justify-center w-14 h-14 -mt-5 bg-brand-600 rounded-full shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    aria-label={item.name}
                  >
                    <item.icon className="w-6 h-6 text-white" aria-hidden="true" />
                  </Link>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[11px] leading-tight">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
