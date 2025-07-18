import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '김태현 ♥ 최유나 결혼식에 초대합니다',
  description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다. 저희의 사랑의 여정을 함께 지켜봐 주세요.',
  keywords: ['결혼식', '웨딩', '청첩장', '김태현', '최유나', '2024년 6월'],
  openGraph: {
    title: '김태현 ♥ 최유나 결혼식 초대',
    description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: '모바일 청첩장',
  },
  twitter: {
    card: 'summary_large_image',
    title: '김태현 ♥ 최유나 결혼식 초대',
    description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.',
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
