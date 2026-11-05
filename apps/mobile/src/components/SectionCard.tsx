import type { PropsWithChildren } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { getScaledTypography } from '../constants/uiTokens';
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
            accessibilityRole="header"
            style={[
              { color: palette.text },
              getScaledTypography(isHero ? 'heroTitle' : isEmphasis ? 'title' : 'cardTitle', fontScale),
            ]}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={[
                { color: palette.textMuted },
                getScaledTypography('cardDescription', fontScale),
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
                { color: badgeTextColor },
                getScaledTypography('badge', fontScale),
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
    borderRadius: 0,
    padding: 16,
    gap: 16,
  },
  heroCard: {
    padding: 16,
    gap: 16,
  },
  emphasisCard: {
    padding: 16,
    gap: 16,
    borderWidth: 1,
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
    minWidth: 0,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    maxWidth: '40%',
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  emphasisBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  body: {
    gap: 16,
  },
});
