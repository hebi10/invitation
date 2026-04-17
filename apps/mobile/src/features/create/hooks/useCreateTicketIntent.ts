import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import {
  isValidCreateStepProductTier,
  isValidCreateStepThemeKey,
  type CreateStepKey,
} from '../shared';

type UseCreateTicketIntentOptions = {
  setSelectedPlan: (plan: MobileInvitationProductTier) => void;
  setSelectedTheme: (theme: MobileInvitationThemeKey | null) => void;
  setNotice: (message: string) => void;
  moveToStep: (step: CreateStepKey) => void;
};

export function useCreateTicketIntent({
  setSelectedPlan,
  setSelectedTheme,
  setNotice,
  moveToStep,
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

    if (isValidCreateStepProductTier(normalizedTargetPlan)) {
      setSelectedPlan(normalizedTargetPlan);
    }

    if (isValidCreateStepThemeKey(normalizedTargetTheme)) {
      setSelectedTheme(normalizedTargetTheme);
    }

    if (normalizedTicketIntent === 'extend') {
      setNotice('티켓 사용: 기간 1개월 연장 준비를 위해 구매 탭으로 이동했습니다.');
    } else if (normalizedTicketIntent === 'extra-page') {
      setNotice('티켓 사용: 추가 청첩장 생성 흐름으로 이동했습니다.');
    } else if (normalizedTicketIntent === 'extra-variant') {
      setNotice('티켓 사용: 같은 청첩장에 다른 디자인을 추가하는 구매 흐름으로 이동했습니다.');
    } else if (normalizedTicketIntent === 'upgrade') {
      setNotice('티켓 사용: 서비스 업그레이드 구매 흐름으로 이동했습니다.');
    }

    moveToStep('ticket');
    setHandledTicketIntentKey(intentKey);
  }, [
    handledTicketIntentKey,
    moveToStep,
    normalizedTargetPlan,
    normalizedTargetTheme,
    normalizedTicketIntent,
    setNotice,
    setSelectedPlan,
    setSelectedTheme,
  ]);
}
