import { View } from 'react-native';

import { SectionCard } from '../../../../components/SectionCard';
import { TextField } from '../../../../components/TextField';
import type {
  ManageFormState,
  ManageParentState,
  ManageStringFieldKey,
} from '../../shared';
import { manageStyles } from '../../manageStyles';
import { PersonEditorCard } from './PersonEditorCard';

type BasicEditorStepProps = {
  form: ManageFormState;
  onUpdateField: (field: ManageStringFieldKey, value: string) => void;
  onUpdatePersonField: (
    role: 'groom' | 'bride',
    field: 'name' | 'order' | 'phone',
    value: string
  ) => void;
  onUpdateParentField: (
    role: 'groom' | 'bride',
    parent: 'father' | 'mother',
    field: keyof ManageParentState,
    value: string
  ) => void;
};

export function BasicEditorStep({
  form,
  onUpdateField,
  onUpdatePersonField,
  onUpdateParentField,
}: BasicEditorStepProps) {
  return (
    <>
      <SectionCard
        title="기본 커버 정보"
        description="페이지 제목과 소개 문구를 먼저 정리합니다."
      >
        <TextField
          label="페이지 제목"
          value={form.displayName}
          onChangeText={(value) => onUpdateField('displayName', value)}
          placeholder="예: 박준호 · 김수민 결혼합니다"
        />
        <TextField
          label="서브 문구"
          value={form.subtitle}
          onChangeText={(value) => onUpdateField('subtitle', value)}
          placeholder="예: 소중한 날에 함께해 주세요"
        />
        <TextField
          label="소개 문구"
          value={form.description}
          onChangeText={(value) => onUpdateField('description', value)}
          placeholder="청첩장 첫 화면에 노출될 설명을 입력해 주세요."
          multiline
        />
      </SectionCard>

      <SectionCard
        title="신랑 · 신부 · 혼주 정보"
        description="웹 page-wizard와 같은 순서로 이름, 연락처, 혼주 정보를 관리합니다."
      >
        <View style={manageStyles.personGrid}>
          <PersonEditorCard
            role="groom"
            label="신랑"
            person={form.groom}
            onUpdatePersonField={onUpdatePersonField}
            onUpdateParentField={onUpdateParentField}
          />
          <PersonEditorCard
            role="bride"
            label="신부"
            person={form.bride}
            onUpdatePersonField={onUpdatePersonField}
            onUpdateParentField={onUpdateParentField}
          />
        </View>
      </SectionCard>
    </>
  );
}
