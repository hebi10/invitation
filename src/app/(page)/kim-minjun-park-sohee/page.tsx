'use client';
/* 웨딩 페이지 설정: /config/weddingPages.ts에서 관리됩니다 */
import { useState, useEffect } from 'react';
import { 
  WeddingLoader, 
  Cover, 
  Greeting, 
  Gallery, 
  Schedule, 
  LocationMap, 
  WeddingCalendar, 
  GiftInfo, 
  Guestbook
} from '@/components';
import { usePageImages } from '@/hooks';
import { AccessDeniedPage, checkPageAccess } from '@/utils';
import { useAdmin } from '@/contexts';
import { getWeddingPageBySlug } from '@/config/weddingPages';

const WEDDING_SLUG = "kim-minjun-park-sohee";
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

export default function KimMinJunParkSoHee() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string }>({ canAccess: true });
  const [isLoading, setIsLoading] = useState(true);
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading, error } = 
  usePageImages(WEDDING_SLUG);

  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    let canceled = false;
    document.title = `${pageConfig?.groomName || ''} ♡ ${pageConfig?.brideName || ''} 결혼식 - ${pageConfig?.date || ''}`;
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
    // 로딩, 접근 거부일 땐 숨김
    if (access === null || (access && !access.canAccess)) {
      kakaoShare.style.display = 'none';
    } else if (!isLoading) {
      kakaoShare.style.display = 'block';
    }
  }, [access, isLoading]);
  
  if (access === null) return null;
  if (!access.canAccess) return <AccessDeniedPage message={access.message} />;
  
  const weddingDate = new Date(2026, 3, 14);
  
  // 메인 이미지 URL 결정 (Firebase 이미지만 사용)
  const mainImageUrl = mainImage?.url || "";

  // 프리로드할 이미지들 (Firebase 갤러리 이미지만 사용) - 최대 6개로 제한
  const preloadImages = galleryImages.slice(0, 6).map(img => img.url);

  // 에러 상태 처리
  if (error) {
    console.warn('이미지 로딩 중 오류 발생:', error);
    // 에러가 있어도 기본 이미지로 진행
  }

  // 이미지 로딩이 완료되지 않은 경우 로더 표시
  if (isLoading || imagesLoading) {
    return (
      <WeddingLoader 
        groomName={pageConfig?.groomName || ''}
        brideName={pageConfig?.brideName || ''}
        onLoadComplete={() => setIsLoading(false)}
        mainImage={mainImageUrl}
        preloadImages={preloadImages}
        duration={2500} // 로딩 시간 단축
      />
    );
  }

  return (
    <main role="main" aria-label={`${pageConfig?.groomName || ''}와 ${pageConfig?.brideName || ''}의 결혼식 청첩장`}>
      <Cover 
        title={pageConfig?.displayName || ''}
        subtitle={pageConfig?.pageData?.subtitle || '두 사람이 사랑으로 하나가 되는 날'} 
        weddingDate={`${pageConfig?.date || ''} ${pageConfig?.pageData?.ceremonyTime || ''}`}
        imageUrl={mainImageUrl}
        brideName={pageConfig?.brideName || ''}
        groomName={pageConfig?.groomName || ''}
        preloadComplete={true}
      />
      <Greeting 
        message={pageConfig?.pageData?.greetingMessage || '두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다.'}
        author={pageConfig?.pageData?.greetingAuthor || `${pageConfig?.groomName || ''} · ${pageConfig?.brideName || ''}`}
      />
      <WeddingCalendar 
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
        showCountdown={true} // 카운트다운 표시
        countdownTitle="결혼식까지"
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      <Gallery 
        images={galleryImages.map(img => img.url)}
      />
      <Schedule 
        date={pageConfig?.date || ''}
        time={pageConfig?.pageData?.ceremonyTime || ''}
        venue={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
      />
      <LocationMap 
        venueName={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
        description={pageConfig?.pageData?.mapDescription || '지하철 이용 시 편리하게 오실 수 있습니다'}
        mapUrl={pageConfig?.pageData?.mapUrl || ''}
      />
      <Guestbook pageSlug={WEDDING_SLUG} />
      <GiftInfo 
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
    </main>
  );
}
