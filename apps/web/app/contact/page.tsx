import Link from 'next/link';
import { Mail, MessageSquare, MapPin } from 'lucide-react';
import { Logo } from '@/components/logo';

export const metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the PaddleUp team',
};

export default function ContactPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Have questions, feedback, or need support? We&apos;d love to hear from you.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Support</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              For general inquiries and support
            </p>
            <a
              href="mailto:support@paddle-up.app"
              className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              support@paddle-up.app
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Feedback</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Share your ideas and suggestions
            </p>
            <a
              href="mailto:feedback@paddle-up.app"
              className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              feedback@paddle-up.app
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Partnership Inquiries</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Interested in partnering with PaddleUp? We work with courts, clubs, and tournament
                organizers to bring the best pickleball experience to players everywhere.
              </p>
              <a
                href="mailto:partnerships@paddle-up.app"
                className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                partnerships@paddle-up.app
              </a>
            </div>
          </div>
        </div>

        <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Response Time</h2>
          <p className="text-gray-600 dark:text-gray-300">
            We aim to respond to all inquiries within 24-48 hours during business days.
            For urgent matters, please include &quot;URGENT&quot; in your email subject line.
          </p>
        </div>
      </main>
    </div>
  );
}
