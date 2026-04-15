import type { PropsWithChildren } from 'react';

import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
}>;

export function InvitationEditorModalShell({
  visible,
  onClose,
  title,
  description,
  palette,
  fontScale,
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
        <View style={styles.backdrop} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
            },
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {children}
          </ScrollView>

          <View style={styles.actions}>
            <ActionButton variant="secondary" onPress={onClose}>
              닫기
            </ActionButton>
          </View>
        </View>
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
    backgroundColor: 'rgba(15, 12, 10, 0.58)',
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
