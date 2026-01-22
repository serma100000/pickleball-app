'use client';

import { useState } from 'react';
import {
  TrendingUp,
  ChevronRight,
  Link as LinkIcon,
  Check,
  Loader2,
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
  const [duprId, setDuprId] = useState('');
  const [isLinkingDupr, setIsLinkingDupr] = useState(false);
  const [duprLinked, setDuprLinked] = useState(false);
  const [duprError, setDuprError] = useState('');

  // Get display name from Clerk user
  const displayName =
    isLoaded && user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        user.username ||
        'User'
      : 'Loading...';

  const handleLinkDupr = async () => {
    if (!duprId.trim()) {
      setDuprError('Please enter your DUPR ID');
      return;
    }

    setIsLinkingDupr(true);
    setDuprError('');

    try {
      // TODO: Call API to link DUPR account
      // const response = await fetch('/api/user/dupr', {
      //   method: 'POST',
      //   body: JSON.stringify({ duprId: duprId.trim() }),
      // });

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setDuprLinked(true);
    } catch {
      setDuprError('Failed to link DUPR account. Please try again.');
    } finally {
      setIsLinkingDupr(false);
    }
  };

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
          <div className="grid grid-cols-4 gap-4 mt-6">
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

      {/* DUPR Account Linking */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            DUPR Account
          </h2>
        </div>

        {duprLinked ? (
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  DUPR Account Linked
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {duprId}
                </p>
              </div>
            </div>
            <a
              href={`https://www.dupr.com/player/${duprId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              View Profile
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Link your DUPR account to import your official rating and match
              history.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={duprId}
                  onChange={(e) => {
                    setDuprId(e.target.value);
                    setDuprError('');
                  }}
                  placeholder="Enter your DUPR ID (e.g., 12345678)"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                {duprError && (
                  <p className="mt-1 text-sm text-red-500">{duprError}</p>
                )}
              </div>
              <button
                onClick={handleLinkDupr}
                disabled={isLinkingDupr}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLinkingDupr ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  'Link Account'
                )}
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have a DUPR account?{' '}
              <a
                href="https://www.dupr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 font-medium"
              >
                Create one here
              </a>
            </p>
          </div>
        )}
      </div>

      {/* Stats Section - Empty State */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-500" />
          Performance Stats
        </h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-gray-400" />
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
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </a>
  );
}
