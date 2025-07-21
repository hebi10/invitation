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
import { checkPageAccess, AccessDeniedPage } from '@/utils';
import { useAdmin } from '@/contexts';

export default function ShinMinJeKimHyunJi() {
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');
  const { isAdminLoggedIn } = useAdmin();
  
  // 🎯 간편한 이미지 사용!
  const { images, imageUrls, firstImage, hasImages, mainImage, galleryImages } = usePageImages('shin-minje-kim-hyunji');
  
  // 페이지 접근 권한 확인
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const result = await checkPageAccess('shin-minje-kim-hyunji', isAdminLoggedIn);
        if (!result.canAccess) {
          setAccessDenied(true);
          setAccessMessage(result.message || '이 페이지에 접근할 수 없습니다.');
          setIsLoading(false);
          return;
        }
        setAccessDenied(false);
      } catch (error) {
        console.error('접근 권한 확인 중 오류:', error);
        // 오류 발생 시 기본적으로 접근 허용
      }
    };

    checkAccess();
  }, [isAdminLoggedIn]);
  
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

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  // 접근 거부 상태 체크
  if (accessDenied) {
    return <AccessDeniedPage message={accessMessage} />;
  }

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
        mapUrl="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d80283.53932035618!2d127.01322032641399!3d37.602953498328084!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357ca2ed7e74759b%3A0x7b496f955842d68!2z7JWE66as656R7Z6QIO2YuO2FlCDrj5nrjIDrrLg!5e0!3m2!1sko!2sus!4v1753075112599!5m2!1sko!2sus"
        address="서울시 성북구 아리랑로 8"
        venueName="아리랑힐 호텔 동대문"
        description="4호선 성신여대입구역 6번 출구로 나오시면 도보 1분 거리에 있습니다."
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
