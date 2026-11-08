import { ActionButton } from '../../../components/ActionButton';
import { ModalActionStack, ModalFeedback, ModalSummaryRow } from '../../../components/ModalPrimitives';
import { SectionCard } from '../../../components/SectionCard';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import type { getPalette } from '../../../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  targetName: string;
  customerAuthenticated: boolean;
  recovering: boolean;
  pendingTargetSlug: string | null;
  currentPageSlug: string | null;
  onRecover: () => void;
};

// Recovery-only compatibility UI. New period extensions and tickets are not sold.
export function PeriodExtensionModal({
  visible, onClose, palette, fontScale, targetName, customerAuthenticated,
  recovering, pendingTargetSlug, currentPageSlug, onRecover,
}: Props) {
  const canRecover = Boolean(pendingTargetSlug && pendingTargetSlug === currentPageSlug);
  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      closeDisabled={recovering}
      placement="center"
      title="이전 결제 복구"
      description="과거에 결제했지만 처리가 완료되지 않은 거래만 확인합니다."
      palette={palette}
      fontScale={fontScale}
      closeConfirmation={(
        <ModalActionStack>
          {pendingTargetSlug ? (
            <ActionButton
              fullWidth
              loading={recovering}
              disabled={recovering || !canRecover || !customerAuthenticated}
              onPress={onRecover}
            >
              이전 결제 이어서 처리
            </ActionButton>
          ) : null}
          <ActionButton variant="secondary" onPress={onClose} disabled={recovering} fullWidth>
            닫기
          </ActionButton>
        </ModalActionStack>
      )}
    >
      <SectionCard title="기존 거래 확인" description="추가 결제 없이 이전 거래만 복구합니다.">
        <ModalSummaryRow label="결제 대상" value={targetName} palette={palette} />
        <ModalFeedback palette={palette} tone="notice">
          신규 이용 기간 연장과 티켓 상품은 판매하지 않습니다.
          과거 결제가 확인되지 않으면 추가 구매 대신 고객 문의로 확인해 주세요.
        </ModalFeedback>
        {!customerAuthenticated ? (
          <ModalFeedback palette={palette} tone="notice">
            이전에 결제한 고객 계정으로 로그인해야 복구할 수 있습니다.
          </ModalFeedback>
        ) : null}
        {pendingTargetSlug && !canRecover ? (
          <ModalFeedback palette={palette} tone="error">
            현재 청첩장과 이전 결제 대상이 다릅니다. 해당 청첩장을 열어 복구해 주세요.
          </ModalFeedback>
        ) : null}
      </SectionCard>
    </InvitationEditorModalShell>
  );
}
