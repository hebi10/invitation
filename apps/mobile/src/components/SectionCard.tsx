import type { PropsWithChildren } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { useAppState } from '../contexts/AppStateContext';

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  badge?: string;
}>;

export function SectionCard({
  title,
  description,
  badge,
  children,
}: SectionCardProps) {
  const { palette, fontScale } = useAppState();

  return (
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
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text, fontSize: 18 * fontScale }]}>
            {title}
          </Text>
          {description ? (
            <Text
              style={[
                styles.description,
                { color: palette.textMuted, fontSize: 14 * fontScale },
              ]}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: palette.accentSoft }]}>
            <Text style={[styles.badgeText, { color: palette.accent, fontSize: 12 * fontScale }]}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontWeight: '800',
  },
  description: {
    lineHeight: 21,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontWeight: '700',
  },
  body: {
    gap: 10,
  },
});
