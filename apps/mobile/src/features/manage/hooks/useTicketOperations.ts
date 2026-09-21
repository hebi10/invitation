import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../contexts/AuthContext';
import type { LinkedInvitationCard } from '../../../lib/linkedInvitationCardsModel';
import type {
  MobileDisplayPeriodSummary,
  MobileInvitationProductTier,
} from '../../../types/mobileInvitation';
type UseTicketOperationsOptions = {
  activeLinkedInvitationCard: LinkedInvitationCard | null;
  additionalLinkedInvitationCards: LinkedInvitationCard[];
  adjustTicketCount: (amount: number) => Promise<number | null>;
  extendDisplayPeriod: (
    months?: number
  ) => Promise<MobileDisplayPeriodSummary | null>;
  setDisplayPeriod: (
    period: MobileDisplayPeriodSummary
  ) => Promise<MobileDisplayPeriodSummary | null>;
  transferTicketCount: (
    targetPageSlug: string,
    targetToken: string,
    amount: number
  ) => Promise<{ sourceTicketCount: number; targetTicketCount: number } | null>;
  setNotice: (message: string) => void;
  setLinkedInvitationCards: React.Dispatch<React.SetStateAction<LinkedInvitationCard[]>>;
  formatDateLabel: (value: string) => string;
};

export function useTicketOperations({
  activeLinkedInvitationCard,
  additionalLinkedInvitationCards,
  adjustTicketCount,
  extendDisplayPeriod,
  setDisplayPeriod,
  transferTicketCount,
  setNotice,
  setLinkedInvitationCards,
  formatDateLabel,
}: UseTicketOperationsOptions) {
  const { runHighRiskAction } = useAuth();
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [isExtendingDisplayPeriod, setIsExtendingDisplayPeriod] = useState(false);
  const [isTransferringTickets, setIsTransferringTickets] = useState(false);
  const [ticketTransferTargetSlug, setTicketTransferTargetSlug] = useState<string | null>(null);
  const [ticketTransferCount, setTicketTransferCount] = useState(1);

  const ticketTransferTargetCards = useMemo(
    () => additionalLinkedInvitationCards.filter((item) => Boolean(item.session)),
    [additionalLinkedInvitationCards]
  );

  const selectedTicketTransferTargetCard = useMemo(
    () =>
      ticketTransferTargetCards.find((item) => item.slug === ticketTransferTargetSlug) ??
      ticketTransferTargetCards[0] ??
      null,
    [ticketTransferTargetCards, ticketTransferTargetSlug]
  );

  const ticketTransferCountOptions = useMemo(() => {
    const availableTicketCount = activeLinkedInvitationCard?.ticketCount ?? 0;
    const cappedCount = Math.min(availableTicketCount, 5);
    const options = Array.from({ length: cappedCount }, (_, index) => index + 1);

    if (availableTicketCount > 5) {
      options.push(availableTicketCount);
    }

    return options;
  }, [activeLinkedInvitationCard?.ticketCount]);

  const upgradeTargetPlan = useMemo<MobileInvitationProductTier | null>(() => {
    if (!activeLinkedInvitationCard) {
      return null;
    }

    if (activeLinkedInvitationCard.productTier === 'standard') {
      return 'deluxe';
    }

    if (activeLinkedInvitationCard.productTier === 'deluxe') {
      return 'premium';
    }

    return null;
  }, [activeLinkedInvitationCard]);

  useEffect(() => {
    if (ticketTransferTargetCards.length === 0) {
      setTicketTransferTargetSlug(null);
      setTicketTransferCount(1);
      return;
    }

    if (
      !ticketTransferTargetSlug ||
      !ticketTransferTargetCards.some((item) => item.slug === ticketTransferTargetSlug)
    ) {
      setTicketTransferTargetSlug(ticketTransferTargetCards[0]?.slug ?? null);
    }
  }, [ticketTransferTargetCards, ticketTransferTargetSlug]);

  useEffect(() => {
    const availableTicketCount = activeLinkedInvitationCard?.ticketCount ?? 0;
    if (availableTicketCount <= 0) {
      setTicketTransferCount(1);
      return;
    }

    setTicketTransferCount((current) => Math.max(1, Math.min(current, availableTicketCount)));
  }, [activeLinkedInvitationCard?.ticketCount]);

  const handleOpenTicketModal = () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    setTicketTransferCount(1);
    setTicketTransferTargetSlug(ticketTransferTargetCards[0]?.slug ?? null);
    setTicketModalVisible(true);
  };

  const closeTicketModal = () => {
    setTicketModalVisible(false);
  };

  const handleExtendDisplayPeriod = async () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < 1) {
      setNotice('노출 기간 1개월 연장에는 티켓 1장이 필요합니다. 먼저 티켓을 구매해 주세요.');
      return;
    }

    const previousDisplayPeriod = activeLinkedInvitationCard.displayPeriod;
    await runHighRiskAction(
      {
        title: '노출 기간을 연장할까요?',
        description:
          '노출 기간 연장은 티켓을 차감하는 민감한 작업입니다. 로그인 세션을 다시 확인한 뒤 진행합니다.',
        confirmLabel: '연장하기',
      },
      async () => {
        setIsExtendingDisplayPeriod(true);
        const displayPeriodResult = await extendDisplayPeriod(1);

        if (!displayPeriodResult) {
          setIsExtendingDisplayPeriod(false);
          return false;
        }

        const nextTicketCount = await adjustTicketCount(-1);
        if (nextTicketCount === null) {
          const rolledBack = await setDisplayPeriod(previousDisplayPeriod);
          setIsExtendingDisplayPeriod(false);
          setNotice(
            rolledBack
              ? '티켓 차감이 실패해 노출 기간 연장을 취소했습니다.'
              : '티켓 차감이 실패했고 노출 기간 롤백도 확인하지 못했습니다. 운영 화면에서 상태를 다시 확인해 주세요.'
          );
          return false;
        }

        const endDateLabel = displayPeriodResult.endDate
          ? formatDateLabel(displayPeriodResult.endDate)
          : '종료일 확인 필요';

        setIsExtendingDisplayPeriod(false);
        setTicketModalVisible(false);
        setNotice(`노출 기간을 1개월 연장했습니다. 새 종료일은 ${endDateLabel}입니다.`);
        return true;
      }
    );
  };

  const handleTransferTicketCount = async () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (!selectedTicketTransferTargetCard?.session) {
      setNotice('티켓을 이동할 다른 연동 청첩장을 먼저 선택해 주세요.');
      return;
    }
    const targetSession = selectedTicketTransferTargetCard.session;

    if (ticketTransferCount <= 0) {
      setNotice('이동할 티켓 수량을 먼저 선택해 주세요.');
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < ticketTransferCount) {
      setNotice('보유 티켓보다 많은 수량은 이동할 수 없습니다.');
      return;
    }

    await runHighRiskAction(
      {
        title: '티켓을 이동할까요?',
        description:
          '티켓 이동은 결제 상태에 영향을 주는 민감한 작업입니다. 로그인 세션을 다시 확인한 뒤 진행합니다.',
        confirmLabel: '이동하기',
      },
      async () => {
        setIsTransferringTickets(true);
        const transferResult = await transferTicketCount(
          selectedTicketTransferTargetCard.slug,
          targetSession.token,
          ticketTransferCount
        );
        setIsTransferringTickets(false);

        if (!transferResult) {
          return false;
        }

        setLinkedInvitationCards((current) =>
          current.map((item) => {
            if (item.slug === activeLinkedInvitationCard.slug) {
              return {
                ...item,
                ticketCount: transferResult.sourceTicketCount,
                updatedAt: Date.now(),
              };
            }

            if (item.slug === selectedTicketTransferTargetCard.slug) {
              return {
                ...item,
                ticketCount: transferResult.targetTicketCount,
                updatedAt: Date.now(),
              };
            }

            return item;
          })
        );

        setTicketModalVisible(false);
        setNotice(
          `티켓 ${ticketTransferCount}장을 ${
            selectedTicketTransferTargetCard.displayName.trim() ||
            selectedTicketTransferTargetCard.slug
          } 청첩장으로 이동했습니다.`
        );
        return true;
      }
    );
  };

  return {
    ticketModalVisible,
    isExtendingDisplayPeriod,
    isTransferringTickets,
    ticketTransferTargetCards,
    selectedTicketTransferTargetCard,
    ticketTransferCount,
    ticketTransferCountOptions,
    upgradeTargetPlan,
    setTicketTransferTargetSlug,
    setTicketTransferCount,
    handleOpenTicketModal,
    closeTicketModal,
    handleExtendDisplayPeriod,
    handleTransferTicketCount,
  };
}
