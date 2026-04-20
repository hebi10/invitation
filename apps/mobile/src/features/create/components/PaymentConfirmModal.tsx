import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getPalette } from '../../../constants/theme';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { formatPrice } from '../../../lib/format';

type PaymentConfirmModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  authError: string | null;
  palette: ReturnType<typeof getPalette>;
  serviceName: string;
  selectedThemeLabel: string;
  ticketCount: number;
  ticketPrice: number;
  slugPreview: string;
  totalPrice: number;
};

export function PaymentConfirmModal({
  visible,
  onClose,
  onConfirm,
  loading,
  authError,
  palette,
  serviceName,
  selectedThemeLabel,
  ticketCount,
  ticketPrice,
  slugPreview,
  totalPrice,
}: PaymentConfirmModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Google Play 결제 팝업 닫기"
          style={[
            styles.backdrop,
            {
              backgroundColor: palette.background,
              opacity: 0.78,
            },
          ]}
          onPress={onClose}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="title" style={styles.title}>
              Google Play 결제
            </AppText>
            <AppText variant="muted" style={styles.description}>
              Google Play 결제가 완료되면 청첩장을 생성하고 운영 탭으로 바로 이동합니다.
            </AppText>

            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>서비스</AppText>
              <AppText style={styles.summaryValue}>{serviceName}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>디자인</AppText>
              <AppText style={styles.summaryValue}>{selectedThemeLabel}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>추가 티켓</AppText>
              <AppText style={styles.summaryValue}>
                {ticketCount}장 / {formatPrice(ticketPrice)}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>생성 URL</AppText>
              <AppText style={styles.summaryValue}>{slugPreview}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>결제 예정 금액</AppText>
              <AppText variant="display" style={styles.totalLabel}>
                {formatPrice(totalPrice)}
              </AppText>
            </View>

            {authError ? (
              <AppText variant="caption" color={palette.danger} style={styles.errorText}>
                {authError}
              </AppText>
            ) : null}

            <View style={styles.actionColumn}>
              <ActionButton variant="secondary" onPress={onClose} fullWidth>
                다시 확인하기
              </ActionButton>
              <ActionButton onPress={onConfirm} loading={loading} fullWidth>
                Google Play 결제 후 페이지 생성
              </ActionButton>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 2,
  },
  title: {
    fontWeight: '800',
  },
  description: {
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    lineHeight: 20,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  totalLabel: {
    fontWeight: '800',
  },
  errorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  actionColumn: {
    gap: 10,
  },
});
