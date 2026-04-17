import { useEffect, useMemo, useState } from 'react';

import type { LinkedInvitationCard } from '../../../lib/linkedInvitationCards';
import type {
  MobileDisplayPeriodSummary,
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
  ) => Promise<MobileDisplayPeriodSummary | null>;
  setDisplayPeriod: (
    period: MobileDisplayPeriodSummary
  ) => Promise<MobileDisplayPeriodSummary | null>;
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

function getThemeLabel(themeKey: MobileInvitationThemeKey) {
  return themeKey === 'emotional' ? '감성형' : '심플형';
}

export function useTicketOperations({
  activeLinkedInvitationCard,
  additionalLinkedInvitationCards,
  dashboardVariants,
  invitationForm,
  adjustTicketCount,
  extendDisplayPeriod,
  setDisplayPeriod,
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

    const previousTheme = activeLinkedInvitationCard.defaultTheme;
    invitationForm.setDefaultTheme(ticketThemeSelection);
    setIsApplyingTicketThemeChange(true);

    const saved = await invitationForm.persistForm({
      suppressNotice: true,
    });

    if (!saved) {
      invitationForm.setDefaultTheme(previousTheme);
      setIsApplyingTicketThemeChange(false);
      return;
    }

    const nextTicketCount = await adjustTicketCount(-1);
    if (nextTicketCount === null) {
      invitationForm.setDefaultTheme(previousTheme);
      const rolledBack = await invitationForm.persistForm({
        suppressNotice: true,
      });
      setIsApplyingTicketThemeChange(false);
      setNotice(
        rolledBack
          ? '티켓 차감에 실패해 기본 디자인 변경을 취소했습니다.'
          : '티켓 차감에 실패했고 기본 디자인 변경 롤백을 확인하지 못했습니다. 새로고침 후 상태를 확인해 주세요.'
      );
      return;
    }

    setIsApplyingTicketThemeChange(false);
    setTicketModalVisible(false);
    setNotice(`기본 디자인을 ${getThemeLabel(ticketThemeSelection)}으로 변경했습니다.`);
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
    setIsExtendingDisplayPeriod(true);
    const displayPeriodResult = await extendDisplayPeriod(1);

    if (!displayPeriodResult) {
      setIsExtendingDisplayPeriod(false);
      return;
    }

    const nextTicketCount = await adjustTicketCount(-1);
    if (nextTicketCount === null) {
      const rolledBack = await setDisplayPeriod(previousDisplayPeriod);
      setIsExtendingDisplayPeriod(false);
      setNotice(
        rolledBack
          ? '티켓 차감에 실패해 노출 기간 연장을 취소했습니다.'
          : '티켓 차감에 실패했고 노출 기간 롤백을 확인하지 못했습니다. 새로고침 후 상태를 확인해 주세요.'
      );
      return;
    }

    const endDateLabel = displayPeriodResult.endDate
      ? formatDateLabel(displayPeriodResult.endDate)
      : '종료일 확인 필요';

    setIsExtendingDisplayPeriod(false);
    setTicketModalVisible(false);
    setNotice(`노출 기간을 1개월 연장했습니다. 새 종료일은 ${endDateLabel}입니다.`);
  };

  const handleAddExtraVariant = async () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (isAlternateThemeAvailable) {
      setNotice(`이미 ${getThemeLabel(alternateTheme)} 디자인이 추가되어 있습니다.`);
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < 2) {
      setNotice('다른 디자인 추가에는 티켓 2장이 필요합니다. 먼저 티켓을 구매해 주세요.');
      return;
    }

    setIsApplyingExtraVariant(true);
    const saved = await setVariantAvailability(alternateTheme, true);

    if (!saved) {
      setIsApplyingExtraVariant(false);
      return;
    }

    const nextTicketCount = await adjustTicketCount(-2);
    if (nextTicketCount === null) {
      const rolledBack = await setVariantAvailability(alternateTheme, false);
      setIsApplyingExtraVariant(false);
      setNotice(
        rolledBack
          ? '티켓 차감에 실패해 추가 디자인 적용을 취소했습니다.'
          : '티켓 차감에 실패했고 추가 디자인 롤백을 확인하지 못했습니다. 새로고침 후 상태를 확인해 주세요.'
      );
      return;
    }

    setIsApplyingExtraVariant(false);
    setTicketModalVisible(false);
    setNotice(`같은 청첩장에 ${getThemeLabel(alternateTheme)} 디자인을 추가했습니다.`);
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
