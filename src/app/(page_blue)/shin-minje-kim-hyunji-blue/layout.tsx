import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '신민제 ♥ 김현지 결혼식 초대 (지중해 블루 버전)',
  description: '신민제와 김현지의 결혼식에 여러분을 초대합니다.',
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
