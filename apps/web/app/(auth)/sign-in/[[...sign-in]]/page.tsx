import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
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
      <SignIn
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
