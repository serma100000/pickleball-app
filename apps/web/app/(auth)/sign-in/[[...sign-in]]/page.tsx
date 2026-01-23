import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your PaddleUp account to find courts, track games, and connect with the pickleball community.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Sign In | PaddleUp',
    description: 'Sign in to your PaddleUp account to find courts, track games, and connect with the pickleball community.',
  },
  alternates: {
    canonical: 'https://www.paddle-up.app/sign-in',
  },
};

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome Back
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Sign in to continue to PaddleUp
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-full',
            cardBox: 'w-full max-w-full',
            card: 'shadow-none border-0 bg-white dark:bg-gray-800 w-full max-w-full',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'min-h-[44px] border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
            formFieldInput:
              'min-h-[44px] border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white',
            formButtonPrimary:
              'min-h-[44px] bg-brand-600 hover:bg-brand-700 text-white',
            footerActionLink:
              'min-h-[44px] inline-flex items-center text-brand-600 hover:text-brand-700 dark:text-brand-400',
            identityPreviewEditButton:
              'min-h-[44px] min-w-[44px] text-brand-600 hover:text-brand-700',
            formFieldInputShowPasswordButton:
              'min-h-[44px] min-w-[44px]',
            footer: 'bg-white dark:bg-gray-800',
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
