import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../../components/ActionButton';
import { Disclosure } from '../../../../components/Disclosure';
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
      <Disclosure
        title="첫 화면 애니메이션 (선택)"
        description={`현재 선택: ${WEDDING_INTRO_OPTIONS.find(option => option.value === form.introStyle)?.label ?? '없음'} · 변경하려면 펼쳐 주세요.`}
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
            {form.introStyle === option.value ? (
              <AppText variant="caption" color={palette.accent} style={styles.selectedLabel}>
                현재 선택한 연출
              </AppText>
            ) : null}
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
  introOption: { borderWidth: 1, borderRadius: 0, padding: 14, gap: 10 },
  selectedLabel: { fontWeight: '600' },
  pendingState: { padding: 12, gap: 6 },
  publicActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  publicAction: { flexGrow: 1, flexBasis: 118, minWidth: 110 },
});
