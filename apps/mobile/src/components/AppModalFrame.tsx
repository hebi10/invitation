import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppPalette } from '../constants/theme';
import { APP_SPACING } from '../constants/uiTokens';
import { useVisualPreferences } from '../contexts/PreferencesContext';
import { AppText } from './AppText';

type AppModalFrameProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  placement?: 'center' | 'bottom';
  footer?: ReactNode;
  contentDisabled?: boolean;
  closeDisabled?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
  palette?: AppPalette;
  fontScale?: number;
}>;

export function AppModalFrame({
  visible,
  onClose,
  title,
  description,
  placement = 'bottom',
  footer,
  contentDisabled = false,
  closeDisabled = false,
  cardStyle,
  palette: suppliedPalette,
  fontScale: suppliedFontScale,
  children,
}: AppModalFrameProps) {
  const appearance = useVisualPreferences();
  const palette = suppliedPalette ?? appearance.palette;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compactLayout = width < 360 || (width < 390 && (suppliedFontScale ?? appearance.fontScale) > 1);
  const dismiss = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={placement === 'bottom' ? 'slide' : 'fade'}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={dismiss}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[
          styles.overlay,
          placement === 'center' ? styles.center : styles.bottom,
          { paddingTop: insets.top + APP_SPACING.md, paddingBottom: Math.max(insets.bottom, APP_SPACING.md) },
        ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeDisabled ? '처리 중에는 팝업을 닫을 수 없습니다' : '팝업 닫기'}
            style={styles.backdrop}
            onPress={dismiss}
            disabled={closeDisabled}
          />
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={dismiss}
            style={[
              styles.card,
              compactLayout ? styles.cardNarrow : null,
              placement === 'center' ? styles.centerCard : styles.bottomCard,
              { backgroundColor: palette.surface, borderColor: palette.cardBorder },
              cardStyle,
            ]}
          >
            {title ? (
              <View style={styles.header}>
                <AppText accessibilityRole="header" variant="title">
                  {title}
                </AppText>
                {description ? <AppText variant="muted">{description}</AppText> : null}
              </View>
            ) : null}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={styles.body}
                pointerEvents={contentDisabled ? 'none' : 'auto'}
                accessibilityElementsHidden={contentDisabled}
                importantForAccessibility={contentDisabled ? 'no-hide-descendants' : 'auto'}
              >
                {children}
              </View>
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, paddingHorizontal: APP_SPACING.md },
  center: { justifyContent: 'center' },
  bottom: { justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 18, 16, 0.58)',
  },
  card: {
    width: '100%',
    alignSelf: 'center',
    maxHeight: '92%',
    borderWidth: 1,
    borderRadius: 0,
    padding: APP_SPACING.md,
    gap: APP_SPACING.md,
  },
  cardNarrow: { padding: APP_SPACING.sm, gap: APP_SPACING.sm },
  centerCard: { maxWidth: 520 },
  bottomCard: { maxWidth: 640 },
  header: { gap: APP_SPACING.xs },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  content: { paddingBottom: APP_SPACING.xs },
  body: { gap: APP_SPACING.sm },
  footer: { alignItems: 'stretch', flexShrink: 0, gap: APP_SPACING.xs },
});
