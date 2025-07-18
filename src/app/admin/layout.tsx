import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '모바일 청첩장 - 아름다운 시작을 함께하세요',
  description: '특별한 날을 더욱 특별하게 만들어줄 모바일 청첩장입니다. 소중한 분들과 함께 나누는 행복한 순간을 아름답게 전해드립니다.',
  keywords: ['모바일청첩장', '웨딩', '결혼식', '청첩장', '결혼', '웨딩카드'],
  openGraph: {
    title: '모바일 청첩장 - 아름다운 시작을 함께하세요',
    description: '특별한 날을 더욱 특별하게 만들어줄 모바일 청첩장입니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: '모바일 청첩장',
  },
  twitter: {
    card: 'summary_large_image',
    title: '모바일 청첩장 - 아름다운 시작을 함께하세요',
    description: '특별한 날을 더욱 특별하게 만들어줄 모바일 청첩장입니다.',
  },
  robots: 'noindex, nofollow',
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
  return children;
}
