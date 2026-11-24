import 'server-only';

import { isDeepStrictEqual } from 'node:util';
import {
  buildInvitationMediaGatewayUrl, collectPublicInvitationImageReferences,
  getInvitationMediaFileName, isInvitationMediaSlug, mapStoredInvitationImageReferences,
} from './invitationMediaProjection';

export type ReferenceRehearsalReason =
  | 'inventory-blocked' | 'snapshot-version-mismatch' | 'unsupported-snapshot'
  | 'temporary-image-reference' | 'roundtrip-mismatch';

export type ReferenceRehearsal = {
  status: 'blocked' | 'no-change' | 'reversible';
  sourceVersion: number | null;
  eventVersion: number | null;
  changedReferences: number;
  distinctChangedFiles: number;
  remainingLegacyReferences: number;
  rollbackMatches: boolean;
  reason: ReferenceRehearsalReason | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function isTemporaryStoredImageReference(value: string) {
  return /^(?:blob:|data:|file:|content:|ph:|assets-library:)/i.test(value.trim());
}

/**
 * This is an in-memory rehearsal, not a persistence or token revocation API.
 * Never return a transformed document or a rollback journal containing old token URLs.
 */
export function rehearseStoredMediaReferences(input: {
  slug: string; bucketName: string; summaryVersion: number | null | undefined;
  raw: unknown; inventoryBlocked: boolean; snapshotChanged?: boolean;
}): ReferenceRehearsal {
  const root = asRecord(input.raw);
  const content = asRecord(root?.content);
  const version = typeof root?.version === 'number' && Number.isSafeInteger(root.version) && root.version > 0 ? root.version : null;
  const eventVersion = typeof input.summaryVersion === 'number' && Number.isSafeInteger(input.summaryVersion) && input.summaryVersion > 0 ? input.summaryVersion : null;
  const blocked = (reason: ReferenceRehearsalReason): ReferenceRehearsal => ({
    status: 'blocked', sourceVersion: version, eventVersion, changedReferences: 0, distinctChangedFiles: 0,
    remainingLegacyReferences: 0, rollbackMatches: false, reason,
  });
  if (!root || !content || root.schemaVersion !== 1 || !input.bucketName || !isInvitationMediaSlug(input.slug) ||
      root.slug !== input.slug || content.slug !== input.slug || root.eventType !== 'wedding' ||
      (content.eventType != null && content.eventType !== 'wedding')) return blocked('unsupported-snapshot');
  // Content and event metadata have independent counters. Only missing or changed snapshots block this rehearsal.
  if (version == null || eventVersion == null || input.snapshotChanged) return blocked('snapshot-version-mismatch');
  if (input.inventoryBlocked) return blocked('inventory-blocked');

  const before = collectPublicInvitationImageReferences(input.raw);
  if (before.some(isTemporaryStoredImageReference)) return blocked('temporary-image-reference');
  const changedFiles = new Set<string>();
  let changedReferences = 0;
  const projected = mapStoredInvitationImageReferences(input.raw, value => {
    const file = getInvitationMediaFileName(value, input.bucketName, input.slug);
    if (!file) return value;
    const next = buildInvitationMediaGatewayUrl(input.slug, file);
    if (next !== value) { changedReferences++; changedFiles.add(file); }
    return next;
  });
  const after = collectPublicInvitationImageReferences(projected);
  const sameFiles = before.length === after.length && before.every((value, index) => {
    const file = getInvitationMediaFileName(value, input.bucketName, input.slug);
    return file ? file === getInvitationMediaFileName(after[index], input.bucketName, input.slug) : value === after[index];
  });
  let position = 0;
  // Reverse only the image slots in exactly the same order. Never persist the old URLs.
  const restored = mapStoredInvitationImageReferences(projected, value => before[position++] ?? value);
  const rollbackMatches = sameFiles && position === before.length && isDeepStrictEqual(restored, input.raw);
  const remainingLegacyReferences = after.filter(value => {
    const file = getInvitationMediaFileName(value, input.bucketName, input.slug);
    return file != null && value !== buildInvitationMediaGatewayUrl(input.slug, file);
  }).length;
  if (!rollbackMatches || remainingLegacyReferences) return blocked('roundtrip-mismatch');
  return { status: changedReferences ? 'reversible' : 'no-change', sourceVersion: version, eventVersion, changedReferences,
    distinctChangedFiles: changedFiles.size, remainingLegacyReferences, rollbackMatches, reason: null };
}
