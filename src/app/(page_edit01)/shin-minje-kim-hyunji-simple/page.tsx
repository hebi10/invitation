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
  GiftInfo_1, 
  Guestbook_1
} from '@/components';
import { usePageImages } from '@/hooks';
import { AccessDeniedPage, checkPageAccess } from '@/utils';
import { useAdmin } from '@/contexts';
import { getWeddingPageBySlug } from '@/config/weddingPages';
import KakaoShareButton from './KakaoShareButton';

const WEDDING_SLUG = "shin-minje-kim-hyunji";
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

export default function ShinMinJeKimHyunJi_Simple() {
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
  
  const weddingDate = new Date(2026, 3, 14);
  
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
    <main role="main" aria-label={`${pageConfig?.groomName || ''}와 ${pageConfig?.brideName || ''}의 결혼식 청첩장 (심플 버전)`}>
      <Cover_1 
        title={pageConfig?.displayName || ''}
        subtitle={pageConfig?.pageData?.subtitle || '두 사람이 사랑으로 하나가 되는 날'} 
        weddingDate={`${pageConfig?.date || ''} ${pageConfig?.pageData?.ceremonyTime || ''}`}
        imageUrl={mainImageUrl}
        brideName={pageConfig?.brideName || ''}
        groomName={pageConfig?.groomName || ''}
        preloadComplete={true}
      />
      <Greeting_1 
        message={pageConfig?.pageData?.greetingMessage || '두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다.'}
        author={pageConfig?.pageData?.greetingAuthor || `${pageConfig?.groomName || ''} · ${pageConfig?.brideName || ''}`}
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
      <Gallery_1 
        images={galleryImages.map(img => img.url)}
      />
      <Schedule_1 
        date={pageConfig?.date || ''}
        time={pageConfig?.pageData?.ceremonyTime || ''}
        venue={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
      />
      <LocationMap_1 
        venueName={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
        description={pageConfig?.pageData?.mapDescription || '지하철 이용 시 편리하게 오실 수 있습니다'}
        mapUrl={pageConfig?.pageData?.mapUrl || ''}
      />
      <Guestbook_1 pageSlug={WEDDING_SLUG} />
      <GiftInfo_1 
        groomAccount={{
          bank: "국민은행",
          accountNumber: "123456-78-901234",
          accountHolder: pageConfig?.groomName || ''
        }}
        brideAccount={{
          bank: "신한은행",
          accountNumber: "567890-12-345678",
          accountHolder: pageConfig?.brideName || ''
        }}
        message="마음만으로도 충분합니다. 축하의 뜻으로 전해주시는 축의금은 소중히 받겠습니다."
      />
      <KakaoShareButton 
        title={`${pageConfig?.groomName || ''} ♡ ${pageConfig?.brideName || ''} 결혼식 (심플 버전)`}
        description={`${pageConfig?.date || ''} ${pageConfig?.pageData?.ceremonyTime || ''} ${pageConfig?.venue || ''}에서 열리는 결혼식에 초대합니다.`}
        imageUrl={mainImageUrl || "/images/thum.jpg"}
      />
    </main>
  );
}
