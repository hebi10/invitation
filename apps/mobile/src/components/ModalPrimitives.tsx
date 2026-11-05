import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { APP_SPACING } from '../constants/uiTokens';
import { AppText } from './AppText';

type ModalSummaryRowProps = {
  label: string;
  value: ReactNode;
  palette: AppPalette;
  total?: boolean;
};

export function ModalSummaryRow({ label, value, palette, total = false }: ModalSummaryRowProps) {
  return (
    <View
      style={[
        styles.summaryRow,
        total ? styles.totalRow : null,
        total ? { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder } : null,
      ]}
    >
      <AppText
        variant={total ? 'body' : 'caption'}
        color={total ? palette.text : palette.textMuted}
        style={styles.summaryLabel}
      >
        {label}
      </AppText>
      <View style={styles.summaryValue}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <AppText variant={total ? 'display' : 'body'} style={styles.valueText}>
            {value}
          </AppText>
        ) : value}
      </View>
    </View>
  );
}

type ModalFeedbackProps = PropsWithChildren<{
  palette: AppPalette;
  tone: 'notice' | 'error' | 'success';
}>;

export function ModalFeedback({ palette, tone, children }: ModalFeedbackProps) {
  const foreground = tone === 'error'
    ? palette.danger
    : tone === 'notice' ? palette.notice : palette.success;
  const background = tone === 'error'
    ? palette.dangerSoft
    : tone === 'notice' ? palette.noticeSoft : palette.successSoft;

  return (
    <View
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.feedback, { backgroundColor: background, borderColor: foreground }]}
    >
      <AppText
        variant="caption"
        color={foreground}
        accessibilityRole={tone === 'error' ? 'alert' : undefined}
      >
        {children}
      </AppText>
    </View>
  );
}

export function ModalActionStack({ children }: PropsWithChildren) {
  return <View style={styles.actions}>{children}</View>;
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: APP_SPACING.sm,
  },
  totalRow: {
    borderWidth: 1,
    borderRadius: 0,
    padding: APP_SPACING.md,
    alignItems: 'center',
  },
  summaryLabel: { flexShrink: 1, minWidth: 0 },
  summaryValue: { flexShrink: 1, minWidth: 0, alignItems: 'flex-end' },
  valueText: { textAlign: 'right', flexShrink: 1 },
  feedback: {
    borderWidth: 1,
    borderRadius: 0,
    padding: APP_SPACING.sm,
  },
  actions: { gap: APP_SPACING.xs },
});
