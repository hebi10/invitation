import { View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { ModalFeedback, ModalSummaryRow } from '../../../components/ModalPrimitives';
import { SectionCard } from '../../../components/SectionCard';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import type { getPalette } from '../../../constants/theme';
import {
  INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS,
  INVITATION_PREMIUM_PRICE_LABEL,
} from '../../../lib/invitationProductPolicy';

type Props = {
  visible: boolean;
  onClose: () => void;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  targetName: string;
  customerAuthenticated: boolean;
  loading: boolean;
  recovering: boolean;
  pendingTargetSlug: string | null;
  currentPageSlug: string | null;
  onPurchase: () => void;
  onRecover: () => void;
};

export function PeriodExtensionModal({
  visible, onClose, palette, fontScale, targetName, customerAuthenticated,
  loading, recovering, pendingTargetSlug, currentPageSlug, onPurchase, onRecover,
}: Props) {
  const busy = loading || recovering;
  const canRecover = Boolean(pendingTargetSlug && pendingTargetSlug === currentPageSlug);
  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      closeDisabled={busy}
      title="이용 기간 연장"
      description="청첩장 제작과 동일한 5,000원 결제로 6개월을 추가합니다."
      palette={palette}
      fontScale={fontScale}
    >
      <SectionCard title="연장 결제 확인" description={targetName}>
        <ModalSummaryRow label="결제 상품" value="프리미엄 기간 연장" palette={palette} />
        <ModalSummaryRow label="연장 기간" value={`${INVITATION_EXTENSION_DISPLAY_PERIOD_MONTHS}개월`} palette={palette} />
        <ModalSummaryRow label="결제 예정 금액" value={INVITATION_PREMIUM_PRICE_LABEL} palette={palette} total />
        <AppText variant="caption" color={palette.textMuted}>
          모든 디자인과 기능은 계속 포함됩니다. 기존 종료일이 남아 있다면 그 날짜부터,
          이미 종료되었다면 결제일부터 6개월을 추가합니다.
        </AppText>
        {!customerAuthenticated ? (
          <ModalFeedback palette={palette} tone="notice">이 청첩장의 소유자 계정으로 로그인해야 연장할 수 있습니다.</ModalFeedback>
        ) : null}
        {pendingTargetSlug ? (
          <ModalFeedback palette={palette} tone="notice">
            미처리 결제가 있습니다. 새로운 결제를 하지 말고 이전 거래를 먼저 복구해 주세요.
            {canRecover ? '' : ` 대상 청첩장: ${pendingTargetSlug}`}
          </ModalFeedback>
        ) : null}
        <View style={{ gap: 10 }}>
          {pendingTargetSlug ? (
            <ActionButton
              fullWidth
              loading={recovering}
              disabled={busy || !canRecover || !customerAuthenticated}
              onPress={onRecover}
            >
              이전 결제 이어서 처리
            </ActionButton>
          ) : (
            <ActionButton
              fullWidth
              loading={loading}
              disabled={busy || !customerAuthenticated || !currentPageSlug}
              onPress={onPurchase}
            >
              5,000원 결제하고 6개월 연장
            </ActionButton>
          )}
          <ActionButton variant="secondary" fullWidth disabled={busy} onPress={onClose}>
            닫기
          </ActionButton>
        </View>
      </SectionCard>
    </InvitationEditorModalShell>
  );
}
