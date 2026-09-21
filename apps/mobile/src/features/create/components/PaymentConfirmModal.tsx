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
              backgroundColor: '#111210',
              opacity: 0.58,
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
              <AppText style={styles.summaryLabel}>청첩장 주소</AppText>
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
    paddingVertical: 24,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
    gap: 16,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 2,
  },
  title: {
    fontWeight: '500',
  },
  description: {
    lineHeight: 21,
  },
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
  errorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  actionColumn: {
    gap: 10,
  },
});
