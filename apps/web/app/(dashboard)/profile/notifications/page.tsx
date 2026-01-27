'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Mail, Smartphone, Trophy, Users, Calendar, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  email: boolean;
  push: boolean;
  icon: React.ReactNode;
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'game-invites',
      title: 'Game Invitations',
      description: 'When someone invites you to play a game',
      email: true,
      push: true,
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      id: 'game-results',
      title: 'Game Results',
      description: 'When a game you played is scored',
      email: true,
      push: true,
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      id: 'club-activity',
      title: 'Club Activity',
      description: 'Updates from clubs you belong to',
      email: false,
      push: true,
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'tournament-updates',
      title: 'Tournament Updates',
      description: 'Registration deadlines and bracket updates',
      email: true,
      push: true,
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'league-updates',
      title: 'League Updates',
      description: 'Match schedules and standings changes',
      email: true,
      push: true,
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'friend-requests',
      title: 'Friend Requests',
      description: 'When someone wants to connect with you',
      email: false,
      push: true,
      icon: <Users className="w-5 h-5" />,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleSetting = (id: string, type: 'email' | 'push') => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, [type]: !setting[type] } : setting
      )
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Call API to save notification preferences
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaved(true);
      toast.success({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      toast.error({
        title: 'Could not save preferences',
        description: 'Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Choose how you want to be notified about activity
        </p>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <span className="font-medium text-gray-900 dark:text-white">
            Notification Type
          </span>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4" />
              Email
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Smartphone className="w-4 h-4" />
              Push
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-gray-400 dark:text-gray-500">
                  {setting.icon}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {setting.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {setting.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <button
                  onClick={() => toggleSetting(setting.id, 'email')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    setting.email
                      ? 'bg-brand-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`Toggle email notifications for ${setting.title}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      setting.email ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
                <button
                  onClick={() => toggleSetting(setting.id, 'push')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    setting.push
                      ? 'bg-brand-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`Toggle push notifications for ${setting.title}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      setting.push ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Digest */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Email Digest
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Receive a summary of your activity instead of individual emails
        </p>

        <select
          className="w-full px-4 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          defaultValue="daily"
        >
          <option value="instant">Instant (no digest)</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
          <option value="never">Never (disable email)</option>
        </select>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Settings saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
