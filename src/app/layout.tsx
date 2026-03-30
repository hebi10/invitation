import type { Metadata } from 'next';
import './globals.css';
import {
  Alex_Brush,
  Cormorant_Garamond,
  Gowun_Dodum,
  Inter,
  Noto_Sans_KR,
  Noto_Serif_KR,
} from 'next/font/google';

export const metadata: Metadata = {
  title: {
    default: '모바일 청첩장',
    template: '%s | 모바일 청첩장',
  },
  description: '모바일 청첩장과 추억 페이지를 위한 정적 Firebase Hosting 프로젝트입니다.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

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

const gowunDodum = Gowun_Dodum({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-gowun-dodum',
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body
        className={`${inter.variable} ${notoSerifKR.variable} ${notoSansKR.variable} ${cormorantGaramond.variable} ${alexBrush.variable} ${gowunDodum.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
