import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { InvitationSummaryCard } from '../../../components/InvitationSummaryCard';
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
  coverImageUrl?: string | null;
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
  dashboardCoverImageUrl?: string | null;
  canRequestDashboardSync: boolean;
  needsRefreshRetry: boolean;
  activatingLinkedInvitationSlug: string | null;
  onOpenEditor: () => void;
  onOpenUrl: () => void;
  onTogglePublished: () => void;
  onOpenPeriodExtension: () => void;
  onCopyPublicUrl: (card: LinkedInvitationCard) => void;
  onKakaoShare: (card: LinkedInvitationCard) => void;
  onOpenInApp: () => void;
  onOpenGuestbook: () => void;
  onRefresh: () => void;
  onActivateLinkedInvitation: (card: LinkedInvitationCard) => void;
};

function LinkedInvitationCardPanel({
  card,
  palette,
  active = false,
  published = card.published,
  weddingDate,
  publicUrl,
  coverImageUrl,
  children,
  managementActions,
}: LinkedInvitationCardPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const visibility = getInvitationVisibility(published, card.displayPeriod);
  const displayName = card.displayName.trim() || '연결한 청첩장';

  return (
    <InvitationSummaryCard
      palette={palette}
      name={displayName}
      contextLabel={active ? '현재 관리 중 · 기기 연동' : '기기에 연동된 청첩장'}
      themeKey={card.defaultTheme}
      imageUrl={coverImageUrl}
      dateLabel={weddingDate ? `예식일 ${formatDateLabel(weddingDate)}` : undefined}
      statusLabel={visibility.label}
      statusTone={visibility.tone}
      periodLabel={`노출 기간 · ${card.displayPeriod.enabled ? formatDisplayPeriod(card.displayPeriod) : '기간 제한 없음'}`}
      selected={active}
    >
      {children}
      <ActionButton
        variant="secondary"
        onPress={() => setExpanded((value) => !value)}
        accessibilityLabel={`${displayName} 정보와 관리 ${expanded ? '접기' : '펼치기'}`}
        accessibilityState={{ expanded }}
        fullWidth
      >
        {expanded ? '추가 정보·관리 접기' : '추가 정보·관리 보기'}
      </ActionButton>
      {expanded ? (
        <View style={styles.details}>
          {managementActions}
          <View style={styles.group}>
            <AppText variant="caption" color={palette.textMuted}>서비스 정보</AppText>
            <AppText>프리미엄 · 모든 기능 포함</AppText>
            <AppText variant="muted">기본 디자인 · {getInvitationThemeLabel(card.defaultTheme)}</AppText>
            <AppText variant="muted">
              사용 가능한 디자인 · {formatThemeList(getLinkedInvitationThemeKeys(card))}
            </AppText>
            <AppText variant="muted">
              배경음악 {card.showMusic ? '사용 가능' : '미제공'} · 방명록 {card.showGuestbook ? '제공' : '미제공'}
            </AppText>
            {publicUrl ? <AppText selectable variant="muted">하객용 주소 · {publicUrl}</AppText> : null}
          </View>
        </View>
      ) : null}
    </InvitationSummaryCard>
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
  dashboardWeddingDate,
  dashboardCoverImageUrl,
  canRequestDashboardSync,
  needsRefreshRetry,
  activatingLinkedInvitationSlug,
  onOpenEditor,
  onOpenUrl,
  onTogglePublished,
  onOpenPeriodExtension,
  onCopyPublicUrl,
  onKakaoShare,
  onOpenInApp,
  onOpenGuestbook,
  onRefresh,
  onActivateLinkedInvitation,
}: LinkedInvitationsSectionProps) {
  if (!activeLinkedInvitationCard) return null;

  return (
    <SectionCard
      title="연결한 청첩장"
      description="이 기기에 연결한 청첩장입니다. 고객 계정의 전체 청첩장 목록과 별도로 표시됩니다."
      badge={`${1 + additionalLinkedInvitationCards.length}개`}
      badgeTone="neutral"
    >
      <LinkedInvitationCardPanel
        key={activeLinkedInvitationCard.slug}
        card={activeLinkedInvitationCard}
        palette={palette}
        active
        published={hasDashboard ? dashboardPublished : activeLinkedInvitationCard.published}
        weddingDate={dashboardWeddingDate}
        coverImageUrl={hasDashboard ? dashboardCoverImageUrl : null}
        publicUrl={hasDashboard ? dashboardPublicUrl : activeLinkedInvitationCard.publicUrl}
        managementActions={hasDashboard ? (
          <>
            <View style={styles.group}>
              <AppText variant="caption" color={palette.textMuted}>공개·노출 기간</AppText>
              <View style={styles.actions}>
                <ActionButton variant="secondary" onPress={onTogglePublished} style={styles.action}>
                  {dashboardPublished ? '비공개로 전환' : '공개로 전환'}
                </ActionButton>
                <ActionButton variant="secondary" onPress={onOpenPeriodExtension} style={styles.action}>
                  5,000원 · 6개월 연장
                </ActionButton>
              </View>
            </View>
            <View style={styles.group}>
              <AppText variant="caption" color={palette.textMuted}>방명록 · {dashboardCommentCount}개</AppText>
              <ActionButton variant="secondary" onPress={onOpenGuestbook} fullWidth>
                방명록 관리
              </ActionButton>
            </View>
            <View style={styles.group}>
              <AppText variant="caption" color={palette.textMuted}>기기 연동·동기화</AppText>
              <View style={styles.actions}>
                <ActionButton variant="secondary" onPress={onOpenInApp} style={styles.action}>
                  앱 연동으로 다시 열기
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onPress={onRefresh}
                  disabled={!canRequestDashboardSync}
                  style={styles.action}
                >
                  {needsRefreshRetry ? '동기화 다시 시도' : '새로고침'}
                </ActionButton>
              </View>
            </View>
          </>
        ) : null}
      >
        {hasDashboard ? (
          <View style={styles.group}>
            <ActionButton fullWidth onPress={onOpenEditor} disabled={!canRequestDashboardSync}>
              내용 수정
            </ActionButton>
            <View style={styles.actions}>
              <ActionButton variant="secondary" onPress={onOpenUrl} style={styles.action}>미리보기</ActionButton>
              <ActionButton
                variant="secondary"
                onPress={() => onKakaoShare(activeLinkedInvitationCard)}
                style={styles.action}
              >
                카카오톡 카드 공유
              </ActionButton>
            </View>
            <ActionButton
              variant="secondary"
              fullWidth
              onPress={() => onCopyPublicUrl(activeLinkedInvitationCard)}
            >
              하객용 주소 복사
            </ActionButton>
          </View>
        ) : (
          <View style={styles.group}>
            <AppText variant="caption" color={palette.textMuted}>
              현재 관리 정보를 확인하고 있습니다. 동기화가 완료되면 수정·공유 도구가 표시됩니다.
            </AppText>
            {needsRefreshRetry ? (
              <ActionButton variant="secondary" onPress={onRefresh} disabled={!canRequestDashboardSync} fullWidth>
                동기화 다시 시도
              </ActionButton>
            ) : null}
          </View>
        )}
      </LinkedInvitationCardPanel>
      {additionalLinkedInvitationCards.map((item) => (
        <LinkedInvitationCardPanel
          key={item.slug}
          card={item}
          palette={palette}
          publicUrl={item.publicUrl}
        >
          <View style={styles.group}>
            <ActionButton
              variant="secondary"
              fullWidth
              onPress={() => onActivateLinkedInvitation(item)}
              loading={activatingLinkedInvitationSlug === item.slug}
              disabled={Boolean(activatingLinkedInvitationSlug)}
            >
              이 청첩장 관리
            </ActionButton>
            <View style={styles.actions}>
              <ActionButton
                variant="secondary"
                onPress={() => onCopyPublicUrl(item)}
                disabled={Boolean(activatingLinkedInvitationSlug)}
                style={styles.action}
              >
                하객용 주소 복사
              </ActionButton>
              <ActionButton
                variant="secondary"
                onPress={() => onKakaoShare(item)}
                disabled={Boolean(activatingLinkedInvitationSlug)}
                style={styles.action}
              >
                카카오톡 카드 공유
              </ActionButton>
            </View>
          </View>
        </LinkedInvitationCardPanel>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexGrow: 1, flexBasis: 140, minWidth: 128 },
  details: { gap: 20 },
});
