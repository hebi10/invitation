'use client';

import { useState } from 'react';
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
  
  // 🎯 간편한 이미지 사용!
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages } = usePageImages('kim-taehyun-choi-yuna');
  
  // 결혼식 날짜 설정
  const weddingDate = new Date(2024, 5, 8); // 2024년 6월 8일
  
  // 기본 갤러리 이미지들
  const mockImages = [
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
    'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400'
  ];

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <WeddingLoader
        brideName="최유나"
        groomName="김태현"
        onLoadComplete={handleLoadComplete}
        duration={3000}
      />
    );
  }

  return (
    <div>
      <Cover
        title="Wedding Invitation"
        subtitle="영원한 사랑을 약속합니다"
        imageUrl={mainImage?.url || "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400"}
        brideName="최유나"
        groomName="김태현"
        weddingDate="2024년 6월 8일 토요일"
      />
      
      <Greeting
        message={`
            여러분의 사랑으로 성장한 저희가
            이제 한 가정을 이루려고 합니다.

            늘 곁에서 사랑으로 돌봐주신 분들이 계셨기에
            오늘의 저희가 있을 수 있었습니다.

            저희의 첫걸음을 지켜봐 주세요.
        `}
        author="김태현 & 최유나"
      />
      
      <Gallery
        title="영원히 함께"
        images={galleryImages.length > 0 ? galleryImages.map(img => img.url) : mockImages}
      />
      
      <Schedule
        date="2024년 6월 8일 토요일"
        time="오후 1시"
        venue="엘리시안 웨딩홀"
        address="서울시 강남구 논현로 825"
        ceremony={{
          time: "오후 1:00",
          location: "B1층 엘리시안홀"
        }}
        reception={{
          time: "오후 2:30",
          location: "1층 가든파티룸"
        }}
      />
      
      <LocationMap
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3165.1234567890!2d127.123456!3d37.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDA3JzI0LjQiTiAxMjfCsDA3JzI0LjQiRQ!5e0!3m2!1sko!2skr!4v1234567890123"
        address="서울시 강남구 논현로 825"
        venueName="엘리시안 웨딩홀"
        description="지하철 7호선 논현역 3번 출구에서 도보 5분"
      />
      
      <WeddingCalendar
        title="소중한 날을 기억해주세요"
        weddingDate={weddingDate}
        currentMonth={weddingDate}
        events={[
          {
            date: weddingDate.getDate(),
            type: 'wedding',
            title: '김태현 ♥ 최유나 결혼식',
            description: '오후 2시 30분 엘리시안 웨딩홀'
          }
        ]}
        onDateClick={(date) => {
          console.log('선택된 날짜:', date);
        }}
      />
      
      <Guestbook pageSlug="kim-taehyun-choi-yuna" />
      
      <GiftInfo
        groomAccount={{
          bank: "신한은행",
          accountNumber: "110-456-789012",
          accountHolder: "김태현"
        }}
        brideAccount={{
          bank: "카카오뱅크",
          accountNumber: "3333-01-1234567",
          accountHolder: "최유나"
        }}
        message="참석만으로도 큰 축복입니다. 따뜻한 마음 감사히 받겠습니다."
      />
    </div>
  );
}
