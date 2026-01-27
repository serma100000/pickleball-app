'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Link as LinkIcon,
  ExternalLink,
  Check,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function DuprSettingsPage() {
  const [duprId, setDuprId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [error, setError] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  const handleLink = async () => {
    if (!duprId.trim()) {
      setError('Please enter your DUPR ID');
      return;
    }

    setIsLinking(true);
    setError('');

    try {
      // TODO: Call API to link DUPR account
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsLinked(true);
      toast.success({
        title: 'DUPR account linked',
        description: 'Your DUPR account has been connected successfully.',
      });
    } catch (error) {
      console.error('Failed to link DUPR account:', error);
      setError('Failed to link DUPR account. Please try again.');
      toast.error({
        title: 'Could not link account',
        description: 'Please check your DUPR ID and try again.',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your DUPR account?')) return;

    try {
      // TODO: Call API to unlink DUPR account
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsLinked(false);
      setDuprId('');
      toast.success({
        title: 'DUPR account unlinked',
        description: 'Your DUPR account has been disconnected.',
      });
    } catch (error) {
      console.error('Failed to unlink DUPR account:', error);
      setError('Failed to unlink DUPR account.');
      toast.error({
        title: 'Could not unlink account',
        description: 'Please try again.',
      });
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // TODO: Call API to sync DUPR data
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success({
        title: 'DUPR data synced',
        description: 'Your rating and match history have been updated.',
      });
    } catch (error) {
      console.error('Failed to sync DUPR data:', error);
      toast.error({
        title: 'Could not sync data',
        description: 'Please try again later.',
      });
    } finally {
      setIsSyncing(false);
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
          DUPR Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your DUPR account connection and sync preferences
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Connection Status
          </h2>
        </div>

        {isLinked ? (
          <div className="space-y-4">
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

            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleUnlink}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Unlink Account
              </button>
            </div>
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
                    setError('');
                  }}
                  placeholder="Enter your DUPR ID (e.g., 12345678)"
                  className="w-full px-4 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
              </div>
              <button
                onClick={handleLink}
                disabled={isLinking}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isLinking ? (
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

      {/* Sync Preferences */}
      {isLinked && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
            Sync Preferences
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Auto-sync ratings
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically update your rating when it changes on DUPR
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </label>
          </div>
        </div>
      )}

      {/* How it Works */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          How DUPR Integration Works
        </h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong>1. Link your account:</strong> Enter your DUPR ID to connect
            your accounts.
          </p>
          <p>
            <strong>2. Import your rating:</strong> Your official DUPR rating
            will be displayed on your profile.
          </p>
          <p>
            <strong>3. Sync match history:</strong> Your verified DUPR matches
            can be imported into PaddleUp.
          </p>
          <p>
            <strong>4. Stay updated:</strong> Enable auto-sync to keep your
            rating current.
          </p>
        </div>
      </div>
    </div>
  );
}
