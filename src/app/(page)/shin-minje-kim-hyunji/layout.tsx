import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import KakaoShareButton from './KakaoShareButton';

// 공유용 이미지 URL
const WEDDING_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fshin-minje-kim-hyunji%2Fthum.jpg?alt=media&token=c5eef8b5-a83b-4a4c-b5bb-2491feaba51c';
const FAVICON_ICON = '/images/favicon.ico';

export const metadata: Metadata = {
  title: '신민제 ♥ 김현지 결혼식에 초대합니다',
  description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요.',
  keywords: ['결혼식', '웨딩', '청첩장', '신민제', '김현지', '2026년 4월'],
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
    description: '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
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
  other: {
    // X (구 Twitter) 카드
    'twitter:card': 'summary_large_image',
    'twitter:title': '신민제 ♥ 김현지 결혼식 초대',
    'twitter:description': '2026년 4월 14일 토요일 오후 3시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다.',
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
      {/* 카카오 JavaScript SDK */}
      <Script 
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" 
        integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4" 
        crossOrigin="anonymous"
        strategy="beforeInteractive"
      />
      
      {children}
      
      {/* 카카오톡 공유 버튼 */}
      <div className='kakao_share' style={{ 
        backgroundColor: '#fff', 
        borderBottom: '1px solid #f0f0f0',
        padding: '10px 0',
        display: 'none'
      }}>
        <KakaoShareButton 
          title="신민제 ♥ 김현지 결혼식에 초대합니다"
          description="2026년 4월 14일 토요일 오후 3시\n더케이웨딩홀에서 열리는 저희의 결혼식에 초대합니다."
          imageUrl={WEDDING_IMAGE}
        />
      </div>
    </>
  );
}
