import { AppText } from '../../../components/AppText';
import { TextField } from '../../../components/TextField';
import type { ManageFormState, ManageStringFieldKey } from '../shared';

type Props = {
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
};

export function WeddingDateTimeFields({ form, onUpdateField }: Props) {
  return (
    <>
      {form.legacyWeddingDateTimeLabel ? (
        <AppText variant="muted">
          기존 예식 일시 {form.legacyWeddingDateTimeLabel}. 확인 후 아래 두 항목에 새로 입력해 주세요.
        </AppText>
      ) : null}
      <TextField
        label="예식 날짜"
        value={form.weddingDateInput}
        onChangeText={(value) => onUpdateField('weddingDateInput', value.replace(/[./\s-]/g, ''))}
        keyboardType="number-pad"
        placeholder="예: 20270506"
        helperText="연도 4자리, 월 2자리, 일 2자리를 입력해 주세요."
      />
      <TextField
        label="예식 시간"
        value={form.weddingTimeInput}
        onChangeText={(value) => onUpdateField('weddingTimeInput', value.replace(/[:\s]/g, ''))}
        keyboardType="number-pad"
        placeholder="예: 1430"
        helperText="24시간제로 입력해 주세요. 오후 2시 30분은 1430입니다."
      />
    </>
  );
}
