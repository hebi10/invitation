import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { useAuth } from '../../../contexts/AuthContext';
import type { useInvitationOps } from '../../../contexts/InvitationOpsContext';
import { fulfillMobileBillingTicketPack } from '../../../lib/api';
import { purchaseBillingProduct } from '../../../lib/billing';
import { getMobileBillingTicketPackProductId } from '../../../lib/mobileBillingProducts';
import {
  buildLinkedInvitationCardFromPageSummary,
  getLinkedInvitationCards,
  mergeLinkedInvitationCard,
  setLinkedInvitationCards as persistLinkedInvitationCards,
  type LinkedInvitationCard,
} from '../../../lib/linkedInvitationCards';
import {
  calculateTicketPrice,
  getAdjacentSupportedTicketCount,
  isPurchasableTicketPackCount,
  normalizeSupportedCreateTicketCount,
  TICKET_UNIT_PRICE,
} from '../shared';
import type { TicketPurchaseSuccessState } from '../shared';

type AuthState = Pick<
  ReturnType<typeof useAuth>,
  'clearAuthError' | 'customerSession' | 'session'
>;
type InvitationOpsState = Pick<
  ReturnType<typeof useInvitationOps>,
  'pageSummary' | 'refreshDashboard'
>;

type UseCreateTicketPurchaseOptions = AuthState &
  InvitationOpsState & {
    apiBaseUrl: string;
    setNotice: (message: string) => void;
  };

export function useCreateTicketPurchase({
  apiBaseUrl,
  pageSummary,
  session,
  customerSession,
  refreshDashboard,
  clearAuthError,
  setNotice,
}: UseCreateTicketPurchaseOptions) {
  const [ticketOnlyCount, setTicketOnlyCount] = useState(0);
  const [ticketOnlyModalVisible, setTicketOnlyModalVisible] = useState(false);
  const [linkedInvitationCards, setLinkedInvitationCards] = useState<LinkedInvitationCard[]>([]);
  const [selectedTicketTargetSlug, setSelectedTicketTargetSlug] = useState<string | null>(null);
  const [isTicketPurchaseSubmitting, setIsTicketPurchaseSubmitting] = useState(false);
  const [ticketPurchaseSuccess, setTicketPurchaseSuccess] =
    useState<TicketPurchaseSuccessState | null>(null);
  const ticketPrice = calculateTicketPrice(ticketOnlyCount);

  const reloadLinkedInvitationCards = useCallback(async () => {
    const storedCards = await getLinkedInvitationCards();
    let nextCards = storedCards.filter((item) => item.session);

    if (pageSummary && session) {
      const currentCard = buildLinkedInvitationCardFromPageSummary(pageSummary, {
        updatedAt: Date.now(),
        ticketCount: pageSummary.ticketCount,
        session,
      });
      const existing = nextCards.find((item) => item.slug === currentCard.slug);
      const mergedCurrentCard = mergeLinkedInvitationCard(existing, currentCard);

      nextCards = [
        mergedCurrentCard,
        ...nextCards.filter((item) => item.slug !== mergedCurrentCard.slug),
      ];
      await persistLinkedInvitationCards(nextCards);
    }

    setLinkedInvitationCards(nextCards);
  }, [pageSummary, session]);

  const selectedTicketTargetCard = useMemo(
    () =>
      linkedInvitationCards.find((item) => item.slug === selectedTicketTargetSlug) ??
      linkedInvitationCards[0] ??
      null,
    [linkedInvitationCards, selectedTicketTargetSlug]
  );
  const hasLinkedInvitation = Boolean(selectedTicketTargetCard);
  const storedTicketCount = selectedTicketTargetCard?.ticketCount ?? 0;
  const ticketTargetOptions = useMemo(
    () =>
      linkedInvitationCards.map((item) => ({
        slug: item.slug,
        displayName: item.displayName.trim() || item.slug,
      })),
    [linkedInvitationCards]
  );
  const selectedTargetLabel =
    selectedTicketTargetCard?.displayName?.trim() ||
    selectedTicketTargetCard?.slug ||
    '연동된 청첩장이 필요합니다';

  useFocusEffect(
    useCallback(() => {
      void reloadLinkedInvitationCards();
    }, [reloadLinkedInvitationCards])
  );

  useEffect(() => {
    if (linkedInvitationCards.length === 0) {
      setSelectedTicketTargetSlug(null);
      return;
    }

    if (
      !selectedTicketTargetSlug ||
      !linkedInvitationCards.some((item) => item.slug === selectedTicketTargetSlug)
    ) {
      setSelectedTicketTargetSlug(linkedInvitationCards[0]?.slug ?? null);
    }
  }, [linkedInvitationCards, selectedTicketTargetSlug]);

  const updateTicketOnlyCount = useCallback((value: number) => {
    setTicketOnlyCount(normalizeSupportedCreateTicketCount(value));
  }, []);

  const decreaseTicketOnlyCount = useCallback(() => {
    setTicketOnlyCount((currentCount) =>
      getAdjacentSupportedTicketCount(currentCount, 'decrease')
    );
  }, []);

  const increaseTicketOnlyCount = useCallback(() => {
    setTicketOnlyCount((currentCount) =>
      getAdjacentSupportedTicketCount(currentCount, 'increase')
    );
  }, []);

  const resetTicketOnlyCount = useCallback(() => {
    setTicketOnlyCount(0);
  }, []);

  const handleOpenTicketOnlyModal = useCallback(() => {
    clearAuthError();

    if (!selectedTicketTargetCard?.session) {
      setNotice('연동된 청첩장이 있을 때만 티켓만 구매할 수 있습니다. 먼저 페이지를 연동해 주세요.');
      return;
    }

    if (!customerSession) {
      setNotice('고객 계정으로 로그인한 뒤 티켓을 구매해 주세요.');
      return;
    }

    if (ticketOnlyCount <= 0) {
      setNotice('티켓만 구매하려면 먼저 티켓 수량을 선택해 주세요.');
      return;
    }

    setNotice('');
    setTicketOnlyModalVisible(true);
  }, [
    clearAuthError,
    customerSession,
    selectedTicketTargetCard,
    setNotice,
    ticketOnlyCount,
  ]);

  const closeTicketOnlyModal = useCallback(() => {
    setTicketOnlyModalVisible(false);
  }, []);

  const closeTicketPurchaseSuccess = useCallback(() => {
    setTicketPurchaseSuccess(null);
  }, []);

  const handleConfirmTicketOnlyPurchase = useCallback(async () => {
    clearAuthError();
    setNotice('');

    if (!selectedTicketTargetCard?.session) {
      setNotice('연동된 청첩장이 없어서 티켓을 적립할 수 없습니다. 먼저 페이지를 연동해 주세요.');
      return;
    }

    if (!customerSession) {
      setNotice('고객 계정으로 로그인한 뒤 티켓을 구매해 주세요.');
      return;
    }

    if (!isPurchasableTicketPackCount(ticketOnlyCount)) {
      setNotice('Google Play Billing에서는 1장, 3장, 6장 티켓 상품만 구매할 수 있습니다.');
      return;
    }

    const purchaseTargetDisplayName =
      selectedTicketTargetCard.displayName.trim() || selectedTicketTargetCard.slug;

    setIsTicketPurchaseSubmitting(true);

    const billingProductId = getMobileBillingTicketPackProductId(ticketOnlyCount);
    let nextTicketCount: number | null = null;

    try {
      const purchase = await purchaseBillingProduct(billingProductId, {
        appUserId: customerSession.uid,
      });
      const fulfillment = await fulfillMobileBillingTicketPack(apiBaseUrl, {
        purchase: {
          appUserId: purchase.appUserId,
          productId: purchase.productIdentifier,
          transactionId: purchase.transactionIdentifier,
        },
        targetPageSlug: selectedTicketTargetCard.slug,
        targetToken: selectedTicketTargetCard.session.token,
      });

      nextTicketCount = fulfillment.ticketCount;
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : '티켓 결제를 진행하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      );
    }

    setIsTicketPurchaseSubmitting(false);

    if (nextTicketCount === null) {
      return;
    }

    const nextLinkedInvitationCards = linkedInvitationCards.map((item) =>
      item.slug === selectedTicketTargetCard.slug
        ? {
            ...item,
            ticketCount: nextTicketCount,
            updatedAt: Date.now(),
          }
        : item
    );

    setLinkedInvitationCards(nextLinkedInvitationCards);
    await persistLinkedInvitationCards(nextLinkedInvitationCards);

    if (session && selectedTicketTargetCard.slug === session.pageSlug) {
      await refreshDashboard();
    }

    setTicketOnlyModalVisible(false);
    resetTicketOnlyCount();
    setTicketPurchaseSuccess({
      ticketCount: ticketOnlyCount,
      targetDisplayName: purchaseTargetDisplayName,
      nextTicketCount,
    });
  }, [
    apiBaseUrl,
    clearAuthError,
    customerSession,
    linkedInvitationCards,
    refreshDashboard,
    resetTicketOnlyCount,
    selectedTicketTargetCard,
    session,
    setNotice,
    ticketOnlyCount,
  ]);

  return {
    ticketOnlyCount,
    updateTicketOnlyCount,
    decreaseTicketOnlyCount,
    increaseTicketOnlyCount,
    ticketUnitPrice: TICKET_UNIT_PRICE,
    ticketPrice,
    ticketOnlyModalVisible,
    closeTicketOnlyModal,
    handleOpenTicketOnlyModal,
    handleConfirmTicketOnlyPurchase,
    isTicketPurchaseSubmitting,
    ticketPurchaseSuccess,
    closeTicketPurchaseSuccess,
    hasLinkedInvitation,
    storedTicketCount,
    selectedTicketTargetCard,
    ticketTargetOptions,
    selectedTargetLabel,
    selectedTicketTargetSlug,
    setSelectedTicketTargetSlug,
  };
}
