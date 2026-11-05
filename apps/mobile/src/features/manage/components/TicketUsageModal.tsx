import { View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { ModalFeedback, ModalSummaryRow } from '../../../components/ModalPrimitives';
import { InvitationEditorModalShell } from '../../../components/manage/InvitationEditorModalShell';
import { SectionCard } from '../../../components/SectionCard';
import type { getPalette } from '../../../constants/theme';
import { manageStyles } from '../manageStyles';

const TICKET_USAGE_ITEMS = [
  '티켓 1장: 노출 기간 1개월 연장',
] as const;

type TicketUsageModalProps = {
  visible: boolean;
  onClose: () => void;
  palette: ReturnType<typeof getPalette>;
  fontScale: number;
  availableTicketCount: number;
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
  notice: string;
  onBuyTickets: () => void;
};

export function TicketUsageModal({
  visible,
  onClose,
  palette,
  fontScale,
  availableTicketCount,
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
  notice,
  onBuyTickets,
}: TicketUsageModalProps) {
  return (
    <InvitationEditorModalShell
      visible={visible}
      onClose={onClose}
      title="티켓 사용"
      description="현재 청첩장의 노출 기간을 연장하거나 다른 청첩장으로 티켓을 이동합니다."
      closeDisabled={isExtendingDisplayPeriod || isTransferringTickets}
      palette={palette}
      fontScale={fontScale}
    >
      <SectionCard
        title="보유 티켓"
        description="사용 가능한 티켓 수량과 적용 기준입니다."
      >
        <ModalSummaryRow
          label="현재 보유 티켓"
          value={`${availableTicketCount}장`}
          palette={palette}
          total
        />
        <BulletList items={[...TICKET_USAGE_ITEMS]} />
      </SectionCard>

      <SectionCard title="기간 1개월 연장" description="티켓 1장 사용">
        {notice ? <ModalFeedback palette={palette} tone="notice">{notice}</ModalFeedback> : null}
        <AppText variant="muted" style={manageStyles.helperText}>
          현재 청첩장의 노출 기간 종료일을 기준으로 1개월 연장합니다.
        </AppText>
        <ActionButton
          onPress={onExtendDisplayPeriod}
          loading={isExtendingDisplayPeriod}
          fullWidth
        >
          {availableTicketCount > 0 ? '1개월 연장 적용' : '이전 연장 결과 다시 확인'}
        </ActionButton>
        <ActionButton
          variant="secondary"
          onPress={onBuyTickets}
          disabled={isExtendingDisplayPeriod || isTransferringTickets}
          fullWidth
        >
          티켓 구매하기
        </ActionButton>
        <AppText variant="caption">이전 요청의 결과를 확인하지 못했다면 다시 눌러 확인할 수 있습니다. 같은 요청에는 티켓이 중복 차감되지 않습니다.</AppText>
      </SectionCard>

      {transferTargetCards.length > 0 ? (
        <SectionCard
          title="다른 연동 청첩장으로 티켓 이동"
          description="현재 연동된 청첩장의 보유 티켓을 다른 연동 청첩장으로 보낼 수 있습니다."
        >
          <AppText variant="caption" color={palette.textMuted}>이동할 청첩장</AppText>
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
          <AppText variant="caption" color={palette.textMuted} style={manageStyles.helperText}>
            선택한 청첩장{' '}
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
          <AppText variant="caption" color={palette.textMuted}>이동할 티켓 수량</AppText>
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
