import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { SectionCard } from '../../../components/SectionCard';
import type { AppPalette } from '../../../constants/theme';
import { getInvitationThemeLabel } from '../../../lib/invitationThemes';
import {
  getLinkedInvitationThemeKeys,
  type LinkedInvitationCard,
} from '../../../lib/linkedInvitationCards';
import { getInvitationVisibility } from '../invitationVisibility';
import { formatDateLabel, formatDisplayPeriod, formatThemeList } from '../linkedInvitationDisplay';

type LinkedInvitationCardPanelProps = {
  card: LinkedInvitationCard;
  palette: AppPalette;
  active?: boolean;
  published?: boolean;
  weddingDate?: string;
  publicUrl?: string | null;
  children?: ReactNode;
  managementActions?: ReactNode;
};

type LinkedInvitationsSectionProps = {
  activeLinkedInvitationCard: LinkedInvitationCard | null;
  additionalLinkedInvitationCards: LinkedInvitationCard[];
  palette: AppPalette;
  hasDashboard: boolean;
  dashboardPublicUrl: string | null;
  dashboardCommentCount: number;
  dashboardPublished: boolean;
  dashboardWeddingDate?: string;
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
  card, palette, active = false, published = card.published, weddingDate,
  publicUrl, children, managementActions,
}: LinkedInvitationCardPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const visibility = getInvitationVisibility(published, card.displayPeriod);
  const statusColor = visibility.tone === 'success'
    ? palette.success : visibility.tone === 'notice' ? palette.notice : palette.textMuted;

  return (
    <View style={[styles.invitation, { borderColor: palette.cardBorder }]}>
      <View style={styles.summary}>
        <AppText variant="caption" color={palette.textMuted}>{active ? '현재 선택한 청첩장' : '연결한 청첩장'}</AppText>
        <AppText variant="title">{card.displayName.trim() || '연결한 청첩장'}</AppText>
        {weddingDate ? <AppText>예식일 {formatDateLabel(weddingDate)}</AppText> : null}
        <AppText color={statusColor}>{visibility.label}</AppText>
        <AppText variant="muted">
          노출 기간 · {card.displayPeriod.enabled ? formatDisplayPeriod(card.displayPeriod) : '기간 제한 없음'}
        </AppText>
      </View>

      {children}

      <ActionButton variant="secondary" onPress={() => setExpanded(value => !value)}
        accessibilityLabel={`${card.displayName || '청첩장'} 정보와 관리 ${expanded ? '접기' : '펼치기'}`}
        accessibilityState={{ expanded }}>
        {expanded ? '정보·관리 접기' : '청첩장 정보·관리 보기'}
      </ActionButton>
      {expanded ? (
        <View style={styles.details}>
          {managementActions}
          <View style={styles.summary}>
            <AppText variant="caption" color={palette.textMuted}>서비스 정보</AppText>
            <AppText>보유 티켓 {card.ticketCount}장 · {card.productTier.toUpperCase()}</AppText>
            <AppText variant="muted">기본 디자인 · {getInvitationThemeLabel(card.defaultTheme)}</AppText>
            <AppText variant="muted">사용 가능한 디자인 · {formatThemeList(getLinkedInvitationThemeKeys(card))}</AppText>
            <AppText variant="muted">배경음악 {card.showMusic ? '사용 가능' : '미제공'} · 방명록 {card.showGuestbook ? '제공' : '미제공'}</AppText>
            {publicUrl ? <AppText selectable variant="muted">하객용 주소 · {publicUrl}</AppText> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function LinkedInvitationsSection({
  activeLinkedInvitationCard, additionalLinkedInvitationCards, palette, hasDashboard,
  dashboardPublicUrl, dashboardCommentCount, dashboardPublished, dashboardWeddingDate,
  canRequestDashboardSync, needsRefreshRetry, activatingLinkedInvitationSlug,
  onOpenEditor, onOpenUrl, onTogglePublished, onOpenTicketModal, onCopyPublicUrl,
  onOpenInApp, onOpenGuestbook, onRefresh, onActivateLinkedInvitation,
}: LinkedInvitationsSectionProps) {
  if (!activeLinkedInvitationCard) return null;

  return (
    <SectionCard title="연결한 청첩장" badge={`${1 + additionalLinkedInvitationCards.length}개`}>
      <LinkedInvitationCardPanel
        key={activeLinkedInvitationCard.slug}
        card={activeLinkedInvitationCard} palette={palette} active
        published={hasDashboard ? dashboardPublished : activeLinkedInvitationCard.published}
        weddingDate={dashboardWeddingDate}
        publicUrl={hasDashboard ? dashboardPublicUrl : activeLinkedInvitationCard.publicUrl}
        managementActions={hasDashboard ? (
          <>
            <View style={styles.group}>
              <AppText variant="caption" color={palette.textMuted}>공개·노출 기간</AppText>
              <View style={styles.actions}>
                <ActionButton variant="secondary" onPress={onTogglePublished} style={styles.action}>
                  {dashboardPublished ? '비공개로 전환' : '공개로 전환'}
                </ActionButton>
                <ActionButton variant="secondary" onPress={onOpenTicketModal} style={styles.action}>티켓으로 기간 연장</ActionButton>
              </View>
            </View>
            <View style={styles.group}>
              <AppText variant="caption" color={palette.textMuted}>방명록 · {dashboardCommentCount}개</AppText>
              <ActionButton variant="secondary" onPress={onOpenGuestbook}>방명록 관리</ActionButton>
            </View>
            <View style={styles.group}>
              <AppText variant="caption" color={palette.textMuted}>기기 연동·동기화</AppText>
              <View style={styles.actions}>
                <ActionButton variant="secondary" onPress={onOpenInApp} style={styles.action}>앱 연동으로 다시 열기</ActionButton>
                <ActionButton variant="secondary" onPress={onRefresh} disabled={!canRequestDashboardSync} style={styles.action}>
                  {needsRefreshRetry ? '동기화 다시 시도' : '새로고침'}
                </ActionButton>
              </View>
            </View>
          </>
        ) : null}
      >
        {hasDashboard ? (
          <View style={styles.group}>
            <ActionButton fullWidth onPress={onOpenEditor} disabled={!canRequestDashboardSync}>내용 수정</ActionButton>
            <View style={styles.actions}>
              <ActionButton variant="secondary" onPress={onOpenUrl} style={styles.action}>미리보기</ActionButton>
              <ActionButton variant="secondary" onPress={() => onCopyPublicUrl(activeLinkedInvitationCard)} style={styles.action}>하객용 주소 복사</ActionButton>
            </View>
          </View>
        ) : null}
      </LinkedInvitationCardPanel>
      {additionalLinkedInvitationCards.map(item => (
        <LinkedInvitationCardPanel key={item.slug} card={item} palette={palette} publicUrl={item.publicUrl}>
          <View style={styles.actions}>
            <ActionButton variant="secondary" onPress={() => onActivateLinkedInvitation(item)}
              loading={activatingLinkedInvitationSlug === item.slug}
              disabled={Boolean(activatingLinkedInvitationSlug)} style={styles.action}>
              이 청첩장 관리
            </ActionButton>
            <ActionButton variant="secondary" onPress={() => onCopyPublicUrl(item)}
              disabled={Boolean(activatingLinkedInvitationSlug)} style={styles.action}>하객용 주소 복사</ActionButton>
          </View>
        </LinkedInvitationCardPanel>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  invitation: { paddingTop: 8, gap: 16 },
  summary: { gap: 6 },
  group: { gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexBasis: 140, flexGrow: 1 },
  details: { paddingTop: 8, gap: 20 },
});
