import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import KakaoShareButton from './KakaoShareButton';
import { generateMetadata as generateWeddingMetadata, getWeddingPageBySlug } from '@/config/weddingPages';
import { ReactNode } from 'react';

const WEDDING_SLUG = 'kim-taehyun-choi-yuna';
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

export default function KimTaehyunChoiYunaSimpleLayout({
  children,
}: {
  children: ReactNode;
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
    </>
  );
}
