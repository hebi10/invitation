import { Ionicons } from '@expo/vector-icons';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [styles.toggle, pressed ? { backgroundColor: palette.surfaceMuted } : null]}
      >
        <View style={styles.copy}>
          <AppText style={styles.title}>{title}</AppText>
          {description ? <AppText variant="muted">{description}</AppText> : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textMuted} />
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1 },
  toggle: { minHeight: 56, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  copy: { flex: 1, gap: 4 },
  title: { fontWeight: '600' },
  content: { padding: 16, paddingTop: 0, gap: 16 },
});
