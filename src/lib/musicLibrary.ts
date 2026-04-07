export const DEFAULT_INVITATION_MUSIC_VOLUME = 0.35;
export const INVITATION_MUSIC_VOLUME_MIN = 0;
export const INVITATION_MUSIC_VOLUME_MAX = 1;

export type InvitationMusicCategoryId = 'romantic' | 'classic' | 'cinematic';

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
        storagePath: 'wedding-music/romantic/memory-lane.mp3',
        active: true,
      },
      {
        id: 'romantic-golden-light',
        categoryId: 'romantic',
        title: 'Golden Light',
        artist: 'Invitation Studio',
        storagePath: 'wedding-music/romantic/golden-light.mp3',
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
        storagePath: 'wedding-music/classic/spring-vow.mp3',
        active: true,
      },
      {
        id: 'classic-waltz-of-you',
        categoryId: 'classic',
        title: 'Waltz Of You',
        artist: 'Invitation Studio',
        storagePath: 'wedding-music/classic/waltz-of-you.mp3',
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
        storagePath: 'wedding-music/cinematic/first-scene.mp3',
        active: true,
      },
      {
        id: 'cinematic-sunset-credits',
        categoryId: 'cinematic',
        title: 'Sunset Credits',
        artist: 'Invitation Studio',
        storagePath: 'wedding-music/cinematic/sunset-credits.mp3',
        active: true,
      },
    ],
  },
];

export const INVITATION_MUSIC_LIBRARY: InvitationMusicCategory[] =
  musicLibrarySource.map((category) => ({
    ...category,
    tracks: [...category.tracks],
  }));

const activeTracks = INVITATION_MUSIC_LIBRARY.flatMap((category) =>
  category.tracks.filter((track) => track.active)
);

const tracksById = new Map<string, InvitationMusicTrack>(
  activeTracks.map((track) => [track.id, track])
);

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
