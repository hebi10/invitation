import 'server-only';

import { groupMediaAssetFiles, type MediaAssetFile } from '@/lib/mediaAssets';
import { getServerStorageBucket } from './firebaseAdmin';
import { MediaAssetError } from './mediaAssetService';
import { buildInvitationMediaGatewayUrl, isInvitationMediaFile, isInvitationMediaSlug } from './invitationMediaProjection';
import { readInvitationMediaRecord } from './repositories/invitationMediaRepository';

const LIMIT = 300;
type LibraryFile = MediaAssetFile & { compatible: boolean };
type LibraryPage = { files: LibraryFile[]; complete: boolean };

async function listFiles(slug: string): Promise<LibraryPage> {
  const bucket = getServerStorageBucket();
  if (!bucket) throw new MediaAssetError(503, '이미지 저장소를 확인하지 못했습니다.');
  const prefix = `wedding-images/${slug}/`;
  const [files, next] = await bucket.getFiles({ prefix, autoPaginate: false, maxResults: LIMIT + 1 });
  if (next || files.length > LIMIT) return { files: [], complete: false };
  const rows: LibraryFile[] = [];
  for (let offset = 0; offset < files.length; offset += 10) {
    rows.push(...await Promise.all(files.slice(offset, offset + 10).map(async file => {
      const name = file.name.slice(prefix.length);
      if (!file.name.startsWith(prefix) || !name) throw new MediaAssetError(503, '이미지 경로를 확인하지 못했습니다.');
      const [metadata] = await file.getMetadata();
      const size = Number(metadata.size);
      const uploadedAt = metadata.timeCreated ? new Date(metadata.timeCreated) : null;
      return { name, path: file.name, url: '', uploadedAt: uploadedAt && Number.isFinite(uploadedAt.getTime()) ? uploadedAt : null,
        variant: typeof metadata.metadata?.variant === 'string' ? metadata.metadata.variant : undefined,
        compatible: isInvitationMediaFile(name) && Number.isSafeInteger(size) && size > 0 && size <= 8 * 1024 * 1024 &&
          ['image/jpeg','image/png','image/webp'].includes(metadata.contentType ?? '') &&
          (!metadata.contentEncoding || metadata.contentEncoding === 'identity') && /^\d+$/.test(String(metadata.generation ?? '')),
      };
    })));
  }
  return { files: rows, complete: true };
}

export async function getAdminMediaLibrary(slug: string, dependencies = {
  pilotSlug: process.env.INVITATION_MEDIA_GATEWAY_PILOT_SLUG ?? '',
  readRecord: readInvitationMediaRecord,
  list: listFiles,
}) {
  if (!isInvitationMediaSlug(slug)) throw new MediaAssetError(400, '올바른 페이지 주소가 필요합니다.');
  if (dependencies.pilotSlug !== slug) return { mode: 'legacy' as const };
  const record = await dependencies.readRecord(slug);
  if (!record || record.summary.slug !== slug || record.summary.eventType !== 'wedding' ||
      record.deleting || (record.summary.status && record.summary.status !== 'active')) {
    throw new MediaAssetError(404, '이미지 목록을 확인할 수 없는 초대장입니다.');
  }
  const page = await dependencies.list(slug);
  if (!page.complete || page.files.length > LIMIT) throw new MediaAssetError(409, '이미지 목록이 점검 한도를 초과했습니다. 전체 이관은 보류됩니다.');
  const prefix = `wedding-images/${slug}/`;
  if (page.files.some(file => !file.path.startsWith(prefix) || file.name !== file.path.slice(prefix.length) ||
      !file.name || file.name.includes('/') || file.name.includes('\\'))) {
    throw new MediaAssetError(409, '지원하지 않는 저장 경로가 있습니다. 기존 사진은 변경하지 않았습니다.');
  }
  if (new Set(page.files.map(file => file.path)).size !== page.files.length) {
    throw new MediaAssetError(503, '이미지 목록의 중복 경로를 확인하지 못했습니다.');
  }
  const images = groupMediaAssetFiles(page.files.map(file => ({
    name: file.name, path: file.path, uploadedAt: file.uploadedAt, variant: file.variant,
    url: file.compatible && isInvitationMediaFile(file.name) ? buildInvitationMediaGatewayUrl(slug, file.name) : '',
  })));
  return { mode: 'protected' as const, images, unsupportedObjects: page.files.filter(file => !file.compatible || !isInvitationMediaFile(file.name)).length };
}
