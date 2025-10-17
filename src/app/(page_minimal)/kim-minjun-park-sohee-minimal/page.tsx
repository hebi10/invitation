'use client';
/* 웨딩 페이지 설정: /config/weddingPages.ts에서 관리됩니다 */
import { useState, useEffect } from 'react';
import { 
  WeddingLoader_2, 
  Cover_2, 
  Greeting_2, 
  Gallery_2, 
  Schedule_2, 
  LocationMap_2, 
  WeddingCalendar_2, 
  GiftInfo_2, 
  Guestbook_2,
  ScrollAnimatedSection
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

export default function KimMinJunParkSoHee_2() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string }>({ canAccess: true });
  const [isLoading, setIsLoading] = useState(true);
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading, error } = 
  usePageImages(WEDDING_SLUG);

  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    let canceled = false;
    document.title = `${pageConfig?.groomName || ''} ♡ ${pageConfig?.brideName || ''} 결혼식 - ${pageConfig?.date || ''} (미니멀 버전)`;
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

  // 이미지 로딩 완료 시 페이지 표시
  useEffect(() => {
    if (!imagesLoading && isLoading) {
      // 최소 1초 로딩 화면 표시 후 전환
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [imagesLoading, isLoading]);

  // 이미지 로딩이 완료되지 않은 경우 로더 표시
  if (isLoading || imagesLoading) {
    return (
      <WeddingLoader_2 
        message="청첩장을 준비하고 있습니다..."
      />
    );
  }

  return (
    <main role="main" aria-label={`${pageConfig?.groomName || ''}와 ${pageConfig?.brideName || ''}의 결혼식 청첩장 (미니멀 버전)`}>
      <Cover_2 
        title={pageConfig?.displayName || ''}
        subtitle={pageConfig?.pageData?.subtitle || '두 사람이 사랑으로 하나가 되는 날'} 
        weddingDate={`${pageConfig?.date || ''} ${pageConfig?.pageData?.ceremonyTime || ''}`}
        imageUrl={mainImageUrl}
        brideName={pageConfig?.brideName || ''}
        groomName={pageConfig?.groomName || ''}
        preloadComplete={true}
      />
      
      <ScrollAnimatedSection delay={100}>
        <Greeting_2 
          message={pageConfig?.pageData?.greetingMessage || '두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다.'}
          author={pageConfig?.pageData?.greetingAuthor || `${pageConfig?.groomName || ''} · ${pageConfig?.brideName || ''}`}
          groom={pageConfig?.pageData?.groom}
          bride={pageConfig?.pageData?.bride}
        />
      </ScrollAnimatedSection>
      
      <ScrollAnimatedSection delay={200}>
        <WeddingCalendar_2 
          weddingDate={weddingDate}
        />
      </ScrollAnimatedSection>
      
      <ScrollAnimatedSection delay={300}>
        <Gallery_2 
          images={galleryImages.map(img => img.url)}
        />
      </ScrollAnimatedSection>
      
      <ScrollAnimatedSection delay={400}>
        <Schedule_2 
          date={pageConfig?.date || ''}
          time={pageConfig?.pageData?.ceremonyTime || ''}
          venue={pageConfig?.venue || ''}
          address={pageConfig?.pageData?.ceremonyAddress || ''}
          venueGuide={pageConfig?.pageData?.venueGuide}
          wreathGuide={pageConfig?.pageData?.wreathGuide}
        />
      </ScrollAnimatedSection>
      
      <ScrollAnimatedSection delay={500}>
        <LocationMap_2 
          latitude={pageConfig?.pageData?.kakaoMap?.latitude || 37.5048}
          longitude={pageConfig?.pageData?.kakaoMap?.longitude || 127.0280}
          placeName={pageConfig?.venue || ''}
          address={pageConfig?.pageData?.ceremonyAddress || ''}
        />
      </ScrollAnimatedSection>
      
      <ScrollAnimatedSection delay={600}>
        <Guestbook_2 pageId={WEDDING_SLUG} />
      </ScrollAnimatedSection>
      
      {pageConfig?.pageData?.giftInfo && (pageConfig.pageData.giftInfo.groomAccounts?.length || pageConfig.pageData.giftInfo.brideAccounts?.length) ? (
        <ScrollAnimatedSection delay={700}>
          <GiftInfo_2 
            groomName={pageConfig?.groomName || ''}
            brideName={pageConfig?.brideName || ''}
            groomAccounts={pageConfig.pageData.giftInfo.groomAccounts?.map(acc => ({ ...acc, holder: acc.accountHolder })) || []}
            brideAccounts={pageConfig.pageData.giftInfo.brideAccounts?.map(acc => ({ ...acc, holder: acc.accountHolder })) || []}
          />
        </ScrollAnimatedSection>
      ) : null}
    </main>
  );
}
