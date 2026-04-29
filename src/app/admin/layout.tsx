import type { Metadata, Viewport } from 'next';
import './admin-theme.css';
import AuthenticatedAppProviders from '@/app/AuthenticatedAppProviders';

import { AdminOverlayProvider } from './_components';

export const metadata: Metadata = {
  title: '관리자 대시보드 | 모바일 청첩장',
  description: '청첩장 페이지, 이미지, 댓글, 고객 계정 연결, 노출 기간을 운영형 UI로 관리하는 관리자 대시보드입니다.',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedAppProviders>
      <div data-admin-ui>
        <AdminOverlayProvider>{children}</AdminOverlayProvider>
      </div>
    </AuthenticatedAppProviders>
  );
}
