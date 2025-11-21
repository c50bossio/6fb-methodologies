import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import ClientWrapper from '@/components/ClientWrapper';
import { Toaster } from '@/components/ui/Toaster';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: 'EWP: 6FB Methodologies Workshop - Transform Your Barber Business',
  description:
    'An Executive Workshop Program event. Join Dre, Nate, and Bossio for an intensive 2-day workshop designed to take your barbering business to the next level. Learn proven systems, marketing strategies, and wealth-building techniques.',
  keywords:
    'EWP, executive workshop program, barbering workshop, business growth, marketing, investing, 6 figure barber',
  authors: [{ name: 'EWP - Executive Workshop Program' }],
  openGraph: {
    title: 'EWP: 6FB Methodologies Workshop - Transform Your Barber Business',
    description:
      'An Executive Workshop Program event - Intensive 2-day workshop with proven systems for barbering business growth',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EWP: 6FB Methodologies Workshop',
    description: 'An Executive Workshop Program event - Transform your barbering business with proven methodologies',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={`dark ${inter.variable}`}>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link rel='icon' href='/favicon.ico' sizes='32x32' />
        <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        <link rel='manifest' href='/manifest.json' />
      </head>
      <body
        className={`${inter.className} bg-background-primary text-text-primary antialiased`}
      >
        <ServiceWorkerRegistration />
        <ClientWrapper>
          <div className='min-h-screen'>{children}</div>
        </ClientWrapper>
        <Toaster />
      </body>
    </html>
  );
}
