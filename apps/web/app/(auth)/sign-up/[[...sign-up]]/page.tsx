import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your free PaddleUp account to discover pickleball courts, track your games, and join the community.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Sign Up | PaddleUp',
    description: 'Create your free PaddleUp account to discover pickleball courts, track your games, and join the community.',
  },
  alternates: {
    canonical: 'https://www.paddle-up.app/sign-up',
  },
};

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Join PaddleUp
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Create an account to start your pickleball journey
        </p>
      </div>
      <SignUp
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
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
