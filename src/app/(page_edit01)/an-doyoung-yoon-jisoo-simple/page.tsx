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
  GiftInfo_1,
  BackgroundMusic
} from '@/components';
import { usePageImages } from '@/hooks';
import { AccessDeniedPage, checkPageAccess } from '@/utils';
import { useAdmin } from '@/contexts';
import { getWeddingPageBySlug } from '@/config/weddingPages';

const WEDDING_SLUG = "an-doyoung-yoon-jisoo";
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

export default function KimTaehyunChoiYuna_Simple() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string }>({ canAccess: true });
  const [isLoading, setIsLoading] = useState(true);
  const [showCopyright, setShowCopyright] = useState(false);
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
      />
      <LocationMap_1 
        venueName={pageConfig?.pageData?.venueName || pageConfig?.venue || '웨딩홀'}
        address={pageConfig?.pageData?.ceremonyAddress || ''}
        description={pageConfig?.pageData?.mapDescription || '지하철 이용 시 편리하게 오실 수 있습니다'}
        mapUrl={pageConfig?.pageData?.mapUrl || ''}
        kakaoMapConfig={pageConfig?.pageData?.kakaoMap}
      />
      <Guestbook_1 pageSlug={WEDDING_SLUG} />
      <GiftInfo_1 
        groomAccount={{
          bank: "국민은행",
          accountNumber: "016702-04-506376",
          accountHolder: pageConfig?.groomName || ''
        }}
        brideAccount={{
          bank: "농협은행",
          accountNumber: "302-2058-7429-31",
          accountHolder: pageConfig?.brideName || ''
        }}
        message={`마음만으로도 충분합니다.
축하의 뜻으로 전해주시는 축의금은
소중히 받겠습니다.`}
      />

      {/* 배경음악 저작권 표기 */}
      <div style={{
        textAlign: 'center',
        padding: '1rem',
        color: '#999',
        fontSize: '0.75rem',
        lineHeight: '1.6',
        backgroundColor: '#fafafa',
        borderTop: '1px solid #eee'
      }}>
        <button
          onClick={() => setShowCopyright(!showCopyright)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.8rem',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            margin: '0 auto'
          }}
        >
          <span>🎵 Music Copyright</span>
          <span style={{ 
            transform: showCopyright ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>▼</span>
        </button>
        
        {showCopyright && (
          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #eee'
          }} className="wedding-fade-in">
            <p style={{ margin: '0.3rem 0' }}>Music from Free To Use</p>
            <p style={{ margin: '0.3rem 0' }}>
              Source: <a 
                href="https://freetouse.com/music" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#666', textDecoration: 'none' }}
              >
                https://freetouse.com/music
              </a>
            </p>
            <p style={{ margin: '0.3rem 0' }}>Glamorous by Pufino</p>
            <p style={{ margin: '0.3rem 0' }}>Loving by Pufino</p>
            <p style={{ margin: '0.3rem 0' }}>Nervous by Pufino</p>
            <p style={{ margin: '0.3rem 0' }}>Relief by Pufino</p>
          </div>
        )}
      </div>
      
      {/* 배경음악 플레이어 */}
      <BackgroundMusic 
        autoPlay={true}
        volume={0.3}
        musicUrl="https://firebasestorage.googleapis.com/v0/b/invitation-35d60.firebasestorage.app/o/music%2FPufino%20-%20Glamorous%20(freetouse.com).mp3?alt=media&token=812dca6d-a992-4584-8ff0-2176f3eae2ef"
      />
     
    </main>
  );
}
