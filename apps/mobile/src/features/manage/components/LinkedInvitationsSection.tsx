import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { SectionCard } from '../../../components/SectionCard';
import type { AppPalette } from '../../../constants/theme';
import { getInvitationThemeLabel } from '../../../lib/invitationThemes';
import {
  getLinkedInvitationThemeKeys,
  type LinkedInvitationCard,
} from '../../../lib/linkedInvitationCards';
import { manageStyles } from '../manageStyles';
import { formatDisplayPeriod, formatThemeList } from '../linkedInvitationDisplay';

type LinkedInvitationCardPanelProps = {
  card: LinkedInvitationCard;
  palette: AppPalette;
  badgeLabel: string;
  publicUrl?: string | null;
  children?: ReactNode;
};

type LinkedInvitationsSectionProps = {
  activeLinkedInvitationCard: LinkedInvitationCard | null;
  additionalLinkedInvitationCards: LinkedInvitationCard[];
  palette: AppPalette;
  hasDashboard: boolean;
  dashboardPublicUrl: string | null;
  dashboardCommentCount: number;
  dashboardPublished: boolean;
  canRequestDashboardSync: boolean;
  needsRefreshRetry: boolean;
  activatingLinkedInvitationSlug: string | null;
  onOpenEditor: () => void;
  onOpenUrl: () => void;
  onTogglePublished: () => void;
  onOpenTicketModal: () => void;
  onCopyPublicUrl: (card: LinkedInvitationCard) => void;
  onOpenInApp: () => void;
  onOpenGuestbook: () => void;
  onRefresh: () => void;
  onActivateLinkedInvitation: (card: LinkedInvitationCard) => void;
};

function LinkedInvitationCardPanel({
  card,
  palette,
  badgeLabel,
  publicUrl,
  children,
}: LinkedInvitationCardPanelProps) {
  return (
    <View
      style={[
        manageStyles.selectedInvitationCard,
        manageStyles.invitationCardExpanded,
        {
          backgroundColor: badgeLabel === '현재 연동' ? palette.surfaceMuted : palette.surface,
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <View style={manageStyles.invitationCardHeaderRow}>
        <AppText style={manageStyles.selectedInvitationTitle}>
          {card.displayName.trim() || (badgeLabel === '현재 연동' ? '연동한 청첩장' : '추가 연동 청첩장')}
        </AppText>
        <AppText color={badgeLabel === '현재 연동' ? palette.accent : palette.textMuted} variant="caption">
          {badgeLabel}
        </AppText>
      </View>

      <BulletList
        items={[
          `공개 상태: ${card.published ? '공개 중' : '비공개'}`,
          `서비스: ${card.productTier.toUpperCase()}`,
          `기본 테마: ${getInvitationThemeLabel(card.defaultTheme)}`,
          `연결된 디자인: ${formatThemeList(getLinkedInvitationThemeKeys(card))}`,
          `보유 티켓: ${card.ticketCount}장`,
          `노출 기간: ${formatDisplayPeriod(card.displayPeriod)}`,
          `배경음악: ${card.showMusic ? '사용 가능' : '미제공'}`,
          `방명록: ${card.showGuestbook ? '제공' : '미제공'}`,
        ]}
      />

      {publicUrl ? (
        <AppText variant="muted" style={manageStyles.linkText}>
          {publicUrl}
        </AppText>
      ) : null}

      {children}
    </View>
  );
}

export function LinkedInvitationsSection({
  activeLinkedInvitationCard,
  additionalLinkedInvitationCards,
  palette,
  hasDashboard,
  dashboardPublicUrl,
  dashboardCommentCount,
  dashboardPublished,
  canRequestDashboardSync,
  needsRefreshRetry,
  activatingLinkedInvitationSlug,
  onOpenEditor,
  onOpenUrl,
  onTogglePublished,
  onOpenTicketModal,
  onCopyPublicUrl,
  onOpenInApp,
  onOpenGuestbook,
  onRefresh,
  onActivateLinkedInvitation,
}: LinkedInvitationsSectionProps) {
  if (!activeLinkedInvitationCard) {
    return null;
  }

  return (
    <SectionCard
      title="연동된 청첩장"
      description="현재 연동 정보와 공개 상태를 확인하고, 필요하면 다시 연동할 수 있습니다."
      badge={`${1 + additionalLinkedInvitationCards.length}개`}
    >
      <LinkedInvitationCardPanel
        card={activeLinkedInvitationCard}
        palette={palette}
        badgeLabel="현재 연동"
        publicUrl={hasDashboard ? dashboardPublicUrl : null}
      >
        {hasDashboard ? (
          <>
            <View style={manageStyles.actionRow}>
              <ActionButton
                onPress={onOpenEditor}
                disabled={!canRequestDashboardSync}
                style={manageStyles.actionHalfButton}
              >
                수정 하기
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={onOpenUrl}
                style={manageStyles.actionHalfButton}
              >
                청첩장 열기
              </ActionButton>
              <ActionButton
                variant={dashboardPublished ? 'danger' : 'primary'}
                onPress={onTogglePublished}
                style={manageStyles.actionHalfButton}
              >
                {dashboardPublished ? '비공개 전환' : '공개 전환'}
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={onOpenTicketModal}
                style={manageStyles.actionHalfButton}
              >
                티켓 사용
              </ActionButton>
            </View>

            <View
              style={[
                manageStyles.secondaryActionCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <AppText variant="caption" color={palette.textMuted} style={manageStyles.secondaryActionLabel}>
                추가 작업
              </AppText>
              <View style={manageStyles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => onCopyPublicUrl(activeLinkedInvitationCard)}
                  style={manageStyles.actionHalfButton}
                >
                  주소 복사
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={onOpenInApp}
                  style={manageStyles.actionHalfButton}
                >
                  앱에서 다시 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={onOpenGuestbook}
                  style={manageStyles.actionHalfButton}
                >
                  방명록 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={onRefresh}
                  disabled={!canRequestDashboardSync}
                  style={manageStyles.actionHalfButton}
                >
                  {needsRefreshRetry ? '다시 시도' : '새로고침'}
                </ActionButton>
              </View>
            </View>

            <AppText variant="muted" style={manageStyles.loadingText}>
              {dashboardCommentCount === 0
                ? '아직 등록된 방명록 댓글이 없습니다.'
                : `${dashboardCommentCount}개의 방명록 댓글이 등록되어 있습니다.`}
            </AppText>
          </>
        ) : null}
      </LinkedInvitationCardPanel>

      {additionalLinkedInvitationCards.length ? (
        <View style={manageStyles.invitationCardList}>
          {additionalLinkedInvitationCards.map((item) => (
            <LinkedInvitationCardPanel
              key={`linked-invitation-${item.slug}`}
              card={item}
              palette={palette}
              badgeLabel="추가 연동"
              publicUrl={item.publicUrl}
            >
              <View style={manageStyles.actionRow}>
                <ActionButton
                  variant="secondary"
                  onPress={() => onActivateLinkedInvitation(item)}
                  loading={activatingLinkedInvitationSlug === item.slug}
                  disabled={Boolean(activatingLinkedInvitationSlug)}
                  style={manageStyles.actionHalfButton}
                >
                  이어서 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={() => onCopyPublicUrl(item)}
                  disabled={Boolean(activatingLinkedInvitationSlug)}
                  style={manageStyles.actionHalfButton}
                >
                  주소 복사
                </ActionButton>
              </View>
            </LinkedInvitationCardPanel>
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}
