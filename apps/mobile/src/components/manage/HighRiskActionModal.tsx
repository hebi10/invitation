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
      {isDestructiveAction ? (
        <ModalFeedback palette={palette} tone="notice">
          이 작업은 기존 상태를 되돌리지 못할 수 있습니다. 계속하기 전에 대상과 내용을 확인해 주세요.
        </ModalFeedback>
      ) : null}
      <AppText variant="muted">
        로그인 세션을 확인한 뒤 이 작업을 실행합니다.
      </AppText>
      {loading ? (
        <AppText variant="caption" color={palette.textMuted} accessibilityLiveRegion="polite">
          작업을 처리하고 있습니다. 완료될 때까지 기다려 주세요.
        </AppText>
      ) : null}
      {errorMessage ? <ModalFeedback palette={palette} tone="error">{errorMessage}</ModalFeedback> : null}
    </InvitationEditorModalShell>
  );
}
