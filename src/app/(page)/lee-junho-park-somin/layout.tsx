import type { Metadata, Viewport } from 'next';

// 공유용 이미지 URL
const WEDDING_IMAGE = '/images/thum.jpg';
const FAVICON_ICON = '/images/favicon.ico';

export const metadata: Metadata = {
  title: '이준호 ♥ 박소민 결혼식에 초대합니다',
  description: '2026년 6월 20일 토요일 오후 2시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다. 저희의 행복한 출발을 함께 축복해 주세요.',
  keywords: ['결혼식', '웨딩', '청첩장', '이준호', '박소민', '2026년 6월'],
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
    title: '이준호 ♥ 박소민 결혼식 초대',
    description: '2026년 6월 20일 토요일 오후 2시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.',
    images: [
      {
        url: WEDDING_IMAGE,
        width: 800,
        height: 600,
        alt: '이준호 ♥ 박소민 결혼식',
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
    'twitter:title': '이준호 ♥ 박소민 결혼식 초대',
    'twitter:description': '2026년 6월 20일 토요일 오후 2시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다.',
    'twitter:image': WEDDING_IMAGE,
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
