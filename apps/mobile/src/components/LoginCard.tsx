import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
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
  const { authError, isAuthenticating } = useAuth();
  const { palette, fontScale } = usePreferences();

  return (
    <SectionCard
      title="페이지 로그인"
      description="페이지 URL 또는 슬러그와 비밀번호로 로그인하면 자동 로그인 상태가 유지됩니다."
    >
      <TextField
        label="페이지 URL 또는 슬러그"
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
        로그인
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
