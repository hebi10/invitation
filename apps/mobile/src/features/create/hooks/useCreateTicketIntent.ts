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

    if (normalizedTicketIntent === 'extra-variant' || normalizedTicketIntent === 'theme-change') {
      setNotice('모든 웨딩 디자인은 별도 티켓 없이 디자인별 주소로 열 수 있습니다.');
      setHandledTicketIntentKey(intentKey);
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
