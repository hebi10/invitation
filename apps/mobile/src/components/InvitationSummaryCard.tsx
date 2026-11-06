import { Image } from 'expo-image';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AppPalette } from '../constants/theme';
import { themePreviewImages } from '../constants/themePreviewImages';
import { AppText } from './AppText';

export type InvitationSummaryTone = 'success' | 'notice' | 'neutral';

type InvitationSummaryCardProps = PropsWithChildren<{
  palette: AppPalette;
  name: string;
  contextLabel: string;
  themeKey: string;
  imageUrl?: string | null;
  dateLabel?: string | null;
  statusLabel: string;
  statusTone?: InvitationSummaryTone;
  periodLabel?: string | null;
  selected?: boolean;
  compact?: boolean;
}>;

export function InvitationSummaryCard({
  palette,
  name,
  contextLabel,
  themeKey,
  imageUrl,
  dateLabel,
  statusLabel,
  statusTone = 'neutral',
  periodLabel,
  selected = false,
  compact = false,
  children,
}: InvitationSummaryCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUrl]);

  const validImageUrl = imageUrl?.trim();
  const showsActualCover = Boolean(
    validImageUrl && /^https?:\/\//i.test(validImageUrl) && !imageFailed
  );
  const previewImage = themePreviewImages[themeKey] ?? themePreviewImages.simple;
  const statusBackgroundColor =
    statusTone === 'success' ? palette.successSoft
      : statusTone === 'notice' ? palette.noticeSoft : palette.surfaceMuted;
  const statusTextColor =
    statusTone === 'success' ? palette.success
      : statusTone === 'notice' ? palette.notice : palette.textMuted;

  return (
    <View
      style={[
        styles.card,
        compact ? styles.cardCompact : null,
        {
          backgroundColor: selected ? palette.accentSoft : palette.surface,
          borderColor: selected ? palette.accent : palette.cardBorder,
        },
      ]}
    >
      <View style={[styles.overview, compact ? styles.overviewCompact : null]}>
        <Image
          source={showsActualCover ? { uri: validImageUrl! } : previewImage}
          style={[styles.cover, compact ? styles.coverCompact : null, { backgroundColor: palette.surfaceMuted }]}
          contentFit="cover"
          contentPosition="top"
          alt={showsActualCover ? `${name} 실제 대표 사진` : `${name} 디자인 미리보기`}
          onError={() => setImageFailed(true)}
        />
        <View style={[styles.details, compact ? styles.detailsCompact : null]}>
          <AppText variant="caption" color={palette.textMuted}>
            {contextLabel}
          </AppText>
          <AppText variant="title" style={styles.name}>{name}</AppText>
          {dateLabel ? (
            <AppText variant="caption" color={palette.textMuted}>
              {dateLabel}
            </AppText>
          ) : null}
          <View style={[styles.status, { backgroundColor: statusBackgroundColor }]}>
            <AppText variant="caption" color={statusTextColor}>
              {statusLabel}
            </AppText>
          </View>
        </View>
      </View>
      {periodLabel ? (
        <AppText variant="caption" color={palette.textMuted}>
          {periodLabel}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 14,
    gap: 14,
  },
  cardCompact: { padding: 10, gap: 8 },
  overviewCompact: { gap: 10 },
  coverCompact: { width: 64, height: 84 },
  detailsCompact: { gap: 3 },
  overview: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  cover: {
    width: 82,
    height: 112,
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  name: {
    flexShrink: 1,
  },
  status: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
});
