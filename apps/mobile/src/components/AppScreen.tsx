import type { PropsWithChildren, ReactNode, RefObject } from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '../contexts/PreferencesContext';

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
  const { palette, fontScale } = usePreferences();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 16,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: palette.text, fontSize: 28 * fontScale }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: palette.textMuted, fontSize: 15 * fontScale },
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    lineHeight: 22,
  },
});
