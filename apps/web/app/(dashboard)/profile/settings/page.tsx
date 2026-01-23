'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { UserProfile } from '@clerk/nextjs';

export default function AccountSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          Account Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account details and preferences
        </p>
      </div>

      {/* Clerk UserProfile Component */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <UserProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              cardBox: 'w-full max-w-full shadow-none',
              card: 'shadow-none border-0 bg-transparent w-full max-w-full',
              navbar: 'hidden',
              navbarMobileMenuButton: 'hidden',
              pageScrollBox: 'p-0',
              page: 'p-6',
            },
          }}
        />
      </div>
    </div>
  );
}
