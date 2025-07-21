'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import './globals.css';
import { Noto_Sans } from 'next/font/google';

const notoSans = Noto_Sans({
  subsets: ['latin'], // 한글 포함시 'latin'과 'korean' 같이 지정
  weight: ['400', '700'], // 사용할 폰트 두께
  display: 'swap', // FOUT 방지
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
      <body className={notoSans.className}>
        <QueryClientProvider client={queryClient}>
          <AdminProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </AdminProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}