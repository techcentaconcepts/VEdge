import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Vantedge - Trade the Market, Don\'t Gamble on the Game',
    template: '%s | Vantedge'
  },
  description: 'Professional betting analytics platform. Find mathematical edges, track your performance, and protect your accounts.',
  keywords: ['betting analytics', 'sports betting', 'value betting', 'CLV', 'closing line value', 'bankroll management'],
  authors: [{ name: 'Techcenta' }],
  creator: 'Techcenta',
  publisher: 'Techcenta',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://vantedge.io',
    siteName: 'Vantedge',
    title: 'Vantedge - Trade the Market, Don\'t Gamble on the Game',
    description: 'Professional betting analytics platform. Find mathematical edges and track your performance.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vantedge - Betting Analytics Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vantedge - Trade the Market, Don\'t Gamble on the Game',
    description: 'Professional betting analytics platform.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
