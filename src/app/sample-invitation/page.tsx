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
  searchParams: Promise<{ embed?: string | string[]; qaTheme?: string | string[]; qaMusic?: string | string[]; qaUI07?: string | string[] }>;
}) {
  const query = await searchParams;
  const theme = query.qaTheme === 'romantic' || query.qaTheme === 'gyeol' || query.qaTheme === 'classic-r' || query.qaTheme === 'emotional' ? query.qaTheme : 'simple';
  return <SampleInvitation embedded={query.embed === '1'} theme={theme} qaMusic={query.qaMusic === '1'} qaUI07={process.env.NODE_ENV !== 'production' && query.qaUI07 === '1'} />;
}
