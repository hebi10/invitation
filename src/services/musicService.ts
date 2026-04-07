import { ensureFirebaseInit, USE_FIREBASE } from '@/lib/firebase';
import type { InvitationMusicCategory, InvitationMusicTrack } from '@/lib/musicLibrary';

const AUDIO_FILE_PATTERN = /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i;
const MUSIC_PATH_PREFIX = 'music/';
const STORAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_ARTIST = 'Invitation Studio';

const CATEGORY_LABELS: Record<string, string> = {
  romantic: '로맨틱',
  classic: '클래식',
  cinematic: '시네마틱',
};

let cachedLibrary: InvitationMusicCategory[] | null = null;
let cachedAt = 0;
let pendingRequest: Promise<InvitationMusicCategory[]> | null = null;

function cloneLibrary(library: InvitationMusicCategory[]) {
  return library.map((category) => ({
    ...category,
    tracks: category.tracks.map((track) => ({ ...track })),
  }));
}

function sanitizeSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatTrackTitle(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const normalized = baseName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return 'Untitled Track';
  }

  return normalized
    .split(' ')
    .map((word) =>
      word.length > 1 ? `${word[0].toUpperCase()}${word.slice(1)}` : word.toUpperCase()
    )
    .join(' ');
}

function formatCategoryLabel(categoryId: string) {
  const normalizedCategoryId = categoryId.trim().toLowerCase();
  if (!normalizedCategoryId) {
    return '기타';
  }

  if (CATEGORY_LABELS[normalizedCategoryId]) {
    return CATEGORY_LABELS[normalizedCategoryId];
  }

  const normalized = normalizedCategoryId.replace(/[-_]+/g, ' ').trim();
  if (!normalized) {
    return '기타';
  }

  return normalized
    .split(' ')
    .map((word) =>
      word.length > 1 ? `${word[0].toUpperCase()}${word.slice(1)}` : word.toUpperCase()
    )
    .join(' ');
}

function compareCategory(left: InvitationMusicCategory, right: InvitationMusicCategory) {
  const knownOrder = ['romantic', 'classic', 'cinematic'];
  const leftIndex = knownOrder.indexOf(left.id);
  const rightIndex = knownOrder.indexOf(right.id);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  }

  return left.label.localeCompare(right.label, 'ko');
}

function buildTrackId(categoryId: string, fileName: string, usedTrackIds: Set<string>) {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const normalizedBaseName = sanitizeSegment(baseName) || 'track';
  const baseTrackId = `${categoryId}-${normalizedBaseName}`;

  if (!usedTrackIds.has(baseTrackId)) {
    usedTrackIds.add(baseTrackId);
    return baseTrackId;
  }

  let suffix = 2;
  while (usedTrackIds.has(`${baseTrackId}-${suffix}`)) {
    suffix += 1;
  }

  const nextTrackId = `${baseTrackId}-${suffix}`;
  usedTrackIds.add(nextTrackId);
  return nextTrackId;
}

async function collectAllMusicItems(
  listAll: (storageRef: any) => Promise<{ items: any[]; prefixes: any[] }>,
  currentRef: any
): Promise<any[]> {
  const listed = await listAll(currentRef);
  const nestedItems = await Promise.all(
    listed.prefixes.map((prefixRef) => collectAllMusicItems(listAll, prefixRef))
  );

  return [...listed.items, ...nestedItems.flat()];
}

async function loadMusicLibraryFromStorage(): Promise<InvitationMusicCategory[]> {
  if (!USE_FIREBASE || typeof window === 'undefined') {
    return [];
  }

  const { storage } = await ensureFirebaseInit();
  if (!storage) {
    return [];
  }

  const { listAll, ref } = await import('firebase/storage');
  const musicRootRef = ref(storage, 'music');
  const items = await collectAllMusicItems(listAll, musicRootRef);

  const tracksByCategory = new Map<string, InvitationMusicTrack[]>();
  const usedTrackIds = new Set<string>();

  items.forEach((item) => {
    const fullPath =
      typeof item === 'object' && item !== null && 'fullPath' in item
        ? String((item as { fullPath: unknown }).fullPath ?? '').trim()
        : '';

    if (!fullPath || !fullPath.startsWith(MUSIC_PATH_PREFIX) || !AUDIO_FILE_PATTERN.test(fullPath)) {
      return;
    }

    const segments = fullPath.split('/').filter(Boolean);
    if (segments.length < 3) {
      return;
    }

    const categoryId = sanitizeSegment(segments[1] ?? '');
    if (!categoryId) {
      return;
    }

    const fileName = segments[segments.length - 1] ?? '';
    if (!fileName) {
      return;
    }

    const trackId = buildTrackId(categoryId, fileName, usedTrackIds);
    const nextTrack: InvitationMusicTrack = {
      id: trackId,
      categoryId,
      title: formatTrackTitle(fileName),
      artist: DEFAULT_ARTIST,
      storagePath: fullPath,
      active: true,
    };

    const currentTracks = tracksByCategory.get(categoryId) ?? [];
    currentTracks.push(nextTrack);
    tracksByCategory.set(categoryId, currentTracks);
  });

  const categories = [...tracksByCategory.entries()]
    .map<InvitationMusicCategory>(([categoryId, tracks]) => ({
      id: categoryId,
      label: formatCategoryLabel(categoryId),
      tracks: tracks.sort((left, right) => left.title.localeCompare(right.title, 'ko')),
    }))
    .sort(compareCategory);

  return categories;
}

export async function getInvitationMusicLibraryFromStorage(
  options: { forceRefresh?: boolean } = {}
): Promise<InvitationMusicCategory[]> {
  const shouldUseCache =
    options.forceRefresh !== true &&
    cachedLibrary &&
    Date.now() - cachedAt < STORAGE_CACHE_TTL_MS;

  if (shouldUseCache && cachedLibrary) {
    return cloneLibrary(cachedLibrary);
  }

  if (pendingRequest) {
    return cloneLibrary(await pendingRequest);
  }

  pendingRequest = loadMusicLibraryFromStorage()
    .then((library) => {
      cachedLibrary = cloneLibrary(library);
      cachedAt = Date.now();
      return library;
    })
    .catch((error) => {
      console.warn('[musicService] failed to load music library from storage', error);
      return [];
    })
    .finally(() => {
      pendingRequest = null;
    });

  return cloneLibrary(await pendingRequest);
}
