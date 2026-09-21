import { View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../../components/SectionCard';
import type { getPalette } from '../../../constants/theme';
import type {
  MobileInvitationProductTier,
} from '../../../types/mobileInvitation';
import { manageStyles } from '../manageStyles';

const TICKET_USAGE_ITEMS = [
  '티켓 1장: 노출 기간 1개월 연장',
  '티켓 2장: 서비스 업그레이드',
] as const;

type TicketUsageModalProps = {
  visible: boolean;
  onClose: () => void;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  availableTicketCount: number;
  currentPlan: MobileInvitationProductTier;
  upgradeTargetPlan: MobileInvitationProductTier | null;
  isExtendingDisplayPeriod: boolean;
  transferTargetCards: Array<{
    slug: string;
    displayName: string;
    ticketCount: number;
  }>;
  selectedTransferTargetSlug: string | null;
  ticketTransferCount: number;
  ticketTransferCountOptions: number[];
  isTransferringTickets: boolean;
  onSelectTransferTarget: (slug: string) => void;
  onSelectTicketTransferCount: (count: number) => void;
  onExtendDisplayPeriod: () => void;
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

export function TicketUsageModal({
  visible,
  onClose,
  palette,
  fontScale,
  availableTicketCount,
  currentPlan,
  upgradeTargetPlan,
  isExtendingDisplayPeriod,
  transferTargetCards,
  selectedTransferTargetSlug,
  ticketTransferCount,
  ticketTransferCountOptions,
  isTransferringTickets,
  onSelectTransferTarget,
  onSelectTicketTransferCount,
  onExtendDisplayPeriod,
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
