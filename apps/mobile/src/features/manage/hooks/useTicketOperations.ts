import { useEffect, useMemo, useState } from 'react';

import type { LinkedInvitationCard } from '../../../lib/linkedInvitationCards';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import type { useInvitationForm } from './useInvitationForm';

type InvitationFormActions = Pick<
  ReturnType<typeof useInvitationForm>,
  'persistForm' | 'setDefaultTheme'
>;

type UseTicketOperationsOptions = {
  activeLinkedInvitationCard: LinkedInvitationCard | null;
  additionalLinkedInvitationCards: LinkedInvitationCard[];
  dashboardVariants:
    | Partial<Record<MobileInvitationThemeKey, { available?: boolean }>>
    | undefined;
  invitationForm: InvitationFormActions;
  adjustTicketCount: (amount: number) => Promise<number | null>;
  extendDisplayPeriod: (
    months?: number
  ) => Promise<{ startDate: string; endDate: string } | null>;
  setVariantAvailability: (
    variantKey: MobileInvitationThemeKey,
    available: boolean
  ) => Promise<boolean>;
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
  dashboardVariants,
  invitationForm,
  adjustTicketCount,
  extendDisplayPeriod,
  setVariantAvailability,
  transferTicketCount,
  setNotice,
  setLinkedInvitationCards,
  formatDateLabel,
}: UseTicketOperationsOptions) {
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketThemeSelection, setTicketThemeSelection] =
    useState<MobileInvitationThemeKey>('emotional');
  const [isExtendingDisplayPeriod, setIsExtendingDisplayPeriod] = useState(false);
  const [isApplyingTicketThemeChange, setIsApplyingTicketThemeChange] = useState(false);
  const [isApplyingExtraVariant, setIsApplyingExtraVariant] = useState(false);
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

  const alternateTheme = useMemo<MobileInvitationThemeKey>(
    () => (activeLinkedInvitationCard?.defaultTheme === 'emotional' ? 'simple' : 'emotional'),
    [activeLinkedInvitationCard?.defaultTheme]
  );

  const isAlternateThemeAvailable = useMemo(() => {
    const targetVariant = dashboardVariants?.[alternateTheme];
    return targetVariant?.available === true;
  }, [alternateTheme, dashboardVariants]);

  useEffect(() => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    setTicketThemeSelection(activeLinkedInvitationCard.defaultTheme);
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

    setTicketThemeSelection(activeLinkedInvitationCard.defaultTheme);
    setTicketTransferCount(1);
    setTicketTransferTargetSlug(ticketTransferTargetCards[0]?.slug ?? null);
    setTicketModalVisible(true);
  };

  const closeTicketModal = () => {
    setTicketModalVisible(false);
  };

  const handleApplyTicketThemeChange = async () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (ticketThemeSelection === activeLinkedInvitationCard.defaultTheme) {
      setNotice('현재 기본 디자인과 같은 테마가 선택되어 있습니다.');
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < 1) {
      setNotice('디자인 변경에는 티켓 1장이 필요합니다. 먼저 티켓을 구매해 주세요.');
      return;
    }

    invitationForm.setDefaultTheme(ticketThemeSelection);
    setIsApplyingTicketThemeChange(true);

    const saved = await invitationForm.persistForm({
      notice: `기본 디자인을 ${
        ticketThemeSelection === 'emotional' ? '감성형' : '심플형'
      }으로 변경했습니다.`,
    });

    setIsApplyingTicketThemeChange(false);

    if (!saved) {
      return;
    }

    const nextTicketCount = await adjustTicketCount(-1);
    if (nextTicketCount === null) {
      return;
    }

    setTicketModalVisible(false);
  };

  const handleExtendDisplayPeriod = async () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < 1) {
      setNotice('기간을 1개월 연장하려면 티켓 1장이 필요합니다. 먼저 티켓을 구매해 주세요.');
      return;
    }

    setIsExtendingDisplayPeriod(true);
    const displayPeriodResult = await extendDisplayPeriod(1);
    setIsExtendingDisplayPeriod(false);

    if (!displayPeriodResult) {
      return;
    }

    const nextTicketCount = await adjustTicketCount(-1);
    if (nextTicketCount === null) {
      return;
    }

    setTicketModalVisible(false);
    setNotice(
      `노출 기간을 1개월 연장했습니다. 새 종료일은 ${formatDateLabel(
        displayPeriodResult.endDate
      )}입니다.`
    );
  };

  const handleAddExtraVariant = async () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (isAlternateThemeAvailable) {
      setNotice(
        `이미 ${alternateTheme === 'emotional' ? '감성형' : '심플형'} 디자인이 추가되어 있습니다.`
      );
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < 2) {
      setNotice('다른 디자인 추가에는 티켓 2장이 필요합니다. 먼저 티켓을 구매해 주세요.');
      return;
    }

    setIsApplyingExtraVariant(true);
    const saved = await setVariantAvailability(alternateTheme, true);
    setIsApplyingExtraVariant(false);

    if (!saved) {
      return;
    }

    const nextTicketCount = await adjustTicketCount(-2);
    if (nextTicketCount === null) {
      return;
    }

    setTicketModalVisible(false);
    setNotice(
      `같은 청첩장에 ${
        alternateTheme === 'emotional' ? '감성형' : '심플형'
      } 디자인을 추가했습니다.`
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

    if (ticketTransferCount <= 0) {
      setNotice('이동할 티켓 수량을 먼저 선택해 주세요.');
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < ticketTransferCount) {
      setNotice('보유 티켓보다 많은 수량은 이동할 수 없습니다.');
      return;
    }

    setIsTransferringTickets(true);
    const transferResult = await transferTicketCount(
      selectedTicketTransferTargetCard.slug,
      selectedTicketTransferTargetCard.session.token,
      ticketTransferCount
    );
    setIsTransferringTickets(false);

    if (!transferResult) {
      return;
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
  };

  return {
    ticketModalVisible,
    ticketThemeSelection,
    isExtendingDisplayPeriod,
    isApplyingTicketThemeChange,
    isApplyingExtraVariant,
    isTransferringTickets,
    ticketTransferTargetCards,
    selectedTicketTransferTargetCard,
    ticketTransferCount,
    ticketTransferCountOptions,
    upgradeTargetPlan,
    alternateTheme,
    isAlternateThemeAvailable,
    setTicketThemeSelection,
    setTicketTransferTargetSlug,
    setTicketTransferCount,
    handleOpenTicketModal,
    closeTicketModal,
    handleApplyTicketThemeChange,
    handleExtendDisplayPeriod,
    handleAddExtraVariant,
    handleTransferTicketCount,
  };
}
