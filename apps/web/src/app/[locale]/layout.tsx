import { ReferralCapture } from '@/components/shared/referral-capture';
import { TouchLoginBridge } from '@/components/shared/touch-login-bridge';
import { XpNotificationBridge } from '@/components/shared/xp-notification-bridge';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { type Locale, locales } from '@/i18n/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import '@/styles/globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
  weight: ['500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    title: t('siteName'),
    description: t('siteDescription'),
    applicationName: t('siteName'),
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: '/favicon.png', sizes: '32x32', type: 'image/png' }],
      apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'WTS',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#0a0a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const initialUser = data.user ?? null;

  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider initialUser={initialUser}>
            <ReferralCapture />
            <TouchLoginBridge />
            <XpNotificationBridge />
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
