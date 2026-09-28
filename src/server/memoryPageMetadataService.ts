import 'server-only';

import type { MemoryPageMetadataSnapshotRecord } from '@/lib/memoryPageMetadataSnapshot';
import { normalizeInvitationPageSlugInput } from '@/lib/invitationPagePersistence';
import { memoryPageMetadataRepository } from './repositories/memoryPageMetadataRepository';

const readString = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export async function getPublicMemoryPageMetadata(
  pageSlug: string,
  repository: Pick<typeof memoryPageMetadataRepository, 'findBySlug'> = memoryPageMetadataRepository
): Promise<MemoryPageMetadataSnapshotRecord | null> {
  const slug = normalizeInvitationPageSlugInput(pageSlug);
  if (!slug) return null;

  try {
    const data = await repository.findBySlug(slug);
    if (!data || data.enabled !== true || !['public', 'unlisted'].includes(String(data.visibility))) return null;
    const hero = data.heroImage && typeof data.heroImage === 'object'
      ? data.heroImage as Record<string, unknown> : {};
    return {
      pageSlug: slug,
      enabled: true,
      visibility: data.visibility === 'public' ? 'public' : 'unlisted',
      title: readString(data.title),
      introMessage: readString(data.introMessage),
      seoTitle: readString(data.seoTitle),
      seoDescription: readString(data.seoDescription),
      seoNoIndex: data.seoNoIndex === true,
      heroImageUrl: readString(hero.url),
      heroThumbnailUrl: readString(data.heroThumbnailUrl) || readString(hero.thumbnailUrl) || readString(hero.url),
    };
  } catch {
    // Never fall back to a build snapshot that may describe a now-private page.
    return null;
  }
}
