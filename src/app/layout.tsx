import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '모바일 청첩장',
    template: '%s | 모바일 청첩장',
  },
  description:
    '예식 초대부터 공유, 방명록, 사진 관리, 추억 페이지까지 이어지는 모바일 청첩장 서비스입니다.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
