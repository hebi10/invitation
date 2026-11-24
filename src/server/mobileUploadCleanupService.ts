import 'server-only';

import { collectMediaUsageReferences, getMediaAssetUsage } from '@/lib/mediaAssets';
import { getServerStorageBucket } from './firebaseAdmin';
import { MediaAssetError } from './mediaAssetService';
import { getMobileUploadVariantPaths, hashMobileUploadEditorSession } from './mobileUploadCleanupPolicy';
import { readInvitationMediaRecord } from './repositories/invitationMediaRepository';
import { memoryPageMetadataRepository } from './repositories/memoryPageMetadataRepository';

type ObjectMetadata = {
  path: string;
  generation: string;
  pageSlug: string;
  variant: string;
  mobileEditorSessionHash: string;
  uploadSessionId: string;
};

async function inspectObject(path: string): Promise<ObjectMetadata | null> {
  const bucket = getServerStorageBucket();
  if (!bucket) throw new MediaAssetError(503, '이미지 저장소를 확인하지 못했습니다.');
  try {
    const [metadata] = await bucket.file(path).getMetadata();
    const custom = metadata.metadata ?? {};
    return {
      path, generation: String(metadata.generation ?? ''),
      pageSlug: typeof custom.pageSlug === 'string' ? custom.pageSlug : '',
      variant: typeof custom.variant === 'string' ? custom.variant : '',
      mobileEditorSessionHash: typeof custom.mobileEditorSessionHash === 'string' ? custom.mobileEditorSessionHash : '',
      uploadSessionId: typeof custom.uploadSessionId === 'string' ? custom.uploadSessionId : '',
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && Number(error.code) === 404) return null;
    throw error;
  }
}

async function removeGeneration(path: string, generation: string) {
  const bucket = getServerStorageBucket();
  if (!bucket) throw new MediaAssetError(503, '이미지 저장소를 확인하지 못했습니다.');
  await bucket.file(path).delete({ ifGenerationMatch: generation, ignoreNotFound: true });
}

const conflict = () => new MediaAssetError(409, '저장된 사진이거나 현재 편집 세션의 임시 업로드인지 확인할 수 없어 삭제하지 않았습니다.');

export async function cleanupMobileStagedImages(input: {
  slug: string; paths: string[]; sessionId: string; eventId: string; ownerUid: string;
}, dependencies = {
  readRecord: readInvitationMediaRecord,
  readMemory: memoryPageMetadataRepository.findBySlug,
  inspect: inspectObject,
  remove: removeGeneration,
}) {
  const { slug, eventId, ownerUid } = input;
  const sessionHash = hashMobileUploadEditorSession(input.sessionId);
  const paths = [...new Set(input.paths)];
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(slug) || !paths.length || paths.length > 40 ||
      !sessionHash || !eventId || !ownerUid) throw conflict();
  const prefix = `wedding-images/${slug}/`;
  if (paths.some(path => !path.startsWith(prefix) || !path.slice(prefix.length) ||
      /[\\/\u0000-\u001f\u007f%?#]/.test(path.slice(prefix.length)) || path.includes('..'))) {
    throw new MediaAssetError(400, '현재 초대장의 이미지 경로만 정리할 수 있습니다.');
  }
  async function readReferences() {
    const [record, memory] = await Promise.all([dependencies.readRecord(slug), dependencies.readMemory(slug)]);
    if (!record || record.deleting || record.summary.slug !== slug || record.summary.eventId !== eventId ||
        record.summary.ownerUid !== ownerUid || (record.summary.status && record.summary.status !== 'active') ||
        !record.content) throw conflict();
    return collectMediaUsageReferences(record.content, memory);
  }
  const initialReferences = await readReferences();
  const objects = await Promise.all(paths.map(path => dependencies.inspect(path)));
  const groups = new Map<string, string[]>();
  const requested = new Set(paths);
  const present = objects.filter((object): object is ObjectMetadata => object !== null);
  for (const object of present) {
    if (!requested.has(object.path) || object.pageSlug !== slug ||
        object.mobileEditorSessionHash !== sessionHash ||
        object.uploadSessionId === 'legacy-mobile-upload' ||
        !/^[a-z0-9-]{8,80}$/.test(object.uploadSessionId) ||
        !/^\d+$/.test(object.generation)) throw conflict();
    const variants = getMobileUploadVariantPaths(slug, object.path, object.variant);
    if (!variants || !variants.every(path => requested.has(path))) throw conflict();
    groups.set(variants[0], variants);
  }
  function assertUnused(references: ReturnType<typeof collectMediaUsageReferences>) {
    for (const variants of groups.values()) {
      const [originalPath, path, thumbnailPath] = variants;
      const asset = { name: path, path, originalPath, thumbnailPath, url: '', uploadedAt: null };
      if (getMediaAssetUsage(asset, references).length) throw conflict();
    }
  }
  assertUnused(initialReferences);
  // Re-read persisted references and ownership immediately before generation-pinned deletes.
  assertUnused(await readReferences());
  for (const object of present) {
    await dependencies.remove(object.path, object.generation);
  }
  return { deletedPaths: present.map(object => object.path), absentPaths: paths.filter(path => !present.some(object => object.path === path)) };
}
