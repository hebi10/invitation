import { View } from 'react-native';

import type { getPalette } from '../../constants/theme';
import { ActionButton } from '../ActionButton';
import { AppText } from '../AppText';
import { TextField } from '../TextField';
import { InvitationEditorModalShell } from './InvitationEditorModalShell';

type HighRiskActionModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  requiresPassword: boolean;
  password: string;
  errorMessage: string | null;
  loading: boolean;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  onChangePassword: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

export function HighRiskActionModal({
  visible,
  title,
  description,
  confirmLabel,
  requiresPassword,
  password,
  errorMessage,
  loading,
  palette,
  fontScale,
  onChangePassword,
  onConfirm,
  onClose,
}: HighRiskActionModalProps) {
  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      palette={palette}
      fontScale={fontScale}
      closeDisabled={loading}
    >
      <View style={{ gap: 12 }}>
        <AppText variant="muted">
          {requiresPassword
            ? '민감한 작업이라 현재 연동 비밀번호를 다시 확인한 뒤 진행합니다.'
            : '최근 인증이 유지되고 있어 비밀번호 재입력 없이 바로 진행할 수 있습니다.'}
        </AppText>

        {requiresPassword ? (
          <TextField
            label="연동 비밀번호"
            value={password}
            onChangeText={onChangePassword}
            placeholder="현재 비밀번호를 입력해 주세요"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}

        {errorMessage ? (
          <AppText color={palette.danger}>{errorMessage}</AppText>
        ) : null}

        <ActionButton onPress={onConfirm} loading={loading} fullWidth>
          {confirmLabel}
        </ActionButton>
      </View>
    </InvitationEditorModalShell>
  );
}
