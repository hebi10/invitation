import { StyleSheet, Text, View } from 'react-native';

import { useAppState } from '../contexts/AppStateContext';
import { ActionButton } from './ActionButton';
import { SectionCard } from './SectionCard';
import { TextField } from './TextField';

type LoginCardProps = {
  pageIdentifier: string;
  password: string;
  onChangePageIdentifier: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
};

export function LoginCard({
  pageIdentifier,
  password,
  onChangePageIdentifier,
  onChangePassword,
  onSubmit,
}: LoginCardProps) {
  const { authError, isAuthenticating, palette, fontScale } = useAppState();

  return (
    <SectionCard
      title="청첩장 연동"
      description="슬러그와 비밀번호로 연동하면 자동 연동 상태가 유지됩니다."
    >
      <TextField
        label="슬러그"
        value={pageIdentifier}
        onChangeText={onChangePageIdentifier}
        placeholder="예: kim-shinlang-na-sinbu"
        autoCapitalize="none"
      />
      <TextField
        label="비밀번호"
        value={password}
        onChangeText={onChangePassword}
        placeholder="예: 12344"
        secureTextEntry
        autoCapitalize="none"
      />
      {authError ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
          ]}
        >
          <Text style={[styles.errorText, { color: palette.danger, fontSize: 13 * fontScale }]}>
            {authError}
          </Text>
        </View>
      ) : null}
      <ActionButton onPress={onSubmit} loading={isAuthenticating} fullWidth>
        청첩장 연동
      </ActionButton>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontWeight: '600',
  },
});
