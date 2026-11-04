import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';
import { manageStyles } from '../../manageStyles';

type SettingsEditorStepProps = {
  form: ManageFormState;
  savedPublished?: boolean;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSetPublished: (published: boolean) => void;
};

export function SettingsEditorStep({
  form,
  savedPublished = form.published,
  onUpdateField,
  onSetPublished,
}: SettingsEditorStepProps) {
  return (
    <>
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
        <AppText variant="muted" style={manageStyles.helperText}>
          현재 저장된 설정: {savedPublished ? '공개' : '비공개'}. 실제 노출은 이용 기간도 함께 확인합니다.
        </AppText>

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
