import type { Metadata } from 'next';

import { getWeddingPageBySlug } from '@/config/weddingPages';
import { getPublicMemoryPageMetadata } from '@/server/memoryPageMetadataService';

import MemoryPageClient from './MemoryPageClient';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

function buildDefaultMetadata(slug: string) {
  const page = getWeddingPageBySlug(slug);
  const title = page ? `${page.displayName} 추억 페이지` : '추억 페이지';
  const description = page
    ? `${page.date} ${page.venue}에서 함께한 시간을 다시 보는 추억 페이지입니다.`
    : '결혼식 이후 사진과 기록을 다시 보는 추억 페이지입니다.';

  return {
    page,
    title,
    description,
  };
}

function getMetadataImage(...candidates: Array<string | undefined>) {
  return (
    candidates.find((candidate) => candidate && !candidate.startsWith('data:')) ?? undefined
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const defaults = buildDefaultMetadata(slug);
  const memoryMetadata = await getPublicMemoryPageMetadata(slug);
  const isPublished = Boolean(
    memoryMetadata && memoryMetadata.enabled && memoryMetadata.visibility !== 'private'
  );
  const allowIndex = Boolean(
    memoryMetadata &&
      memoryMetadata.enabled &&
      memoryMetadata.visibility === 'public' &&
      !memoryMetadata.seoNoIndex
  );
  const title =
    isPublished &&
    memoryMetadata &&
    (memoryMetadata.seoTitle.trim().length > 0 || memoryMetadata.title.trim().length > 0)
      ? memoryMetadata.seoTitle || memoryMetadata.title
      : defaults.title;
  const description =
    isPublished &&
    memoryMetadata &&
    (memoryMetadata.seoDescription.trim().length > 0 ||
      memoryMetadata.introMessage.trim().length > 0)
      ? memoryMetadata.seoDescription || memoryMetadata.introMessage
      : defaults.description;
  const image = getMetadataImage(
    isPublished ? memoryMetadata?.heroThumbnailUrl : undefined,
    isPublished ? memoryMetadata?.heroImageUrl : undefined,
    defaults.page?.metadata.images.wedding
  );

  return {
    title,
    description,
    openGraph: isPublished || defaults.page
      ? {
          type: 'website',
          locale: 'ko_KR',
          title,
          description,
          images: image
            ? [
                {
                  url: image,
                  alt: memoryMetadata?.title || defaults.page?.displayName || title,
                },
              ]
            : undefined,
        }
      : undefined,
    twitter: isPublished || defaults.page
      ? {
          card: 'summary_large_image',
          title,
          description,
          images: image ? [image] : undefined,
        }
      : undefined,
    robots: {
      index: allowIndex,
      follow: allowIndex,
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
