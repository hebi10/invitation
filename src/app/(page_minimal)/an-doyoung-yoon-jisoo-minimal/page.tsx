'use client';
import { useState, useEffect } from 'react';
import { WeddingLoader_2, Cover_2, Greeting_2, Gallery_2, Schedule_2, LocationMap_2, WeddingCalendar_2, WeddingCountdown_2, GiftInfo_2, Guestbook_2, ScrollAnimatedSection } from '@/components';
import { usePageImages } from '@/hooks';
import { AccessDeniedPage, checkPageAccess } from '@/utils';
import { useAdmin } from '@/contexts';
import { getWeddingPageBySlug } from '@/config/weddingPages';

const WEDDING_SLUG = "an-doyoung-yoon-jisoo";
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

export default function AnDoyoungYoonJisoo_2() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string }>({ canAccess: true });
  const [isLoading, setIsLoading] = useState(true);
  const { mainImage, galleryImages, loading: imagesLoading, error } = usePageImages(WEDDING_SLUG);
  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    let canceled = false;
    document.title = `${pageConfig?.groomName || ''} ♡ ${pageConfig?.brideName || ''} 결혼식 - ${pageConfig?.date || ''} (미니멀 버전)`;
    checkPageAccess(WEDDING_SLUG, isAdminLoggedIn).then(result => {
      if (!canceled) setAccess(result);
    });
    return () => { canceled = true; };
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
  
  const weddingDate = new Date(pageConfig?.weddingDateTime.year || 2024, pageConfig?.weddingDateTime.month || 0, pageConfig?.weddingDateTime.day || 1, pageConfig?.weddingDateTime.hour || 0, pageConfig?.weddingDateTime.minute || 0);
  const mainImageUrl = mainImage?.url || "";

  if (error) console.warn('이미지 로딩 중 오류 발생:', error);
  if (isLoading || imagesLoading) return <WeddingLoader_2 message="청첩장을 준비하고 있습니다..." />;

  return (
    <main role="main" aria-label={`${pageConfig?.groomName || ''}와 ${pageConfig?.brideName || ''}의 결혼식 청첩장 (미니멀 버전)`}>
      <Cover_2 
        title={pageConfig?.displayName || ''} 
        subtitle={pageConfig?.pageData?.subtitle || ''} 
        weddingDate={`${pageConfig?.date || ''} ${pageConfig?.pageData?.ceremonyTime || ''}`} 
        imageUrl={mainImageUrl} 
        brideName={pageConfig?.brideName || ''} 
        groomName={pageConfig?.groomName || ''} 
        preloadComplete={true} 
      />
      
      <ScrollAnimatedSection delay={100}>
        <Greeting_2 
          message={pageConfig?.pageData?.greetingMessage || ''} 
          author={pageConfig?.pageData?.greetingAuthor || ''} 
          groom={pageConfig?.pageData?.groom} 
          bride={pageConfig?.pageData?.bride} 
        />
      </ScrollAnimatedSection>
      
      <ScrollAnimatedSection delay={200}>
        <WeddingCalendar_2 weddingDate={weddingDate} />
        <WeddingCountdown_2 targetDate={weddingDate} title="결혼식까지" />
      </ScrollAnimatedSection>
      
      <ScrollAnimatedSection delay={300}>
        <Gallery_2 images={galleryImages.map(img => img.url)} />
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
      <GiftInfo_2 groomName={pageConfig?.groomName || ''} brideName={pageConfig?.brideName || ''} />
    </main>
  );
}
