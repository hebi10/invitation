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
  GiftInfo 
} from '@/components';
import { usePageImages } from '@/hooks';

export default function LeeJunhoParkSomin() {
  const [isLoading, setIsLoading] = useState(true);
  
  // 🎯 간편한 이미지 사용!
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading } = usePageImages('lee-junho-park-somin');
  
  // 결혼식 날짜 설정
  const weddingDate = new Date(2024, 4, 18); // 2024년 5월 18일
  
  // 메인 이미지 URL 결정 (Firebase 이미지만 사용)
  const mainImageUrl = mainImage?.url || "";

  // 프리로드할 이미지들 (Firebase 갤러리 이미지만 사용)
  const preloadImages = galleryImages.map(img => img.url);

  const pageData = {
    title: "이준호 ♡ 박소민",
    subtitle: "따뜻한 마음으로 초대합니다",
    weddingDate: "2024년 5월 18일 토요일 오후 1시 30분",
    groomName: "이준호",
    brideName: "박소민",
    ceremony: {
      date: "2024년 5월 18일 토요일",
      time: "오후 1:30",
      location: "블루밍 웨딩홀",
      address: "서울시 종로구 세종대로 175"
    },
    accountInfo: {
      groom: {
        name: "이준호",
        bank: "KB국민은행",
        account: "123456-78-901234"
      },
      bride: {
        name: "박소민",
        bank: "NH농협은행", 
        account: "301-0123-4567-89"
      }
    }
  };

  if (isLoading) {
    return (
      <WeddingLoader
        brideName="박소민"
        groomName="이준호"
        onLoadComplete={() => setIsLoading(false)}
        mainImage={mainImageUrl}
        preloadImages={preloadImages}
        duration={3000}
      />
    );
  }

  return (
    <div>
      <Cover
        title={pageData.title}
        subtitle={pageData.subtitle}
        imageUrl={mainImageUrl}
        brideName={pageData.brideName}
        groomName={pageData.groomName}
        weddingDate={pageData.weddingDate}
      />
      
      <Greeting
        message={`사랑하는 가족, 친구 여러분께

        저희 두 사람이 하나가 되어 새로운 인생을 시작하려고 합니다.
        소중한 분들께서 축복해 주신다면 더없는 기쁨이겠습니다.

        진심을 담아 초대드립니다.`}
        author="신랑 이준호, 신부 박소민"
      />
      
      <Gallery
        title="우리의 사랑 이야기"
        images={galleryImages.map(img => img.url)}
      />
      
      <Schedule
        date={pageData.ceremony.date}
        time={pageData.ceremony.time}
        venue={pageData.ceremony.location}
        address={pageData.ceremony.address}
      />
      
      <LocationMap
        address={pageData.ceremony.address}
        venueName={pageData.ceremony.location}
        description="지하철 1호선 종각역 1번 출구에서 도보 2분"
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
            description: '오후 1시 30분 블루밍 웨딩홀'
          }
        ]}
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      
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
    </div>
  );
}
