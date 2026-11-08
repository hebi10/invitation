import {
  findFirstActiveInvitationMusicTrack,
  findInvitationMusicTrackById,
} from '@/lib/musicLibrary';

type WeddingMusicSelection = {
  storagePath: string;
  categoryId?: string | null;
  trackId?: string | null;
};

// Old saved wedding pages can refer to folders that predate the current music catalog.
const LEGACY_MUSIC_CATEGORIES: Record<string, string> = {
  romantic: '01-romantic-piano',
  classic: '03-elegant-classic',
  cinematic: '05-emotional-cinematic',
};

export function getWeddingMusicStorageCandidates(selection: WeddingMusicSelection) {
  const originalPath = selection.storagePath.trim();
  if (!originalPath) {
    return [];
  }

  // Do not silently replace external music or arbitrary Storage paths.
  if (!/^music\/[^/]+\/[^/]+$/.test(originalPath)) {
    return [originalPath];
  }

  const storedCategory = originalPath.split('/')[1] ?? '';
  const requestedCategory = selection.categoryId?.trim() || storedCategory;
  const currentCategory =
    LEGACY_MUSIC_CATEGORIES[requestedCategory] ?? requestedCategory;
  const selectedTrack = findInvitationMusicTrackById(selection.trackId);
  const categoryTrack = findFirstActiveInvitationMusicTrack(currentCategory);
  const defaultTrack = findFirstActiveInvitationMusicTrack();

  return [...new Set([
    originalPath,
    selectedTrack?.storagePath,
    categoryTrack?.storagePath,
    defaultTrack?.storagePath,
  ].filter((path): path is string => Boolean(path)))];
}

export async function resolveWeddingMusicDownloadUrl(
  selection: WeddingMusicSelection,
  lookup: (storagePath: string) => Promise<string | null>,
  isCancelled: () => boolean = () => false
) {
  for (const candidate of getWeddingMusicStorageCandidates(selection)) {
    if (isCancelled()) {
      return null;
    }

    const url = await lookup(candidate);
    if (isCancelled()) {
      return null;
    }

    if (url) {
      return url;
    }
  }

  return null;
}
