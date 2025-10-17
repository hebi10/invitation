import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import KakaoShareButton from './KakaoShareButton';
import { generateMetadata as generateWeddingMetadata, getWeddingPageBySlug } from '@/config/weddingPages';

const WEDDING_SLUG = 'shin-minje-kim-hyunji';
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

const WEDDING_IMAGE = pageConfig.metadata.images.wedding;

export const metadata: Metadata = generateWeddingMetadata(WEDDING_SLUG);

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
        backgroundColor: '#0a0e27', 
        borderBottom: '1px solid rgba(142, 197, 252, 0.2)',
        padding: '10px 0',
        display: 'none'
      }}>
        <KakaoShareButton 
          title={pageConfig?.metadata.title || '결혼식에 초대합니다'}
          description={`${pageConfig?.date || ''}\n${pageConfig?.venue || ''}에서 열리는 저희의 결혼식에 초대합니다.`}
          imageUrl={WEDDING_IMAGE}
        />
      </div>
    </>
  );
}
