import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import KakaoShareButton from './KakaoShareButton';

// 공유용 이미지 URL
const WEDDING_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fshin-minje-kim-hyunji%2Fthum.jpg?alt=media&token=c5eef8b5-a83b-4a4c-b5bb-2491feaba51c';
const FAVICON_ICON = '/images/favicon.ico';

export const metadata: Metadata = {
  title: '김태현 ♥ 최유나 결혼식에 초대합니다',
  description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다. 저희의 사랑의 여정을 함께 지켜봐 주세요.',
  keywords: ['결혼식', '웨딩', '청첩장', '김태현', '최유나', '2024년 6월'],
  icons: [
    {
      rel: 'icon',
      url: FAVICON_ICON,
    },
    {
      rel: 'shortcut icon',
      url: FAVICON_ICON,
    },
    {
      rel: 'apple-touch-icon',
      url: FAVICON_ICON,
    },
  ],
  openGraph: {
    title: '김태현 ♥ 최유나 결혼식 초대',
    description: '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.',
    images: [
      {
        url: WEDDING_IMAGE,
        width: 800,
        height: 600,
        alt: '김태현 ♥ 최유나 결혼식',
      },
    ],
    type: 'website',
    locale: 'ko_KR',
    siteName: '모바일 청첩장',
  },
  // X (구 Twitter) 메타데이터 - 인스타그램은 OpenGraph 사용
  other: {
    // X (구 Twitter) 카드
    'twitter:card': 'summary_large_image',
    'twitter:title': '김태현 ♥ 최유나 결혼식 초대',
    'twitter:description': '2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다.',
    'twitter:image': WEDDING_IMAGE,
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
    <>
      {children}
    </>
  );
}
