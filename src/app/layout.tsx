'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import './globals.css';
import { Inter, Noto_Serif_KR, Noto_Sans_KR, Cormorant_Garamond, Alex_Brush, Gowun_Dodum } from 'next/font/google';

// export const metadata = {
//   icons: {
//     icon: '/images/favicon.ico',
//     shortcut: '/images/favicon.ico',
//     apple: '/images/favicon.ico',
//   },
// };

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

  useEffect(() => {
    // 동적으로 link 태그 추가
    const links: Array<{ rel: string; href: string; type?: string; crossOrigin?: string }> = [
      { rel: 'preconnect', href: 'https://firebasestorage.googleapis.com' },
      { rel: 'dns-prefetch', href: 'https://firebasestorage.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' },
      { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },
      { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' },
      { rel: 'apple-touch-icon', href: '/favicon.ico' },
    ];

    links.forEach(linkConfig => {
      const link = document.createElement('link');
      link.rel = linkConfig.rel;
      link.href = linkConfig.href;
      if (linkConfig.type) {
        link.type = linkConfig.type;
      }
      if (linkConfig.crossOrigin) {
        link.crossOrigin = linkConfig.crossOrigin;
      }
      document.head.appendChild(link);
    });
  }, []);

  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
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