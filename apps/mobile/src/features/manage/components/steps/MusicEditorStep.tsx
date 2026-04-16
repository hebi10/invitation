import { Pressable, View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import { usePreferences } from '../../../../contexts/PreferencesContext';
import type { MobileMusicCategory } from '../../../../types/mobileInvitation';
import type {
  ManageFormState,
  ManageStringFieldKey,
  MusicDropdownPanel,
} from '../../shared';
import { manageStyles } from '../../manageStyles';

type MusicEditorStepProps = {
  form: ManageFormState;
  supportsMusicFeature: boolean;
  musicLibraryLoading: boolean;
  musicCategories: MobileMusicCategory[];
  openMusicDropdown: MusicDropdownPanel;
  selectedMusicCategoryLabel: string;
  selectedMusicTrackLabel: string;
  availableMusicTracks: MobileMusicCategory['tracks'];
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSetMusicEnabled: (enabled: boolean) => void;
  onToggleMusicDropdown: (panel: MusicDropdownPanel) => void;
  onSelectMusicCategory: (categoryId: string) => void;
  onSelectMusicTrack: (trackId: string) => void;
};

export function MusicEditorStep({
  form,
  supportsMusicFeature,
  musicLibraryLoading,
  musicCategories,
  openMusicDropdown,
  selectedMusicCategoryLabel,
  selectedMusicTrackLabel,
  availableMusicTracks,
  onUpdateField,
  onSetMusicEnabled,
  onToggleMusicDropdown,
  onSelectMusicCategory,
  onSelectMusicTrack,
}: MusicEditorStepProps) {
  const { palette } = usePreferences();

  return (
    <SectionCard
      title="배경음악 설정"
      description="서비스 등급에 맞는 배경음악 설정은 이 단계에서 따로 관리합니다."
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
          현재 서비스 등급에서는 배경음악 기능을 제공하지 않습니다.
        </AppText>
      )}
    </SectionCard>
  );
}
