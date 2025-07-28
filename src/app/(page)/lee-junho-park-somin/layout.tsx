import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import KakaoShareButton from './KakaoShareButton';

// 공유용 이미지 URL
const WEDDING_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/wedding-images%2Fshin-minje-kim-hyunji%2Fthum.jpg?alt=media&token=c5eef8b5-a83b-4a4c-b5bb-2491feaba51c';
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
      
      {/* 카카오톡 공유 버튼 - 상단에 배치 */}
      <div className='kakao_share' style={{ 
        backgroundColor: '#fff', 
        borderBottom: '1px solid #f0f0f0',
        padding: '10px 0'
      }}>
        <KakaoShareButton 
          title="이준호 ♥ 박소민 결혼식에 초대합니다"
          description="2026년 6월 20일 토요일 오후 2시\n웨딩팰리스에서 열리는 저희의 결혼식에 초대합니다."
          imageUrl={WEDDING_IMAGE}
        />
      </div>
    </>
  );
}
