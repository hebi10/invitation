import { View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../../components/SectionCard';
import type { getPalette } from '../../../constants/theme';
import { getInvitationThemeLabel } from '../../../lib/invitationThemes';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import { manageStyles } from '../manageStyles';

const TICKET_USAGE_ITEMS = [
  '티켓 1장: 노출 기간 1개월 연장',
  '티켓 1장: 연결된 디자인 중 기본 디자인 변경',
  '티켓 2장: 같은 청첩장에 새 디자인 추가',
  '티켓 2장: 서비스 업그레이드',
] as const;

type TicketUsageModalProps = {
  visible: boolean;
  onClose: () => void;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  availableTicketCount: number;
  currentPlan: MobileInvitationProductTier;
  currentTheme: MobileInvitationThemeKey;
  availableThemes: MobileInvitationThemeKey[];
  purchasableThemes: MobileInvitationThemeKey[];
  selectedTargetTheme: MobileInvitationThemeKey;
  upgradeTargetPlan: MobileInvitationProductTier | null;
  isExtendingDisplayPeriod: boolean;
  isApplyingThemeChange: boolean;
  isPurchasingTargetTheme: boolean;
  isSelectedTargetThemeAvailable: boolean;
  isSelectedTargetThemeCurrent: boolean;
  transferTargetCards: Array<{
    slug: string;
    displayName: string;
    ticketCount: number;
  }>;
  selectedTransferTargetSlug: string | null;
  ticketTransferCount: number;
  ticketTransferCountOptions: number[];
  isTransferringTickets: boolean;
  onSelectTargetTheme: (theme: MobileInvitationThemeKey) => void;
  onSelectTransferTarget: (slug: string) => void;
  onSelectTicketTransferCount: (count: number) => void;
  onExtendDisplayPeriod: () => void;
  onApplyThemeChange: () => void;
  onOpenTargetThemePreview: () => void;
  onPurchaseTargetTheme: () => void;
  onTransferTickets: () => void;
  onGoToUpgrade: () => void;
};

function getPlanLabel(plan: MobileInvitationProductTier) {
  if (plan === 'standard') {
    return 'STANDARD';
  }

  if (plan === 'deluxe') {
    return 'DELUXE';
  }

  return 'PREMIUM';
}

function formatThemeList(themeKeys: readonly MobileInvitationThemeKey[]) {
  return themeKeys.map((themeKey) => getInvitationThemeLabel(themeKey)).join(', ');
}

function getTargetThemeChangeHelperText(options: {
  currentTheme: MobileInvitationThemeKey;
  selectedTargetTheme: MobileInvitationThemeKey;
  isSelectedTargetThemeAvailable: boolean;
  isSelectedTargetThemeCurrent: boolean;
}) {
  const {
    currentTheme,
    selectedTargetTheme,
    isSelectedTargetThemeAvailable,
    isSelectedTargetThemeCurrent,
  } = options;

  if (isSelectedTargetThemeCurrent) {
    return `${getInvitationThemeLabel(currentTheme)}은 이미 현재 기본 디자인입니다.`;
  }

  if (!isSelectedTargetThemeAvailable) {
    return `${getInvitationThemeLabel(
      selectedTargetTheme
    )}은 아직 현재 청첩장에 연결되지 않았습니다. 먼저 추가 구매가 필요합니다.`;
  }

  return '선택한 디자인은 이미 사용할 수 있으므로 티켓 1장으로 기본 디자인만 전환합니다.';
}

function getTargetThemePurchaseHelperText(options: {
  currentTheme: MobileInvitationThemeKey;
  selectedTargetTheme: MobileInvitationThemeKey;
  isSelectedTargetThemeAvailable: boolean;
  isSelectedTargetThemeCurrent: boolean;
}) {
  const {
    currentTheme,
    selectedTargetTheme,
    isSelectedTargetThemeAvailable,
    isSelectedTargetThemeCurrent,
  } = options;

  if (isSelectedTargetThemeCurrent) {
    return `${getInvitationThemeLabel(currentTheme)}은 이미 기본 디자인으로 사용 중입니다.`;
  }

  if (isSelectedTargetThemeAvailable) {
    return `${getInvitationThemeLabel(
      selectedTargetTheme
    )}은 이미 현재 청첩장에서 사용할 수 있습니다.`;
  }

  return '현재 청첩장 slug는 유지하고, 선택한 디자인 경로만 추가합니다.';
}

export function TicketUsageModal({
  visible,
  onClose,
  palette,
  fontScale,
  availableTicketCount,
  currentPlan,
  currentTheme,
  availableThemes,
  purchasableThemes,
  selectedTargetTheme,
  upgradeTargetPlan,
  isExtendingDisplayPeriod,
  isApplyingThemeChange,
  isPurchasingTargetTheme,
  isSelectedTargetThemeAvailable,
  isSelectedTargetThemeCurrent,
  transferTargetCards,
  selectedTransferTargetSlug,
  ticketTransferCount,
  ticketTransferCountOptions,
  isTransferringTickets,
  onSelectTargetTheme,
  onSelectTransferTarget,
  onSelectTicketTransferCount,
  onExtendDisplayPeriod,
  onApplyThemeChange,
  onOpenTargetThemePreview,
  onPurchaseTargetTheme,
  onTransferTickets,
  onGoToUpgrade,
}: TicketUsageModalProps) {
  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      title="티켓 사용"
      description="현재 연동된 청첩장에 바로 적용할 수 있는 티켓 기능을 모아 두었습니다."
      palette={palette}
      fontScale={fontScale}
    >
      <SectionCard
        title="티켓 정책"
        description="운영 탭에서도 현재 지원하는 티켓 사용 범위를 한 번에 확인할 수 있습니다."
      >
        <AppText variant="muted" style={manageStyles.helperText}>
          현재 보유 티켓: {availableTicketCount}장
        </AppText>
        <BulletList items={[...TICKET_USAGE_ITEMS]} />
      </SectionCard>

      <SectionCard
        title="대상 디자인 선택"
        description={`현재 기본 디자인 ${getInvitationThemeLabel(currentTheme)}`}
      >
        <AppText variant="muted" style={manageStyles.helperText}>
          현재 사용할 수 있는 디자인: {formatThemeList(availableThemes)}
        </AppText>
        <View style={manageStyles.chipRow}>
          {purchasableThemes.map((themeKey) => (
            <ChoiceChip
              key={`ticket-target-theme-${themeKey}`}
              label={getInvitationThemeLabel(themeKey)}
              selected={selectedTargetTheme === themeKey}
              onPress={() => onSelectTargetTheme(themeKey)}
            />
          ))}
        </View>
        <AppText variant="muted" style={manageStyles.helperText}>
          선택 대상: {getInvitationThemeLabel(selectedTargetTheme)}
          {isSelectedTargetThemeCurrent
            ? ' / 현재 기본 디자인'
            : isSelectedTargetThemeAvailable
              ? ' / 이미 연결됨'
              : ' / 아직 미연결'}
        </AppText>
        <ActionButton variant="secondary" onPress={onOpenTargetThemePreview} fullWidth>
          선택한 디자인 미리보기
        </ActionButton>
      </SectionCard>

      <SectionCard title="기간 1개월 연장" description="티켓 1장 사용">
        <AppText variant="muted" style={manageStyles.helperText}>
          현재 청첩장의 노출 기간 종료일을 기준으로 1개월 연장합니다.
        </AppText>
        <ActionButton
          onPress={onExtendDisplayPeriod}
          loading={isExtendingDisplayPeriod}
          disabled={availableTicketCount < 1}
          fullWidth
        >
          1개월 연장 적용
        </ActionButton>
      </SectionCard>

      <SectionCard
        title="기본 디자인 변경"
        description={`티켓 1장 사용 / 대상 ${getInvitationThemeLabel(selectedTargetTheme)}`}
      >
        <AppText variant="muted" style={manageStyles.helperText}>
          {getTargetThemeChangeHelperText({
            currentTheme,
            selectedTargetTheme,
            isSelectedTargetThemeAvailable,
            isSelectedTargetThemeCurrent,
          })}
        </AppText>
        <ActionButton
          variant="secondary"
          onPress={onApplyThemeChange}
          disabled={
            availableTicketCount < 1 ||
            isSelectedTargetThemeCurrent ||
            !isSelectedTargetThemeAvailable
          }
          loading={isApplyingThemeChange}
          fullWidth
        >
          선택한 디자인으로 기본 변경
        </ActionButton>
      </SectionCard>

      <SectionCard
        title="같은 청첩장에 디자인 추가"
        description={`티켓 2장 사용 / 대상 ${getInvitationThemeLabel(selectedTargetTheme)}`}
      >
        <AppText variant="muted" style={manageStyles.helperText}>
          {getTargetThemePurchaseHelperText({
            currentTheme,
            selectedTargetTheme,
            isSelectedTargetThemeAvailable,
            isSelectedTargetThemeCurrent,
          })}
        </AppText>
        <ActionButton
          onPress={onPurchaseTargetTheme}
          loading={isPurchasingTargetTheme}
          disabled={
            availableTicketCount < 2 ||
            isSelectedTargetThemeCurrent ||
            isSelectedTargetThemeAvailable
          }
          fullWidth
        >
          {isSelectedTargetThemeCurrent
            ? '현재 기본 디자인'
            : isSelectedTargetThemeAvailable
              ? '이미 추가됨'
              : '선택한 디자인 추가'}
        </ActionButton>
      </SectionCard>

      <SectionCard
        title="서비스 업그레이드"
        description={`티켓 2장 사용 / 현재 ${getPlanLabel(currentPlan)}`}
      >
        <AppText variant="muted" style={manageStyles.helperText}>
          {upgradeTargetPlan
            ? `${getPlanLabel(upgradeTargetPlan)} 상품으로 업그레이드할 수 있습니다.`
            : '현재가 최고 등급 상품이라 추가 업그레이드는 필요하지 않습니다.'}
        </AppText>
        <ActionButton onPress={onGoToUpgrade} disabled={!upgradeTargetPlan} fullWidth>
          {upgradeTargetPlan
            ? `${getPlanLabel(upgradeTargetPlan)} 업그레이드 진행`
            : '업그레이드 가능한 상품이 없습니다'}
        </ActionButton>
      </SectionCard>

      {transferTargetCards.length > 0 ? (
        <SectionCard
          title="다른 연동 청첩장으로 티켓 이동"
          description="현재 연동된 청첩장의 보유 티켓을 다른 연동 청첩장으로 보낼 수 있습니다."
        >
          <View style={manageStyles.chipRow}>
            {transferTargetCards.map((item) => (
              <ChoiceChip
                key={`transfer-target-${item.slug}`}
                label={item.displayName.trim() || item.slug}
                selected={selectedTransferTargetSlug === item.slug}
                onPress={() => onSelectTransferTarget(item.slug)}
              />
            ))}
          </View>
          <AppText variant="muted" style={manageStyles.helperText}>
            이동 대상{' '}
            {transferTargetCards.find((item) => item.slug === selectedTransferTargetSlug)
              ?.displayName.trim() ||
              transferTargetCards.find((item) => item.slug === selectedTransferTargetSlug)
                ?.slug ||
              '-'}{' '}
            / 현재 보유 티켓{' '}
            {transferTargetCards.find((item) => item.slug === selectedTransferTargetSlug)
              ?.ticketCount ?? 0}
            장
          </AppText>
          <View style={manageStyles.chipRow}>
            {ticketTransferCountOptions.map((count) => (
              <ChoiceChip
                key={`transfer-count-${count}`}
                label={`${count}장`}
                selected={ticketTransferCount === count}
                onPress={() => onSelectTicketTransferCount(count)}
              />
            ))}
          </View>
          <ActionButton
            variant="secondary"
            onPress={onTransferTickets}
            loading={isTransferringTickets}
            disabled={!selectedTransferTargetSlug || availableTicketCount < ticketTransferCount}
            fullWidth
          >
            선택한 청첩장으로 티켓 이동
          </ActionButton>
        </SectionCard>
      ) : null}
    </InvitationEditorModalShell>
  );
}
