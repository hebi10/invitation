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

export default function KimTaehyunChoiYuna() {
  const [isLoading, setIsLoading] = useState(true);
  
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading } = usePageImages('kim-taehyun-choi-yuna');
  
  const weddingDate = new Date(2024, 5, 8); // 2024년 6월 8일
  
  // 메인 이미지 URL 결정 (Firebase 이미지만 사용)
  const mainImageUrl = mainImage?.url || "";

  // 프리로드할 이미지들 (Firebase 갤러리 이미지만 사용)
  const preloadImages = galleryImages.map(img => img.url);

  const pageData = {
    title: "김태현 ♡ 최유나",
    subtitle: "영원한 사랑을 약속합니다",
    coupleNames: "김태현 ♡ 최유나",
    weddingDate: "2024년 6월 8일 토요일 오후 2시",
    groomName: "김태현",
    brideName: "최유나",
    groomFamily: {
      father: "김진수",
      mother: "이미경",
      relation: "차남"
    },
    brideFamily: {
      father: "최경호",
      mother: "박선희", 
      relation: "장녀"
    },
    ceremony: {
      date: "2024년 6월 8일 토요일",
      time: "오후 2:00",
      location: "로즈가든 웨딩홀",
      address: "서울특별시 강남구 압구정로 456",
      contact: "02-2345-6789"
    },
    reception: {
      date: "2024년 6월 8일 토요일", 
      time: "오후 3:30",
      location: "로즈가든 웨딩홀 리셉션홀",
      address: "서울특별시 강남구 압구정로 456"
    },
    contact: {
      groom: {
        name: "김태현",
        phone: "010-2345-6789"
      },
      bride: {
        name: "최유나", 
        phone: "010-9876-5432"
      },
      groomParents: {
        father: { name: "김진수", phone: "010-1111-3333" },
        mother: { name: "이미경", phone: "010-4444-5555" }
      },
      brideParents: {
        father: { name: "최경호", phone: "010-6666-7777" },
        mother: { name: "박선희", phone: "010-8888-9999" }
      }
    },
    accountInfo: {
      groom: {
        name: "김태현",
        bank: "신한은행",
        account: "110-123-456789"
      },
      bride: {
        name: "최유나",
        bank: "우리은행", 
        account: "1002-234-567890"
      },
      groomParents: {
        father: { name: "김진수", bank: "NH농협은행", account: "222-333-444555" },
        mother: { name: "이미경", bank: "KB국민은행", account: "666-777-888999" }
      },
      brideParents: {
        father: { name: "최경호", bank: "기업은행", account: "111-222-333444" },
        mother: { name: "박선희", bank: "하나은행", account: "555-666-777888" }
      }
    }
  };

  if (isLoading) {
    return (
      <WeddingLoader 
        groomName="김태현"
        brideName="최유나"
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
      />
      <Greeting 
        message="두 사람이 사랑으로 하나가 되는 순간을 함께해 주시는 모든 분들께 감사드립니다. 새로운 시작을 따뜻한 마음으로 축복해 주시면 더없는 기쁨이겠습니다."
        author="김태현 · 최유나"
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
            title: '김태현 ♥ 최유나 결혼식',
            description: '오후 2시 로즈가든 웨딩홀'
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
        description="지하철 이용 시 로즈가든 웨딩홀까지 편리하게 오실 수 있습니다"
      />
      <Guestbook pageSlug="kim-taehyun-choi-yuna" />
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
