import { Ionicons } from '@expo/vector-icons';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { APP_SPACING } from '../constants/uiTokens';
import { useVisualPreferences } from '../contexts/PreferencesContext';
import { AppText } from './AppText';

type DisclosureProps = PropsWithChildren<{
  title: string;
  description?: string;
  defaultExpanded?: boolean;
}>;

export function Disclosure({ title, description, defaultExpanded = false, children }: DisclosureProps) {
  const { palette } = useVisualPreferences();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={[styles.container, { borderColor: palette.cardBorder, backgroundColor: palette.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={expanded ? '접으려면 두 번 탭하세요' : '내용을 펼치려면 두 번 탭하세요'}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.toggle,
          expanded || pressed ? { backgroundColor: palette.surfaceMuted } : null,
        ]}
      >
        <View style={styles.copy}>
          <AppText variant="body" style={styles.title}>{title}</AppText>
          {description ? <AppText variant="muted">{description}</AppText> : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={expanded ? palette.accent : palette.textMuted}
        />
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 0 },
  toggle: {
    minHeight: 56,
    padding: APP_SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: APP_SPACING.md,
  },
  copy: { flex: 1, minWidth: 0, gap: APP_SPACING.xs },
  title: { fontWeight: '700' },
  content: { padding: APP_SPACING.md, gap: APP_SPACING.md },
});
