import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

// Check if Clerk is configured
const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const metadata: Metadata = {
  title: {
    default: 'Pickle Play - Find Courts, Track Games, Build Community',
    template: '%s | Pickle Play',
  },
  description:
    'The ultimate pickleball companion app. Find nearby courts, track your games, join clubs, and compete in leagues and tournaments.',
  keywords: [
    'pickleball',
    'courts',
    'games',
    'clubs',
    'leagues',
    'tournaments',
    'sports',
    'community',
  ],
  authors: [{ name: 'Pickle Play Team' }],
  creator: 'Pickle Play',
  publisher: 'Pickle Play',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Pickle Play - Find Courts, Track Games, Build Community',
    description:
      'The ultimate pickleball companion app. Find nearby courts, track your games, join clubs, and compete in leagues and tournaments.',
    url: '/',
    siteName: 'Pickle Play',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pickle Play - Find Courts, Track Games, Build Community',
    description:
      'The ultimate pickleball companion app. Find nearby courts, track your games, join clubs, and compete in leagues and tournaments.',
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
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pickle Play',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#22c55e' },
    { media: '(prefers-color-scheme: dark)', color: '#15803d' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

// Wrapper component that conditionally includes ClerkProvider
async function AuthWrapper({ children }: { children: React.ReactNode }) {
  if (isClerkConfigured) {
    const { ClerkProvider } = await import('@clerk/nextjs');
    return (
      <ClerkProvider
        appearance={{
          variables: {
            colorPrimary: '#22c55e',
            colorText: '#1f2937',
            colorTextSecondary: '#6b7280',
            colorBackground: '#ffffff',
            colorInputBackground: '#f9fafb',
            colorInputText: '#1f2937',
            borderRadius: '0.5rem',
          },
          elements: {
            formButtonPrimary: 'bg-pickle-500 hover:bg-pickle-600',
            footerActionLink: 'text-pickle-600 hover:text-pickle-700',
          },
        }}
      >
        {children}
      </ClerkProvider>
    );
  }
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthWrapper>
          <Providers>{children}</Providers>
        </AuthWrapper>
      </body>
    </html>
  );
}
