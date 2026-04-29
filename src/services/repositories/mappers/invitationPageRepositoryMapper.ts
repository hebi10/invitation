import { getWeddingPageBySlug } from '@/config/weddingPages';
import {
  normalizeInvitationConfigSeed,
  normalizeInvitationPageDisplayPeriod,
  normalizeInvitationPageRegistryRecord,
  type InvitationPageDisplayPeriodRecord,
  type InvitationPageRegistryRecord,
} from '@/lib/invitationPagePersistence';
import type { InvitationPageSeed } from '@/types/invitationPage';

import { toClientRepositoryDate } from '../clientFirestoreRepositoryCore';

export interface StoredInvitationPageConfigRecord {
  slug: string;
  config: InvitationPageSeed;
  createdAt: Date | null;
  updatedAt: Date | null;
  seedSourceSlug: string | null;
}

export function normalizeRepositoryDisplayPeriodRecord(
  docId: string,
  data: Record<string, unknown>
): InvitationPageDisplayPeriodRecord | null {
  return normalizeInvitationPageDisplayPeriod(docId, data);
}

export function normalizeRepositoryRegistryRecord(
  docId: string,
  data: Record<string, unknown>
): InvitationPageRegistryRecord | null {
  return normalizeInvitationPageRegistryRecord(docId, data);
}

export function normalizeRepositoryConfigRecord(
  docId: string,
  data: Record<string, unknown>
): StoredInvitationPageConfigRecord | null {
  const config = normalizeInvitationConfigSeed(
    docId,
    data,
    getWeddingPageBySlug(docId) ?? undefined
  );
  if (!config) {
    return null;
  }

  return {
    slug: config.slug,
    config,
    createdAt: toClientRepositoryDate(data.createdAt, new Date()),
    updatedAt: toClientRepositoryDate(data.updatedAt, new Date()),
    seedSourceSlug:
      typeof data.seedSourceSlug === 'string' && data.seedSourceSlug.trim()
        ? data.seedSourceSlug.trim()
        : null,
  };
}
