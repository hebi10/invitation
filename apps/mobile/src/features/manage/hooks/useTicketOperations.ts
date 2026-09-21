import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../../contexts/AuthContext';
import { usePreferences } from '../../../contexts/PreferencesContext';
import { completeTicketExtensionRequest, getOrCreateTicketExtensionRequest } from '../../../lib/pendingTicketExtension';
import type { LinkedInvitationCard } from '../../../lib/linkedInvitationCardsModel';
import type {
  MobileDisplayPeriodSummary,
} from '../../../types/mobileInvitation';
type UseTicketOperationsOptions = {
  activeLinkedInvitationCard: LinkedInvitationCard | null;
  additionalLinkedInvitationCards: LinkedInvitationCard[];
  extendDisplayPeriod: (
    requestId: string
  ) => Promise<(MobileDisplayPeriodSummary & { ticketCount: number }) | null>;
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
  extendDisplayPeriod,
  transferTicketCount,
  setNotice,
  setLinkedInvitationCards,
  formatDateLabel,
}: UseTicketOperationsOptions) {
  const { runHighRiskAction, customerSession, session } = useAuth();
  const { apiBaseUrl } = usePreferences();
  const extensionInFlight = useRef(false);
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

    setNotice('');
    setTicketTransferCount(1);
    setTicketTransferTargetSlug(ticketTransferTargetCards[0]?.slug ?? null);
    setTicketModalVisible(true);
  };

  const closeTicketModal = () => {
    setTicketModalVisible(false);
  };

  const handleExtendDisplayPeriod = async () => {
    if (!activeLinkedInvitationCard || !session || extensionInFlight.current) {
      return;
    }
    const scope = JSON.stringify([apiBaseUrl, activeLinkedInvitationCard.slug, customerSession?.uid ?? session.token]);
    await runHighRiskAction(
      {
        title: '노출 기간을 연장할까요?',
        description:
          '티켓 1장을 사용해 노출 기간을 1개월 연장합니다. 응답을 받지 못한 요청은 같은 요청으로 다시 확인합니다.',
        confirmLabel: '연장하기',
      },
      async () => {
        if (extensionInFlight.current) return false;
        extensionInFlight.current = true;
        setIsExtendingDisplayPeriod(true);
        try {
          const requestId = await getOrCreateTicketExtensionRequest(scope);
          const result = await extendDisplayPeriod(requestId);
          if (!result) {
            setNotice('기간 연장 결과를 확인하지 못했습니다. 다시 연장하기를 누르면 같은 요청을 확인하며, 티켓을 중복 차감하지 않습니다.');
            return false;
          }
          await completeTicketExtensionRequest(scope, requestId);
          const endDateLabel = result.endDate ? formatDateLabel(result.endDate) : '종료일 확인 필요';
          setTicketModalVisible(false);
          setNotice(`노출 기간 연장을 확인했습니다. 종료일은 ${endDateLabel}이며 남은 티켓은 ${result.ticketCount}장입니다.`);
          return true;
        } catch {
          setNotice('연장 요청을 안전하게 저장하거나 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          return false;
        } finally {
          extensionInFlight.current = false;
          setIsExtendingDisplayPeriod(false);
        }
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
    setTicketTransferTargetSlug,
    setTicketTransferCount,
    handleOpenTicketModal,
    closeTicketModal,
    handleExtendDisplayPeriod,
    handleTransferTicketCount,
  };
}
