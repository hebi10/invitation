'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import './globals.css';
import Head from 'next/head';
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
      <Head>
        <link rel="icon" href="/images/favicon.ico" />
      </Head>
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