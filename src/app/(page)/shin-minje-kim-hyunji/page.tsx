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

export default function ShinMinJeKimHyunJi() {
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreloaded, setImagePreloaded] = useState(false);
  
  // 🎯 간편한 이미지 사용!
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages, loading: imagesLoading } = usePageImages('shin-minje-kim-hyunji');
  
  // 결혼식 날짜 설정
  const weddingDate = new Date(2024, 3, 14); // 2024년 4월 14일
  
  // 기본 갤러리 이미지들 (테스트용 - 더 많은 이미지 추가)
  const mockImages = [
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
    'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400',
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400',
    'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=400',
    'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400'
  ];

  // 메인 이미지 URL 결정
  const mainImageUrl = mainImage?.url || "https://images.unsplash.com/photo-1519741497674-611481863552?w=400";

  // 이미지 프리로딩
  useEffect(() => {
    const preloadImage = new Image();
    preloadImage.onload = () => setImagePreloaded(true);
    preloadImage.src = mainImageUrl;
  }, [mainImageUrl]);

  const handleLoadComplete = () => {
    // 이미지가 프리로드되었을 때만 로딩 완료
    if (imagePreloaded) {
      setIsLoading(false);
    }
  };

  // 이미지 프리로딩이 완료되면 자동으로 로딩 완료
  useEffect(() => {
    if (imagePreloaded && !imagesLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500); // 최소 1.5초는 로딩 화면 유지
      return () => clearTimeout(timer);
    }
  }, [imagePreloaded, imagesLoading]);

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
      <Cover
        title="Wedding Invitation"
        subtitle="우리의 특별한 날에 함께해주세요"
        imageUrl={mainImageUrl}
        brideName="김현지"
        groomName="신민제"
        weddingDate="2024년 4월 14일 일요일"
        preloadComplete={imagePreloaded && !imagesLoading}
      />
      
      <Greeting
        message={`
            소중한 분들을 초대합니다.
            
            서로 다른 길을 걸어온 저희가
            이제 하나의 길을 함께 걸어가려 합니다.
            
            저희의 새로운 시작을
            축복해 주시면 감사하겠습니다.
        `}
        author="신민제 & 김현지"
      />
      
      <Gallery
        title="우리의 이야기"
        images={galleryImages.length > 0 ? galleryImages.map(img => img.url) : mockImages}
      />
      
      <Schedule
        date="2024년 4월 14일 일요일"
        time="오후 2시"
        venue="드림웨딩홀"
        address="서울시 서초구 서초대로 78길 15"
        ceremony={{
          time: "오후 2:00",
          location: "3층 드림홀"
        }}
        reception={{
          time: "오후 3:30",
          location: "2층 연회장"
        }}
      />
      
      <LocationMap
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3165.4567890123!2d127.098765!3d37.456789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDA3JzI0LjQiTiAxMjfCsDA3JzI0LjQiRQ!5e0!3m2!1sko!2skr!4v1234567890123"
        address="서울시 서초구 서초대로 78길 15"
        venueName="드림웨딩홀"
        description="지하철 2호선 서초역 4번 출구에서 도보 7분"
      />
      
      <WeddingCalendar
        title="우리가 만나는 특별한 날"
        weddingDate={weddingDate}
        currentMonth={weddingDate}
        events={[
          {
            date: weddingDate.getDate(),
            type: 'wedding',
            title: '신민제 ♥ 김현지 결혼식',
            description: '오후 2시 드림웨딩홀'
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
          accountNumber: "1002-567-890123",
          accountHolder: "신민제"
        }}
        brideAccount={{
          bank: "국민은행",
          accountNumber: "456789-01-234567",
          accountHolder: "김현지"
        }}
        message="소중한 마음만으로도 충분합니다. 함께해 주셔서 감사합니다."
      />
    </div>
  );
}
