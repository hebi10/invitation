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

const musicLibrarySource: InvitationMusicCategory[] = [
  {
    id: 'romantic',
    label: '로맨틱',
    tracks: [
      {
        id: 'romantic-memory-lane',
        categoryId: 'romantic',
        title: 'Memory Lane',
        artist: 'Invitation Studio',
        storagePath: 'music/romantic/memory-lane.mp3',
        active: true,
      },
      {
        id: 'romantic-golden-light',
        categoryId: 'romantic',
        title: 'Golden Light',
        artist: 'Invitation Studio',
        storagePath: 'music/romantic/golden-light.mp3',
        active: true,
      },
    ],
  },
  {
    id: 'classic',
    label: '클래식',
    tracks: [
      {
        id: 'classic-spring-vow',
        categoryId: 'classic',
        title: 'Spring Vow',
        artist: 'Invitation Studio',
        storagePath: 'music/classic/spring-vow.mp3',
        active: true,
      },
      {
        id: 'classic-waltz-of-you',
        categoryId: 'classic',
        title: 'Waltz Of You',
        artist: 'Invitation Studio',
        storagePath: 'music/classic/waltz-of-you.mp3',
        active: true,
      },
    ],
  },
  {
    id: 'cinematic',
    label: '시네마틱',
    tracks: [
      {
        id: 'cinematic-first-scene',
        categoryId: 'cinematic',
        title: 'First Scene',
        artist: 'Invitation Studio',
        storagePath: 'music/cinematic/first-scene.mp3',
        active: true,
      },
      {
        id: 'cinematic-sunset-credits',
        categoryId: 'cinematic',
        title: 'Sunset Credits',
        artist: 'Invitation Studio',
        storagePath: 'music/cinematic/sunset-credits.mp3',
        active: true,
      },
    ],
  },
];

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
