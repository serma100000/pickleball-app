import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-brand-50 via-white to-brand-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Main Content - centered horizontally, scrolls naturally */}
      <main className="flex-1 flex flex-col items-center px-4 pb-6">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 sm:py-6 text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} PaddleUp. All rights reserved.</p>
      </footer>
    </div>
  );
}
