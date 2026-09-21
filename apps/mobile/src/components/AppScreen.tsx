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
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 32,
          },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={[styles.title, { color: palette.text, fontSize: 26 * fontScale }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  { color: palette.textMuted, fontSize: 15 * fontScale, lineHeight: 24 * fontScale },
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
    paddingHorizontal: 20,
    gap: 24,
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
  title: {
    fontWeight: '500',
  },
  subtitle: {
    lineHeight: 22,
  },
});
