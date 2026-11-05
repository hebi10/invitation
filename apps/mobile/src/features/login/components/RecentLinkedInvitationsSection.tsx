import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { SectionCard } from '../../../components/SectionCard';
import type { AppPalette } from '../../../constants/theme';
import {
  canActivateLinkedInvitationCard,
  type LinkedInvitationCard,
} from '../../../lib/linkedInvitationCards';
import { getInvitationVisibility } from '../../manage/invitationVisibility';

type RecentLinkedInvitationsSectionProps = {
  cards: LinkedInvitationCard[];
  palette: AppPalette;
  activatingSlug: string | null;
  onContinue: (card: LinkedInvitationCard) => void;
  onCopyLink: (card: LinkedInvitationCard) => void;
};

function formatRecentLinkedAt(updatedAt: number) {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return '방금 연동';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(updatedAt));
}

export function RecentLinkedInvitationsSection({
  cards,
  palette,
  activatingSlug,
  onContinue,
  onCopyLink,
}: RecentLinkedInvitationsSectionProps) {
  if (!cards.length) {
    return null;
  }

  return (
    <SectionCard
      title="최근 연동한 청첩장"
      description="이전에 연동한 청첩장은 저장된 세션이 유효할 때 바로 이어서 열 수 있습니다."
      badge={`${cards.length}개`}
      badgeTone="neutral"
    >
      {cards.map((card) => {
        const canContinue = canActivateLinkedInvitationCard(card);
        const displayName = card.displayName.trim() || '최근 연동한 청첩장';
        const visibility = getInvitationVisibility(card.published, card.displayPeriod);
        const hasPublicUrl = Boolean(card.publicUrl?.trim());

        return (
          <View
            key={`recent-linked-invitation-${card.slug}`}
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <View style={styles.header}>
              <AppText variant="body" style={styles.title}>{displayName}</AppText>
              <AppText
                variant="caption"
                color={canContinue ? palette.success : palette.textMuted}
                style={styles.status}
              >
                {canContinue ? '바로 이어서 열기 가능' : '연동 만료'}
              </AppText>
            </View>

            <View style={styles.copy}>
              <AppText
                variant="muted"
                color={visibility.tone === 'success' ? palette.success : visibility.tone === 'notice' ? palette.notice : palette.textMuted}
              >
                공개 상태: {visibility.label}
              </AppText>
              <AppText variant="muted">최근 연동: {formatRecentLinkedAt(card.updatedAt)}</AppText>
              {card.publicUrl ? (
                <AppText variant="muted" style={styles.linkText} numberOfLines={2}>
                  {card.publicUrl}
                </AppText>
              ) : null}
            </View>

            <View style={styles.actions}>
              <ActionButton
                onPress={() => onContinue(card)}
                loading={activatingSlug === card.slug}
                disabled={Boolean(activatingSlug) && activatingSlug !== card.slug}
                style={styles.actionButton}
              >
                {canContinue ? '이어서 열기' : '연동 확인'}
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={() => onCopyLink(card)}
                disabled={Boolean(activatingSlug) || !hasPublicUrl}
                accessibilityHint={hasPublicUrl ? '하객용 공개 주소를 복사합니다' : '하객용 주소를 확인한 후 사용할 수 있습니다'}
                style={styles.actionButton}
              >
                주소 복사
              </ActionButton>
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 14,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontWeight: '600',
  },
  status: {
    fontWeight: '700',
  },
  copy: {
    gap: 4,
  },
  linkText: {
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 120,
  },
});
