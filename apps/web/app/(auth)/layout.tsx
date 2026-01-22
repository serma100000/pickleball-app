import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="p-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} PaddleUp. All rights reserved.</p>
      </footer>
    </div>
  );
}
