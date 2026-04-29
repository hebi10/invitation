import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { SectionCard } from '../../../components/SectionCard';
import type { AppPalette } from '../../../constants/theme';
import {
  canActivateLinkedInvitationCard,
  type LinkedInvitationCard,
} from '../../../lib/linkedInvitationCards';

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
      badgeTone="notice"
    >
      {cards.map((card) => {
        const canContinue = canActivateLinkedInvitationCard(card);
        const displayName = card.displayName.trim() || '최근 연동한 청첩장';

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
              <AppText style={styles.title}>{displayName}</AppText>
              <AppText
                variant="caption"
                color={canContinue ? palette.success : palette.textMuted}
                style={styles.status}
              >
                {canContinue ? '바로 이어서 열기 가능' : '연동 만료'}
              </AppText>
            </View>

            <View style={styles.copy}>
              <AppText variant="muted">
                공개 상태: {card.published ? '공개 중' : '비공개'}
              </AppText>
              <AppText variant="muted">최근 연동: {formatRecentLinkedAt(card.updatedAt)}</AppText>
              {card.publicUrl ? (
                <AppText variant="muted" style={styles.linkText}>
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
                disabled={Boolean(activatingSlug)}
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
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  header: {
    gap: 4,
  },
  title: {
    fontWeight: '800',
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
    flexBasis: '48%',
  },
});
