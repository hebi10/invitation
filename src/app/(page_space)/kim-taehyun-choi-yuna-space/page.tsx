'use client';

import { useState, useEffect } from 'react';
import { 
  Cover_3 as Cover, 
  Greeting_3 as Greeting, 
  Gallery_3 as Gallery, 
  Schedule_3 as Schedule, 
  LocationMap_3 as LocationMap, 
  WeddingCalendar_3 as WeddingCalendar,
  GiftInfo_3 as GiftInfo, 
  Guestbook_3 as Guestbook,
  WeddingLoader_3 as WeddingLoader
} from '@/components';
import { usePageImages } from '@/hooks';
import { AccessDeniedPage, checkPageAccess } from '@/utils';
import { useAdmin } from '@/contexts';
import { getWeddingPageBySlug } from '@/config/weddingPages';

const WEDDING_SLUG = "kim-taehyun-choi-yuna";
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

export default function KimTaehyunChoiYunaSpace() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string }>({ canAccess: true });
  const [isLoading, setIsLoading] = useState(true);
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading, error } = 
  usePageImages(WEDDING_SLUG);

  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    let canceled = false;
    document.title = `${pageConfig?.groomName || ''} ♡ ${pageConfig?.brideName || ''} 결혼식 - ${pageConfig?.date || ''} (우주 버전)`;
    checkPageAccess(WEDDING_SLUG, isAdminLoggedIn).then(result => {
      if (!canceled) setAccess(result);
    });
    return () => {
      canceled = true;
    };
  }, [isAdminLoggedIn]);

  useEffect(() => {
    const kakaoShare = document.querySelector<HTMLDivElement>('.kakao_share');
    if (!kakaoShare) return;
    if (access === null || (access && !access.canAccess)) {
      kakaoShare.style.display = 'none';
    } else if (!isLoading) {
      kakaoShare.style.display = 'block';
    }
  }, [access, isLoading]);
  
  if (access === null) return null;
  if (!access.canAccess) return <AccessDeniedPage message={access.message} />;
  
  const weddingDate = new Date(
    pageConfig?.weddingDateTime.year || 2024,
    pageConfig?.weddingDateTime.month || 0,
    pageConfig?.weddingDateTime.day || 1,
    pageConfig?.weddingDateTime.hour || 0,
    pageConfig?.weddingDateTime.minute || 0
  );
  
  const mainImageUrl = mainImage?.url || "";
  const preloadImages = [
    ...(mainImageUrl ? [mainImageUrl] : []),
    ...galleryImages.slice(0, 5).map(img => img.url)
  ].slice(0, 6);

  if (error) {
    console.warn('이미지 로딩 중 오류 발생:', error);
  }

  useEffect(() => {
    if (!imagesLoading && isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [imagesLoading, isLoading]);

  if (isLoading || imagesLoading) {
    return (
      <WeddingLoader 
        groomName={pageConfig?.groomName || ''}
        brideName={pageConfig?.brideName || ''}
      />
    );
  }

  return (
    <main role="main" aria-label={`${pageConfig?.groomName || ''}와 ${pageConfig?.brideName || ''}의 결혼식 청첩장 (우주 버전)`}>
      <Cover 
        title={pageConfig?.displayName || ''}
        subtitle={pageConfig?.pageData?.subtitle || ''}
        weddingDate={pageConfig?.date || ''}
        imageUrl={mainImageUrl}
        groomName={pageConfig?.groomName || ''}
        brideName={pageConfig?.brideName || ''}
        preloadComplete={true}
      />
        <Greeting 
          message={pageConfig?.pageData?.greetingMessage || ''}
          parents={{
            groom: {
              father: pageConfig?.pageData?.groom?.father?.name || '',
              mother: pageConfig?.pageData?.groom?.mother?.name || ''
            },
            bride: {
              father: pageConfig?.pageData?.bride?.father?.name || '',
              mother: pageConfig?.pageData?.bride?.mother?.name || ''
            }
          }}
          groomName={pageConfig?.groomName || ''}
          brideName={pageConfig?.brideName || ''}
        />
        
        <WeddingCalendar 
          weddingDate={weddingDate}
          showCountdown={true}
          countdownTitle="결혼식까지"
        />

        <Gallery images={galleryImages.map(img => img.url)} />

        <Schedule 
          weddingDate={pageConfig?.date || ''}
          weddingTime={pageConfig?.pageData?.ceremonyTime || ''}
          location={pageConfig?.venue || ''}
          address={pageConfig?.pageData?.ceremonyAddress || ''}
          contact={{
            groom: {
              name: pageConfig?.groomName || '',
              phone: pageConfig?.pageData?.groom?.phone || ''
            },
            bride: {
              name: pageConfig?.brideName || '',
              phone: pageConfig?.pageData?.bride?.phone || ''
            }
          }}
        />

        <LocationMap 
          location={pageConfig?.venue || ''}
          address={pageConfig?.pageData?.ceremonyAddress || ''}
          coordinates={{
            lat: pageConfig?.pageData?.kakaoMap?.latitude || 37.5048,
            lng: pageConfig?.pageData?.kakaoMap?.longitude || 127.0280
          }}
        />
        
        <GiftInfo 
          groomAccounts={pageConfig?.pageData?.giftInfo?.groomAccounts || []}
          brideAccounts={pageConfig?.pageData?.giftInfo?.brideAccounts || []}
        />
    </main>
  );
}
