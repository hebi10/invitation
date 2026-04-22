import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../contexts/AuthContext';
import {
  getLinkedInvitationThemeKeys,
  type LinkedInvitationCard,
} from '../../../lib/linkedInvitationCardsModel';
import {
  DEFAULT_INVITATION_THEME,
  INVITATION_THEME_KEYS,
  getInvitationThemeLabel,
  getPurchasableInvitationThemeKeys,
} from '../../../lib/invitationThemes';
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

export function resolvePreferredTargetTheme(
  currentTheme: MobileInvitationThemeKey,
  availableThemes: readonly MobileInvitationThemeKey[],
  purchasableThemes: readonly MobileInvitationThemeKey[]
) {
  const availableThemeSet = new Set<MobileInvitationThemeKey>(availableThemes);

  return (
    purchasableThemes.find(
      (themeKey) => themeKey !== currentTheme && availableThemeSet.has(themeKey)
    ) ??
    purchasableThemes.find((themeKey) => !availableThemeSet.has(themeKey)) ??
    purchasableThemes.find((themeKey) => themeKey === currentTheme) ??
    purchasableThemes[0] ??
    currentTheme
  );
}

export function getSelectedTargetThemeState(options: {
  currentTheme: MobileInvitationThemeKey;
  selectedTargetTheme: MobileInvitationThemeKey;
  availableThemes: readonly MobileInvitationThemeKey[];
}) {
  const { currentTheme, selectedTargetTheme, availableThemes } = options;
  const isSelectedTargetThemeCurrent = selectedTargetTheme === currentTheme;
  const isSelectedTargetThemeAvailable = availableThemes.includes(selectedTargetTheme);

  return {
    isSelectedTargetThemeCurrent,
    isSelectedTargetThemeAvailable,
    canApplyThemeChange:
      !isSelectedTargetThemeCurrent && isSelectedTargetThemeAvailable,
    canPurchaseTargetTheme:
      !isSelectedTargetThemeCurrent && !isSelectedTargetThemeAvailable,
  };
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
  const { runHighRiskAction } = useAuth();
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [selectedTargetTheme, setSelectedTargetTheme] =
    useState<MobileInvitationThemeKey>(DEFAULT_INVITATION_THEME);
  const [isExtendingDisplayPeriod, setIsExtendingDisplayPeriod] = useState(false);
  const [isApplyingTicketThemeChange, setIsApplyingTicketThemeChange] = useState(false);
  const [isPurchasingTargetTheme, setIsPurchasingTargetTheme] = useState(false);
  const [isTransferringTickets, setIsTransferringTickets] = useState(false);
  const [ticketTransferTargetSlug, setTicketTransferTargetSlug] = useState<string | null>(null);
  const [ticketTransferCount, setTicketTransferCount] = useState(1);

  const purchasableThemes = useMemo(() => getPurchasableInvitationThemeKeys(), []);

  const currentTheme = activeLinkedInvitationCard?.defaultTheme ?? DEFAULT_INVITATION_THEME;

  const availableThemes = useMemo(() => {
    if (!activeLinkedInvitationCard) {
      return [] as MobileInvitationThemeKey[];
    }

    const themeSet = new Set<MobileInvitationThemeKey>([
      activeLinkedInvitationCard.defaultTheme,
      ...getLinkedInvitationThemeKeys(activeLinkedInvitationCard),
    ]);

    INVITATION_THEME_KEYS.forEach((themeKey) => {
      if (dashboardVariants?.[themeKey]?.available === true) {
        themeSet.add(themeKey);
      }
    });

    return INVITATION_THEME_KEYS.filter((themeKey) => themeSet.has(themeKey));
  }, [activeLinkedInvitationCard, dashboardVariants]);

  const selectedTargetThemeState = useMemo(
    () =>
      getSelectedTargetThemeState({
        currentTheme,
        selectedTargetTheme,
        availableThemes,
      }),
    [availableThemes, currentTheme, selectedTargetTheme]
  );

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
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (purchasableThemes.includes(selectedTargetTheme)) {
      return;
    }

    setSelectedTargetTheme(
      resolvePreferredTargetTheme(currentTheme, availableThemes, purchasableThemes)
    );
  }, [
    activeLinkedInvitationCard,
    availableThemes,
    currentTheme,
    purchasableThemes,
    selectedTargetTheme,
  ]);

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

    setSelectedTargetTheme(
      resolvePreferredTargetTheme(currentTheme, availableThemes, purchasableThemes)
    );
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

    if (selectedTargetThemeState.isSelectedTargetThemeCurrent) {
      setNotice('현재 기본 디자인과 같은 디자인이 선택되어 있습니다.');
      return;
    }

    if (!selectedTargetThemeState.isSelectedTargetThemeAvailable) {
      setNotice(
        '기본 디자인을 바꾸려면 먼저 해당 디자인을 현재 청첩장에 추가해야 합니다.'
      );
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < 1) {
      setNotice('기본 디자인 변경에는 티켓 1장이 필요합니다. 먼저 티켓을 구매해 주세요.');
      return;
    }

    const previousTheme = currentTheme;
    await runHighRiskAction(
      {
        title: '디자인 변경을 진행할까요?',
        description:
          '기본 디자인 변경은 티켓을 차감하는 민감한 작업입니다. 비밀번호를 다시 확인한 뒤 진행합니다.',
        confirmLabel: '변경하기',
      },
      async () => {
        invitationForm.setDefaultTheme(selectedTargetTheme);
        setIsApplyingTicketThemeChange(true);

        const saved = await invitationForm.persistForm({
          suppressNotice: true,
        });

        if (!saved) {
          invitationForm.setDefaultTheme(previousTheme);
          setIsApplyingTicketThemeChange(false);
          return false;
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
              ? '티켓 차감이 실패해 기본 디자인 변경을 취소했습니다.'
              : '티켓 차감이 실패했고 기본 디자인 롤백도 확인하지 못했습니다. 운영 화면에서 상태를 다시 확인해 주세요.'
          );
          return false;
        }

        setIsApplyingTicketThemeChange(false);
        setTicketModalVisible(false);
        setNotice(
          `기본 디자인을 ${getInvitationThemeLabel(selectedTargetTheme)}(으)로 변경했습니다.`
        );
        return true;
      }
    );
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
          '노출 기간 연장은 티켓을 차감하는 민감한 작업입니다. 비밀번호를 다시 확인한 뒤 진행합니다.',
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

  const handlePurchaseTargetTheme = async () => {
    if (!activeLinkedInvitationCard) {
      return;
    }

    if (selectedTargetThemeState.isSelectedTargetThemeCurrent) {
      setNotice('현재 기본 디자인은 추가 구매 대상이 아닙니다.');
      return;
    }

    if (selectedTargetThemeState.isSelectedTargetThemeAvailable) {
      setNotice(
        `이미 ${getInvitationThemeLabel(selectedTargetTheme)} 디자인을 현재 청첩장에서 사용할 수 있습니다.`
      );
      return;
    }

    if (activeLinkedInvitationCard.ticketCount < 2) {
      setNotice('다른 디자인 추가에는 티켓 2장이 필요합니다. 먼저 티켓을 구매해 주세요.');
      return;
    }

    await runHighRiskAction(
      {
        title: '디자인을 추가할까요?',
        description:
          '새 디자인 추가는 티켓을 차감하는 민감한 작업입니다. 비밀번호를 다시 확인한 뒤 진행합니다.',
        confirmLabel: '추가하기',
      },
      async () => {
        setIsPurchasingTargetTheme(true);
        const saved = await setVariantAvailability(selectedTargetTheme, true);

        if (!saved) {
          setIsPurchasingTargetTheme(false);
          return false;
        }

        const nextTicketCount = await adjustTicketCount(-2);
        if (nextTicketCount === null) {
          const rolledBack = await setVariantAvailability(selectedTargetTheme, false);
          setIsPurchasingTargetTheme(false);
          setNotice(
            rolledBack
              ? '티켓 차감이 실패해 추가 디자인 적용을 취소했습니다.'
              : '티켓 차감이 실패했고 추가 디자인 롤백도 확인하지 못했습니다. 운영 화면에서 상태를 다시 확인해 주세요.'
          );
          return false;
        }

        setIsPurchasingTargetTheme(false);
        setTicketModalVisible(false);
        setNotice(
          `현재 청첩장에 ${getInvitationThemeLabel(selectedTargetTheme)} 디자인을 추가했습니다.`
        );
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
          '티켓 이동은 결제 상태에 영향을 주는 민감한 작업입니다. 비밀번호를 다시 확인한 뒤 진행합니다.',
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
    currentTheme,
    availableThemes,
    purchasableThemes,
    selectedTargetTheme,
    isExtendingDisplayPeriod,
    isApplyingTicketThemeChange,
    isPurchasingTargetTheme,
    isSelectedTargetThemeAvailable:
      selectedTargetThemeState.isSelectedTargetThemeAvailable,
    isSelectedTargetThemeCurrent:
      selectedTargetThemeState.isSelectedTargetThemeCurrent,
    isTransferringTickets,
    ticketTransferTargetCards,
    selectedTicketTransferTargetCard,
    ticketTransferCount,
    ticketTransferCountOptions,
    upgradeTargetPlan,
    setSelectedTargetTheme,
    setTicketTransferTargetSlug,
    setTicketTransferCount,
    handleOpenTicketModal,
    closeTicketModal,
    handleApplyTicketThemeChange,
    handleExtendDisplayPeriod,
    handlePurchaseTargetTheme,
    handleTransferTicketCount,
  };
}
