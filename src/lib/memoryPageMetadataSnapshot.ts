import fs from 'node:fs';
import path from 'node:path';

import type { MemoryPageVisibility } from '@/types/memoryPage';

export interface MemoryPageMetadataSnapshotRecord {
  pageSlug: string;
  enabled: boolean;
  visibility: MemoryPageVisibility;
  title: string;
  introMessage: string;
  seoTitle: string;
  seoDescription: string;
  seoNoIndex: boolean;
  heroImageUrl: string;
  heroThumbnailUrl: string;
}

interface MemoryPageMetadataSnapshotPayload {
  generatedAt: string | null;
  source: string;
  pages: Record<string, MemoryPageMetadataSnapshotRecord>;
}

const SNAPSHOT_PATH = path.join(process.cwd(), 'src', 'generated', 'memory-page-metadata.json');
const EMPTY_SNAPSHOT: MemoryPageMetadataSnapshotPayload = {
  generatedAt: null,
  source: 'unavailable',
  pages: {},
};

let snapshotCache: MemoryPageMetadataSnapshotPayload | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function getBooleanValue(value: unknown) {
  return value === true;
}

function normalizeVisibility(value: unknown): MemoryPageVisibility {
  return value === 'public' || value === 'unlisted' ? value : 'private';
}

function normalizePageRecord(
  slug: string,
  value: unknown
): MemoryPageMetadataSnapshotRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    pageSlug: getStringValue(value.pageSlug) || slug,
    enabled: getBooleanValue(value.enabled),
    visibility: normalizeVisibility(value.visibility),
    title: getStringValue(value.title),
    introMessage: getStringValue(value.introMessage),
    seoTitle: getStringValue(value.seoTitle),
    seoDescription: getStringValue(value.seoDescription),
    seoNoIndex: getBooleanValue(value.seoNoIndex),
    heroImageUrl: getStringValue(value.heroImageUrl),
    heroThumbnailUrl: getStringValue(value.heroThumbnailUrl),
  };
}

function loadSnapshot(): MemoryPageMetadataSnapshotPayload {
  if (snapshotCache) {
    return snapshotCache;
  }

  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (!isRecord(parsed) || !isRecord(parsed.pages)) {
      snapshotCache = EMPTY_SNAPSHOT;
      return snapshotCache;
    }

    const pages = Object.entries(parsed.pages).reduce<Record<string, MemoryPageMetadataSnapshotRecord>>(
      (accumulator, [slug, value]) => {
        const normalized = normalizePageRecord(slug, value);
        if (normalized) {
          accumulator[slug] = normalized;
        }

        return accumulator;
      },
      {}
    );

    snapshotCache = {
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      source: typeof parsed.source === 'string' ? parsed.source : 'unknown',
      pages,
    };

    return snapshotCache;
  } catch {
    snapshotCache = EMPTY_SNAPSHOT;
    return snapshotCache;
  }
}

export function getMemoryPageMetadataBySlug(pageSlug: string) {
  return loadSnapshot().pages[pageSlug] ?? null;
}
