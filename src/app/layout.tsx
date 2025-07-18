'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AdminProvider } from '@/contexts/AdminContext';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="ko">
      <body>
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