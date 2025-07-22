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
  const [imagePreloaded, setImagePreloaded] = useState(false);
  
  // 🎯 간편한 이미지 사용!
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading } = usePageImages('lee-junho-park-somin');
  
  // 결혼식 날짜 설정
  const weddingDate = new Date(2024, 4, 18); // 2024년 5월 18일
  
  // 기본 갤러리 이미지들
  const mockImages = [
    'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400',
    'https://images.unsplash.com/photo-1594736797933-d0c6258a3d68?w=400',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400',
    'https://images.unsplash.com/photo-1594736797933-d0c6258a3d68?w=400',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400'
  ];

  // 메인 이미지 URL 결정
  const mainImageUrl = mainImage?.url || "https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400";

  // 이미지 프리로딩
  useEffect(() => {
    const preloadImage = new Image();
    preloadImage.onload = () => setImagePreloaded(true);
    preloadImage.src = mainImageUrl;
  }, [mainImageUrl]);

  const handleLoadComplete = () => {
    // 로더가 완료되고 이미지가 프리로드되었을 때만 로딩 완료
    if (imagePreloaded && !imagesLoading) {
      setIsLoading(false);
    }
  };

  // 이미지 프리로딩이 완료되면 자동으로 로딩 완료 준비
  useEffect(() => {
    if (imagePreloaded && !imagesLoading) {
      // 이미지가 준비되었음을 표시하지만 로더가 완료될 때까지 기다림
      console.log('Images ready, waiting for loader completion');
    }
  }, [imagePreloaded, imagesLoading]);

  if (isLoading) {
    return (
      <WeddingLoader
        brideName="박소민"
        groomName="이준호"
        onLoadComplete={handleLoadComplete}
        duration={3000}
      />
    );
  }

  return (
    <div>
      <Cover
        title="Wedding Invitation"
        subtitle="따뜻한 마음으로 초대합니다"
        imageUrl={mainImageUrl}
        brideName="박소민"
        groomName="이준호"
        weddingDate="2024년 5월 18일 토요일"
        preloadComplete={imagePreloaded && !imagesLoading}
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
        images={galleryImages.length > 0 ? galleryImages.map(img => img.url) : mockImages}
      />
      
      <Schedule
        date="2024년 5월 18일 토요일"
        time="오후 2시 30분"
        venue="블루밍 웨딩홀"
        address="서울시 종로구 세종대로 175"
        ceremony={{
          time: "오후 2:30",
          location: "3층 블루밍홀"
        }}
        reception={{
          time: "오후 4:00",
          location: "4층 가든홀"
        }}
      />
      
      <LocationMap
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3165.1234567890!2d127.123456!3d37.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDA3JzI0LjQiTiAxMjfCsDA3JzI0LjQiRQ!5e0!3m2!1sko!2skr!4v1234567890123"
        address="서울시 종로구 세종대로 175"
        venueName="블루밍 웨딩홀"
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
          bank: "KB국민은행",
          accountNumber: "123456-78-901234",
          accountHolder: "이준호"
        }}
        brideAccount={{
          bank: "NH농협은행",
          accountNumber: "301-0123-4567-89",
          accountHolder: "박소민"
        }}
        message="마음만으로도 충분합니다. 축하의 뜻으로 전해주시는 축의금은 소중히 받겠습니다."
      />
    </div>
  );
}
