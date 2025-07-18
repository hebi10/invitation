import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '이준호 ♥ 박소민 결혼식에 초대합니다',
  description: '2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다. 저희의 행복한 출발을 함께 축복해 주세요.',
  keywords: ['결혼식', '웨딩', '청첩장', '이준호', '박소민', '2024년 5월'],
  openGraph: {
    title: '이준호 ♥ 박소민 결혼식 초대',
    description: '2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: '모바일 청첩장',
  },
  twitter: {
    card: 'summary_large_image',
    title: '이준호 ♥ 박소민 결혼식 초대',
    description: '2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.',
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
