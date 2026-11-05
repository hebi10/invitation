import type { PropsWithChildren, ReactNode, RefObject } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_SPACING, getScaledTypography } from '../constants/uiTokens';
import { useVisualPreferences } from '../contexts/PreferencesContext';

type AppScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: RefObject<ScrollView | null>;
}>;

export function AppScreen({
  title,
  subtitle,
  headerRight,
  contentContainerStyle,
  scrollRef,
  children,
}: AppScreenProps) {
  const { palette, fontScale } = useVisualPreferences();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.screen, { backgroundColor: palette.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + APP_SPACING.lg,
            paddingBottom: insets.bottom + APP_SPACING.xl,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={[{ color: palette.text }, getScaledTypography('screenTitle', fontScale)]}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  { color: palette.textMuted },
                  getScaledTypography('screenSubtitle', fontScale),
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight ? <View>{headerRight}</View> : null}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: APP_SPACING.md,
    gap: APP_SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 10,
  },
});
