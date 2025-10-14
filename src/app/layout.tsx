'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import './globals.css';
import { Inter, Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Alex_Brush, Gowun_Dodum } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-noto-serif',
});

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-noto-sans',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-cormorant',
});

const alexBrush = Alex_Brush({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-alex-brush',
});

// Gowun Dodum
const gowunDodum = Gowun_Dodum({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-gowun-dodum',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/images/favicon.ico" />
        <link rel="shortcut icon" href="/images/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/favicon.ico" />
      </head>
      <body className={`${inter.variable} ${notoSerifKR.variable} ${notoSansKR.variable} ${cormorantGaramond.variable} ${alexBrush.variable} ${gowunDodum.variable}`}>
        <QueryClientProvider client={queryClient}>
          <AdminProvider>
            {children}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </AdminProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}