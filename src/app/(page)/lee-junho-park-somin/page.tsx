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
  GiftInfo,
  Guestbook
} from '@/components';
import { usePageImages } from '@/hooks';
import { AccessDeniedPage, checkPageAccess } from '@/utils';
import { useAdmin } from '@/contexts';

const WEDDING_SLUG = "lee-junho-park-somin";

export default function page() {
  const [access, setAccess] = useState<{ canAccess: boolean; message?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading, error } = 
  usePageImages(WEDDING_SLUG);

  const { isAdminLoggedIn } = useAdmin();

  useEffect(() => {
    let canceled = false;
    document.title = '이준호 ♡ 박소민 결혼식 - 2026년 6월 20일';
    console.log('isAdminLoggedIn:', isAdminLoggedIn);
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
  
  const weddingDate = new Date(2026, 5, 20);
  
  // 메인 이미지 URL 결정 (Firebase 이미지만 사용)
  const mainImageUrl = mainImage?.url || "";

  // 프리로드할 이미지들 (Firebase 갤러리 이미지만 사용) - 최대 6개로 제한
  const preloadImages = galleryImages.slice(0, 6).map(img => img.url);

  // 에러 상태 처리
  if (error) {
    console.warn('이미지 로딩 중 오류 발생:', error);
    // 에러가 있어도 기본 이미지로 진행
  }  const pageData = {
    title: "이준호 ♡ 박소민",
    subtitle: "두 사람이 사랑으로 하나가 되는 날",
    coupleNames: "이준호 ♡ 박소민",
    weddingDate: "2026년 6월 20일 토요일 오후 2시",
    groomName: "이준호",
    brideName: "박소민",
    groomFamily: {
      father: "이성민",
      mother: "김지영",
      relation: "장남"
    },
    brideFamily: {
      father: "박준수",
      mother: "최현숙", 
      relation: "장녀"
    },
    ceremony: {
      date: "2026년 6월 20일 토요일",
      time: "오후 2:00",
      location: "롯데호텔 웨딩홀",
      address: "서울특별시 중구 을지로 30",
      contact: "02-771-1000"
    },
    reception: {
      date: "2026년 6월 20일 토요일", 
      time: "오후 3:30",
      location: "롯데호텔 웨딩홀 리셉션",
      address: "서울특별시 중구 을지로 30"
    },
    contact: {
      groom: {
        name: "이준호",
        phone: "010-2345-6789"
      },
      bride: {
        name: "박소민", 
        phone: "010-9876-5432"
      },
      groomParents: {
        father: { name: "이성민", phone: "010-1111-3333" },
        mother: { name: "김지영", phone: "010-4444-5555" }
      },
      brideParents: {
        father: { name: "박준수", phone: "010-6666-7777" },
        mother: { name: "최현숙", phone: "010-8888-9999" }
      }
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
      },
      groomParents: {
        father: { name: "이성민", bank: "하나은행", account: "222-333-444555" },
        mother: { name: "김지영", bank: "국민은행", account: "666-777-888999" }
      },
      brideParents: {
        father: { name: "박준수", bank: "기업은행", account: "000-111-222333" },
        mother: { name: "최현숙", bank: "농협은행", account: "444-555-666777" }
      }
    }
  };

  // 이미지 로딩이 완료되지 않은 경우 로더 표시
  if (isLoading || imagesLoading) {
    return (
      <WeddingLoader
        groomName="이준호"
        brideName="박소민"
        onLoadComplete={() => setIsLoading(false)}
        mainImage={mainImageUrl}
        preloadImages={preloadImages}
        duration={2500} // 로딩 시간 단축
      />
    );
  }

  return (
    <main role="main" aria-label="이준호와 박소민의 결혼식 청첩장">
      <Cover 
        title={pageData.title}
        subtitle={pageData.subtitle} 
        weddingDate={pageData.weddingDate}
        imageUrl={mainImageUrl}
        brideName={pageData.brideName}
        groomName={pageData.groomName}
        preloadComplete={true}
      />
      <Greeting 
        message="두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다."
        author="이준호 · 박소민"
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
            title: '이준호 ♥ 박소민 결혼식',
            description: '오후 2시 롯데호텔 웨딩홀'
          }
        ]}
        showCountdown={true} // 카운트다운 표시
        countdownTitle="결혼식까지"
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      <Schedule 
        date={pageData.ceremony.date}
        time={pageData.ceremony.time}
        venue={pageData.ceremony.location}
        address={pageData.ceremony.address}
      />
      <LocationMap 
        venueName={pageData.ceremony.location}
        address={pageData.ceremony.address}
        description="지하철 2호선 을지로입구역에서 도보 5분 거리입니다"
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.543492849434!2d126.98165331568618!3d37.56515197979826!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca2f7dabc1b29%3A0x68e324964fb8e04c!2z66Gv642w7Zi464qU!5e0!3m2!1sko!2skr!4v1642645644356!5m2!1sko!2skr"
      />
      <Guestbook pageSlug={WEDDING_SLUG} />
      <GiftInfo 
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
    </main>
  );
}