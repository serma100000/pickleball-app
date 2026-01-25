'use client';

import { BellOff, Bell, Settings } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/ui/EmptyState';

interface NoNotificationsProps {
  /** Show compact version for dropdown use */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export function NoNotifications({ compact = false, className }: NoNotificationsProps) {
  return (
    <EmptyState
      icon={BellOff}
      iconVariant="default"
      title="No notifications yet"
      description="We'll let you know when something happens - game invites, tournament updates, and more."
      primaryActionLabel="Notification Settings"
      primaryActionHref="/profile/notifications"
      compact={compact}
      className={className}
    />
  );
}

/** Inline variant for use within the notification dropdown */
export function NoNotificationsInline() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
        <BellOff className="w-6 h-6 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        No notifications yet
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        We&apos;ll let you know when something happens
      </p>
    </div>
  );
}

/** Variant for all-read state */
export function AllNotificationsRead() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
        <Bell className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        All caught up!
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        You&apos;ve read all your notifications
      </p>
    </div>
  );
}

/** Full-page variant for the notifications settings page */
export function NoNotificationsPage() {
  return (
    <EmptyState
      icon={BellOff}
      iconVariant="default"
      title="No notifications"
      description="You don't have any notifications right now. When you receive game invites, tournament updates, or other alerts, they'll appear here."
      primaryActionLabel="Notification Settings"
      primaryActionHref="/profile/notifications"
    >
      {/* Settings hint */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-pickle-100 dark:bg-pickle-900/30 flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-pickle-600 dark:text-pickle-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Customize your notifications
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose what you want to be notified about
            </p>
          </div>
          <Link
            href="/profile/notifications"
            className="ml-auto text-sm font-medium text-pickle-600 dark:text-pickle-400 hover:underline"
          >
            Settings
          </Link>
        </div>
      </div>
    </EmptyState>
  );
}
