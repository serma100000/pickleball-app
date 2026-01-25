'use client';

import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Clock,
  Trophy,
  UserPlus,
  UserCheck,
  Users,
  Calendar,
  Bell,
  XCircle,
  Award,
  Megaphone,
  Info,
} from 'lucide-react';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { Notification } from '@/hooks/use-notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClose?: () => void;
}

// Icons for each notification type
const notificationIcons: Record<string, React.ElementType> = {
  game_invite: Gamepad2,
  game_reminder: Clock,
  game_cancelled: XCircle,
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  club_invite: Users,
  club_announcement: Megaphone,
  tournament_registration: Trophy,
  tournament_reminder: Calendar,
  tournament_result: Trophy,
  league_update: Award,
  achievement: Award,
  system: Info,
};

// Colors for each notification type
const notificationColors: Record<string, string> = {
  game_invite: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  game_reminder: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  game_cancelled: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  friend_request: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  friend_accepted: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  club_invite: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
  club_announcement: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
  tournament_registration: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  tournament_reminder: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  tournament_result: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  league_update: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  achievement: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  system: 'text-gray-500 bg-gray-50 dark:bg-gray-700',
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = notificationIcons[notification.type] || Bell;
  const iconColorClass = notificationColors[notification.type] || 'text-gray-500 bg-gray-50 dark:bg-gray-700';

  // Extract actionUrl from data if present
  const actionUrl = notification.data?.actionUrl as string | undefined;

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    if (actionUrl) {
      onClose?.();
      router.push(actionUrl);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-700/50',
        'focus-visible:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700/50',
        !notification.isRead && 'bg-blue-50/50 dark:bg-blue-900/10'
      )}
      aria-label={`${notification.title}. ${notification.message}. ${formatRelativeTime(notification.createdAt)}${!notification.isRead ? '. Unread' : ''}`}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          iconColorClass
        )}
        aria-hidden="true"
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium text-gray-900 dark:text-white truncate',
              !notification.isRead && 'font-semibold'
            )}
          >
            {notification.title}
          </p>
          {/* Unread indicator */}
          {!notification.isRead && (
            <span
              className="flex-shrink-0 w-2 h-2 mt-1.5 bg-blue-500 rounded-full"
              aria-hidden="true"
            />
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}
