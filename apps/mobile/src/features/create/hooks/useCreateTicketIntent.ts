import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import {
  isValidCreateStepThemeKey,
  type CreateStepKey,
} from '../shared';

type UseCreateTicketIntentOptions = {
  setSelectedPlan: (plan: MobileInvitationProductTier) => void;
  setSelectedTheme: (theme: MobileInvitationThemeKey | null) => void;
  setNotice: (message: string) => void;
  moveToStep: (step: CreateStepKey) => void;
  onOpenTicketPurchase: () => void;
};

export function useCreateTicketIntent({
  setSelectedPlan,
  setSelectedTheme,
  setNotice,
  moveToStep,
  onOpenTicketPurchase,
}: UseCreateTicketIntentOptions) {
  const {
    ticketIntent: ticketIntentParam,
    targetPlan: targetPlanParam,
    targetTheme: targetThemeParam,
  } = useLocalSearchParams<{
    ticketIntent?: string | string[];
    targetPlan?: string | string[];
    targetTheme?: string | string[];
  }>();

  const normalizedTicketIntent = Array.isArray(ticketIntentParam)
    ? ticketIntentParam[0]
    : ticketIntentParam;
  const normalizedTargetPlan = Array.isArray(targetPlanParam)
    ? targetPlanParam[0]
    : targetPlanParam;
  const normalizedTargetTheme = Array.isArray(targetThemeParam)
    ? targetThemeParam[0]
    : targetThemeParam;

  const [handledTicketIntentKey, setHandledTicketIntentKey] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedTicketIntent) {
      setHandledTicketIntentKey(null);
      return;
    }

    const intentKey = [
      normalizedTicketIntent,
      normalizedTargetPlan ?? '',
      normalizedTargetTheme ?? '',
    ].join(':');

    if (handledTicketIntentKey === intentKey) {
      return;
    }

    if (normalizedTicketIntent === 'extra-variant' || normalizedTicketIntent === 'theme-change') {
      setNotice('모든 웨딩 디자인은 별도 티켓 없이 디자인별 주소로 열 수 있습니다.');
      setHandledTicketIntentKey(intentKey);
      return;
    }

    if (normalizedTicketIntent === 'upgrade') {
      setNotice('모든 청첩장은 프리미엄 기능을 제공합니다. 별도 업그레이드는 필요하지 않습니다.');
      setHandledTicketIntentKey(intentKey);
      return;
    }
    if (normalizedTicketIntent === 'extend') {
      setNotice('기간 연장에 필요한 티켓 수량을 선택해 주세요.');
      onOpenTicketPurchase();
      setHandledTicketIntentKey(intentKey);
      return;
    }
    setSelectedPlan('premium');

    if (isValidCreateStepThemeKey(normalizedTargetTheme)) {
      setSelectedTheme(normalizedTargetTheme);
    }

    if (normalizedTicketIntent === 'extra-page') {
      setNotice('티켓 사용: 추가 청첩장 생성 흐름으로 이동했습니다.');
    }

    moveToStep('info');
    setHandledTicketIntentKey(intentKey);
  }, [
    handledTicketIntentKey,
    moveToStep,
    onOpenTicketPurchase,
    normalizedTargetPlan,
    normalizedTargetTheme,
    normalizedTicketIntent,
    setNotice,
    setSelectedPlan,
    setSelectedTheme,
  ]);
}
