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
  Shield,
  Star,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDuprSettings, useDuprSync, useDuprUnlink } from '@/hooks/use-api';
import { DuprSsoModal } from '@/components/dupr/DuprSsoModal';

export default function DuprSettingsPage() {
  const { data: settings, isLoading, refetch } = useDuprSettings();
  const syncMutation = useDuprSync();
  const unlinkMutation = useDuprUnlink();
  const [showSso, setShowSso] = useState(false);

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      toast.success({
        title: 'DUPR data synced',
        description: 'Your ratings have been updated from DUPR.',
      });
    } catch (error) {
      console.error('Failed to sync DUPR data:', error);
      toast.error({
        title: 'Could not sync data',
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your DUPR account?')) return;

    try {
      await unlinkMutation.mutateAsync();
      toast.success({
        title: 'DUPR account unlinked',
        description: 'Your DUPR account has been disconnected.',
      });
    } catch (error) {
      console.error('Failed to unlink DUPR account:', error);
      toast.error({
        title: 'Could not unlink account',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const entitlementBadge = () => {
    if (!settings?.entitlementLevel || settings.entitlementLevel === 'NONE') return null;

    if (settings.entitlementLevel === 'VERIFIED_L1') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
          <Shield className="w-3 h-3" /> Verified
        </span>
      );
    }

    if (settings.entitlementLevel === 'PREMIUM_L1') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
          <Star className="w-3 h-3" /> DUPR+
        </span>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

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
          Manage your DUPR account connection and rating sync
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

        {settings?.linked ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      DUPR Account Linked
                    </p>
                    {entitlementBadge()}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {settings.duprId}
                  </p>
                </div>
              </div>
              <a
                href={`https://mydupr.com/player/${settings.duprId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-medium"
              >
                View Profile
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Ratings */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Singles', value: settings.ratings.singles },
                { label: 'Doubles', value: settings.ratings.doubles },
                { label: 'Mixed', value: settings.ratings.mixedDoubles },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {label}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {value ? parseFloat(value).toFixed(2) : '--'}
                  </p>
                </div>
              ))}
            </div>

            {settings.lastSync && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last synced: {new Date(settings.lastSync).toLocaleString()}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                />
                {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinkMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Unlink Account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Link your DUPR account to import your official rating and enable
              match reporting.
            </p>

            <button
              onClick={() => setShowSso(true)}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Link with DUPR
            </button>

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
        )}
      </div>

      {/* How it Works */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          How DUPR Integration Works
        </h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            <strong>1. Sign in with DUPR:</strong> Click &quot;Link with
            DUPR&quot; and log in to your DUPR account securely.
          </p>
          <p>
            <strong>2. Import your rating:</strong> Your official DUPR rating
            (singles, doubles, mixed) will be synced automatically.
          </p>
          <p>
            <strong>3. Report matches:</strong> Match results can be submitted
            directly to DUPR for official rating updates.
          </p>
          <p>
            <strong>4. Stay current:</strong> Use &quot;Sync Now&quot; to pull
            the latest ratings from DUPR at any time.
          </p>
        </div>
      </div>

      {/* Match Dispute Support */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
          Need Help?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          If you have a dispute about a match result submitted to DUPR, or need
          help with your account, contact our support team.
        </p>
        <a
          href="mailto:support@paddle-up.app"
          className="text-brand-600 hover:text-brand-700 text-sm font-medium"
        >
          support@paddle-up.app
        </a>
      </div>

      {/* SSO Modal */}
      <DuprSsoModal
        open={showSso}
        onOpenChange={setShowSso}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
