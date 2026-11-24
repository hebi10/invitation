import 'server-only';

import { getEventSummaryPublicAccessState } from '@/lib/invitationPublicAccess';
import {
  collectPublicInvitationImageReferences, getInvitationMediaFileName,
  isInvitationMediaSlug, isInvitationMediaFile,
} from './invitationMediaProjection';
export { buildInvitationMediaGatewayUrl } from './invitationMediaProjection';
import { getServerStorageBucket } from './firebaseAdmin';
import { MediaAssetError } from './mediaAssetService';
import { readInvitationMediaRecord } from './repositories/invitationMediaRepository';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
type Reader = { kind: 'public' } | { kind: 'owner'; uid: string } | { kind: 'admin' } |
  { kind: 'preview-owner'; uid: string; eventId: string };
type ImageData = { bytes: Uint8Array; contentType: string };

function isReferenced(config: unknown, bucketName: string, slug: string, file: string) {
  return collectPublicInvitationImageReferences(config).some(value => getInvitationMediaFileName(value, bucketName, slug) === file);
}

function matchesImageType(bytes: Uint8Array, type: string) {
  const b = Buffer.from(bytes);
  if (type === 'image/jpeg') return b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === 'image/png') return b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/webp') return b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

async function readStoredImage(path: string): Promise<ImageData> {
  const bucket = getServerStorageBucket();
  if (!bucket) throw new MediaAssetError(503, '이미지 저장소를 확인하지 못했습니다.');
  const [metadata] = await bucket.file(path).getMetadata();
  const size = Number(metadata.size);
  const type = metadata.contentType ?? '';
  const generation = metadata.generation;
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_IMAGE_BYTES ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(type) ||
      (metadata.contentEncoding && metadata.contentEncoding !== 'identity') ||
      !generation || !/^\d+$/.test(String(generation))) {
    throw new MediaAssetError(404, '이미지를 찾을 수 없습니다.');
  }
  // Pin the object generation so replacement cannot invalidate the size/type check.
  const [buffer] = await bucket.file(path, { generation: String(generation) }).download({ decompress: false });
  if (buffer.length !== size || !matchesImageType(buffer, type)) {
    throw new MediaAssetError(404, '이미지를 찾을 수 없습니다.');
  }
  return { bytes: Uint8Array.from(buffer), contentType: type };
}

export async function getInvitationMediaGatewayImage(
  slug: string,
  file: string,
  reader: Reader,
  dependencies = {
    pilotSlug: process.env.INVITATION_MEDIA_GATEWAY_PILOT_SLUG ?? '',
    bucketName: getServerStorageBucket()?.name ?? '',
    readRecord: readInvitationMediaRecord,
    readImage: readStoredImage,
  },
) {
  const unavailable = () => new MediaAssetError(404, '이미지를 찾을 수 없습니다.');
  if (!isInvitationMediaSlug(slug) || !isInvitationMediaFile(file) || dependencies.pilotSlug !== slug || !dependencies.bucketName) throw unavailable();
  const record = await dependencies.readRecord(slug);
  if (!record || record.summary.slug !== slug ||
      (record.summary.status && record.summary.status !== 'active')) throw unavailable();
  if (record.deleting) throw unavailable();
  if (reader.kind === 'public') {
    if (record.blocked || !getEventSummaryPublicAccessState(record.summary).isPublic ||
        !isReferenced(record.content, dependencies.bucketName, slug, file)) throw unavailable();
  } else if ((reader.kind === 'owner' || reader.kind === 'preview-owner') && record.summary.ownerUid !== reader.uid) {
    throw unavailable();
  }
  if (reader.kind === 'preview-owner' && (record.summary.eventId !== reader.eventId ||
      !isReferenced(record.content, dependencies.bucketName, slug, file))) throw unavailable();
  const image = await dependencies.readImage(`wedding-images/${slug}/${file}`);
  if (image.bytes.length === 0 || image.bytes.length > MAX_IMAGE_BYTES ||
      !matchesImageType(image.bytes, image.contentType)) throw unavailable();
  // Recheck after object access; never return bytes if access changed while reading.
  const latest = await dependencies.readRecord(slug);
  if (!latest || latest.summary.eventId !== record.summary.eventId ||
      latest.summary.slug !== slug || (latest.summary.status && latest.summary.status !== 'active')) throw unavailable();
  if (reader.kind === 'public' && (latest.blocked || !getEventSummaryPublicAccessState(latest.summary).isPublic ||
      !isReferenced(latest.content, dependencies.bucketName, slug, file))) throw unavailable();
  if (latest.deleting) throw unavailable();
  if ((reader.kind === 'owner' || reader.kind === 'preview-owner') && latest.summary.ownerUid !== reader.uid) throw unavailable();
  if (reader.kind === 'preview-owner' && (latest.summary.eventId !== reader.eventId ||
      !isReferenced(latest.content, dependencies.bucketName, slug, file))) throw unavailable();
  return image;
}

export function invitationMediaGatewayResponse(image: ImageData) {
  return new Response(Uint8Array.from(image.bytes), {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': 'inline',
    },
  });
}

export function invitationMediaGatewayError(error: unknown) {
  const status = error instanceof MediaAssetError ? error.status : 503;
  return Response.json({ error: status === 404 ? '이미지를 찾을 수 없습니다.' : '이미지를 불러오지 못했습니다.' }, {
    status, headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
