'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function DeleteDataPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to your backend
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Delete Your Data</h1>

        <p className="text-gray-600 dark:text-gray-300 mb-8">
          You can request deletion of your PaddleUp account and all associated data.
          This action is permanent and cannot be undone.
        </p>

        {submitted ? (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
              Request Received
            </h2>
            <p className="text-green-700 dark:text-green-300">
              We&apos;ve received your data deletion request. You&apos;ll receive a confirmation email
              within 24 hours, and your data will be deleted within 30 days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email address associated with your account
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> Deleting your data will permanently remove your account,
                game history, skill ratings, and all other information. This cannot be undone.
              </p>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Request Data Deletion
            </button>
          </form>
        )}

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alternative: Delete via Account Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            If you&apos;re logged in, you can also delete your account directly from your profile settings:
          </p>
          <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-300 space-y-2">
            <li>Sign in to your PaddleUp account</li>
            <li>Go to Profile → Settings</li>
            <li>Scroll to &quot;Delete Account&quot;</li>
            <li>Confirm deletion</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
