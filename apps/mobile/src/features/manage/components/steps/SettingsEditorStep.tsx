import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { Disclosure } from '../../../../components/Disclosure';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import { WEDDING_INTRO_OPTIONS } from '../../../../lib/weddingIntro';
import type { EventTypeKey } from '../../../../../../../../src/lib/eventTypes';
import { getInvitationIntroPreset, listAvailableInvitationIntroPresets, listAvailableInvitationIntroGroups,
  parseInvitationIntroChoice, type InvitationIntroChoice, type InvitationIntroGroup,
  type InvitationIntroPresetId } from '../../../../lib/invitationIntroCatalog';
import { useVisualPreferences } from '../../../../contexts/PreferencesContext';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';
import { manageStyles } from '../../manageStyles';

type SettingsEditorStepProps = {
  form: ManageFormState;
  eventType: EventTypeKey;
  savedPublished?: boolean;
  savedIntroPresetId: InvitationIntroChoice | null;
  hasUnknownSavedIntroPreset: boolean;
  introAssetBaseUrl: string;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSetPublished: (published: boolean) => void;
  onSetIntroPresetId: (choice: InvitationIntroChoice) => void;
  onPreviewIntroPreset: (id: InvitationIntroPresetId) => void;
};

export function SettingsEditorStep({
  form,
  eventType,
  savedPublished = form.published,
  savedIntroPresetId,
  hasUnknownSavedIntroPreset,
  introAssetBaseUrl,
  onUpdateField,
  onSetPublished,
  onSetIntroPresetId,
  onPreviewIntroPreset,
}: SettingsEditorStepProps) {
  const { palette } = useVisualPreferences();
  const [failedPosters, setFailedPosters] = useState<Record<string, boolean>>({});
  const [activeGroup, setActiveGroup] = useState<InvitationIntroGroup | 'all'>('all');
  const options = listAvailableInvitationIntroPresets(eventType);
  const groups = listAvailableInvitationIntroGroups(eventType);
  const visibleGroup = activeGroup === 'all' || groups.some((g) => g.id === activeGroup)
    ? activeGroup : 'all';
  const visiblePresets = options.filter((preset) => visibleGroup === 'all' || preset.group === visibleGroup);
  const selectedChoice = parseInvitationIntroChoice(form.introPresetId, eventType);
  const unavailableChoice = parseInvitationIntroChoice(form.introPresetId) !== null && selectedChoice === null;
  const legacyOption = WEDDING_INTRO_OPTIONS.find((option) => option.value === form.introStyle);
  const savedLabel = savedIntroPresetId === 'none'
    ? '사용 안 함'
    : savedIntroPresetId
      ? getInvitationIntroPreset(savedIntroPresetId)?.label ?? '기존 GIF'
      : hasUnknownSavedIntroPreset
        ? '현재 앱에서 지원하지 않는 인트로'
        : form.introStyle !== 'none'
          ? `기존 연출: ${legacyOption?.label ?? '기존 인트로'}`
          : '미선택';
  const draftLabel = selectedChoice === 'none'
    ? '사용 안 함'
    : selectedChoice
      ? getInvitationIntroPreset(selectedChoice)?.label ?? '선택한 GIF'
      : savedLabel;

  return (
    <>
      <Disclosure
        title="인트로 GIF (선택)"
        description={`저장된 설정: ${savedLabel} · 변경하려면 펼쳐 주세요.`}
      >
        <AppText variant="muted">
          초대장 디자인과 별개로 GIF 한 종류 또는 사용 안 함을 선택할 수 있습니다.
          미리보기는 저장하지 않으며 기존 저장 버튼으로 확정됩니다.
        </AppText>
        {unavailableChoice ? (
          <View style={[styles.introNotice, { backgroundColor: palette.surfaceMuted }]}>
            <AppText variant="caption">기존에 저장된 GIF는 이 행사에서 사용할 수 없습니다. 다른 디자인을 선택해 저장해 주세요.</AppText>
          </View>
        ) : null}
        {selectedChoice === null && form.introStyle !== 'none' ? (
          <View style={[styles.introNotice, { backgroundColor: palette.surfaceMuted }]}>
            <AppText variant="caption">
              기존 인트로 {legacyOption?.label ?? '연출'}이(가) 유지됩니다. 새 GIF를 저장하기 전에는 변경되지 않습니다.
            </AppText>
          </View>
        ) : null}
        {selectedChoice === null && hasUnknownSavedIntroPreset ? (
          <View style={[styles.introNotice, { backgroundColor: palette.surfaceMuted }]}>
            <AppText variant="caption">
              다른 버전에서 저장된 인트로 ID가 있습니다. 새 선택 없이 다른 내용을 저장해도 기존 ID를 보존합니다.
            </AppText>
          </View>
        ) : null}
        <View style={[
          styles.noneOption,
          {
            backgroundColor: selectedChoice === 'none' ? palette.accentSoft : palette.surface,
            borderColor: selectedChoice === 'none' ? palette.accent : palette.cardBorder,
          },
        ]}>
          <AppText variant="title">사용 안 함</AppText>
          <AppText variant="muted">새 GIF 인트로를 사용하지 않습니다.</AppText>
          {savedIntroPresetId === 'none' ? <AppText variant="caption">저장된 선택</AppText> : null}
          <ActionButton
            fullWidth
            variant={selectedChoice === 'none' ? 'primary' : 'secondary'}
            onPress={() => onSetIntroPresetId('none')}
            accessibilityState={{ selected: selectedChoice === 'none' }}
          >
            {selectedChoice === 'none' ? '선택됨' : '사용 안 함 선택'}
          </ActionButton>
        </View>
        <View style={styles.groupFilter} accessibilityRole="radiogroup" accessibilityLabel="인트로 디자인 분류">
          <ActionButton variant={visibleGroup === 'all' ? 'primary' : 'secondary'}
            onPress={() => setActiveGroup('all')} accessibilityState={{ selected: visibleGroup === 'all' }}>
            전체 {options.length}
          </ActionButton>
          {groups.map((group) => (
            <ActionButton key={group.id} variant={visibleGroup === group.id ? 'primary' : 'secondary'}
              onPress={() => setActiveGroup(group.id)} accessibilityState={{ selected: visibleGroup === group.id }}>
              {group.label} {options.filter((preset) => preset.group === group.id).length}
            </ActionButton>
          ))}
        </View>
        <View style={styles.presetGrid}>
          {visiblePresets.map((preset) => {
            const isSelected = selectedChoice === preset.id;
            return (
              <View
                key={preset.id}
                style={[
                  styles.presetCard,
                  {
                    backgroundColor: isSelected ? palette.accentSoft : palette.surface,
                    borderColor: isSelected ? palette.accent : palette.cardBorder,
                  },
                ]}
              >
                <View style={[styles.posterFrame, { backgroundColor: palette.surfaceMuted }]}>
                  {failedPosters[preset.id] ? (
                    <AppText variant="caption" color={palette.textMuted}>
                      포스터를 불러오지 못했습니다.
                    </AppText>
                  ) : (
                    <Image
                      source={{ uri: new URL(preset.posterSrc, introAssetBaseUrl).toString() }}
                      style={styles.posterImage}
                      contentFit="contain"
                      accessibilityLabel={`${preset.label} 인트로 정지 이미지`}
                      onError={() => setFailedPosters((current) => ({ ...current, [preset.id]: true }))}
                    />
                  )}
                </View>
                <AppText variant="title">{preset.label}</AppText>
                <AppText variant="muted">{preset.description}</AppText>
                <AppText variant="caption" color={palette.textMuted}>
                  {preset.durationMs / 1000}초 · {savedIntroPresetId === preset.id ? '저장된 선택' : '선택 가능'}
                </AppText>
                <ActionButton
                  fullWidth
                  variant={isSelected ? 'primary' : 'secondary'}
                  onPress={() => onSetIntroPresetId(preset.id)}
                  accessibilityState={{ selected: isSelected }}
                >
                  {isSelected ? '선택됨' : '이 GIF 선택'}
                </ActionButton>
                <ActionButton
                  fullWidth
                  variant="secondary"
                  onPress={() => onPreviewIntroPreset(preset.id)}
                  accessibilityLabel={`${preset.label} GIF 미리보기`}
                >
                  2초 미리보기
                </ActionButton>
              </View>
            );
          })}
        </View>
        {selectedChoice !== savedIntroPresetId && selectedChoice !== null ? (
          <AppText variant="caption" color={palette.textMuted}>
            저장 예정: {draftLabel} · 아직 실제 초대장에 적용되지 않았습니다.
          </AppText>
        ) : null}
        <AppText variant="caption" color={palette.textMuted}>
          현재 행사에서 사용 가능한 GIF만 표시합니다. 미리보기는 샘플 자료만 재생하며 저장값을 바꾸지 않습니다.
        </AppText>
      </Disclosure>

      <SectionCard
        title="공유 제목과 설명"
        description="청첩장 링크를 전달할 때 보이는 글을 확인해 주세요."
      >
        <TextField
          label="공유 제목"
          value={form.shareTitle}
          onChangeText={(value) => onUpdateField('shareTitle', value)}
          placeholder="예: 박신랑 김신부 결혼식에 초대합니다."
        />
        <TextField
          label="공유 설명"
          value={form.shareDescription}
          onChangeText={(value) => onUpdateField('shareDescription', value)}
          placeholder="미리보기 카드에서 보일 설명을 입력해 주세요."
          multiline
        />
      </SectionCard>

      <SectionCard
        title="공개 여부 최종 확인"
        description="공개 여부를 선택한 다음 화면 아래 저장 버튼을 눌러 적용합니다."
      >
        <View style={[styles.stateSummary, { backgroundColor: palette.surfaceMuted }]}>
          <AppText variant="caption" color={palette.textMuted}>현재 저장된 공개 설정</AppText>
          <AppText variant="title" color={palette.text}>
            {savedPublished ? '공개' : '비공개'}
          </AppText>
          <AppText variant="muted" style={manageStyles.helperText}>
            실제 하객 노출 여부는 이용 기간 설정도 함께 확인합니다.
          </AppText>
        </View>

        <View style={styles.publicActions}>
          <ActionButton variant={form.published ? 'primary' : 'secondary'}
            accessibilityState={{ selected: form.published }} onPress={() => onSetPublished(true)}
            style={styles.publicAction}>
            공개 선택
          </ActionButton>
          <ActionButton variant={!form.published ? 'primary' : 'secondary'}
            accessibilityState={{ selected: !form.published }} onPress={() => onSetPublished(false)}
            style={styles.publicAction}>
            비공개 선택
          </ActionButton>
        </View>
        {form.published !== savedPublished ? (
          <View style={[styles.pendingState, { backgroundColor: palette.noticeSoft }]}>
            <AppText variant="caption" color={palette.notice}>
              저장 예정: {form.published ? '공개' : '비공개'} · 아직 적용되지 않았습니다.
            </AppText>
          </View>
        ) : null}
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  stateSummary: { padding: 14, gap: 6 },
  introNotice: { padding: 12, gap: 6 },
  noneOption: { borderWidth: 1, padding: 14, gap: 8 },
  groupFilter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetCard: { flexGrow: 1, width: '48%', minWidth: 124, borderWidth: 1, padding: 10, gap: 8 },
  posterFrame: { height: 164, alignItems: 'center', justifyContent: 'center', padding: 4 },
  posterImage: { width: '100%', height: '100%' },
  pendingState: { padding: 12, gap: 6 },
  publicActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  publicAction: { flexGrow: 1, flexBasis: 118, minWidth: 110 },
});
