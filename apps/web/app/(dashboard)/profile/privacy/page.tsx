'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, EyeOff, Download, Trash2, AlertTriangle } from 'lucide-react';

export default function PrivacyPage() {
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [showRating, setShowRating] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [showGameHistory, setShowGameHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Call API to save privacy settings
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSaved(true);
    } catch {
      // Handle error
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    // TODO: Call API to export user data
    alert('Your data export has been requested. You will receive an email with a download link.');
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    if (!confirm('This will permanently delete all your data including games, stats, and profile. Continue?')) {
      return;
    }
    // TODO: Call API to delete account
    alert('Account deletion requested. You will receive a confirmation email.');
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
          Privacy Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Control who can see your information
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Profile Visibility
          </h2>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Choose who can view your profile
        </p>

        <div className="space-y-3">
          {[
            { value: 'public', label: 'Public', desc: 'Anyone can view your profile' },
            { value: 'friends', label: 'Friends Only', desc: 'Only people you\'ve played with can see your profile' },
            { value: 'private', label: 'Private', desc: 'Only you can see your profile' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                profileVisibility === option.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {option.value === 'public' ? (
                  <Eye className="w-5 h-5 text-gray-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {option.desc}
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={profileVisibility === option.value}
                onChange={(e) => {
                  setProfileVisibility(e.target.value as typeof profileVisibility);
                  setSaved(false);
                }}
                className="w-5 h-5 text-brand-500 border-gray-300 focus:ring-brand-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Information Visibility */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Information Visibility
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Choose what information is visible on your public profile
        </p>

        <div className="space-y-4">
          {[
            { id: 'rating', label: 'Skill Rating', desc: 'Show your skill rating on your profile', state: showRating, setState: setShowRating },
            { id: 'stats', label: 'Game Statistics', desc: 'Show win rate, games played, etc.', state: showStats, setState: setShowStats },
            { id: 'history', label: 'Game History', desc: 'Allow others to see your recent games', state: showGameHistory, setState: setShowGameHistory },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {item.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.desc}
                </p>
              </div>
              <button
                onClick={() => {
                  item.setState(!item.state);
                  setSaved(false);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  item.state ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Toggle ${item.label}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    item.state ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
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
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Data Management
        </h2>

        <div className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Export Your Data
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Download a copy of all your PaddleUp data
                </p>
              </div>
            </div>
            <button
              onClick={handleExportData}
              className="px-4 py-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors min-h-[44px]"
            >
              Export
            </button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Delete Account
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors min-h-[44px]"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
