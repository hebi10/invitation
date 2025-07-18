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
  'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400',
  'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400',
  'https://images.unsplash.com/photo-1594736797933-d0c6258a3d68?w=400',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400'
];

export default function LeeJunhoParkSomin() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadComplete = () => {
    setIsLoading(false);
  };

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
      <Head>
        <title>이준호 ♥ 박소민 결혼식에 초대합니다</title>
        <meta name="description" content="2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다. 저희의 행복한 출발을 함께 축복해 주세요." />
        <meta name="keywords" content="결혼식,웨딩,청첩장,이준호,박소민,2024년 5월" />
        <meta property="og:title" content="이준호 ♥ 박소민 결혼식 초대" />
        <meta property="og:description" content="2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content="모바일 청첩장" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="이준호 ♥ 박소민 결혼식 초대" />
        <meta name="twitter:description" content="2024년 5월 18일 일요일 오후 3시, 이준호와 박소민이 사랑으로 하나 되는 특별한 날입니다." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <Cover
        title="Wedding Invitation"
        subtitle="따뜻한 마음으로 초대합니다"
        imageUrl="https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=400"
        brideName="박소민"
        groomName="이준호"
        weddingDate="2024년 5월 18일 토요일"
      />
      
      <Greeting
        message={`사랑하는 가족, 친구 여러분께

저희 두 사람이 하나가 되어 새로운 인생을 시작하려고 합니다.
소중한 분들께서 축복해 주신다면 더없는 기쁨이겠습니다.

진심을 담아 초대드립니다.`}
        author="신랑 이준호, 신부 박소민"
      />
      
      <Gallery
        title="Our Story"
        images={mockImages}
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
      
      <Guestbook pageSlug="lee-junho-park-somin" />
      
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
