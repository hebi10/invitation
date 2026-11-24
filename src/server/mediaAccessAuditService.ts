import 'server-only';

import { getServerStorageBucket } from './firebaseAdmin';
import { findEventSlugIndexBySlug, findStoredEventSummaryById } from './repositories/eventRepository';
import { MediaAssetError } from './mediaAssetService';

const MAX_OBJECTS_PER_PREFIX = 300;
const IMAGE_NAMESPACES = ['wedding-images', 'memory-images'] as const;
type ImageNamespace = typeof IMAGE_NAMESPACES[number];
type AuditedObject = { path: string; tokenPresent: boolean; noStore: boolean; variant: string | null };
type AuditPage = { objects: AuditedObject[]; complete: boolean };

async function listImageMetadata(prefix: string): Promise<AuditPage> {
  const bucket = getServerStorageBucket();
  if (!bucket) throw new MediaAssetError(503, '이미지 저장소를 확인할 수 없습니다.');
  const [files, nextQuery] = await bucket.getFiles({
    prefix, autoPaginate: false, maxResults: MAX_OBJECTS_PER_PREFIX + 1,
  });
  const objects: AuditedObject[] = [];
  const boundedFiles = files.slice(0, MAX_OBJECTS_PER_PREFIX);
  for (let offset = 0; offset < boundedFiles.length; offset += 10) {
    const metadata = await Promise.all(boundedFiles.slice(offset, offset + 10).map(async file => {
      if (!file.name.startsWith(prefix) || file.name === prefix) {
        throw new MediaAssetError(503, '이미지 저장 경로를 확인하지 못했습니다.');
      }
      const [data] = await file.getMetadata();
      const custom = data.metadata;
      return {
        path: file.name,
        tokenPresent: typeof custom?.firebaseStorageDownloadTokens === 'string' && custom.firebaseStorageDownloadTokens.trim().length > 0,
        noStore: typeof data.cacheControl === 'string' && /(?:^|,)\s*no-store\s*(?:,|$)/i.test(data.cacheControl),
        variant: typeof custom?.variant === 'string' ? custom.variant : null,
      };
    }));
    objects.push(...metadata);
  }
  return { objects, complete: files.length <= MAX_OBJECTS_PER_PREFIX && !nextQuery };
}

async function eventExists(slug: string) {
  // Direct reads only: do not use the index repair/auto-create path.
  const index = await findEventSlugIndexBySlug(slug);
  if (!index || index.status !== 'active' || index.slug !== slug) return false;
  const summary = await findStoredEventSummaryById(index.eventId);
  return summary?.slug === slug;
}

function summarize(namespace: ImageNamespace, page: AuditPage) {
  const tokenObjects = page.objects.filter(object => object.tokenPresent).length;
  return {
    namespace,
    inspectedObjects: page.objects.length,
    tokenObjects,
    cacheReviewObjects: page.objects.filter(object => !object.noStore).length,
    originalTokenObjects: page.objects.filter(object => object.tokenPresent && object.variant === 'original').length,
    complete: page.complete,
  };
}

/** A bounded, read-only diagnostic. Never return object paths, token values, or URLs. */
export async function getServerMediaAccessAudit(slug: string, dependencies = {
  eventExists,
  list: listImageMetadata,
}) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug)) {
    throw new MediaAssetError(400, '올바른 페이지 주소가 필요합니다.');
  }
  if (!await dependencies.eventExists(slug)) throw new MediaAssetError(404, '초대장을 찾지 못했습니다.');
  const results = await Promise.all(IMAGE_NAMESPACES.map(async namespace => {
    const prefix = `${namespace}/${slug}/`;
    const page = await dependencies.list(prefix);
    if (page.objects.length > MAX_OBJECTS_PER_PREFIX ||
        page.objects.some(object => !object.path.startsWith(prefix) || object.path === prefix)) {
      throw new MediaAssetError(503, '이미지 점검 범위를 확인하지 못했습니다.');
    }
    return summarize(namespace, page);
  }));
  return { complete: results.every(result => result.complete), results };
}
