import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import { WEDDING_INTRO_OPTIONS, type WeddingIntroStyle } from '../../../../lib/weddingIntro';
import { useVisualPreferences } from '../../../../contexts/PreferencesContext';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';
import { manageStyles } from '../../manageStyles';

type SettingsEditorStepProps = {
  form: ManageFormState;
  savedPublished?: boolean;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSetPublished: (published: boolean) => void;
  onSetIntroStyle: (style: WeddingIntroStyle) => void;
  onPreviewIntro: (style: WeddingIntroStyle) => void;
};

export function SettingsEditorStep({
  form,
  savedPublished = form.published,
  onUpdateField,
  onSetPublished,
  onSetIntroStyle,
  onPreviewIntro,
}: SettingsEditorStepProps) {
  const { palette } = useVisualPreferences();

  return (
    <>
      <SectionCard
        title="첫 화면 애니메이션"
        description="PC 제작기와 동일한 연출을 선택할 수 있습니다. 저장 후 실제 청첩장에 반영됩니다."
      >
        {WEDDING_INTRO_OPTIONS.map((option) => (
          <View
            key={option.value}
            style={[
              styles.introOption,
              {
                backgroundColor: form.introStyle === option.value ? palette.accentSoft : palette.surface,
                borderColor: form.introStyle === option.value ? palette.accent : palette.cardBorder,
              },
            ]}
          >
            <AppText variant="title">{option.label}</AppText>
            <AppText variant="muted">{option.description}</AppText>
            <ActionButton
              fullWidth
              variant={form.introStyle === option.value ? 'primary' : 'secondary'}
              onPress={() => onSetIntroStyle(option.value)}
              accessibilityState={{ selected: form.introStyle === option.value }}
            >
              {form.introStyle === option.value ? '선택됨' : '이 연출 선택'}
            </ActionButton>
            {option.value !== 'none' ? (
              <ActionButton variant="secondary" fullWidth onPress={() => onPreviewIntro(option.value)}>
                연출 보기
              </ActionButton>
            ) : null}
          </View>
        ))}
        <AppText variant="caption" color={palette.textMuted}>
          미리보기는 PC와 동일한 웹 연출을 샘플 정보로 재생합니다. 실제 데이터는 변경하지 않습니다.
        </AppText>
      </SectionCard>

      <SectionCard
        title="공유 문구"
        description="링크 공유 때 보이는 제목과 설명을 마지막으로 다듬습니다."
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
        title="공개 상태"
        description="선택한 공개 여부는 마지막 저장 버튼을 누르면 적용됩니다."
      >
        <View style={[styles.stateSummary, { backgroundColor: palette.surfaceMuted }]}>
          <AppText variant="caption" color={palette.textMuted}>현재 저장된 공개 설정</AppText>
          <AppText variant="title" color={savedPublished ? palette.success : palette.text}>
            {savedPublished ? '공개' : '비공개'}
          </AppText>
          <AppText variant="muted" style={manageStyles.helperText}>
            실제 하객 노출 여부는 이용 기간 설정도 함께 확인합니다.
          </AppText>
        </View>

        <ActionButton variant={form.published ? 'primary' : 'secondary'}
          accessibilityState={{ selected: form.published }} onPress={() => onSetPublished(true)} fullWidth>
          저장 후 공개
        </ActionButton>
        <ActionButton variant={!form.published ? 'primary' : 'secondary'}
          accessibilityState={{ selected: !form.published }} onPress={() => onSetPublished(false)} fullWidth>
          비공개로 저장
        </ActionButton>
        {form.published !== savedPublished ? <AppText variant="muted">공개 설정 변경이 아직 적용되지 않았습니다.</AppText> : null}
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  stateSummary: { padding: 14, gap: 6 },
  introOption: { borderWidth: 1, borderRadius: 0, padding: 12, gap: 10 },
});
