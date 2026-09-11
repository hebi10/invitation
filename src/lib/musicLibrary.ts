export const DEFAULT_INVITATION_MUSIC_VOLUME = 0.35;
export const INVITATION_MUSIC_VOLUME_MIN = 0;
export const INVITATION_MUSIC_VOLUME_MAX = 1;

export type InvitationMusicCategoryId = string;

export interface InvitationMusicTrack {
  id: string;
  categoryId: InvitationMusicCategoryId;
  title: string;
  artist: string;
  storagePath: string;
  active: boolean;
}

export interface InvitationMusicCategory {
  id: InvitationMusicCategoryId;
  label: string;
  tracks: InvitationMusicTrack[];
}

// Firebase Storage의 현재 18곡과 동일한 목록입니다. 조회 실패 시에도 실제 곡만 표시합니다.
const musicCatalog = [
  ['01-romantic-piano', '01 Romantic Piano', ['Petals_on_the_Lawn', 'Sunlight_on_the_Aisle', 'Sunlight_on_the_Floor']],
  ['02-acoustic-warm', '02 Acoustic Warm', ['First_Light_on_the_Lawn', 'Morning_in_the_Arbor', 'The_Quiet_Promise']],
  ['03-elegant-classic', '03 Elegant Classic', ['A_Quiet_Promise', 'Morning_Vows', 'Stained_Glass_Afternoon']],
  ['04-bright-lovely', '04 Bright Lovely', ['Before_the_Vows', 'Paper_Lace', 'Sunlight_on_the_Aisle']],
  ['05-emotional-cinematic', '05 Emotional Cinematic', ['Before_The_Vows', 'Sunlight_on_the_Aisle', 'Vows_at_Dawn']],
  ['06-modern-lofi', '06 Modern Lofi', ['Sunday_Morning_View', 'Vows_by_the_Window', 'Vows_in_Morning_Light']],
] as const;

const musicLibrarySource: InvitationMusicCategory[] = musicCatalog.map(([id, label, files]) => ({
  id,
  label,
  tracks: files.map(file => ({
    id: `${id}-${file.toLowerCase().replace(/_/g, '-')}`,
    categoryId: id,
    title: file.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' '),
    artist: 'Invitation Studio',
    storagePath: `music/${id}/${file}.mp3`,
    active: true,
  })),
}));

function cloneMusicLibrary(source: InvitationMusicCategory[]) {
  return source.map((category) => ({
    ...category,
    tracks: category.tracks.map((track) => ({
      ...track,
      categoryId: track.categoryId || category.id,
    })),
  }));
}

function buildMusicTrackIndex(library: InvitationMusicCategory[]) {
  const activeTrackList = library.flatMap((category) =>
    category.tracks.filter((track) => track.active)
  );

  return {
    activeTrackList,
    tracksByIdMap: new Map<string, InvitationMusicTrack>(
      activeTrackList.map((track) => [track.id, track])
    ),
  };
}

const defaultMusicLibrary = cloneMusicLibrary(musicLibrarySource);

export let INVITATION_MUSIC_LIBRARY: InvitationMusicCategory[] =
  cloneMusicLibrary(defaultMusicLibrary);

let { activeTrackList: activeTracks, tracksByIdMap: tracksById } =
  buildMusicTrackIndex(INVITATION_MUSIC_LIBRARY);

function applyInvitationMusicLibrary(library: InvitationMusicCategory[]) {
  INVITATION_MUSIC_LIBRARY = cloneMusicLibrary(library);

  const nextIndex = buildMusicTrackIndex(INVITATION_MUSIC_LIBRARY);
  activeTracks = nextIndex.activeTrackList;
  tracksById = nextIndex.tracksByIdMap;
}

export function setInvitationMusicLibrary(library: InvitationMusicCategory[]) {
  const normalizedLibrary = cloneMusicLibrary(library)
    .map((category) => ({
      ...category,
      id: category.id.trim(),
      label: category.label.trim() || category.id.trim(),
      tracks: category.tracks
        .map((track) => ({
          ...track,
          id: track.id.trim(),
          categoryId: track.categoryId.trim() || category.id.trim(),
          title: track.title.trim() || track.id.trim(),
          artist: track.artist.trim() || 'Invitation Studio',
          storagePath: track.storagePath.trim(),
          active: track.active !== false,
        }))
        .filter((track) => Boolean(track.id) && Boolean(track.storagePath)),
    }))
    .filter((category) => Boolean(category.id) && category.tracks.length > 0);

  if (normalizedLibrary.length === 0) {
    return false;
  }

  applyInvitationMusicLibrary(normalizedLibrary);
  return true;
}

export function resetInvitationMusicLibrary() {
  applyInvitationMusicLibrary(defaultMusicLibrary);
}

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function trimValue(value?: string | null) {
  return value?.trim() ?? '';
}

export function clampInvitationMusicVolume(
  value: unknown,
  fallback = DEFAULT_INVITATION_MUSIC_VOLUME
) {
  const normalizedFallback =
    typeof fallback === 'number' && Number.isFinite(fallback)
      ? Math.min(
          INVITATION_MUSIC_VOLUME_MAX,
          Math.max(INVITATION_MUSIC_VOLUME_MIN, fallback)
        )
      : DEFAULT_INVITATION_MUSIC_VOLUME;

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return normalizedFallback;
  }

  return Math.min(
    INVITATION_MUSIC_VOLUME_MAX,
    Math.max(INVITATION_MUSIC_VOLUME_MIN, value)
  );
}

export function getInvitationMusicCategory(categoryId?: string | null) {
  const normalizedCategoryId = trimValue(categoryId);
  if (!normalizedCategoryId) {
    return null;
  }

  return (
    INVITATION_MUSIC_LIBRARY.find((category) => category.id === normalizedCategoryId) ??
    null
  );
}

export function getInvitationMusicTracksByCategory(categoryId?: string | null) {
  const category = getInvitationMusicCategory(categoryId);
  if (!category) {
    return [];
  }

  return category.tracks.filter((track) => track.active);
}

export function findInvitationMusicTrackById(trackId?: string | null) {
  const normalizedTrackId = trimValue(trackId);
  if (!normalizedTrackId) {
    return null;
  }

  return tracksById.get(normalizedTrackId) ?? null;
}

export function findFirstActiveInvitationMusicTrack(categoryId?: string | null) {
  const tracks = categoryId
    ? getInvitationMusicTracksByCategory(categoryId)
    : activeTracks;

  return tracks[0] ?? null;
}

export function normalizeInvitationMusicSelection(params: {
  categoryId?: string | null;
  trackId?: string | null;
  storagePath?: string | null;
}) {
  const musicCategoryId = trimValue(params.categoryId);
  const musicTrackId = trimValue(params.trackId);
  const musicStoragePath = trimValue(params.storagePath);

  const selectedTrack = findInvitationMusicTrackById(musicTrackId);
  if (selectedTrack) {
    return {
      musicCategoryId: hasText(musicCategoryId)
        ? musicCategoryId
        : selectedTrack.categoryId,
      musicTrackId: selectedTrack.id,
      musicStoragePath: hasText(musicStoragePath)
        ? musicStoragePath
        : selectedTrack.storagePath,
    };
  }

  if (hasText(musicCategoryId)) {
    const firstTrackInCategory = findFirstActiveInvitationMusicTrack(musicCategoryId);
    if (firstTrackInCategory) {
      return {
        musicCategoryId,
        musicTrackId: firstTrackInCategory.id,
        musicStoragePath: hasText(musicStoragePath)
          ? musicStoragePath
          : firstTrackInCategory.storagePath,
      };
    }
  }

  return {
    musicCategoryId,
    musicTrackId,
    musicStoragePath,
  };
}
