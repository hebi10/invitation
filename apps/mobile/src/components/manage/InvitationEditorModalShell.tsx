import type { PropsWithChildren, ReactNode } from 'react';

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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  closeConfirmation?: ReactNode;
  contentDisabled?: boolean;
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
  closeConfirmation,
  contentDisabled = false,
  children,
}: InvitationEditorModalShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 18),
          },
        ]}
      >
        <View
          style={[
            styles.backdrop,
            {
              backgroundColor: '#111210',
              opacity: 0.5,
            },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
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
                  { color: palette.textMuted, fontSize: 13 * fontScale, lineHeight: 20 * fontScale },
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
              <View pointerEvents={contentDisabled ? 'none' : 'auto'}
                accessibilityElementsHidden={contentDisabled}
                importantForAccessibility={contentDisabled ? 'no-hide-descendants' : 'auto'}
                style={{ gap: 12 }}>
                {children}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              {closeConfirmation ?? <ActionButton
                variant="secondary"
                onPress={onClose}
                disabled={closeDisabled}
                loading={closeLoading}
                accessibilityLabel={closeAccessibilityLabel ?? `${title} 닫기`}
              >
                닫기
              </ActionButton>}
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
    maxWidth: 640,
    alignSelf: 'center',
    flexShrink: 1,
  },
  card: {
    maxHeight: '92%',
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  title: {
    fontWeight: '500',
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
