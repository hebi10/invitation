import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { fetchMobileInvitationMusicLibrary } from '../../../lib/api';
import type { MobileMusicCategory } from '../../../types/mobileInvitation';
import type { ManageFormState, MusicDropdownPanel } from '../shared';

type UseMusicLibraryOptions = {
  apiBaseUrl: string;
  supportsMusicFeature: boolean;
  form: ManageFormState;
  setForm: Dispatch<SetStateAction<ManageFormState>>;
  setNotice: (message: string) => void;
};

export function useMusicLibrary({
  apiBaseUrl,
  supportsMusicFeature,
  form,
  setForm,
  setNotice,
}: UseMusicLibraryOptions) {
  const [musicCategories, setMusicCategories] = useState<MobileMusicCategory[]>([]);
  const [musicLibraryLoading, setMusicLibraryLoading] = useState(false);
  const [openMusicDropdown, setOpenMusicDropdown] =
    useState<MusicDropdownPanel>(null);

  const selectedMusicCategory = useMemo(
    () => musicCategories.find((category) => category.id === form.musicCategoryId) ?? null,
    [form.musicCategoryId, musicCategories]
  );

  const availableMusicTracks = useMemo(
    () => selectedMusicCategory?.tracks ?? [],
    [selectedMusicCategory]
  );

  const selectedMusicTrack = useMemo(
    () => availableMusicTracks.find((track) => track.id === form.musicTrackId) ?? null,
    [availableMusicTracks, form.musicTrackId]
  );

  const selectedMusicTrackLabel =
    selectedMusicTrack === null
      ? form.musicCategoryId
        ? '곡을 선택해 주세요'
        : '먼저 카테고리를 선택해 주세요'
      : `${selectedMusicTrack.title} · ${selectedMusicTrack.artist}`;

  useEffect(() => {
    if (!supportsMusicFeature) {
      setMusicCategories([]);
      setMusicLibraryLoading(false);
      setOpenMusicDropdown(null);
      return;
    }

    let mounted = true;

    const loadMusicLibrary = async () => {
      setMusicLibraryLoading(true);

      try {
        const response = await fetchMobileInvitationMusicLibrary(apiBaseUrl);
        if (!mounted) {
          return;
        }

        setMusicCategories(response.categories);

        setForm((current) => {
          if (response.categories.length === 0) {
            return {
              ...current,
              musicCategoryId: '',
              musicTrackId: '',
              musicStoragePath: '',
            };
          }

          const fallbackCategory = response.categories[0];
          const nextCategory =
            response.categories.find((category) => category.id === current.musicCategoryId) ??
            fallbackCategory;
          const nextTrack =
            nextCategory.tracks.find((track) => track.id === current.musicTrackId) ??
            nextCategory.tracks[0] ??
            null;

          const nextCategoryId = nextCategory?.id ?? '';
          const nextTrackId = nextTrack?.id ?? '';
          const nextStoragePath = nextTrack?.storagePath ?? '';

          if (
            current.musicCategoryId === nextCategoryId &&
            current.musicTrackId === nextTrackId &&
            current.musicStoragePath === nextStoragePath
          ) {
            return current;
          }

          return {
            ...current,
            musicCategoryId: nextCategoryId,
            musicTrackId: nextTrackId,
            musicStoragePath: nextStoragePath,
          };
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setMusicCategories([]);
        setNotice(
          error instanceof Error
            ? error.message
            : '음악 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
        );
      } finally {
        if (mounted) {
          setMusicLibraryLoading(false);
        }
      }
    };

    void loadMusicLibrary();

    return () => {
      mounted = false;
    };
  }, [apiBaseUrl, setForm, setNotice, supportsMusicFeature]);

  useEffect(() => {
    if (!form.musicEnabled) {
      setOpenMusicDropdown(null);
    }
  }, [form.musicEnabled]);

  const handleSelectMusicCategory = useCallback(
    (categoryId: string) => {
      const selectedCategory = musicCategories.find((category) => category.id === categoryId);
      const firstTrack = selectedCategory?.tracks[0] ?? null;

      setForm((current) => ({
        ...current,
        musicCategoryId: categoryId,
        musicTrackId: firstTrack?.id ?? '',
        musicStoragePath: firstTrack?.storagePath ?? '',
      }));
      setOpenMusicDropdown(null);
    },
    [musicCategories, setForm]
  );

  const handleSelectMusicTrack = useCallback(
    (trackId: string) => {
      const selectedTrack = availableMusicTracks.find((track) => track.id === trackId);

      setForm((current) => ({
        ...current,
        musicTrackId: trackId,
        musicStoragePath: selectedTrack?.storagePath ?? current.musicStoragePath,
      }));
      setOpenMusicDropdown(null);
    },
    [availableMusicTracks, setForm]
  );

  return {
    musicCategories,
    musicLibraryLoading,
    openMusicDropdown,
    selectedMusicCategory,
    availableMusicTracks,
    selectedMusicTrack,
    selectedMusicTrackLabel,
    setOpenMusicDropdown,
    handleSelectMusicCategory,
    handleSelectMusicTrack,
  };
}
