import type { getPalette } from '../../constants/theme';
import { ActionButton } from '../ActionButton';
import { AppText } from '../AppText';
import { ModalActionStack, ModalFeedback } from '../ModalPrimitives';
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
  const isDestructiveAction = /삭제|폐기|초기화/.test(confirmLabel);

  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      placement="center"
      palette={palette}
      fontScale={fontScale}
      closeDisabled={loading}
      contentDisabled={loading}
      closeConfirmation={(
        <ModalActionStack>
          <ActionButton variant="secondary" onPress={onClose} disabled={loading} fullWidth>
            취소
          </ActionButton>
          <ActionButton variant={isDestructiveAction ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} fullWidth>
            {confirmLabel}
          </ActionButton>
        </ModalActionStack>
      )}
    >
      <AppText variant="muted">
        로그인 세션을 확인한 뒤 이 작업을 실행합니다.
      </AppText>
      {errorMessage ? <ModalFeedback palette={palette} tone="error">{errorMessage}</ModalFeedback> : null}
    </InvitationEditorModalShell>
  );
}
