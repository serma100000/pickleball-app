'use client';

import { useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Check, BellOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isLoading?: boolean;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  isLoading = false,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close dropdown
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle escape key to close dropdown
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
        buttonRef.current?.focus();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, handleClickOutside, handleEscapeKey]);

  // Focus trap within dropdown when open
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const firstFocusable = dropdownRef.current.querySelector<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={onToggle}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          isOpen && 'bg-gray-100 dark:bg-gray-700'
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="notification-dropdown"
      >
        <Bell
          className="w-5 h-5 text-gray-600 dark:text-gray-300"
          aria-hidden="true"
        />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="notification-dropdown"
          role="dialog"
          aria-label="Notifications"
          className={cn(
            'absolute right-0 mt-2 w-80 sm:w-96',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-xl shadow-lg',
            'z-50',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
            'duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors',
                  'text-gray-600 dark:text-gray-400',
                  'hover:text-brand-600 dark:hover:text-brand-400',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
                )}
                aria-label="Mark all notifications as read"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div
            className="max-h-[400px] overflow-y-auto"
            role="list"
            aria-label="Notification list"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div key={notification.id} role="listitem">
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    onClose={onClose}
                  />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                  <BellOff
                    className="w-6 h-6 text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  We&apos;ll let you know when something happens
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/profile/notifications"
                onClick={onClose}
                className={cn(
                  'block w-full px-4 py-3 text-center text-sm font-medium transition-colors',
                  'text-brand-600 dark:text-brand-400',
                  'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                  'focus-visible:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700/50',
                  'rounded-b-xl'
                )}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
