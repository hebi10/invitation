import type { Metadata } from 'next';
import { getAllWeddingPageSlugs, getWeddingPageBySlug } from '@/config/weddingPages';
import MemoryPageClient from './MemoryPageClient';

export function generateStaticParams() {
  return getAllWeddingPageSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pageConfig = getWeddingPageBySlug(slug);

  if (!pageConfig) {
    return {
      title: '추억 페이지',
      description: '결혼식 이후의 사진과 기록을 다시 볼 수 있는 추억 페이지입니다.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${pageConfig.groomName} ♥ ${pageConfig.brideName}의 추억 페이지`,
    description: `${pageConfig.date} ${pageConfig.venue}에서 함께한 결혼식의 순간을 다시 담아둔 기록형 페이지입니다.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function MemoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MemoryPageClient slug={slug} />;
}
