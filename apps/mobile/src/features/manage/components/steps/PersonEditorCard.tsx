import { View } from 'react-native';

import { AppText } from '../../../../components/AppText';
import { TextField } from '../../../../components/TextField';
import { useAppState } from '../../../../contexts/AppStateContext';
import { manageStyles } from '../../manageStyles';
import type { ManageParentState, ManagePersonState } from '../../shared';

type PersonEditorCardProps = {
  role: 'groom' | 'bride';
  label: string;
  person: ManagePersonState;
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
  onUpdatePersonField,
  onUpdateParentField,
}: PersonEditorCardProps) {
  const { palette } = useAppState();

  return (
    <View
      style={[
        manageStyles.personCard,
        { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
      ]}
    >
      <AppText style={manageStyles.personCardTitle}>{label}</AppText>
      <TextField
        label={`${label} 이름`}
        value={person.name}
        onChangeText={(value) => onUpdatePersonField(role, 'name', value)}
        placeholder={`예: ${role === 'groom' ? '박준호' : '김소민'}`}
      />
      <View style={manageStyles.twoColumnRow}>
        <View style={manageStyles.halfField}>
          <TextField
            label="서열"
            value={person.order}
            onChangeText={(value) => onUpdatePersonField(role, 'order', value)}
            placeholder="예: 장남"
          />
        </View>
        <View style={manageStyles.halfField}>
          <TextField
            label="연락처"
            value={person.phone}
            onChangeText={(value) => onUpdatePersonField(role, 'phone', value)}
            placeholder="예: 010-1234-5678"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="phone-pad"
          />
        </View>
      </View>

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
            placeholder="예: 박상훈"
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
    </View>
  );
}
