'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Check if Clerk is configured
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignInPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [SignInComponent, setSignInComponent] = useState<any>(null);

  useEffect(() => {
    if (isClerkConfigured) {
      import('@clerk/nextjs').then((clerk) => {
        setSignInComponent(() => clerk.SignIn);
      });
    }
  }, []);

  if (!isClerkConfigured) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to continue to Pickle Play
          </p>
        </div>
        <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Authentication is not configured yet.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              To enable sign-in, add your Clerk keys to <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env.local</code>
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 bg-pickle-500 hover:bg-pickle-600 text-white rounded-lg font-medium transition-colors"
            >
              Continue as Demo User
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!SignInComponent) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome Back
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Sign in to continue to Pickle Play
        </p>
      </div>
      <SignInComponent
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none p-0 bg-transparent',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
            formFieldInput:
              'border-gray-300 dark:border-gray-600 focus:ring-pickle-500 focus:border-pickle-500',
            formButtonPrimary:
              'bg-pickle-500 hover:bg-pickle-600 text-white',
            footerActionLink:
              'text-pickle-600 hover:text-pickle-700 dark:text-pickle-400 dark:hover:text-pickle-300',
            identityPreviewEditButton:
              'text-pickle-600 hover:text-pickle-700',
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
