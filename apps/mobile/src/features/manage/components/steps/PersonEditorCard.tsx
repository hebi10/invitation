import { View } from 'react-native';

import { Disclosure } from '../../../../components/Disclosure';
import { AppText } from '../../../../components/AppText';
import { TextField } from '../../../../components/TextField';
import { usePreferences } from '../../../../contexts/PreferencesContext';
import { manageStyles } from '../../manageStyles';
import type { ManageParentState, ManagePersonState } from '../../shared';

type PersonEditorCardProps = {
  role: 'groom' | 'bride';
  label: string;
  person: ManagePersonState;
  showNameField?: boolean;
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

export function PersonEditorCard({
  role,
  label,
  person,
  showNameField = true,
  onUpdatePersonField,
  onUpdateParentField,
}: PersonEditorCardProps) {
  const { palette } = usePreferences();
  const hasExistingParentInformation = [person.father, person.mother].some(
    (parent) => [parent.relation, parent.name, parent.phone].some((value) => value.trim().length > 0)
  );

  return (
    <View
      style={[
        manageStyles.personCard,
        { backgroundColor: palette.surface, borderColor: palette.cardBorder },
      ]}
    >
      <AppText variant="title" style={manageStyles.personCardTitle}>{label} 정보</AppText>
      {showNameField ? (
        <TextField
          label={`${label} 이름`}
          value={person.name}
          onChangeText={(value) => onUpdatePersonField(role, 'name', value)}
          placeholder={`예: ${role === 'groom' ? '박신랑' : '김신부'}`}
        />
      ) : null}
      <View style={manageStyles.twoColumnRow}>
        <View style={manageStyles.halfField}>
          <TextField
            label="가족 내 호칭 (선택)"
            value={person.order}
            onChangeText={(value) => onUpdatePersonField(role, 'order', value)}
            placeholder="예: 장남"
          />
        </View>
        <View style={manageStyles.halfField}>
          <TextField
            label="연락처 (선택)"
            value={person.phone}
            onChangeText={(value) => onUpdatePersonField(role, 'phone', value)}
            placeholder="예: 010-1234-5678"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <Disclosure title={`${label} 부모님 정보`}
        description={hasExistingParentInformation
          ? '저장된 혼주 정보가 있습니다. 펼쳐서 확인해 주세요.'
          : '필요한 혼주 이름과 연락처를 입력합니다.'}
        defaultExpanded={hasExistingParentInformation}
        expandWhenPopulated
      >
      <AppText variant="caption" style={manageStyles.personSectionLabel}>
        아버지 정보
      </AppText>
      <View style={manageStyles.twoColumnRow}>
        <View style={manageStyles.halfField}>
          <TextField
            label="관계"
            value={person.father.relation}
            onChangeText={(value) => onUpdateParentField(role, 'father', 'relation', value)}
            placeholder="예: 부"
          />
        </View>
        <View style={manageStyles.halfField}>
          <TextField
            label="이름"
            value={person.father.name}
            onChangeText={(value) => onUpdateParentField(role, 'father', 'name', value)}
            placeholder="예: 박상우"
          />
        </View>
      </View>
      <TextField
        label="연락처"
        value={person.father.phone}
        onChangeText={(value) => onUpdateParentField(role, 'father', 'phone', value)}
        placeholder="예: 010-1234-5678"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="phone-pad"
      />

      <AppText variant="caption" style={manageStyles.personSectionLabel}>
        어머니 정보
      </AppText>
      <View style={manageStyles.twoColumnRow}>
        <View style={manageStyles.halfField}>
          <TextField
            label="관계"
            value={person.mother.relation}
            onChangeText={(value) => onUpdateParentField(role, 'mother', 'relation', value)}
            placeholder="예: 모"
          />
        </View>
        <View style={manageStyles.halfField}>
          <TextField
            label="이름"
            value={person.mother.name}
            onChangeText={(value) => onUpdateParentField(role, 'mother', 'name', value)}
            placeholder="예: 이영희"
          />
        </View>
      </View>
      <TextField
        label="연락처"
        value={person.mother.phone}
        onChangeText={(value) => onUpdateParentField(role, 'mother', 'phone', value)}
        placeholder="예: 010-1234-5678"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="phone-pad"
      />
      </Disclosure>
    </View>
  );
}
