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
  onPaste: () => void;
  onSubmit: () => void;
};

export function LoginCard({
  pageIdentifier,
  password,
  onChangePageIdentifier,
  onChangePassword,
  onPaste,
  onSubmit,
}: LoginCardProps) {
  const { authError, isAuthenticating } = useAuth();
  const { palette, fontScale } = usePreferences();

  return (
    <SectionCard
      title="청첩장 연동"
      description="청첩장 링크 또는 주소와 비밀번호를 입력하면 저장된 연동 상태로 이어서 관리할 수 있습니다."
    >
      <View style={styles.identifierField}>
        <TextField
          label="청첩장 링크 또는 주소"
          value={pageIdentifier}
          onChangeText={onChangePageIdentifier}
          placeholder="예: https://msgnote.kr/kim-shinlang-na-sinbu"
          helperText="전체 URL을 붙여넣어도 자동으로 인식됩니다."
          autoCapitalize="none"
          containerStyle={styles.identifierInput}
        />
        <ActionButton variant="secondary" onPress={onPaste} style={styles.pasteButton}>
          붙여넣기
        </ActionButton>
      </View>
      <TextField
        label="연동 비밀번호"
        value={password}
        onChangeText={onChangePassword}
        placeholder="예: wedding2026!"
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
        연동하기
      </ActionButton>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  identifierField: {
    gap: 10,
  },
  identifierInput: {
    gap: 0,
  },
  pasteButton: {
    alignSelf: 'flex-start',
  },
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
