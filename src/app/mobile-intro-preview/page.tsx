import type { Metadata } from 'next';
import { normalizeWeddingIntroStyle } from '@/lib/weddingIntro';
import IntroPreviewClient from './IntroPreviewClient';

export const metadata: Metadata = {
  title: '청첩장 첫 화면 연출 미리보기',
  robots: { index: false, follow: false },
};

export default async function MobileIntroPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string }>;
}) {
  const { style } = await searchParams;
  return <IntroPreviewClient style={normalizeWeddingIntroStyle(style)} />;
}
