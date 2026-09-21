import { ActionButton } from '../../../../components/ActionButton';
import { AppText } from '../../../../components/AppText';
import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';
import { manageStyles } from '../../manageStyles';

type SettingsEditorStepProps = {
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onSetPublished: (published: boolean) => void;
};

export function SettingsEditorStep({
  form,
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
        description="청첩장의 공개 여부를 설정합니다."
      >
        <AppText variant="muted" style={manageStyles.helperText}>
          모든 웨딩 디자인은 별도 연결이나 티켓 없이 디자인별 주소로 열 수 있습니다.
        </AppText>

        <ActionButton
          variant={form.published ? 'primary' : 'secondary'}
          onPress={() => onSetPublished(!form.published)}
          fullWidth
        >
          {form.published ? '현재 공개 상태 유지' : '현재 비공개 상태 유지'}
        </ActionButton>
      </SectionCard>
    </>
  );
}
