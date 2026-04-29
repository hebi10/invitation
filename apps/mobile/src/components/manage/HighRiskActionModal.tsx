import { View } from 'react-native';

import type { getPalette } from '../../constants/theme';
import { ActionButton } from '../ActionButton';
import { AppText } from '../AppText';
import { InvitationEditorModalShell } from './InvitationEditorModalShell';

type HighRiskActionModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  errorMessage: string | null;
  loading: boolean;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  onConfirm: () => void;
  onClose: () => void;
};

export function HighRiskActionModal({
  visible,
  title,
  description,
  confirmLabel,
  errorMessage,
  loading,
  palette,
  fontScale,
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
          로그인 세션을 확인한 뒤 바로 진행할 수 있습니다.
        </AppText>

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
