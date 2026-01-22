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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'PaddleUp - Find Courts, Book Games, Level Up',
    description:
      'The ultimate pickleball companion app. Find nearby courts, book games, track your progress, join clubs, and compete in leagues and tournaments.',
    url: '/',
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
          formButtonPrimary: 'bg-brand-500 hover:bg-brand-600',
          footerActionLink: 'text-brand-600 hover:text-brand-700',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <Providers>{children}</Providers>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
