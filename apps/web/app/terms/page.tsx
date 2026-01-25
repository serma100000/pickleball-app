import Link from 'next/link';
import { Logo } from '@/components/logo';

export const metadata = {
  title: 'Terms of Service',
  description: 'PaddleUp Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>

        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 dark:text-gray-300">
              By accessing or using PaddleUp, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. Use of Service</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You agree to use PaddleUp only for lawful purposes. You must not:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Use the service in any way that violates applicable laws</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the service</li>
              <li>Attempt to gain unauthorized access to any part of the service</li>
              <li>Use the service to harass or harm other users</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. User Accounts</h2>
            <p className="text-gray-600 dark:text-gray-300">
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You must notify us immediately
              of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. User Content</h2>
            <p className="text-gray-600 dark:text-gray-300">
              You retain ownership of content you submit to PaddleUp. By posting content, you grant
              us a non-exclusive license to use, display, and distribute your content in connection
              with the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Game Data and Ratings</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Game results and skill ratings are calculated based on data you provide. We strive for
              accuracy but cannot guarantee the precision of ratings. By using the rating system,
              you agree that ratings are for informational purposes only.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-600 dark:text-gray-300">
              PaddleUp is provided &quot;as is&quot; without warranties of any kind. We are not liable for
              any damages arising from your use of the service, including but not limited to direct,
              indirect, incidental, or consequential damages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Termination</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We reserve the right to terminate or suspend your account at any time for violations
              of these terms or for any other reason at our discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Changes to Terms</h2>
            <p className="text-gray-600 dark:text-gray-300">
              We may update these terms from time to time. Continued use of the service after
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">9. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-300">
              If you have questions about these Terms of Service, contact us at{' '}
              <a href="mailto:support@paddle-up.app" className="text-brand-600 dark:text-brand-400 hover:underline">
                support@paddle-up.app
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
