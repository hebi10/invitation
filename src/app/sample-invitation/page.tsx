import type { Metadata } from 'next';
import SampleInvitation from './SampleInvitation';

export const metadata: Metadata = {
  title: '기본형 청첩장 샘플',
  description: '사진과 예시 방명록이 담긴 기본형 청첩장을 둘러보세요.',
  robots: { index: false, follow: false },
};

export default async function SampleInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string | string[]; qaTheme?: string | string[]; qaMusic?: string | string[]; qaUI07?: string | string[]; qaUI07Case?: string | string[]; qaUI07Map?: string | string[]; qaUI07Intro?: string | string[]; qaR08GalleryCount?: string | string[]; qaR08NoCover?: string | string[] }>;
}) {
  const query = await searchParams;
  const theme = query.qaTheme === 'romantic' || query.qaTheme === 'gyeol' || query.qaTheme === 'classic-r' || query.qaTheme === 'emotional' ? query.qaTheme : 'simple';
  const qaUI07 = process.env.NODE_ENV !== 'production' && query.qaUI07 === '1';
  const qaUI07Case = qaUI07 && (query.qaUI07Case === 'groom' || query.qaUI07Case === 'bride' || query.qaUI07Case === 'empty' || query.qaUI07Case === 'long')
    ? query.qaUI07Case
    : 'full';
  const qaUI07Map = qaUI07 && (query.qaUI07Map === 'coordinates' || query.qaUI07Map === 'geocode')
    ? query.qaUI07Map
    : 'off';
  const qaUI07Intro = qaUI07 && (query.qaUI07Intro === 'light' || query.qaUI07Intro === 'cinema' || query.qaUI07Intro === 'envelope')
    ? query.qaUI07Intro
    : 'none';
  const qaR08GalleryCount = qaUI07 && typeof query.qaR08GalleryCount === 'string' && ['0', '1', '2', '3'].includes(query.qaR08GalleryCount)
    ? Number(query.qaR08GalleryCount) : null;
  const qaR08NoCover = qaUI07 && query.qaR08NoCover === '1';
  return <SampleInvitation embedded={query.embed === '1'} theme={theme} qaMusic={query.qaMusic === '1'} qaUI07={qaUI07} qaUI07Case={qaUI07Case} qaUI07Map={qaUI07Map} qaUI07Intro={qaUI07Intro} qaR08GalleryCount={qaR08GalleryCount} qaR08NoCover={qaR08NoCover} />;
}
