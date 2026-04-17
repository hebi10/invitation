import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { useAuth } from '../../../contexts/AuthContext';
import type { useDrafts } from '../../../contexts/DraftsContext';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import {
  CREATE_STEPS,
  MAX_TICKET_COUNT,
  TICKET_DISCOUNT_BUNDLE_SIZE,
  buildCreateSlugBase,
  buildCreateValidationRules,
  calculateTicketPrice,
  designThemes,
  isValidCreateStepProductTier,
  isValidCreateStepThemeKey,
  servicePlans,
  type CreateStepKey,
} from '../shared';

type DraftStore = Pick<ReturnType<typeof useDrafts>, 'drafts' | 'removeDraft' | 'saveDraft'>;
type AuthActions = Pick<
  ReturnType<typeof useAuth>,
  'clearAuthError' | 'createInvitationPage'
>;

type UseCreateFormOptions = DraftStore &
  AuthActions & {
    apiBaseUrl: string;
    isExpoWebPreview: boolean;
  };

export function useCreateForm({
  apiBaseUrl,
  drafts,
  saveDraft,
  removeDraft,
  clearAuthError,
  createInvitationPage,
  isExpoWebPreview,
}: UseCreateFormOptions) {
  const router = useRouter();
  const {
    draftId: draftIdParam,
    ticketIntent: ticketIntentParam,
    targetPlan: targetPlanParam,
    targetTheme: targetThemeParam,
  } = useLocalSearchParams<{
    draftId?: string | string[];
    ticketIntent?: string | string[];
    targetPlan?: string | string[];
    targetTheme?: string | string[];
  }>();

  const [selectedPlan, setSelectedPlan] =
    useState<MobileInvitationProductTier>('standard');
  const [selectedTheme, setSelectedTheme] =
    useState<MobileInvitationThemeKey | null>(null);
  const [groomKoreanName, setGroomKoreanName] = useState('');
  const [brideKoreanName, setBrideKoreanName] = useState('');
  const [groomEnglishName, setGroomEnglishName] = useState('');
  const [brideEnglishName, setBrideEnglishName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ticketCount, setTicketCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);
  const [handledTicketIntentKey, setHandledTicketIntentKey] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CreateStepKey>('info');

  const selectedPlanInfo = useMemo(
    () => servicePlans.find((plan) => plan.tier === selectedPlan) ?? servicePlans[0],
    [selectedPlan]
  );
  const selectedThemeInfo = useMemo(
    () => designThemes.find((theme) => theme.key === selectedTheme) ?? null,
    [selectedTheme]
  );
  const selectedPlanHighlights = useMemo(() => {
    const coreFeatures = selectedPlanInfo.features.filter(
      (feature) => !feature.includes('전체 포함')
    );

    return (coreFeatures.length > 0 ? coreFeatures : [...selectedPlanInfo.features]).slice(0, 2);
  }, [selectedPlanInfo]);
  const ticketPrice = useMemo(() => calculateTicketPrice(ticketCount), [ticketCount]);
  const discountedBundleCount = Math.floor(ticketCount / TICKET_DISCOUNT_BUNDLE_SIZE);
  const remainderTicketCount = ticketCount % TICKET_DISCOUNT_BUNDLE_SIZE;
  const totalPrice = selectedPlanInfo.price + ticketPrice;

  const slugBase = useMemo(
    () => buildCreateSlugBase(groomEnglishName, brideEnglishName),
    [brideEnglishName, groomEnglishName]
  );
  const publicUrlPreview = useMemo(() => {
    const baseUrl = apiBaseUrl.replace(/\/+$/g, '');
    return slugBase ? `${baseUrl}/${slugBase}` : `${baseUrl}/...`;
  }, [apiBaseUrl, slugBase]);

  const normalizedDraftId = Array.isArray(draftIdParam) ? draftIdParam[0] : draftIdParam;
  const normalizedTicketIntent = Array.isArray(ticketIntentParam)
    ? ticketIntentParam[0]
    : ticketIntentParam;
  const normalizedTargetPlan = Array.isArray(targetPlanParam)
    ? targetPlanParam[0]
    : targetPlanParam;
  const normalizedTargetTheme = Array.isArray(targetThemeParam)
    ? targetThemeParam[0]
    : targetThemeParam;

  const validationRules = useMemo(
    () =>
      buildCreateValidationRules({
        groomKoreanName,
        brideKoreanName,
        groomEnglishName,
        brideEnglishName,
        password,
        confirmPassword,
        selectedTheme,
      }),
    [
      brideEnglishName,
      brideKoreanName,
      confirmPassword,
      groomEnglishName,
      groomKoreanName,
      password,
      selectedTheme,
    ]
  );
  const validationMessages = useMemo(
    () => validationRules.filter((rule) => !rule.passed).map((rule) => rule.errorMessage),
    [validationRules]
  );
  const basicValidationMessages = useMemo(
    () =>
      validationRules
        .filter((rule) => rule.section === 'basic' && !rule.passed)
        .map((rule) => rule.errorMessage),
    [validationRules]
  );
  const securityValidationMessages = useMemo(
    () =>
      validationRules
        .filter((rule) => rule.section === 'security' && !rule.passed)
        .map((rule) => rule.errorMessage),
    [validationRules]
  );
  const selectionValidationMessages = useMemo(
    () =>
      validationRules
        .filter((rule) => rule.section === 'selection' && !rule.passed)
        .map((rule) => rule.errorMessage),
    [validationRules]
  );
  const infoValidationMessages = useMemo(
    () => [...basicValidationMessages, ...securityValidationMessages],
    [basicValidationMessages, securityValidationMessages]
  );
  const currentStepIndex = CREATE_STEPS.findIndex((step) => step.key === currentStep);
  const currentStepInfo = CREATE_STEPS[currentStepIndex] ?? CREATE_STEPS[0];
  const primaryCtaLabel = currentStep === 'review' ? '결제 확인' : '다음';
  const showPreviousCta = currentStepIndex > 0;
  const stepCompletion = useMemo(
    () => ({
      info: infoValidationMessages.length === 0,
      selection:
        infoValidationMessages.length === 0 && selectionValidationMessages.length === 0,
      ticket: currentStep === 'review' || ticketCount > 0,
      review: currentStep === 'review' && validationMessages.length === 0,
    }),
    [
      currentStep,
      infoValidationMessages.length,
      selectionValidationMessages.length,
      ticketCount,
      validationMessages.length,
    ]
  );
  const currentProgressLabel = useMemo(() => {
    if (currentStep === 'review') {
      return validationMessages.length === 0
        ? '4단계 · 결제 확인 준비 완료'
        : '4단계 · 결제 정보 확인 중';
    }

    if (currentStep === 'ticket') {
      return '3단계 · 티켓 수량 확인 중';
    }

    if (currentStep === 'selection') {
      return selectionValidationMessages.length === 0
        ? '2단계 · 서비스와 디자인 선택 완료'
        : '2단계 · 서비스와 디자인 선택 중';
    }

    return infoValidationMessages.length === 0
      ? '1단계 · 기본 정보 입력 완료'
      : '1단계 · 기본 정보 입력 중';
  }, [
    currentStep,
    infoValidationMessages.length,
    selectionValidationMessages.length,
    validationMessages.length,
  ]);

  useEffect(() => {
    if (!normalizedDraftId || normalizedDraftId === loadedDraftId) {
      return;
    }

    const selectedDraft = drafts.find((draft) => draft.id === normalizedDraftId);
    if (!selectedDraft) {
      return;
    }

    setSelectedPlan(selectedDraft.servicePlan);
    setSelectedTheme(selectedDraft.theme);
    setGroomKoreanName(selectedDraft.groomName);
    setBrideKoreanName(selectedDraft.brideName);
    setGroomEnglishName(selectedDraft.groomEnglishName);
    setBrideEnglishName(selectedDraft.brideEnglishName);
    setPassword('');
    setConfirmPassword('');
    setTicketCount(selectedDraft.ticketCount);
    setEditingDraftId(selectedDraft.id);
    setLoadedDraftId(selectedDraft.id);
    setPaymentModalVisible(false);
    clearAuthError();
    setNotice('저장된 초안을 불러왔습니다. 비밀번호만 다시 입력하면 이어서 진행할 수 있습니다.');
    router.replace('/create');
  }, [clearAuthError, drafts, loadedDraftId, normalizedDraftId, router]);

  useEffect(() => {
    if (!normalizedTicketIntent) {
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
      setNotice('티켓 사용: 추가 청첩장 생성을 진행할 수 있습니다.');
    } else if (normalizedTicketIntent === 'extra-variant') {
      setNotice('티켓 사용: 같은 청첩장에 다른 디자인 추가 구매 흐름으로 이동했습니다.');
    } else if (normalizedTicketIntent === 'upgrade') {
      setNotice('티켓 사용: 서비스 업그레이드 구매 흐름으로 이동했습니다.');
    }

    setCurrentStep('ticket');
    setHandledTicketIntentKey(intentKey);
  }, [
    handledTicketIntentKey,
    normalizedTargetPlan,
    normalizedTargetTheme,
    normalizedTicketIntent,
  ]);

  const moveToStep = useCallback((nextStep: CreateStepKey) => {
    setCurrentStep(nextStep);
  }, []);

  const getBlockedStepForTarget = useCallback(
    (targetStep: CreateStepKey) => {
      if (targetStep === 'info') {
        return null;
      }

      if (infoValidationMessages.length > 0) {
        return {
          step: 'info' as const,
          message: infoValidationMessages[0] ?? '기본 정보와 보안 설정을 먼저 확인해 주세요.',
        };
      }

      if (targetStep === 'selection') {
        return null;
      }

      if (selectionValidationMessages.length > 0) {
        return {
          step: 'selection' as const,
          message:
            selectionValidationMessages[0] ?? '서비스와 디자인 선택을 먼저 확인해 주세요.',
        };
      }

      return null;
    },
    [infoValidationMessages, selectionValidationMessages]
  );

  const handleStepTabPress = useCallback(
    (targetStep: CreateStepKey) => {
      if (targetStep === currentStep) {
        return;
      }

      const blockedStep = getBlockedStepForTarget(targetStep);
      if (blockedStep) {
        setNotice(blockedStep.message);
        moveToStep(blockedStep.step);
        return;
      }

      setNotice('');
      moveToStep(targetStep);
    },
    [currentStep, getBlockedStepForTarget, moveToStep]
  );

  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex <= 0) {
      return;
    }

    moveToStep(CREATE_STEPS[currentStepIndex - 1]?.key ?? 'info');
  }, [currentStepIndex, moveToStep]);

  const resetForm = useCallback(() => {
    setSelectedPlan('standard');
    setSelectedTheme(null);
    setGroomKoreanName('');
    setBrideKoreanName('');
    setGroomEnglishName('');
    setBrideEnglishName('');
    setPassword('');
    setConfirmPassword('');
    setTicketCount(0);
    setEditingDraftId(null);
    setLoadedDraftId(null);
    setPaymentModalVisible(false);
    setCurrentStep('info');
    setNotice('');
    clearAuthError();
  }, [clearAuthError]);

  const updateTicketCount = useCallback((nextCount: number) => {
    setTicketCount(Math.max(0, Math.min(MAX_TICKET_COUNT, nextCount)));
  }, []);

  const resetTicketCount = useCallback(() => {
    setTicketCount(0);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!groomKoreanName.trim() || !brideKoreanName.trim()) {
      setNotice('초안 저장 전에는 신랑·신부 한글 이름을 먼저 입력해 주세요.');
      moveToStep('info');
      return;
    }

    if (!selectedTheme) {
      setNotice('초안 저장 전에는 디자인을 먼저 선택해 주세요.');
      moveToStep('selection');
      return;
    }

    const savedDraftId = await saveDraft(
      {
        servicePlan: selectedPlan,
        theme: selectedTheme,
        pageIdentifier: slugBase,
        groomName: groomKoreanName.trim(),
        brideName: brideKoreanName.trim(),
        groomEnglishName: groomEnglishName.trim(),
        brideEnglishName: brideEnglishName.trim(),
        weddingDate: '',
        venue: '',
        estimatedPrice: totalPrice,
        ticketCount,
        notes: '',
      },
      {
        draftId: editingDraftId ?? undefined,
      }
    );

    setEditingDraftId(savedDraftId);
    setLoadedDraftId(savedDraftId);
    setNotice('제작 초안을 저장했습니다. 입력한 내용은 유지되고 홈에서도 이어서 작성할 수 있습니다.');
  }, [
    brideEnglishName,
    brideKoreanName,
    editingDraftId,
    groomEnglishName,
    groomKoreanName,
    moveToStep,
    saveDraft,
    selectedPlan,
    selectedTheme,
    slugBase,
    ticketCount,
    totalPrice,
  ]);

  const handleOpenPaymentModal = useCallback(() => {
    clearAuthError();

    if (isExpoWebPreview) {
      setNotice(
        'Expo 웹 빌드에서는 실제 페이지 생성이 차단되어 있습니다. 네이티브 앱이나 Next 웹 편집기를 사용해 주세요.'
      );
      return;
    }

    if (validationMessages.length > 0) {
      setNotice(validationMessages[0] ?? '입력 정보를 먼저 확인해 주세요.');
      const firstInvalidRule = validationRules.find((rule) => !rule.passed);
      moveToStep(firstInvalidRule?.section === 'selection' ? 'selection' : 'info');
      return;
    }

    setNotice('');
    setPaymentModalVisible(true);
  }, [
    clearAuthError,
    isExpoWebPreview,
    moveToStep,
    validationMessages,
    validationRules,
  ]);

  const handlePrimaryStepAction = useCallback(() => {
    if (currentStep === 'review') {
      handleOpenPaymentModal();
      return;
    }

    const nextStep = CREATE_STEPS[currentStepIndex + 1]?.key;
    if (!nextStep) {
      return;
    }

    const blockedStep = getBlockedStepForTarget(nextStep);
    if (blockedStep) {
      setNotice(blockedStep.message);
      moveToStep(blockedStep.step);
      return;
    }

    setNotice('');
    moveToStep(nextStep);
  }, [
    currentStep,
    currentStepIndex,
    getBlockedStepForTarget,
    handleOpenPaymentModal,
    moveToStep,
  ]);

  const closePaymentModal = useCallback(() => {
    setPaymentModalVisible(false);
  }, []);

  const handleConfirmCreate = useCallback(async () => {
    if (isExpoWebPreview) {
      setNotice(
        'Expo 웹 빌드에서는 실제 페이지를 생성할 수 없습니다. 네이티브 앱이나 Next 웹 편집기를 사용해 주세요.'
      );
      setPaymentModalVisible(false);
      return;
    }

    if (validationMessages.length > 0) {
      setNotice(validationMessages[0] ?? '입력 정보를 먼저 확인해 주세요.');
      setPaymentModalVisible(false);
      const firstInvalidRule = validationRules.find((rule) => !rule.passed);
      moveToStep(firstInvalidRule?.section === 'selection' ? 'selection' : 'info');
      return;
    }

    setIsSubmitting(true);
    clearAuthError();

    const created = await createInvitationPage({
      slugBase,
      groomKoreanName: groomKoreanName.trim(),
      brideKoreanName: brideKoreanName.trim(),
      groomEnglishName: groomEnglishName.trim(),
      brideEnglishName: brideEnglishName.trim(),
      password: password.trim(),
      servicePlan: selectedPlan,
      theme: selectedTheme ?? 'emotional',
    });

    setIsSubmitting(false);

    if (!created) {
      return;
    }

    if (editingDraftId) {
      await removeDraft(editingDraftId);
    }

    resetForm();
    setNotice('청첩장을 생성했습니다. 운영 탭에서 예식 정보를 이어서 입력해 주세요.');
    router.replace('/manage');
  }, [
    brideEnglishName,
    brideKoreanName,
    clearAuthError,
    createInvitationPage,
    editingDraftId,
    groomEnglishName,
    groomKoreanName,
    isExpoWebPreview,
    moveToStep,
    password,
    removeDraft,
    resetForm,
    router,
    selectedPlan,
    selectedTheme,
    slugBase,
    validationMessages,
    validationRules,
  ]);

  return {
    selectedPlan,
    setSelectedPlan,
    selectedPlanInfo,
    selectedPlanHighlights,
    selectedTheme,
    setSelectedTheme,
    selectedThemeInfo,
    groomKoreanName,
    setGroomKoreanName,
    brideKoreanName,
    setBrideKoreanName,
    groomEnglishName,
    setGroomEnglishName,
    brideEnglishName,
    setBrideEnglishName,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    ticketCount,
    updateTicketCount,
    resetTicketCount,
    ticketPrice,
    discountedBundleCount,
    remainderTicketCount,
    totalPrice,
    slugBase,
    publicUrlPreview,
    notice,
    setNotice,
    paymentModalVisible,
    closePaymentModal,
    isSubmitting,
    currentStep,
    currentStepIndex,
    currentStepInfo,
    primaryCtaLabel,
    showPreviousCta,
    stepCompletion,
    currentProgressLabel,
    validationMessages,
    basicValidationMessages,
    securityValidationMessages,
    selectionValidationMessages,
    handleStepTabPress,
    handlePreviousStep,
    handleSaveDraft,
    handlePrimaryStepAction,
    handleConfirmCreate,
  };
}
