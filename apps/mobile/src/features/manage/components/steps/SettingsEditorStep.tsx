import { Pressable, View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { ChoiceChip } from '../../../../components/ChoiceChip';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import { useAppState } from '../../../../contexts/AppStateContext';
import type { MobileMusicCategory } from '../../../../types/mobileInvitation';
import type {
  ManageFormState,
  ManageStringFieldKey,
  MusicDropdownPanel,
} from '../../shared';
import { manageStyles } from '../../manageStyles';

type SettingsEditorStepProps = {
  form: ManageFormState;
  supportsMusicFeature: boolean;
  musicLibraryLoading: boolean;
  musicCategories: MobileMusicCategory[];
  openMusicDropdown: MusicDropdownPanel;
  selectedMusicCategoryLabel: string;
  selectedMusicTrackLabel: string;
  availableMusicTracks: MobileMusicCategory['tracks'];
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSetDefaultTheme: (theme: 'emotional' | 'simple') => void;
  onSetMusicEnabled: (enabled: boolean) => void;
  onSetPublished: (published: boolean) => void;
  onToggleMusicDropdown: (panel: MusicDropdownPanel) => void;
  onSelectMusicCategory: (categoryId: string) => void;
  onSelectMusicTrack: (trackId: string) => void;
};

export function SettingsEditorStep({
  form,
  supportsMusicFeature,
  musicLibraryLoading,
  musicCategories,
  openMusicDropdown,
  selectedMusicCategoryLabel,
  selectedMusicTrackLabel,
  availableMusicTracks,
  onUpdateField,
  onSetDefaultTheme,
  onSetMusicEnabled,
  onSetPublished,
  onToggleMusicDropdown,
  onSelectMusicCategory,
  onSelectMusicTrack,
}: SettingsEditorStepProps) {
  const { palette } = useAppState();

  return (
    <>
      <SectionCard
        title="공유 문구와 기본 테마"
        description="미리보기 제목·설명과 공개 페이지 기본 테마를 마지막으로 점검합니다."
      >
        <TextField
          label="공유 제목"
          value={form.shareTitle}
          onChangeText={(value) => onUpdateField('shareTitle', value)}
          placeholder="예: 박준호 · 김수민 결혼식에 초대합니다"
        />
        <TextField
          label="공유 설명"
          value={form.shareDescription}
          onChangeText={(value) => onUpdateField('shareDescription', value)}
          placeholder="미리보기 카드에서 보일 설명을 입력해 주세요."
          multiline
        />

        <AppText variant="caption" style={manageStyles.helperText}>
          기본 테마
        </AppText>
        <View style={manageStyles.chipRow}>
          <ChoiceChip
            label="감성형"
            selected={form.defaultTheme === 'emotional'}
            onPress={() => onSetDefaultTheme('emotional')}
          />
          <ChoiceChip
            label="심플형"
            selected={form.defaultTheme === 'simple'}
            onPress={() => onSetDefaultTheme('simple')}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="배경음악과 공개 설정"
        description="서비스 등급에 맞는 음악 설정과 공개 상태를 함께 저장합니다."
      >
        {supportsMusicFeature ? (
          <>
            <ActionButton
              variant={form.musicEnabled ? 'primary' : 'secondary'}
              onPress={() => onSetMusicEnabled(!form.musicEnabled)}
              fullWidth
            >
              {form.musicEnabled ? '배경음악 사용 중' : '배경음악 사용 안 함'}
            </ActionButton>

            <View style={manageStyles.dropdownField}>
              <AppText variant="caption" style={manageStyles.dropdownLabel}>
                음악 카테고리
              </AppText>
              <Pressable
                accessibilityRole="button"
                disabled={!form.musicEnabled || musicLibraryLoading}
                onPress={() =>
                  onToggleMusicDropdown(openMusicDropdown === 'category' ? null : 'category')
                }
                style={[
                  manageStyles.dropdownButton,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor:
                      openMusicDropdown === 'category' ? palette.accent : palette.cardBorder,
                    opacity: !form.musicEnabled || musicLibraryLoading ? 0.5 : 1,
                  },
                ]}
              >
                <AppText style={manageStyles.dropdownButtonText}>
                  {selectedMusicCategoryLabel}
                </AppText>
                <AppText variant="caption" style={manageStyles.dropdownArrow}>
                  {openMusicDropdown === 'category' ? '▲' : '▼'}
                </AppText>
              </Pressable>

              {openMusicDropdown === 'category' ? (
                <View
                  style={[
                    manageStyles.dropdownList,
                    { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                  ]}
                >
                  {musicCategories.length ? (
                    musicCategories.map((category) => {
                      const selected = category.id === form.musicCategoryId;

                      return (
                        <Pressable
                          key={`music-category-${category.id}`}
                          accessibilityRole="button"
                          onPress={() => onSelectMusicCategory(category.id)}
                          style={[
                            manageStyles.dropdownOption,
                            {
                              borderColor: selected ? palette.accent : palette.cardBorder,
                              backgroundColor: selected ? palette.accentSoft : palette.surfaceMuted,
                            },
                          ]}
                        >
                          <View style={manageStyles.dropdownOptionCopy}>
                            <AppText style={manageStyles.dropdownOptionTitle}>
                              {category.label}
                            </AppText>
                            <AppText variant="caption" style={manageStyles.dropdownOptionMeta}>
                              {category.tracks.length}곡
                            </AppText>
                          </View>
                        </Pressable>
                      );
                    })
                  ) : (
                    <AppText variant="caption" style={manageStyles.helperText}>
                      등록된 카테고리가 없습니다.
                    </AppText>
                  )}
                </View>
              ) : null}
            </View>

            <View style={manageStyles.dropdownField}>
              <AppText variant="caption" style={manageStyles.dropdownLabel}>
                곡 선택
              </AppText>
              <Pressable
                accessibilityRole="button"
                disabled={!form.musicEnabled || musicLibraryLoading || availableMusicTracks.length === 0}
                onPress={() =>
                  onToggleMusicDropdown(openMusicDropdown === 'track' ? null : 'track')
                }
                style={[
                  manageStyles.dropdownButton,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor:
                      openMusicDropdown === 'track' ? palette.accent : palette.cardBorder,
                    opacity:
                      !form.musicEnabled || musicLibraryLoading || availableMusicTracks.length === 0
                        ? 0.5
                        : 1,
                  },
                ]}
              >
                <AppText style={manageStyles.dropdownButtonText}>
                  {selectedMusicTrackLabel}
                </AppText>
                <AppText variant="caption" style={manageStyles.dropdownArrow}>
                  {openMusicDropdown === 'track' ? '▲' : '▼'}
                </AppText>
              </Pressable>

              {openMusicDropdown === 'track' ? (
                <View
                  style={[
                    manageStyles.dropdownList,
                    { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                  ]}
                >
                  {availableMusicTracks.length ? (
                    availableMusicTracks.map((track) => {
                      const selected = track.id === form.musicTrackId;

                      return (
                        <Pressable
                          key={`music-track-${track.id}`}
                          accessibilityRole="button"
                          onPress={() => onSelectMusicTrack(track.id)}
                          style={[
                            manageStyles.dropdownOption,
                            {
                              borderColor: selected ? palette.accent : palette.cardBorder,
                              backgroundColor: selected ? palette.accentSoft : palette.surfaceMuted,
                            },
                          ]}
                        >
                          <View style={manageStyles.dropdownOptionCopy}>
                            <AppText style={manageStyles.dropdownOptionTitle}>
                              {track.title}
                            </AppText>
                            <AppText variant="caption" style={manageStyles.dropdownOptionMeta}>
                              {track.artist}
                            </AppText>
                          </View>
                        </Pressable>
                      );
                    })
                  ) : (
                    <AppText variant="caption" style={manageStyles.helperText}>
                      등록된 곡이 없습니다.
                    </AppText>
                  )}
                </View>
              ) : null}
            </View>

            <TextField
              label="볼륨 (0 ~ 1)"
              value={form.musicVolume}
              onChangeText={(value) => onUpdateField('musicVolume', value)}
              placeholder="예: 0.35"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="decimal-pad"
            />
          </>
        ) : (
          <AppText variant="muted" style={manageStyles.helperText}>
            현재 서비스 등급에서는 배경음악을 제공하지 않습니다.
          </AppText>
        )}

        <ActionButton
          variant={form.published ? 'primary' : 'secondary'}
          onPress={() => onSetPublished(!form.published)}
          fullWidth
        >
          {form.published ? '저장 후 공개 상태 유지' : '저장 후 비공개 상태 유지'}
        </ActionButton>
      </SectionCard>
    </>
  );
}
