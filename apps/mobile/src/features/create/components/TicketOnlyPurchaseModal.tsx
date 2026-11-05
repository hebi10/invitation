import { StyleSheet, View } from 'react-native';

import { AppModalFrame } from '../../../components/AppModalFrame';
import { getPalette } from '../../../constants/theme';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { formatPrice } from '../../../lib/format';

type TicketTargetOption = {
  slug: string;
  displayName: string;
};

type TicketOnlyPurchaseModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  authError: string | null;
  notice: string;
  pendingTarget: string;
  onRecover: () => void;
  palette: ReturnType<typeof getPalette>;
  ticketCount: number;
  ticketUnitPrice: number;
  ticketPrice: number;
  ticketUsageItems: readonly string[];
  targetOptions: TicketTargetOption[];
  selectedTargetSlug: string | null;
  selectedTargetLabel: string;
  currentStoredTicketCount: number;
  onSelectTarget: (slug: string) => void;
};

export function TicketOnlyPurchaseModal({
  visible,
  onClose,
  onConfirm,
  loading,
  authError,
  notice,
  pendingTarget,
  onRecover,
  palette,
  ticketCount,
  ticketUnitPrice,
  ticketPrice,
  ticketUsageItems,
  targetOptions,
  selectedTargetSlug,
  selectedTargetLabel,
  currentStoredTicketCount,
  onSelectTarget,
}: TicketOnlyPurchaseModalProps) {
  return (
    <AppModalFrame
    visible={visible}
    onClose={onClose}
    title="티켓 Google Play 결제"
    description="결제 완료 후 선택한 청첩장에 티켓이 적립됩니다."
    placement="center"
    >
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>티켓 수량</AppText>
          <AppText style={styles.summaryValue}>{ticketCount}장</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>장당 금액</AppText>
          <AppText style={styles.summaryValue}>{formatPrice(ticketUnitPrice)}</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>티켓 결제 예정 금액</AppText>
          <AppText variant="display" style={styles.totalLabel}>
            {formatPrice(ticketPrice)}
          </AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>적립 대상</AppText>
          <AppText style={styles.summaryValue}>{selectedTargetLabel}</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>현재 보유 티켓</AppText>
          <AppText style={styles.summaryValue}>{currentStoredTicketCount}장</AppText>
        </View>

        {targetOptions.length > 1 ? (
          <View style={styles.actionColumn}>
            <AppText variant="caption" style={styles.summaryLabel}>
              티켓 적립 대상 선택
            </AppText>
            <View style={styles.chipRow}>
              {targetOptions.map((item) => (
                <ChoiceChip
                  key={`ticket-target-${item.slug}`}
                  label={item.displayName}
                  selected={selectedTargetSlug === item.slug}
                  onPress={() => onSelectTarget(item.slug)}
                />
              ))}
            </View>
            <AppText variant="muted" style={styles.helperText}>
              선택한 청첩장에 티켓이 적립되고, 내 청첩장에서도 같은 수량을 바로 확인할
              수 있습니다.
            </AppText>
          </View>
        ) : null}

        <BulletList items={ticketUsageItems} />

        {notice ? (
          <View
            style={[
              styles.noticeBox,
              {
                backgroundColor: palette.noticeSoft,
                borderColor: palette.notice,
              },
            ]}
          >
            <AppText variant="caption" color={palette.notice} style={styles.noticeText}>
              {notice}
            </AppText>
          </View>
        ) : null}

        {authError ? (
          <View
            style={[
              styles.noticeBox,
              {
                backgroundColor: palette.dangerSoft,
                borderColor: palette.danger,
              },
            ]}
          >
            <AppText variant="caption" color={palette.danger} style={styles.noticeText}>
              {authError}
            </AppText>
          </View>
        ) : null}

        <View style={styles.actionColumn}>
          {pendingTarget ? <><AppText>기존 결제 대상: {pendingTarget}. 이 청첩장에 추가 결제 없이 티켓을 적립합니다.</AppText><ActionButton onPress={onRecover} loading={loading} fullWidth>티켓 결제 이어서 처리</ActionButton></> : null}
          <ActionButton variant="secondary" onPress={onClose} fullWidth>
            다시 확인하기
          </ActionButton>
          <ActionButton onPress={onConfirm} loading={loading} disabled={Boolean(pendingTarget)} fullWidth>
            Google Play로 티켓 구매
          </ActionButton>
        </View>
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    flexShrink: 1,
    lineHeight: 22,
  },
  summaryValue: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
    fontWeight: '700',
  },
  totalLabel: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  actionColumn: {
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperText: {
    lineHeight: 21,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  noticeText: {
    lineHeight: 19,
    fontWeight: '600',
  },
});
