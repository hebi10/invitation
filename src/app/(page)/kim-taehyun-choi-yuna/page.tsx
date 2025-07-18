'use client';

import { useState } from 'react';
import Head from 'next/head';
import WeddingLoader from '@/components/WeddingLoader';
import Cover from '@/components/Cover';
import Greeting from '@/components/Greeting';
import Gallery from '@/components/Gallery';
import Schedule from '@/components/Schedule';
import LocationMap from '@/components/LocationMap';
import Guestbook from '@/components/Guestbook';
import GiftInfo from '@/components/GiftInfo';

const mockImages = [
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
  'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400',
  'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400'
];

export default function KimTaehyunChoiYuna() {
  const [isLoading, setIsLoading] = useState(true);

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
      <Head>
        <title>김태현 ♥ 최유나 결혼식에 초대합니다</title>
        <meta name="description" content="2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다. 저희의 사랑의 여정을 함께 지켜봐 주세요." />
        <meta name="keywords" content="결혼식,웨딩,청첩장,김태현,최유나,2024년 6월" />
        <meta property="og:title" content="김태현 ♥ 최유나 결혼식 초대" />
        <meta property="og:description" content="2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content="모바일 청첩장" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="김태현 ♥ 최유나 결혼식 초대" />
        <meta name="twitter:description" content="2024년 6월 22일 토요일 오후 1시, 김태현과 최유나가 영원한 약속을 나누는 소중한 순간입니다." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <Cover
        title="Wedding Invitation"
        subtitle="영원한 사랑을 약속합니다"
        imageUrl="https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400"
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
        title="Together Forever"
        images={mockImages}
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
