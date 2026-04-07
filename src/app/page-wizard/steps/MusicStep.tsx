import { useState } from 'react';

import {
  DEFAULT_INVITATION_MUSIC_VOLUME,
  clampInvitationMusicVolume,
  findFirstActiveInvitationMusicTrack,
  findInvitationMusicTrackById,
  getInvitationMusicTracksByCategory,
  INVITATION_MUSIC_LIBRARY,
  normalizeInvitationMusicSelection,
} from '@/lib/musicLibrary';

import styles from '../page.module.css';
import { renderFieldMeta, type MusicStepProps } from '../pageWizardShared';

export default function MusicStep({
  formState,
  updateForm,
  musicPreviewState,
}: MusicStepProps) {
  const [openOptionPanel, setOpenOptionPanel] = useState<'category' | 'track' | null>(null);

  const defaultTrack = findFirstActiveInvitationMusicTrack();
  const normalizedSelection = normalizeInvitationMusicSelection({
    categoryId: formState.musicCategoryId ?? defaultTrack?.categoryId,
    trackId: formState.musicTrackId ?? defaultTrack?.id,
    storagePath: formState.musicStoragePath ?? defaultTrack?.storagePath,
  });
  const musicCategoryId = normalizedSelection.musicCategoryId;
  const musicTracks = getInvitationMusicTracksByCategory(musicCategoryId);
  const selectedCategory =
    INVITATION_MUSIC_LIBRARY.find((category) => category.id === musicCategoryId) ??
    INVITATION_MUSIC_LIBRARY[0] ??
    null;
  const selectedTrack =
    findInvitationMusicTrackById(normalizedSelection.musicTrackId) ??
    musicTracks[0] ??
    defaultTrack;
  const musicVolume = clampInvitationMusicVolume(
    formState.musicVolume,
    DEFAULT_INVITATION_MUSIC_VOLUME
  );
  const previewMusicUrl = formState.musicUrl?.trim() ?? '';

  const handleMusicEnabledChange = (enabled: boolean) => {
    updateForm((draft) => {
      const draftDefaultTrack = findFirstActiveInvitationMusicTrack(draft.musicCategoryId);
      const normalizedDraftSelection = normalizeInvitationMusicSelection({
        categoryId: draft.musicCategoryId ?? draftDefaultTrack?.categoryId,
        trackId: draft.musicTrackId ?? draftDefaultTrack?.id,
        storagePath: draft.musicStoragePath ?? draftDefaultTrack?.storagePath,
      });

      draft.musicEnabled = enabled;
      draft.musicVolume = clampInvitationMusicVolume(
        draft.musicVolume,
        DEFAULT_INVITATION_MUSIC_VOLUME
      );
      draft.musicCategoryId = normalizedDraftSelection.musicCategoryId;
      draft.musicTrackId = normalizedDraftSelection.musicTrackId;
      draft.musicStoragePath = normalizedDraftSelection.musicStoragePath;
      draft.musicUrl = '';
    });
  };

  const handleMusicCategoryChange = (categoryId: string) => {
    updateForm((draft) => {
      const normalizedDraftSelection = normalizeInvitationMusicSelection({
        categoryId,
        trackId: '',
        storagePath: '',
      });

      draft.musicCategoryId = normalizedDraftSelection.musicCategoryId;
      draft.musicTrackId = normalizedDraftSelection.musicTrackId;
      draft.musicStoragePath = normalizedDraftSelection.musicStoragePath;
      draft.musicUrl = '';
    });
  };

  const handleMusicTrackChange = (trackId: string) => {
    updateForm((draft) => {
      const normalizedDraftSelection = normalizeInvitationMusicSelection({
        categoryId: draft.musicCategoryId,
        trackId,
        storagePath: '',
      });

      draft.musicCategoryId = normalizedDraftSelection.musicCategoryId;
      draft.musicTrackId = normalizedDraftSelection.musicTrackId;
      draft.musicStoragePath = normalizedDraftSelection.musicStoragePath;
      draft.musicUrl = '';
    });
  };

  const handleMusicVolumeChange = (value: string) => {
    updateForm((draft) => {
      const parsedVolume = Number(value);
      draft.musicVolume = clampInvitationMusicVolume(
        Number.isFinite(parsedVolume) ? parsedVolume : draft.musicVolume,
        DEFAULT_INVITATION_MUSIC_VOLUME
      );
    });
  };

  return (
    <div className={`${styles.fieldGrid} ${styles.musicSection}`}>
      <div className={`${styles.summaryCard} ${styles.musicIntroCard}`}>
        <span className={styles.summaryLabel}>선택 단계</span>
        <strong className={styles.summaryValue}>배경음악은 필요할 때만 켜면 됩니다.</strong>
        <p className={styles.sectionText}>
          음악을 켜면 방문자가 페이지를 열었을 때 선택한 곡으로 배경음악이 재생됩니다.
        </p>
      </div>

      <section className={`${styles.formCard} ${styles.musicToggleCard}`}>
        <div className={styles.musicToggleContent}>
          <label className={styles.switchRow}>
            <input
              type="checkbox"
              checked={Boolean(formState.musicEnabled)}
              onChange={(event) => handleMusicEnabledChange(event.target.checked)}
            />
            <span>배경음악 사용</span>
          </label>
          <p className={styles.musicToggleHint}>
            비활성화하면 음악은 재생되지 않고, 설정은 유지됩니다.
          </p>
        </div>
      </section>

      <section className={`${styles.formCard} ${styles.musicControlCard}`}>
        <div className={`${styles.twoColumnGrid} ${styles.musicControlGrid}`}>
          <label className={`${styles.field} ${styles.musicField}`}>
            {renderFieldMeta('음악 카테고리', 'optional')}
            <button
              type="button"
              className={`${styles.musicSelectButton} ${
                openOptionPanel === 'category' ? styles.musicSelectButtonActive : ''
              }`}
              onClick={() =>
                setOpenOptionPanel((current) =>
                  current === 'category' ? null : 'category'
                )
              }
              aria-expanded={openOptionPanel === 'category'}
              aria-haspopup="listbox"
              disabled={!formState.musicEnabled}
            >
              <span className={styles.musicSelectButtonValue}>
                {selectedCategory?.label ?? '카테고리 선택'}
              </span>
              <span className={styles.musicSelectButtonArrow} aria-hidden>
                {openOptionPanel === 'category' ? '▲' : '▼'}
              </span>
            </button>

            {openOptionPanel === 'category' ? (
              <div className={styles.musicOptionList} role="radiogroup" aria-label="음악 카테고리 옵션">
                {INVITATION_MUSIC_LIBRARY.map((category) => {
                  const isActive = category.id === musicCategoryId;

                  return (
                    <button
                      key={`music-category-${category.id}`}
                      type="button"
                      className={`${styles.musicOptionCard} ${isActive ? styles.musicOptionCardActive : ''}`}
                      onClick={() => {
                        handleMusicCategoryChange(category.id);
                        setOpenOptionPanel(null);
                      }}
                      disabled={!formState.musicEnabled}
                    >
                      <span className={styles.musicOptionTitle}>{category.label}</span>
                      <span className={styles.musicOptionMeta}>{category.tracks.length}곡</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </label>

          <label className={`${styles.field} ${styles.musicField}`}>
            {renderFieldMeta('곡 선택', 'optional')}
            <button
              type="button"
              className={`${styles.musicSelectButton} ${
                openOptionPanel === 'track' ? styles.musicSelectButtonActive : ''
              }`}
              onClick={() =>
                setOpenOptionPanel((current) => (current === 'track' ? null : 'track'))
              }
              aria-expanded={openOptionPanel === 'track'}
              aria-haspopup="listbox"
              disabled={!formState.musicEnabled || musicTracks.length === 0}
            >
              <span className={styles.musicSelectButtonValue}>
                {selectedTrack ? `${selectedTrack.title} · ${selectedTrack.artist}` : '등록된 곡이 없습니다.'}
              </span>
              <span className={styles.musicSelectButtonArrow} aria-hidden>
                {openOptionPanel === 'track' ? '▲' : '▼'}
              </span>
            </button>

            {openOptionPanel === 'track' ? (
              <div className={styles.musicOptionList} role="radiogroup" aria-label="음악 곡 옵션">
                {musicTracks.length > 0 ? (
                  musicTracks.map((track) => {
                    const isActive = selectedTrack?.id === track.id;

                    return (
                      <button
                        key={`music-track-${track.id}`}
                        type="button"
                        className={`${styles.musicOptionCard} ${isActive ? styles.musicOptionCardActive : ''}`}
                        onClick={() => {
                          handleMusicTrackChange(track.id);
                          setOpenOptionPanel(null);
                        }}
                        disabled={!formState.musicEnabled}
                      >
                        <span className={styles.musicOptionTitle}>{track.title}</span>
                        <span className={styles.musicOptionMeta}>{track.artist}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.musicOptionEmpty}>등록된 곡이 없습니다.</div>
                )}
              </div>
            ) : null}
          </label>

          <label className={`${styles.field} ${styles.musicField} ${styles.fieldWide}`}>
            {renderFieldMeta('볼륨', 'optional', '0은 음소거, 1은 최대 음량입니다.')}
            <div className={styles.musicRangeRow}>
              <input
                className={styles.musicRangeInput}
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={(event) => handleMusicVolumeChange(event.target.value)}
                disabled={!formState.musicEnabled}
              />
              <span className={styles.musicVolumeBadge}>{Math.round(musicVolume * 100)}%</span>
            </div>
          </label>
        </div>
      </section>

      <div className={`${styles.summaryCard} ${styles.musicMetaCard}`}>
        <span className={styles.summaryLabel}>선택된 곡</span>
        <strong className={styles.summaryValue}>
          {selectedTrack ? `${selectedTrack.title} · ${selectedTrack.artist}` : '선택된 곡 없음'}
        </strong>
        <p className={styles.sectionText}>
          저장 경로
        </p>
        <code className={styles.musicStoragePath}>
          {normalizedSelection.musicStoragePath || '설정되지 않음'}
        </code>
      </div>

      <section className={`${styles.formCard} ${styles.musicPreviewCard}`}>
        <span className={styles.summaryLabel}>미리 듣기</span>
        {formState.musicEnabled ? (
          previewMusicUrl ? (
            <audio className={styles.musicAudio} controls preload="none" src={previewMusicUrl} />
          ) : musicPreviewState === 'loading' ? (
            <div className={styles.musicAudioPlaceholder}>선택한 곡을 불러오는 중입니다.</div>
          ) : (
            <div className={styles.musicAudioPlaceholder}>
              미리듣기 URL을 가져오지 못했습니다. 저장 경로 또는 Storage 읽기 권한을 확인해 주세요.
            </div>
          )
        ) : (
          <div className={styles.musicAudioPlaceholder}>
            배경음악 사용을 켜면 여기서 바로 미리 들을 수 있습니다.
          </div>
        )}
      </section>
    </div>
  );
}
