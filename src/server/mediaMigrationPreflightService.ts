import 'server-only';

import { getServerStorageBucketName } from './firebaseAdmin';
import { MediaAssetError } from './mediaAssetService';
import { MAX_OBJECTS_PER_PREFIX, listImageMetadata, type AuditPage } from './mediaAccessAuditService';
import { collectPublicInvitationImageReferences, getInvitationMediaFileName, isInvitationMediaSlug } from './invitationMediaProjection';
import { readInvitationMediaRecord } from './repositories/invitationMediaRepository';
import { memoryPageMetadataRepository } from './repositories/memoryPageMetadataRepository';

const MAX_SCAN_NODES = 20000;
const MAX_SCAN_DEPTH = 24;

function isManagedReference(value: string) {
  const source = value.trim();
  if (/^(?:\/?(?:wedding-images|memory-images)\/|gs:\/\/|\/api\/(?:public\/media|customer\/events)\/)/i.test(source)) return true;
  try {
    const url = new URL(source, 'https://invite.msgnote.kr');
    return url.hostname === 'firebasestorage.googleapis.com' ||
      url.hostname === 'storage.googleapis.com' || url.hostname.endsWith('.storage.googleapis.com') ||
      (url.origin === 'https://invite.msgnote.kr' && url.pathname.startsWith('/api/public/media/'));
  } catch { return false; }
}

function scanReferences(data: unknown) {
  const values: string[] = [];
  let nodes = 0;
  let complete = true;
  const pending = [{ value: data, depth: 0 }];
  while (pending.length) {
    const item = pending.pop()!;
    if (++nodes > MAX_SCAN_NODES) { complete = false; break; }
    if (item.depth > MAX_SCAN_DEPTH) { complete = false; continue; }
    if (typeof item.value === 'string') {
      if (isManagedReference(item.value)) values.push(item.value);
    } else if (item.value && typeof item.value === 'object') {
      for (const value of Object.values(item.value)) {
        if (pending.length + nodes >= MAX_SCAN_NODES) { complete = false; break; }
        pending.push({ value, depth: item.depth + 1 });
      }
    }
  }
  return { values, complete };
}

function countUnexpectedReferences(all: string[], accepted: string[]) {
  const remaining = new Map<string, number>();
  for (const value of accepted) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  let unexpected = 0;
  for (const value of all) {
    const count = remaining.get(value) ?? 0;
    if (!count) unexpected++;
    else remaining.set(value, count - 1);
  }
  return unexpected;
}

export type MigrationBlocker =
  | 'pilot-disabled' | 'not-wedding' | 'no-current-content' | 'event-unavailable'
  | 'partial-inventory' | 'unsupported-image-reference' | 'unmapped-stored-reference'
  | 'missing-or-unscanned-object' | 'incompatible-object' | 'unreferenced-token-object'
  | 'memory-page-review-required' | 'legacy-token-reference'
  | 'editor-upload-client-cutover-required' | 'cross-event-reference-review-required'
  | 'live-compatibility-and-revocation-approval-required';

export interface MediaMigrationPreflight {
  mode: 'read-only';
  scope: 'selected-invitation-and-memory';
  revocationAllowed: false;
  inventoryComplete: boolean;
  candidateFiles: number;
  compatibleCandidateFiles: number;
  legacyTokenReferences: number;
  unsupportedImageReferences: number;
  unmappedStoredReferences: number;
  missingOrUnscannedObjects: number;
  incompatibleObjects: number;
  unreferencedTokenObjects: number;
  memoryReferences: number;
  memoryObjects: number;
  blockers: MigrationBlocker[];
}

export function buildMediaMigrationPreflight(input: {
  slug: string; bucketName: string; pilotSlug: string;
  content: unknown; memory: unknown; wedding: AuditPage; memoryImages: AuditPage;
  eventType: string; unavailable: boolean;
}): MediaMigrationPreflight {
  const { slug, bucketName, pilotSlug, content, memory, wedding, memoryImages, eventType, unavailable } = input;
  for (const [page, prefix] of [[wedding, `wedding-images/${slug}/`], [memoryImages, `memory-images/${slug}/`]] as const) {
    if (page.objects.length > MAX_OBJECTS_PER_PREFIX || page.objects.some(object => !object.path.startsWith(prefix) || object.path === prefix)) {
      throw new MediaAssetError(503, '이미지 이관 점검 범위를 확인하지 못했습니다.');
    }
  }
  const accepted = collectPublicInvitationImageReferences(content).filter(isManagedReference);
  const all = scanReferences(content);
  const memoryScan = scanReferences(memory);
  const inventoryComplete = all.complete && memoryScan.complete && wedding.complete && memoryImages.complete;
  const files = new Set<string>();
  let unsupportedImageReferences = 0;
  let legacyTokenReferences = 0;
  for (const source of accepted) {
    const file = getInvitationMediaFileName(source, bucketName, slug);
    if (!file) unsupportedImageReferences++;
    else files.add(`wedding-images/${slug}/${file}`);
    try {
      const url = new URL(source);
      if (url.hostname === 'firebasestorage.googleapis.com' && url.searchParams.has('token')) legacyTokenReferences++;
    } catch { /* A stable storage path has no URL token. */ }
  }
  const objects = new Map(wedding.objects.map(object => [object.path, object]));
  let compatibleCandidateFiles = 0;
  let missingOrUnscannedObjects = 0;
  let incompatibleObjects = 0;
  for (const file of files) {
    const object = objects.get(file);
    if (!object) missingOrUnscannedObjects++;
    else if (object.gatewayCompatible !== true) incompatibleObjects++;
    else compatibleCandidateFiles++;
  }
  const unmappedStoredReferences = countUnexpectedReferences(all.values, accepted);
  const unreferencedTokenObjects = wedding.objects.filter(object => object.tokenPresent && !files.has(object.path)).length;
  const blockers: MigrationBlocker[] = [];
  if (!pilotSlug || pilotSlug !== slug) blockers.push('pilot-disabled');
  if (eventType !== 'wedding') blockers.push('not-wedding');
  if (!content) blockers.push('no-current-content');
  if (unavailable) blockers.push('event-unavailable');
  if (!inventoryComplete) blockers.push('partial-inventory');
  if (unsupportedImageReferences) blockers.push('unsupported-image-reference');
  if (unmappedStoredReferences) blockers.push('unmapped-stored-reference');
  if (missingOrUnscannedObjects) blockers.push('missing-or-unscanned-object');
  if (incompatibleObjects) blockers.push('incompatible-object');
  if (unreferencedTokenObjects) blockers.push('unreferenced-token-object');
  if (memory != null || memoryImages.objects.length) blockers.push('memory-page-review-required');
  if (legacyTokenReferences) blockers.push('legacy-token-reference');
  // A clean selected-page inventory is NOT proof that every consumer can stop using old URLs.
  blockers.push('editor-upload-client-cutover-required', 'cross-event-reference-review-required',
    'live-compatibility-and-revocation-approval-required');
  return { mode: 'read-only', scope: 'selected-invitation-and-memory', revocationAllowed: false,
    inventoryComplete, candidateFiles: files.size, compatibleCandidateFiles, legacyTokenReferences,
    unsupportedImageReferences, unmappedStoredReferences, missingOrUnscannedObjects, incompatibleObjects,
    unreferencedTokenObjects, memoryReferences: memoryScan.values.length,
    memoryObjects: memoryImages.objects.length, blockers };
}

export async function getServerMediaMigrationPreflight(slug: string, dependencies = {
  bucketName: getServerStorageBucketName() ?? '',
  pilotSlug: process.env.INVITATION_MEDIA_GATEWAY_PILOT_SLUG ?? '',
  readRecord: readInvitationMediaRecord,
  readMemory: memoryPageMetadataRepository.findBySlug,
  list: listImageMetadata,
}) {
  if (!isInvitationMediaSlug(slug)) throw new MediaAssetError(400, '올바른 페이지 주소가 필요합니다.');
  if (!dependencies.bucketName) throw new MediaAssetError(503, '이미지 저장소를 확인하지 못했습니다.');
  const record = await dependencies.readRecord(slug);
  if (!record || record.summary.slug !== slug) throw new MediaAssetError(404, '초대장을 찾지 못했습니다.');
  const [memory, wedding, memoryImages] = await Promise.all([
    dependencies.readMemory(slug),
    dependencies.list(`wedding-images/${slug}/`),
    dependencies.list(`memory-images/${slug}/`),
  ]);
  return buildMediaMigrationPreflight({
    slug, bucketName: dependencies.bucketName, pilotSlug: dependencies.pilotSlug,
    content: record.content, memory, wedding, memoryImages, eventType: record.summary.eventType,
    unavailable: record.blocked || (record.summary.status != null && record.summary.status !== 'active'),
  });
}
