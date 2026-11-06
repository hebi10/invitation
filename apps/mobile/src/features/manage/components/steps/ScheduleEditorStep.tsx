import { View } from 'react-native';

import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type { ManageFormState, ManageStringFieldKey } from '../../shared';
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
    <>
      <SectionCard
        title="예식 날짜와 시간"
        description="예식 날짜·시간은 하객이 가장 먼저 확인하는 정보입니다."
      >
        <TextField
          label="예식 일시"
          value={form.date}
          onChangeText={(value) => onUpdateField('date', value)}
          placeholder="예: 2027년 5월 6일 오후 2시"
          helperText="날짜와 시간을 한 문장으로 입력해 주세요. 청첩장에 그대로 표시됩니다."
        />
        <TextField
          label="예식장 이름"
          value={form.venue}
          onChangeText={(value) => onUpdateField('venue', value)}
          placeholder="예: 소풍컨벤션 서울"
        />
      </SectionCard>
      <SectionCard
        title="본식 안내"
        description="홀 이름이나 층수가 있다면 추가해 주세요."
      >
        <View style={manageStyles.editorFieldGroup}>
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
        </View>
      </SectionCard>
      <SectionCard
        title="피로연 안내 (선택)"
        description="식사·피로연이 별도로 진행될 때만 입력해 주세요."
      >
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
    </>
  );
}
