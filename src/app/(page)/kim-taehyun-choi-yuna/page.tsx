'use client';

import { useState, useEffect } from 'react';
import { 
  WeddingLoader, 
  Cover, 
  Greeting, 
  Gallery, 
  Schedule, 
  LocationMap, 
  WeddingCalendar, 
  Guestbook, 
  GiftInfo 
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

export default function KimTaehyunChoiYuna() {
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
  
  const weddingDate = new Date(
    pageConfig?.weddingDateTime.year || 2024,
    pageConfig?.weddingDateTime.month || 0,
    pageConfig?.weddingDateTime.day || 1,
    pageConfig?.weddingDateTime.hour || 0,
    pageConfig?.weddingDateTime.minute || 0
  );
  
  // 메인 이미지 URL 결정 (Firebase 이미지만 사용)
  const mainImageUrl = mainImage?.url || "";

  // 프리로드할 이미지들 (메인 이미지 + Firebase 갤러리 이미지 상위 5개) - 최대 6개로 제한
  const preloadImages = [
    ...(mainImageUrl ? [mainImageUrl] : []), // Cover 이미지 포함
    ...galleryImages.slice(0, 5).map(img => img.url)
  ].slice(0, 6);

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
    <main role="main" aria-label={`${pageConfig?.groomName || ''}과 ${pageConfig?.brideName || ''}의 결혼식 청첩장`}>
      <Cover 
        title={pageConfig?.displayName || ''}
        subtitle={pageConfig?.pageData?.subtitle || '영원한 사랑을 약속합니다'} 
        weddingDate={`${pageConfig?.date || ''} ${pageConfig?.pageData?.ceremonyTime || ''}`}
        imageUrl={mainImageUrl}
        brideName={pageConfig?.brideName || ''}
        groomName={pageConfig?.groomName || ''}
        preloadComplete={true}
      />
      <Greeting 
        message={pageConfig?.pageData?.greetingMessage || '사랑하는 가족과 친구들과 함께 영원한 약속을 나누고자 합니다. 저희의 사랑의 여정을 따뜻하게 지켜봐 주세요.'}
        author={pageConfig?.pageData?.greetingAuthor || `${pageConfig?.groomName || ''} · ${pageConfig?.brideName || ''}`}
      />
      <Gallery 
        images={galleryImages.map(img => img.url)}
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
        showCountdown={false} // 카운트다운
        countdownTitle="결혼식까지"
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      <Schedule 
        date={pageConfig?.date || ''}
        time={pageConfig?.pageData?.ceremonyTime || ''}
        venue={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
        venueGuide={pageConfig?.pageData?.venueGuide}
      />
      <LocationMap 
        venueName={pageConfig?.venue || ''}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
        description={pageConfig?.pageData?.mapDescription || '지하철 이용 시 편리하게 오실 수 있습니다'}
        contact={pageConfig?.pageData?.ceremonyContact}
      />
      <GiftInfo 
        groomAccounts={[
          {
            bank: "신한은행",
            accountNumber: "110-123-456789",
            accountHolder: pageConfig?.groomName || ''
          }
        ]}
        brideAccounts={[
          {
            bank: "우리은행",
            accountNumber: "1002-234-567890",
            accountHolder: pageConfig?.brideName || ''
          }
        ]}
        message="마음만으로도 충분합니다. 축하의 뜻으로 전해주시는 축의금은 소중히 받겠습니다."
      />
    </main>
  );
}
