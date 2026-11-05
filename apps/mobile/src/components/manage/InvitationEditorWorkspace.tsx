import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  busy: boolean;
  footer: ReactNode;
  compactFooter: ReactNode;
  confirmation?: ReactNode;
}>;

export function InvitationEditorWorkspace({
  visible, onClose, title, description, status, statusTone, publicationLabel,
  steps, activeStepIndex, onSelectStep, onPreview, busy, footer, compactFooter, confirmation, children,
}: InvitationEditorWorkspaceProps) {
  const { palette } = useVisualPreferences();
  const insets = useSafeAreaInsets();
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

  const statusColor = statusTone === 'neutral' ? palette.textMuted : palette[statusTone];

  return (
    <Modal visible={visible} presentationStyle="fullScreen" animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.screen, { backgroundColor: palette.background, paddingTop: insets.top }]}
      >
        <View style={[styles.header, { backgroundColor: palette.surface }]}>
          <View style={styles.topRow}>
            <AppText variant="title" accessibilityRole="header" style={styles.heading}>청첩장 편집</AppText>
            <ActionButton variant="secondary" onPress={onClose} disabled={busy}>닫기</ActionButton>
          </View>
          {!keyboardVisible ? <View style={styles.statusRow}>
            <AppText variant="caption" color={statusColor} accessibilityLiveRegion="polite">{status}</AppText>
            <AppText variant="caption" color={palette.textMuted}>{publicationLabel}</AppText>
          </View> : null}
          {!keyboardVisible ? <View style={styles.navigation}>
            <ActionButton
              variant="secondary" onPress={() => setContentsOpen(!contentsOpen)} disabled={busy}
              accessibilityLabel={`전체 목차, 현재 ${activeStepIndex + 1}단계 ${title}`}
              accessibilityState={{ expanded: contentsOpen }} style={styles.contentsButton}
            >
              {activeStepIndex + 1} / {steps.length} · {title} {contentsOpen ? '접기' : '목차'}
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
          ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        >
          {contentsOpen ? (
            <View style={[styles.contents, { backgroundColor: palette.surface }]}>
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
            <AppText variant="caption" color={palette.accent} style={styles.sectionEyebrow}>
              편집 단계 {activeStepIndex + 1} / {steps.length}
            </AppText>
            <AppText variant="title" accessibilityRole="header" style={styles.sectionTitle}>{title}</AppText>
            <AppText variant="muted">{description}</AppText>
          </View>
          <View pointerEvents={busy ? 'none' : 'auto'} style={styles.fields}>{children}</View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: palette.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {confirmation ?? (keyboardVisible ? compactFooter : footer)}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heading: { flex: 1, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contentsButton: { flexGrow: 1 },
  progressTrack: { height: 3, overflow: 'hidden' },
  progressFill: { height: '100%' },
  scroll: { flex: 1 },
  scrollContent: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingVertical: 20, gap: 18 },
  contents: { padding: 12, gap: 8 },
  sectionHeading: { gap: 8 },
  sectionEyebrow: { fontWeight: '600' },
  sectionTitle: { fontWeight: '600' },
  fields: { gap: 20 },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 10 },
});
