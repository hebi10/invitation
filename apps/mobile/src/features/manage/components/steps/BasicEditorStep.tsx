import { View } from 'react-native';

import { Disclosure } from '../../../../components/Disclosure';
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
        title="청첩장 제목과 두 분의 이름"
        description="하객에게 가장 먼저 보여줄 기본 정보를 입력해 주세요."
      >
        <TextField
          label="청첩장 제목"
          value={form.displayName}
          onChangeText={(value) => onUpdateField('displayName', value)}
          placeholder="예: 김도윤 · 이서연 결혼합니다"
          helperText="청첩장 목록과 초대장 상단에 표시되는 이름입니다."
        />
        <TextField
          label="신랑 이름 (필수)"
          value={form.groom.name}
          onChangeText={(value) => onUpdatePersonField('groom', 'name', value)}
          placeholder="예: 김도윤"
          autoCorrect={false}
        />
        <TextField
          label="신부 이름 (필수)"
          value={form.bride.name}
          onChangeText={(value) => onUpdatePersonField('bride', 'name', value)}
          placeholder="예: 이서연"
          autoCorrect={false}
        />
      </SectionCard>
      <SectionCard
        title="표지 소개 문구"
        description="짧은 초대 문구를 적고, 필요하면 소개 글을 덧붙여 주세요."
      >
        <TextField
          label="한 줄 소개"
          value={form.subtitle}
          onChangeText={(value) => onUpdateField('subtitle', value)}
          placeholder="예: 소중한 분들을 초대합니다"
        />
        <TextField
          label="소개 글 (선택)"
          value={form.description}
          onChangeText={(value) => onUpdateField('description', value)}
          placeholder="청첩장 첫 화면에 전할 내용을 입력해 주세요"
          multiline
        />
      </SectionCard>
      <Disclosure
        title="연락처·가족 정보 (선택)"
        description="연락처와 혼주 정보를 추가하려면 펼쳐서 입력해 주세요."
      >
        <View style={manageStyles.personGrid}>
          <PersonEditorCard
            role="groom"
            label="신랑"
            person={form.groom}
            showNameField={false}
            onUpdatePersonField={onUpdatePersonField}
            onUpdateParentField={onUpdateParentField}
          />
          <PersonEditorCard
            role="bride"
            label="신부"
            person={form.bride}
            showNameField={false}
            onUpdatePersonField={onUpdatePersonField}
            onUpdateParentField={onUpdateParentField}
          />
        </View>
      </Disclosure>
    </>
  );
}