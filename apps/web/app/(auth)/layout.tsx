import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-gradient-to-br from-brand-50 via-white to-brand-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="shrink-0 p-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
      </header>

      {/* Main Content - scrollable on mobile */}
      <main className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} PaddleUp. All rights reserved.</p>
      </footer>
    </div>
  );
}
