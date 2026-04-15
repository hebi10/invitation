import { View } from 'react-native';

import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type {
  ManageFormState,
  ManageStringFieldKey,
} from '../../shared';
import { manageStyles } from '../../manageStyles';

type ScheduleEditorStepProps = {
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
};

export function ScheduleEditorStep({
  form,
  onUpdateField,
}: ScheduleEditorStepProps) {
  return (
    <SectionCard
      title="예식 일정 정보"
      description="예식 일시와 본식·피로연 장소를 나눠서 입력합니다."
    >
      <TextField
        label="예식 일시 문구"
        value={form.date}
        onChangeText={(value) => onUpdateField('date', value)}
        placeholder="예: 2026.07.12 오후 2시"
      />
      <TextField
        label="예식장 이름"
        value={form.venue}
        onChangeText={(value) => onUpdateField('venue', value)}
        placeholder="예: 더채플 서울"
      />
      <View style={manageStyles.twoColumnRow}>
        <View style={manageStyles.halfField}>
          <TextField
            label="본식 시간"
            value={form.ceremonyTime}
            onChangeText={(value) => onUpdateField('ceremonyTime', value)}
            placeholder="예: 오후 2시 30분"
          />
        </View>
        <View style={manageStyles.halfField}>
          <TextField
            label="본식 장소"
            value={form.ceremonyLocation}
            onChangeText={(value) => onUpdateField('ceremonyLocation', value)}
            placeholder="예: 3층 그랜드홀"
          />
        </View>
      </View>
      <View style={manageStyles.twoColumnRow}>
        <View style={manageStyles.halfField}>
          <TextField
            label="피로연 시간"
            value={form.receptionTime}
            onChangeText={(value) => onUpdateField('receptionTime', value)}
            placeholder="예: 오후 4시 30분"
          />
        </View>
        <View style={manageStyles.halfField}>
          <TextField
            label="피로연 장소"
            value={form.receptionLocation}
            onChangeText={(value) => onUpdateField('receptionLocation', value)}
            placeholder="예: 1층 연회장"
          />
        </View>
      </View>
    </SectionCard>
  );
}
