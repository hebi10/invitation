import type { Metadata } from 'next';

import { getAllWeddingPageSlugs } from '@/config/weddingPages';

import MemoryPageClient from './MemoryPageClient';

export function generateStaticParams() {
  return getAllWeddingPageSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '추억 페이지',
    description: '결혼식 이후 사진과 기록을 다시 보는 추억 페이지입니다.',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MemoryPageClient slug={slug} />;
}
