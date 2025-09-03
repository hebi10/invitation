import { ReactNode } from 'react';
import Script from 'next/script';
import { Metadata } from 'next';
import KakaoShareButton from './KakaoShareButton';

export const metadata: Metadata = {
  title: "이준호 ♡ 박소민 결혼식 (심플 버전)",
  description: "2024년 5월 18일 (토) 14:00 대전 스카이라운지에서 열리는 결혼식에 초대합니다.",
  openGraph: {
    title: "이준호 ♡ 박소민 결혼식 (심플 버전)",
    description: "2024년 5월 18일 (토) 14:00 대전 스카이라운지에서 열리는 결혼식에 초대합니다.",
    images: ["/images/thum.jpg"],
    url: '/lee-junho-park-somin',
  },
};

export default function LeeJunhoParkSominSimpleLayout({
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
        title="이준호 ♡ 박소민 결혼식 (심플 버전)"
        description="2024년 5월 18일 (토) 14:00 대전 스카이라운지에서 열리는 결혼식에 초대합니다."
        imageUrl="/images/thum.jpg"
      />
    </>
  );
}
