import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '신민제 ♥ 김현지 결혼식에 초대합니다',
  description: '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
  keywords: ['결혼식', '웨딩', '청첩장', '신민제', '김현지', '2024년 4월'],
  openGraph: {
    title: '신민제 ♥ 김현지 결혼식 초대',
    description: '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: '모바일 청첩장',
  },
  twitter: {
    card: 'summary_large_image',
    title: '신민제 ♥ 김현지 결혼식 초대',
    description: '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
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
