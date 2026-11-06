import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_SPACING } from '../../constants/uiTokens';
import { useVisualPreferences } from '../../contexts/PreferencesContext';
import { ActionButton } from '../ActionButton';
import { AppText } from '../AppText';

type InvitationEditorWorkspaceProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  status: string;
  statusTone: 'neutral' | 'success' | 'notice' | 'danger';
  publicationLabel: string;
  steps: readonly { key: string; title: string }[];
  activeStepIndex: number;
  onSelectStep: (index: number) => void;
  onPreview: () => void;
  onSaveCurrent?: () => void;
  busy: boolean;
  footer: ReactNode;
  compactFooter: ReactNode;
  compactNavigationFooter?: ReactNode;
  confirmation?: ReactNode;
}>;

export function InvitationEditorWorkspace({
  visible, onClose, title, description, status, statusTone, publicationLabel,
  steps, activeStepIndex, onSelectStep, onPreview, onSaveCurrent, busy, footer, compactFooter,
  compactNavigationFooter, confirmation, children,
}: InvitationEditorWorkspaceProps) {
  const { palette, fontScale } = useVisualPreferences();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactLayout = width < 360 || (width < 390 && fontScale > 1);
  const compactPublicationLabel = publicationLabel.replace(/^현재 저장 상태\s*·\s*/, '');
  const scrollRef = useRef<ScrollView>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { setKeyboardVisible(true); setContentsOpen(false); });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible) scrollRef.current?.scrollTo({ y: 0, animated: false });
    else { setContentsOpen(false); setKeyboardVisible(false); }
  }, [activeStepIndex, visible]);

  useEffect(() => {
    if (visible && statusTone === 'danger') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [statusTone, visible]);

  const statusColor = statusTone === 'neutral' ? palette.textMuted : palette[statusTone];
  const statusBackgroundColor = statusTone === 'success'
    ? palette.successSoft
    : statusTone === 'notice'
      ? palette.noticeSoft
      : statusTone === 'danger'
        ? palette.dangerSoft
        : palette.surfaceMuted;

  return (
    <Modal visible={visible} presentationStyle="fullScreen" animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.screen, { backgroundColor: palette.background, paddingTop: insets.top }]}
      >
        <View style={[styles.header, compactLayout ? styles.headerNarrow : null, { backgroundColor: palette.surface }]}>
          <View style={styles.topRow}>
            <AppText variant="title" accessibilityRole="header" style={styles.heading}>청첩장 편집</AppText>
            {!keyboardVisible && onSaveCurrent ? (
              <ActionButton
                variant="secondary"
                onPress={onSaveCurrent}
                disabled={busy}
                accessibilityLabel="현재 편집 내용 저장"
              >
                저장
              </ActionButton>
            ) : null}
            <ActionButton variant="secondary" onPress={onClose} disabled={busy}>닫기</ActionButton>
          </View>
          {!keyboardVisible ? (
            compactLayout ? (
              <AppText
                variant="caption"
                color={statusColor}
                numberOfLines={statusTone === 'danger' ? 2 : 1}
                accessibilityLiveRegion="polite"
              >
                {status} · {compactPublicationLabel}
              </AppText>
            ) : (
              <View style={styles.statusRow}>
                <View style={[styles.statusFlag, { backgroundColor: statusBackgroundColor }]}>
                  <AppText variant="caption" color={statusColor} accessibilityLiveRegion="polite">
                    {status}
                  </AppText>
                </View>
                <AppText variant="caption" color={palette.textMuted} style={styles.publicationLabel}>
                  {publicationLabel}
                </AppText>
              </View>
            )
          ) : null}
          {!keyboardVisible ? <View style={styles.navigation}>
            <ActionButton
              variant="secondary" onPress={() => setContentsOpen(!contentsOpen)} disabled={busy}
              accessibilityLabel={`전체 목차, 현재 ${activeStepIndex + 1}단계 ${title}`}
              accessibilityState={{ expanded: contentsOpen }} style={styles.contentsButton}
            >
              {compactLayout
                ? `${activeStepIndex + 1} / ${steps.length} · 목차${contentsOpen ? ' 접기' : ''}`
                : `${activeStepIndex + 1} / ${steps.length} · ${title} ${contentsOpen ? '접기' : '목차'}`}
            </ActionButton>
            <ActionButton variant="secondary" onPress={onPreview} disabled={busy}>미리보기</ActionButton>
          </View> : null}
          {!keyboardVisible ? (
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="청첩장 편집 진행 단계"
              accessibilityValue={{ min: 1, max: steps.length, now: activeStepIndex + 1 }}
              style={[styles.progressTrack, { backgroundColor: palette.surfaceMuted }]}
            >
              <View
                style={[styles.progressFill, {
                  backgroundColor: palette.accent,
                  width: `${((activeStepIndex + 1) / steps.length) * 100}%`,
                }]}
              />
            </View>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef} style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, compactLayout ? styles.scrollContentNarrow : null]}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {contentsOpen ? (
            <View style={[styles.contents, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
              <AppText variant="caption" color={palette.textMuted}>
                다른 단계로 이동해도 입력값은 남지만 자동 저장되지 않습니다. 저장 버튼으로 먼저 저장해 주세요.
              </AppText>
              {steps.map((step, index) => (
                <ActionButton
                  key={step.key} variant={index === activeStepIndex ? 'primary' : 'secondary'}
                  accessibilityState={{ selected: index === activeStepIndex }}
                  onPress={() => { setContentsOpen(false); onSelectStep(index); }} disabled={busy} fullWidth
                >
                  {index + 1}. {step.title}
                </ActionButton>
              ))}
            </View>
          ) : null}
          <View style={styles.sectionHeading}>
            {!compactLayout ? <AppText variant="caption" color={palette.accent} style={styles.sectionEyebrow}>
              편집 단계 {activeStepIndex + 1} / {steps.length}
            </AppText> : null}
            <AppText variant="display" accessibilityRole="header" style={styles.sectionTitle}>{title}</AppText>
            <AppText variant="muted">{description}</AppText>
          </View>
          <View pointerEvents={busy ? 'none' : 'auto'} style={styles.fields}>{children}</View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            compactLayout ? styles.footerNarrow : null,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
              paddingBottom: Math.max(insets.bottom, compactLayout ? APP_SPACING.sm : APP_SPACING.md),
            },
          ]}
        >
          {confirmation ?? (keyboardVisible ? compactFooter : compactLayout ? (compactNavigationFooter ?? footer) : footer)}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    gap: APP_SPACING.sm,
  },
  headerNarrow: { paddingVertical: APP_SPACING.xs, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: APP_SPACING.sm },
  heading: { flex: 1, minWidth: 0, fontWeight: '700' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: APP_SPACING.xs },
  statusFlag: { paddingHorizontal: APP_SPACING.sm, paddingVertical: APP_SPACING.xs },
  publicationLabel: { flexShrink: 1 },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: APP_SPACING.xs },
  contentsButton: { flexGrow: 1, minWidth: 0 },
  progressTrack: { height: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
  scroll: { flex: 1 },
  scrollContent: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: APP_SPACING.md,
    paddingVertical: APP_SPACING.lg,
    gap: APP_SPACING.lg,
  },
  scrollContentNarrow: { paddingVertical: APP_SPACING.sm, gap: APP_SPACING.sm },
  contents: { borderWidth: 1, padding: APP_SPACING.md, gap: APP_SPACING.xs },
  sectionHeading: { gap: APP_SPACING.sm },
  sectionEyebrow: { fontWeight: '600' },
  sectionTitle: { fontWeight: '700' },
  fields: { gap: APP_SPACING.md },
  footerNarrow: { padding: APP_SPACING.xs, gap: APP_SPACING.xs },
  footer: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 0,
    padding: APP_SPACING.md,
    gap: APP_SPACING.sm,
  },
});
