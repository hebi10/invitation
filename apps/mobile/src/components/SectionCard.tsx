import type { PropsWithChildren } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useVisualPreferences } from '../contexts/PreferencesContext';

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  badge?: string;
  badgeTone?: 'accent' | 'success' | 'notice' | 'neutral';
  onPress?: () => void;
  variant?: 'default' | 'hero' | 'emphasis';
}>;

export function SectionCard({
  title,
  description,
  badge,
  badgeTone = 'accent',
  onPress,
  variant = 'default',
  children,
}: SectionCardProps) {
  const { palette, fontScale } = useVisualPreferences();

  const isHero = variant === 'hero';
  const isEmphasis = variant === 'emphasis';
  const noticeBadgeBackgroundColor = palette.noticeSoft ?? palette.surfaceMuted;
  const noticeBadgeTextColor = palette.notice ?? palette.textMuted;

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    isHero ? styles.heroCard : null,
    isEmphasis ? styles.emphasisCard : null,
    {
      backgroundColor: isHero
        ? palette.surfaceMuted
        : isEmphasis
          ? palette.accentSoft
          : palette.surface,
      borderColor: isEmphasis ? palette.accent : palette.cardBorder,
    },
  ];

  const badgeBackgroundColor =
    badgeTone === 'success'
      ? palette.successSoft
      : badgeTone === 'notice'
        ? noticeBadgeBackgroundColor
        : badgeTone === 'neutral'
          ? palette.surface
          : isEmphasis
            ? palette.surface
            : palette.accentSoft;
  const badgeTextColor =
    badgeTone === 'success'
      ? palette.success
      : badgeTone === 'notice'
        ? noticeBadgeTextColor
        : badgeTone === 'neutral'
          ? palette.textMuted
          : palette.accent;

  const cardContent = (
    <>
      <View style={[styles.header, isHero ? styles.heroHeader : null]}>
        <View style={styles.copy}>
          <Text
            style={[
              styles.title,
              isHero ? styles.heroTitle : null,
              isEmphasis ? styles.emphasisTitle : null,
              {
                color: palette.text,
                fontSize: (isHero ? 22 : isEmphasis ? 20 : 18) * fontScale,
              },
            ]}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={[
                styles.description,
                isHero ? styles.heroDescription : null,
                { color: palette.textMuted, fontSize: 14 * fontScale },
              ]}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View
            style={[
              styles.badge,
              isHero ? styles.heroBadge : null,
              isEmphasis ? styles.emphasisBadge : null,
              { backgroundColor: badgeBackgroundColor },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: badgeTextColor, fontSize: 12 * fontScale },
              ]}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={cardStyle}>
        {cardContent}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>
      {cardContent}
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
  heroCard: {
    padding: 20,
    gap: 16,
  },
  emphasisCard: {
    padding: 20,
    gap: 16,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroHeader: {
    gap: 16,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontWeight: '800',
  },
  heroTitle: {
    lineHeight: 28,
  },
  emphasisTitle: {
    lineHeight: 26,
  },
  description: {
    lineHeight: 21,
  },
  heroDescription: {
    lineHeight: 22,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emphasisBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontWeight: '700',
  },
  body: {
    gap: 10,
  },
});
