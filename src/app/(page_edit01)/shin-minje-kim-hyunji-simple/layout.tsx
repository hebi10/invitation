import { ReactNode } from 'react';
import Script from 'next/script';
import { Metadata } from 'next';
import KakaoShareButton from './KakaoShareButton';

export const metadata: Metadata = {
  title: "신민제 ♡ 김현지 결혼식 (심플 버전)",
  description: "2024년 9월 14일 (토) 11:00 부산 베스트웨스턴 호텔에서 열리는 결혼식에 초대합니다.",
  openGraph: {
    title: "신민제 ♡ 김현지 결혼식 (심플 버전)",
    description: "2024년 9월 14일 (토) 11:00 부산 베스트웨스턴 호텔에서 열리는 결혼식에 초대합니다.",
    images: ["/images/thum.jpg"],
    url: '/shin-minje-kim-hyunji',
  },
};

export default function ShinMinJeKimHyunJiSimpleLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Script
        src="https://developers.kakao.com/sdk/js/kakao.js"
        strategy="beforeInteractive"
      />
      {children}
      <KakaoShareButton 
        title="신민제 ♡ 김현지 결혼식 (심플 버전)"
        description="2024년 9월 14일 (토) 11:00 부산 베스트웨스턴 호텔에서 열리는 결혼식에 초대합니다."
        imageUrl="/images/thum.jpg"
      />
    </>
  );
}
