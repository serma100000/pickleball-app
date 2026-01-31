import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';

import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PaddleUp - Find Courts, Book Games, Level Up',
    template: '%s | PaddleUp',
  },
  description:
    'The ultimate pickleball companion app. Find nearby courts, book games, track your progress, join clubs, and compete in leagues and tournaments.',
  keywords: [
    'pickleball',
    'courts',
    'games',
    'clubs',
    'leagues',
    'tournaments',
    'sports',
    'community',
    'paddle',
    'booking',
  ],
  authors: [{ name: 'PaddleUp Team' }],
  creator: 'PaddleUp',
  publisher: 'PaddleUp',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://www.paddle-up.app'
  ),
  openGraph: {
    title: 'PaddleUp - Find Courts, Book Games, Level Up',
    description:
      'The ultimate pickleball companion app. Find nearby courts, book games, track your progress, join clubs, and compete in leagues and tournaments.',
    url: 'https://www.paddle-up.app',
    siteName: 'PaddleUp',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaddleUp - Find Courts, Book Games, Level Up',
    description:
      'The ultimate pickleball companion app. Find nearby courts, book games, track your progress, join clubs, and compete in leagues and tournaments.',
  },
  alternates: {
    canonical: 'https://www.paddle-up.app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PaddleUp',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0891B2' },
    { media: '(prefers-color-scheme: dark)', color: '#0E7490' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#0891B2',
          colorText: '#1f2937',
          colorTextSecondary: '#6b7280',
          colorBackground: '#ffffff',
          colorInputBackground: '#f9fafb',
          colorInputText: '#1f2937',
          borderRadius: '0.5rem',
        },
        elements: {
          rootBox: 'dark:[&_*]:border-gray-700',
          cardBox: 'dark:bg-gray-800',
          card: 'dark:bg-gray-800 dark:border-gray-700 dark:shadow-none',
          formButtonPrimary: 'bg-brand-500 hover:bg-brand-600',
          headerTitle: 'dark:text-white',
          headerSubtitle: 'dark:text-gray-300',
          socialButtonsBlockButton: 'dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600',
          socialButtonsBlockButtonText: 'dark:text-white',
          dividerLine: 'dark:bg-gray-600',
          dividerText: 'dark:text-gray-400',
          formFieldLabel: 'dark:text-gray-300',
          formFieldInput: 'dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400',
          footer: 'dark:bg-gray-800 dark:text-gray-400 dark:[&_*]:bg-gray-800',
          footerAction: 'dark:bg-gray-800 dark:border-gray-700 dark:[&_*]:bg-gray-800',
          footerActionText: 'dark:text-gray-300',
          footerActionLink: 'text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300',
          footerPages: 'dark:bg-gray-800 dark:[&_*]:bg-gray-800',
          footerPagesLink: 'dark:text-gray-400',
          identityPreview: 'dark:bg-gray-700 dark:border-gray-600',
          identityPreviewText: 'dark:text-white',
          identityPreviewEditButton: 'dark:text-brand-400',
          formResendCodeLink: 'dark:text-brand-400',
          otpCodeFieldInput: 'dark:bg-gray-700 dark:border-gray-600 dark:text-white',
          alert: 'dark:bg-gray-700 dark:border-gray-600',
          alertText: 'dark:text-gray-200',
          badge: 'dark:bg-gray-700 dark:text-gray-300',
          // Target all internal backgrounds
          internal: 'dark:[&_*]:bg-gray-800',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          {/* Skip to main content link for keyboard accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Skip to main content
          </a>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Providers>{children}</Providers>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
