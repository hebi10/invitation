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

const WEDDING_SLUG = "lee-junho-park-somin";
const pageConfig = getWeddingPageBySlug(WEDDING_SLUG);

if (!pageConfig) {
  throw new Error(`Wedding page config not found for slug: ${WEDDING_SLUG}`);
}

export default function LeeJunhoParkSomin_Simple() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string } | null>(null);
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
  
  const weddingDate = new Date(2026, 5, 20);
  
  const mainImageUrl = mainImage?.url || "";

  const preloadImages = [
    ...(mainImageUrl ? [mainImageUrl] : []),
    ...galleryImages.slice(0, 5).map(img => img.url)
  ].slice(0, 6);

  if (error) {
    console.warn('이미지 로딩 중 오류 발생:', error);
  }

  const pageData = {
    title: "이준호 ♡ 박소민",
    subtitle: "두 사람이 사랑으로 하나가 되는 날",
    coupleNames: "이준호 ♡ 박소민",
    weddingDate: "2026년 6월 20일 토요일 오후 2시",
    groomName: "이준호",
    brideName: "박소민",
    ceremony: {
      date: "2026년 6월 20일 토요일",
      time: "오후 2:00",
      location: "롯데호텔 웨딩홀",
      address: "서울특별시 중구 을지로 30",
      contact: "02-771-1000"
    },
    accountInfo: {
      groom: {
        name: "이준호",
        bank: "신한은행",
        account: "234567-89-012345"
      },
      bride: {
        name: "박소민",
        bank: "우리은행", 
        account: "678901-23-456789"
      }
    }
  };

  if (isLoading || imagesLoading) {
    return (
      <WeddingLoader_1
        groomName="이준호"
        brideName="박소민"
        onLoadComplete={() => setIsLoading(false)}
        mainImage={mainImageUrl}
        preloadImages={preloadImages}
        duration={2500}
      />
    );
  }

  return (
    <main role="main" aria-label="이준호와 박소민의 결혼식 청첩장 (심플 버전)">
      <Cover_1 
        title={pageData.title}
        subtitle={pageData.subtitle} 
        weddingDate={pageData.weddingDate}
        imageUrl={mainImageUrl}
        brideName={pageData.brideName}
        groomName={pageData.groomName}
        preloadComplete={true}
      />
      <Greeting_1 
        message="두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다."
        author="이준호 · 박소민"
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
            title: '이준호 ♥ 박소민 결혼식',
            description: '오후 2시 롯데호텔 웨딩홀'
          }
        ]}
        showCountdown={true}
        countdownTitle="결혼식까지"
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      <Schedule_1 
        date={pageData.ceremony.date}
        time={pageData.ceremony.time}
        venue={pageData.ceremony.location}
        address={pageData.ceremony.address}
      />
      <LocationMap_1 
        venueName={pageData.ceremony.location}
        address={pageData.ceremony.address}
        description="지하철 2호선 을지로입구역에서 도보 5분 거리입니다"
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.543492849434!2d126.98165331568618!3d37.56515197979826!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca2f7dabc1b29%3A0x68e324964fb8e04c!2z66Gv642w7Zi464qU!5e0!3m2!1sko!2skr!4v1642645644356!5m2!1sko!2skr"
      />
      <Guestbook_1 pageSlug={WEDDING_SLUG} />
      <GiftInfo_1 
        groomAccount={{
          bank: pageData.accountInfo.groom.bank,
          accountNumber: pageData.accountInfo.groom.account,
          accountHolder: pageData.accountInfo.groom.name
        }}
        brideAccount={{
          bank: pageData.accountInfo.bride.bank,
          accountNumber: pageData.accountInfo.bride.account,
          accountHolder: pageData.accountInfo.bride.name
        }}
        message="마음만으로도 충분합니다. 축하의 뜻으로 전해주시는 축의금은 소중히 받겠습니다."
      />
      <KakaoShareButton 
        title="이준호 ♡ 박소민 결혼식 (심플 버전)"
        description="2026년 6월 20일 토요일 오후 2시 롯데호텔 웨딩홀에서 열리는 결혼식에 초대합니다."
        imageUrl={mainImageUrl || "/images/thum.jpg"}
      />
    </main>
  );
}
