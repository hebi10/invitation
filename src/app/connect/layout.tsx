import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import AuthenticatedAppProviders from '@/app/AuthenticatedAppProviders';

export const metadata: Metadata = {
  title: '청첩장 계정 연결',
  description: '전달받은 청첩장을 로그인한 고객 계정에 연결합니다.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function ConnectLayout({ children }: { children: ReactNode }) {
  return <AuthenticatedAppProviders>{children}</AuthenticatedAppProviders>;
}
