import type { Metadata, Viewport } from 'next';

// 공유용 이미지 URL
const WEDDING_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fshin-minje-kim-hyunji%2Fthum.jpg?alt=media&token=c5eef8b5-a83b-4a4c-b5bb-2491feaba51c';
const FAVICON_ICON = '/images/favicon.ico';

export const metadata: Metadata = {
  title: '신민제 ♥ 김현지 결혼식에 초대합니다',
  description: '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
  keywords: ['결혼식', '웨딩', '청첩장', '신민제', '김현지', '2024년 4월'],
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
    title: '신민제 ♥ 김현지 결혼식 초대',
    description: '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
    images: [
      {
        url: WEDDING_IMAGE,
        width: 800,
        height: 600,
        alt: '신민제 ♥ 김현지 결혼식',
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
    'twitter:title': '신민제 ♥ 김현지 결혼식 초대',
    'twitter:description': '2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
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
  return children;
}
