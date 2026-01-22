import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome Back
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Sign in to continue to Pickle Play
        </p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border-0 bg-white dark:bg-gray-800',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
            formFieldInput:
              'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white',
            formButtonPrimary:
              'bg-green-600 hover:bg-green-700 text-white',
            footerActionLink:
              'text-green-600 hover:text-green-700 dark:text-green-400',
            identityPreviewEditButton:
              'text-green-600 hover:text-green-700',
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
