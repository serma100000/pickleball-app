'use client';

import {
  TrendingUp,
  ChevronRight,
  Link as LinkIcon,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { UserButton, useUser } from '@clerk/nextjs';

// Dynamic user avatar component
function ProfileAvatar() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'w-20 h-20',
        },
      }}
    />
  );
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();

  // Get display name from Clerk user with better fallbacks
  const displayName =
    isLoaded && user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        user.username ||
        // Use email username as fallback (part before @)
        user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
        'Player'
      : 'Loading...';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-brand-500 to-brand-600" />

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
              <ProfileAvatar />
            </div>
            <div className="flex-1 md:pb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {displayName}
              </h1>
              {isLoaded && user?.primaryEmailAddress && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  {user.primaryEmailAddress.emailAddress}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats - Placeholder for real data */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                --
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Skill Rating
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                0
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Games
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                --
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Win Rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                0
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Clubs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DUPR Account */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            DUPR Account
          </h2>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Link your DUPR account to import your official rating and enable
            match reporting. DUPR accounts are linked securely via SSO.
          </p>

          <a
            href="/profile/dupr-settings"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Manage DUPR Connection
            <ExternalLink className="w-4 h-4" />
          </a>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have a DUPR account?{' '}
            <a
              href="https://mydupr.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Create one here
            </a>
          </p>
        </div>
      </div>

      {/* Stats Section - Empty State */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-500" />
          Performance Stats
        </h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            No games played yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Start playing to track your stats!
          </p>
        </div>
      </div>

      {/* Settings Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
        <SettingsLink
          href="/profile/settings"
          title="Account Settings"
          description="Manage your account and preferences"
          icon={<Settings className="w-5 h-5" />}
        />
        <SettingsLink
          href="/profile/dupr-settings"
          title="DUPR Settings"
          description="Manage your DUPR account connection and sync preferences"
          icon={<LinkIcon className="w-5 h-5" />}
        />
        <SettingsLink
          href="/profile/notifications"
          title="Notifications"
          description="Configure your notification preferences"
        />
        <SettingsLink
          href="/profile/privacy"
          title="Privacy"
          description="Control your data and visibility"
        />
      </div>
    </div>
  );
}

function SettingsLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="text-gray-400 dark:text-gray-500">{icon}</div>
        )}
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
    </a>
  );
}
