import type { PropsWithChildren } from 'react';

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { getPalette } from '../../constants/theme';
import { ActionButton } from '../ActionButton';

type InvitationEditorModalShellProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  cardStyle?: StyleProp<ViewStyle>;
  closeAccessibilityLabel?: string;
  closeDisabled?: boolean;
  closeLoading?: boolean;
}>;

export function InvitationEditorModalShell({
  visible,
  onClose,
  title,
  description,
  palette,
  fontScale,
  cardStyle,
  closeAccessibilityLabel,
  closeDisabled = false,
  closeLoading = false,
  children,
}: InvitationEditorModalShellProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.backdrop,
            {
              backgroundColor: palette.background,
              opacity: 0.78,
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
          style={styles.keyboardAvoiding}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
              cardStyle,
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: palette.text, fontSize: 20 * fontScale }]}>
                {title}
              </Text>
              <Text
                style={[
                  styles.description,
                  { color: palette.textMuted, fontSize: 13 * fontScale },
                ]}
              >
                {description}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {children}
            </ScrollView>

            <View style={styles.actions}>
              <ActionButton
                variant="secondary"
                onPress={onClose}
                disabled={closeDisabled}
                loading={closeLoading}
                accessibilityLabel={closeAccessibilityLabel ?? `${title} 닫기`}
              >
                닫기
              </ActionButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoiding: {
    width: '100%',
  },
  card: {
    maxHeight: '92%',
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontWeight: '800',
  },
  description: {
    lineHeight: 20,
  },
  content: {
    gap: 12,
    paddingBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

