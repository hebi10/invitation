'use client';

import { useState } from 'react';
import Head from 'next/head';
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
import { usePageImages } from '@/hooks';export default function ShinMinJeKimHyunJi() {
  const [isLoading, setIsLoading] = useState(true);
  
  // 🎯 간편한 이미지 사용!
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages } = usePageImages('shin-minje-kim-hyunji');
  
  // 결혼식 날짜 설정
  const weddingDate = new Date(2024, 3, 14); // 2024년 4월 14일
  
  // 기본 갤러리 이미지들
  const mockImages = [
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400'
  ];

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <WeddingLoader
        brideName="김현지"
        groomName="신민제"
        onLoadComplete={handleLoadComplete}
        duration={3000}
      />
    );
  }

  return (
    <div>
      <Head>
        <title>신민제 ♥ 김현지 결혼식에 초대합니다</title>
        <meta name="description" content="2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다. 저희의 새로운 시작을 함께 축복해 주세요." />
        <meta name="keywords" content="결혼식,웨딩,청첩장,신민제,김현지,2024년 4월" />
        <meta property="og:title" content="신민제 ♥ 김현지 결혼식 초대" />
        <meta property="og:description" content="2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content="모바일 청첩장" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="신민제 ♥ 김현지 결혼식 초대" />
        <meta name="twitter:description" content="2024년 4월 14일 토요일 오후 2시, 신민제와 김현지가 하나 되는 날에 소중한 분들을 초대합니다." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <Cover
        title="Wedding Invitation"
        subtitle="우리의 특별한 날에 함께해주세요"
        imageUrl={mainImage?.url || "https://images.unsplash.com/photo-1519741497674-611481863552?w=400"}
        brideName="김현지"
        groomName="신민제"
        weddingDate="2024년 4월 20일 토요일"
      />
      
      <Greeting
        message={`
          안녕하세요. 
          저희 두 사람이 사랑의 결실을 맺어 
          부부의 연을 맺게 되었습니다.

          늘 받기만 했던 사랑을 이제 함께 나누며 살겠습니다.
          저희의 새로운 시작을 축복해 주시면 감사하겠습니다.
          `}
        author="신랑 신민제, 신부 김현지"
      />
      
      <Gallery
        title="우리의 소중한 순간들"
        images={galleryImages.length > 0 ? galleryImages.map(img => img.url) : mockImages}
      />
      
      <Schedule
        date="2024년 4월 20일 토요일"
        time="오후 3시"
        venue="라벤더 웨딩홀"
        address="서울시 서초구 강남대로 456"
        ceremony={{
          time: "오후 3:00",
          location: "본관 1층 라벤더홀"
        }}
        reception={{
          time: "오후 4:30",
          location: "본관 2층 로즈홀"
        }}
      />
      
      <LocationMap
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3165.1234567890!2d127.123456!3d37.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDA3JzI0LjQiTiAxMjfCsDA3JzI0LjQiRQ!5e0!3m2!1sko!2skr!4v1234567890123"
        address="서울시 종로구 세종대로 175"
        venueName="블루밍 웨딩홀"
        description="지하철 1호선 종각역 1번 출구에서 도보 2분"
      />
      
      <WeddingCalendar
        title="특별한 날을 함께해주세요"
        weddingDate={weddingDate}
        currentMonth={weddingDate}
        events={[
          {
            date: weddingDate.getDate(),
            type: 'wedding',
            title: '신민제 ♥ 김현지 결혼식',
            description: '오후 3시 라벤더 웨딩홀'
          }
        ]}
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      
      <Guestbook pageSlug="shin-minje-kim-hyunji" />
      
      <GiftInfo
        groomAccount={{
          bank: "우리은행",
          accountNumber: "1002-123-456789",
          accountHolder: "신민제"
        }}
        brideAccount={{
          bank: "하나은행",
          accountNumber: "123-456789-12345",
          accountHolder: "김현지"
        }}
        message="축하의 마음을 전하고 싶으시다면 아래 계좌로 송금해주세요. 정성스러운 마음만으로도 충분합니다."
      />
    </div>
  );
}
