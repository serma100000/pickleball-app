'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  TrendingUp,
  Calendar,
  MapPin,
  Users,
  Award,
  Edit2,
  ChevronRight,
} from 'lucide-react';

// Check if Clerk is configured
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Dynamic user avatar component
function ProfileAvatar() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ClerkComponent, setClerkComponent] = useState<any>(null);

  useEffect(() => {
    if (isClerkConfigured) {
      import('@clerk/nextjs').then((clerk) => {
        setClerkComponent(() => clerk.UserButton);
      });
    }
  }, []);

  if (!isClerkConfigured || !ClerkComponent) {
    return (
      <div className="w-20 h-20 rounded-full bg-pickle-500 flex items-center justify-center">
        <span className="text-white text-2xl font-medium">DU</span>
      </div>
    );
  }

  return (
    <ClerkComponent
      appearance={{
        elements: {
          avatarBox: 'w-20 h-20',
        },
      }}
    />
  );
}

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-pickle-500 to-pickle-600" />

        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
              <ProfileAvatar />
            </div>
            <div className="flex-1 md:pb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isClerkConfigured ? 'Your Name' : 'Demo User'}
              </h1>
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-1">
                <MapPin className="w-4 h-4" />
                San Francisco, CA
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          {/* Bio */}
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Passionate pickleball player since 2022. Love playing doubles and always looking
            for new partners to improve with!
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">3.75</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Skill Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">47</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Games</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">68%</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">2</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Clubs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats & Achievements Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Performance Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pickle-500" />
            Performance Stats
          </h2>
          <div className="space-y-4">
            <StatRow label="Singles Record" value="12-5" subvalue="70.6% win rate" />
            <StatRow label="Doubles Record" value="20-10" subvalue="66.7% win rate" />
            <StatRow label="Avg Points/Game" value="9.2" />
            <StatRow label="Longest Win Streak" value="7 games" />
            <StatRow label="Current Streak" value="3W" positive />
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-ball-500" />
            Achievements
          </h2>
          <div className="space-y-3">
            <AchievementBadge
              title="First Win"
              description="Won your first game"
              unlocked
            />
            <AchievementBadge
              title="10 Game Streak"
              description="Win 10 games in a row"
              unlocked={false}
              progress={3}
              total={10}
            />
            <AchievementBadge
              title="Club Champion"
              description="Win a club tournament"
              unlocked
            />
            <AchievementBadge
              title="Social Butterfly"
              description="Play with 20 different partners"
              unlocked={false}
              progress={12}
              total={20}
            />
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-court-500" />
          Recent Activity
        </h2>
        <div className="space-y-4">
          <ActivityItem
            icon={<Trophy className="w-4 h-4" />}
            title="Won a doubles match"
            description="11-7, 11-9 vs John D. & Sarah M."
            time="2 hours ago"
          />
          <ActivityItem
            icon={<Users className="w-4 h-4" />}
            title="Joined Bay Area Pickleball Club"
            description="Welcome to the community!"
            time="1 day ago"
          />
          <ActivityItem
            icon={<Award className="w-4 h-4" />}
            title="Earned achievement"
            description="Club Champion - Won a club tournament"
            time="3 days ago"
          />
          <ActivityItem
            icon={<TrendingUp className="w-4 h-4" />}
            title="Rating increased"
            description="3.70 → 3.75 (+0.05)"
            time="1 week ago"
          />
        </div>
      </div>

      {/* Settings Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
        <SettingsLink
          href="/profile/settings"
          title="Account Settings"
          description="Manage your account and preferences"
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

function StatRow({
  label,
  value,
  subvalue,
  positive,
}: {
  label: string;
  value: string;
  subvalue?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-right">
        <span
          className={`font-semibold ${
            positive
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {value}
        </span>
        {subvalue && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            {subvalue}
          </span>
        )}
      </div>
    </div>
  );
}

function AchievementBadge({
  title,
  description,
  unlocked,
  progress,
  total,
}: {
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${
        unlocked
          ? 'bg-ball-50 dark:bg-ball-900/20'
          : 'bg-gray-50 dark:bg-gray-700/50'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          unlocked
            ? 'bg-ball-500 text-white'
            : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
        }`}
      >
        <Award className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p
          className={`font-medium ${
            unlocked
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {title}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        {!unlocked && progress !== undefined && total !== undefined && (
          <div className="mt-2">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full">
              <div
                className="h-full bg-pickle-500 rounded-full"
                style={{ width: `${(progress / total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {progress}/{total}
            </p>
          </div>
        )}
      </div>
      {unlocked && (
        <div className="text-ball-500">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function ActivityItem({
  icon,
  title,
  description,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <span className="text-sm text-gray-400 dark:text-gray-500">{time}</span>
    </div>
  );
}

function SettingsLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </a>
  );
}
