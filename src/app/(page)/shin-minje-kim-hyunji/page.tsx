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

export default function ShinMinJeKimHyunJi() {
  const [isLoading, setIsLoading] = useState(true);
  
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading } = usePageImages('shin-minje-kim-hyunji');
  
  const weddingDate = new Date(2026, 3, 14);
  
  // 메인 이미지 URL 결정 (Firebase 이미지만 사용)
  const mainImageUrl = mainImage?.url || "";

  // 프리로드할 이미지들 (Firebase 갤러리 이미지만 사용)
  const preloadImages = galleryImages.map(img => img.url);

  const pageData = {
    title: "신민제 ♡ 김현지",
    subtitle: "두 사람이 사랑으로 하나가 되는 날",
    coupleNames: "신민제 ♡ 김현지",
    weddingDate: "2026년 4월 14일 토요일 오후 3시",
    groomName: "신민제",
    brideName: "김현지",
    groomFamily: {
      father: "신동현",
      mother: "박미영",
      relation: "장남"
    },
    brideFamily: {
      father: "김태준",
      mother: "이소영", 
      relation: "장녀"
    },
    ceremony: {
      date: "2026년 4월 14일 토요일",
      time: "오후 3:00",
      location: "더케이웨딩홀",
      address: "서울특별시 강남구 테헤란로 123",
      contact: "02-1234-5678"
    },
    reception: {
      date: "2026년 4월 14일 토요일", 
      time: "오후 4:30",
      location: "더케이웨딩홀 리셉션홀",
      address: "서울특별시 강남구 테헤란로 123"
    },
    contact: {
      groom: {
        name: "신민제",
        phone: "010-1234-5678"
      },
      bride: {
        name: "김현지", 
        phone: "010-8765-4321"
      },
      groomParents: {
        father: { name: "신동현", phone: "010-1111-2222" },
        mother: { name: "박미영", phone: "010-3333-4444" }
      },
      brideParents: {
        father: { name: "김태준", phone: "010-5555-6666" },
        mother: { name: "이소영", phone: "010-7777-8888" }
      }
    },
    accountInfo: {
      groom: {
        name: "신민제",
        bank: "국민은행",
        account: "123456-78-901234"
      },
      bride: {
        name: "김현지",
        bank: "신한은행", 
        account: "567890-12-345678"
      },
      groomParents: {
        father: { name: "신동현", bank: "우리은행", account: "111-222-333444" },
        mother: { name: "박미영", bank: "하나은행", account: "555-666-777888" }
      },
      brideParents: {
        father: { name: "김태준", bank: "KB국민은행", account: "999-000-111222" },
        mother: { name: "이소영", bank: "기업은행", account: "333-444-555666" }
      }
    }
  };

  if (isLoading) {
    return (
      <WeddingLoader 
        groomName="신민제"
        brideName="김현지"
        onLoadComplete={() => setIsLoading(false)}
        mainImage={mainImageUrl}
        preloadImages={preloadImages}
        duration={3000}
      />
    );
  }

  return (
    <main>
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
        author="신민제 · 김현지"
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
            title: '신민제 ♥ 김현지 결혼식',
            description: '오후 3시 더케이웨딩홀'
          }
        ]}
        showCountdown={true}
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
        description="지하철 이용 시 더케이웨딩홀까지 편리하게 오실 수 있습니다"
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25314.40229051596!2d127.01265801385874!3d37.52441811794768!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca4784ed95631%3A0x12a8bf0e6438ac7!2z642U7YG0656Y7Iqk7LKt64u0!5e0!3m2!1sko!2skr!4v1753176333092!5m2!1sko!2skr"
      />
      <Guestbook pageSlug="shin-minje-kim-hyunji" />
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
