'use client';

import { useState, useEffect } from 'react';
import { 
  WeddingLoader_1, 
  Cover_1, 
  Greeting_1, 
  Gallery_1, 
  Schedule_1, 
  LocationMap_1, 
  WeddingCalendar_1, 
  Guestbook_1, 
  GiftInfo_1 
} from '@/components';
import { usePageImages } from '@/hooks';
import { AccessDeniedPage, checkPageAccess } from '@/utils';
import { useAdmin } from '@/contexts';
import { getWeddingPageBySlug } from '@/config/weddingPages';

const WEDDING_SLUG = "lee-jonghun-choi-in";
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

export default function ShinMinjeKimHyunji_Simple() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string }>({ canAccess: true });
  const [isLoading, setIsLoading] = useState(true);
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading, error } = 
  usePageImages(WEDDING_SLUG);
  
  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    let canceled = false;
    document.title = `${pageConfig?.groomName || ''} ♡ ${pageConfig?.brideName || ''} 결혼식 - ${pageConfig?.date || ''} (심플 버전)`;
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

  if (isLoading || imagesLoading) {
    return (
      <WeddingLoader_1 
        groomName={pageConfig?.groomName || ''}
        brideName={pageConfig?.brideName || ''}
        onLoadComplete={() => setIsLoading(false)}
        mainImage={mainImageUrl}
        preloadImages={preloadImages}
        duration={2500}
      />
    );
  }

  return (
    <main role="main" aria-label={`${pageConfig?.groomName || ''}과 ${pageConfig?.brideName || ''}의 결혼식 청첩장 (심플 버전)`}>
      <Cover_1 
        title={pageConfig?.displayName || ''}
        subtitle={pageConfig?.pageData?.subtitle || '영원한 사랑을 약속합니다'} 
        weddingDate={`${pageConfig?.date || ''} ${pageConfig?.pageData?.ceremonyTime || ''}`}
        imageUrl={mainImageUrl}
        brideName={pageConfig?.brideName || ''}
        groomName={pageConfig?.groomName || ''}
        preloadComplete={true}
      />
      <Greeting_1 
        message={pageConfig?.pageData?.greetingMessage || '사랑하는 가족과 친구들과 함께 영원한 약속을 나누고자 합니다. 저희의 사랑의 여정을 따뜻하게 지켜봐 주세요.'}
        author={pageConfig?.pageData?.greetingAuthor || `${pageConfig?.groomName || ''} · ${pageConfig?.brideName || ''}`}
        groom={pageConfig?.pageData?.groom}
        bride={pageConfig?.pageData?.bride}
      />
      <Gallery_1 
        images={galleryImages.map(img => img.url)}
      />
      <WeddingCalendar_1 
        title="행복한 순간을 함께하세요"
        weddingDate={weddingDate}
        currentMonth={weddingDate}
        events={[
          {
            date: weddingDate.getDate(),
            type: 'wedding',
            title: `${pageConfig?.groomName || ''} ♥ ${pageConfig?.brideName || ''} 결혼식`,
            description: `${pageConfig?.pageData?.ceremonyTime || ''} ${pageConfig?.venue || ''}`
          }
        ]}
        showCountdown={true}
        countdownTitle="결혼식까지"
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      <Schedule_1 
        date={pageConfig?.date || ''}
        time={pageConfig?.pageData?.ceremonyTime || ''}
        venue={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
        venueGuide={pageConfig?.pageData?.venueGuide}
        wreathGuide={pageConfig?.pageData?.wreathGuide}
      />
      <LocationMap_1 
        venueName={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
        description={pageConfig?.pageData?.mapDescription || '지하철 이용 시 편리하게 오실 수 있습니다'}
        kakaoMapConfig={pageConfig?.pageData?.kakaoMap}
      />
      <Guestbook_1 pageSlug={WEDDING_SLUG} />
      {pageConfig?.pageData?.giftInfo && (pageConfig.pageData.giftInfo.groomAccounts?.length || pageConfig.pageData.giftInfo.brideAccounts?.length) ? (
        <GiftInfo_1 
          groomAccounts={pageConfig.pageData.giftInfo.groomAccounts || []}
          brideAccounts={pageConfig.pageData.giftInfo.brideAccounts || []}
          message={pageConfig.pageData.giftInfo.message || '참석해 주시는 것만으로도 큰 기쁨입니다.'}
        />
      ) : null}
    </main>
  );
}
