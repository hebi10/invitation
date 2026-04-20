import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { useAuth } from '../../../contexts/AuthContext';
import type { useDrafts } from '../../../contexts/DraftsContext';
import { DEFAULT_INVITATION_THEME } from '../../../lib/invitationThemes';
import { purchaseBillingProduct } from '../../../lib/billing';
import { getMobileBillingPageCreationProductId } from '../../../lib/mobileBillingProducts';
import type {
  CreateDraftItem,
  MobileInvitationCreationInput,
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import { useCreateDraftSync } from './useCreateDraftSync';
import { useCreateTicketIntent } from './useCreateTicketIntent';
import {
  CREATE_STEPS,
  TICKET_DISCOUNT_BUNDLE_SIZE,
  buildCreateSlugBase,
  buildCreateValidationRules,
  calculateTicketPrice,
  designThemes,
  getAdjacentSupportedTicketCount,
  normalizeSupportedCreateTicketCount,
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
  const [currentStep, setCurrentStep] = useState<CreateStepKey>('info');
  const lastDraftSnapshotRef = useRef('');

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

    return (coreFeatures.length > 0 ? coreFeatures : [...selectedPlanInfo.features]).slice(
      0,
      2
    );
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
  const primaryCtaLabel = currentStep === 'review' ? 'Google Play 결제' : '다음';
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
      return '3단계 · 추가 티켓 확인 중';
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

  const moveToStep = useCallback((nextStep: CreateStepKey) => {
    setCurrentStep(nextStep);
  }, []);

  const buildDraftPayload = useCallback(
    (
      overrides: Partial<{
        servicePlan: MobileInvitationProductTier;
        theme: MobileInvitationThemeKey;
        pageIdentifier: string;
        groomName: string;
        brideName: string;
        groomEnglishName: string;
        brideEnglishName: string;
        estimatedPrice: number;
        ticketCount: number;
      }> = {}
    ) => ({
      servicePlan: overrides.servicePlan ?? selectedPlan,
      theme: overrides.theme ?? selectedTheme ?? DEFAULT_INVITATION_THEME,
      pageIdentifier: overrides.pageIdentifier ?? slugBase,
      groomName: overrides.groomName ?? groomKoreanName.trim(),
      brideName: overrides.brideName ?? brideKoreanName.trim(),
      groomEnglishName: overrides.groomEnglishName ?? groomEnglishName.trim(),
      brideEnglishName: overrides.brideEnglishName ?? brideEnglishName.trim(),
      weddingDate: '',
      venue: '',
      estimatedPrice: overrides.estimatedPrice ?? totalPrice,
      ticketCount: overrides.ticketCount ?? ticketCount,
      notes: '',
    }),
    [
      brideEnglishName,
      brideKoreanName,
      groomEnglishName,
      groomKoreanName,
      selectedPlan,
      selectedTheme,
      slugBase,
      ticketCount,
      totalPrice,
    ]
  );

  const applyDraft = useCallback(
    (draft: CreateDraftItem) => {
      setSelectedPlan(draft.servicePlan);
      setSelectedTheme(draft.theme);
      setGroomKoreanName(draft.groomName);
      setBrideKoreanName(draft.brideName);
      setGroomEnglishName(draft.groomEnglishName);
      setBrideEnglishName(draft.brideEnglishName);
      setPassword('');
      setConfirmPassword('');
      setTicketCount(normalizeSupportedCreateTicketCount(draft.ticketCount));
      setPaymentModalVisible(false);
      setCurrentStep('info');
      lastDraftSnapshotRef.current = JSON.stringify(
        buildDraftPayload({
          servicePlan: draft.servicePlan,
          theme: draft.theme,
          pageIdentifier: draft.pageIdentifier,
          groomName: draft.groomName,
          brideName: draft.brideName,
          groomEnglishName: draft.groomEnglishName,
          brideEnglishName: draft.brideEnglishName,
          estimatedPrice: draft.estimatedPrice,
          ticketCount: draft.ticketCount,
        })
      );
    },
    [buildDraftPayload]
  );

  const { editingDraftId, setEditingDraftId, resetDraftSync } = useCreateDraftSync({
    drafts,
    clearAuthError,
    setNotice,
    applyDraft,
  });

  useCreateTicketIntent({
    setSelectedPlan,
    setSelectedTheme,
    setNotice,
    moveToStep,
  });

  const hasDraftableInput = useMemo(
    () =>
      Boolean(
        groomKoreanName.trim() ||
          brideKoreanName.trim() ||
          groomEnglishName.trim() ||
          brideEnglishName.trim() ||
          password.trim() ||
          confirmPassword.trim() ||
          selectedTheme ||
          ticketCount > 0 ||
          selectedPlan !== 'standard'
      ),
    [
      brideEnglishName,
      brideKoreanName,
      confirmPassword,
      groomEnglishName,
      groomKoreanName,
      password,
      selectedPlan,
      selectedTheme,
      ticketCount,
    ]
  );

  const canAutoSaveProgress = useMemo(
    () => Boolean(groomKoreanName.trim() && brideKoreanName.trim()),
    [brideKoreanName, groomKoreanName]
  );

  const persistDraft = useCallback(
    async (
      theme: MobileInvitationThemeKey,
      options: {
        silent?: boolean;
        notice?: string;
      } = {}
    ) => {
      const nextDraftPayload = buildDraftPayload({ theme });
      const savedDraftId = await saveDraft(nextDraftPayload, {
        draftId: editingDraftId ?? undefined,
      });

      setEditingDraftId(savedDraftId);
      lastDraftSnapshotRef.current = JSON.stringify(nextDraftPayload);

      if (!options.silent && options.notice) {
        setNotice(options.notice);
      }

      return savedDraftId;
    },
    [buildDraftPayload, editingDraftId, saveDraft, setEditingDraftId]
  );

  const getBlockedStepForTarget = useCallback(
    (targetStep: CreateStepKey) => {
      if (targetStep === 'info') {
        return null;
      }

      if (infoValidationMessages.length > 0) {
        return {
          step: 'info' as const,
          message:
            infoValidationMessages[0] ??
            '기본 정보와 보안 설정을 먼저 확인해 주세요.',
        };
      }

      if (targetStep === 'selection') {
        return null;
      }

      if (selectionValidationMessages.length > 0) {
        return {
          step: 'selection' as const,
          message:
            selectionValidationMessages[0] ??
            '서비스와 디자인 선택을 먼저 확인해 주세요.',
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
    resetDraftSync();
    lastDraftSnapshotRef.current = '';
    setPaymentModalVisible(false);
    setCurrentStep('info');
    setNotice('');
    clearAuthError();
  }, [clearAuthError, resetDraftSync]);

  const updateTicketCount = useCallback((nextCount: number) => {
    setTicketCount(normalizeSupportedCreateTicketCount(nextCount));
  }, []);

  const decreaseTicketCount = useCallback(() => {
    setTicketCount((currentCount) =>
      getAdjacentSupportedTicketCount(currentCount, 'decrease')
    );
  }, []);

  const increaseTicketCount = useCallback(() => {
    setTicketCount((currentCount) =>
      getAdjacentSupportedTicketCount(currentCount, 'increase')
    );
  }, []);

  const resetTicketCount = useCallback(() => {
    setTicketCount(0);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!groomKoreanName.trim() || !brideKoreanName.trim()) {
      setNotice('초안 저장 전에는 신랑과 신부 이름을 먼저 입력해 주세요.');
      moveToStep('info');
      return;
    }

    if (!selectedTheme) {
      setNotice('초안 저장 전에는 디자인을 먼저 선택해 주세요.');
      moveToStep('selection');
      return;
    }

    await persistDraft(selectedTheme, {
      notice:
        '시작 초안을 저장했습니다. 입력 중인 내용은 홈에서도 다시 이어서 작성할 수 있습니다.',
    });
  }, [brideKoreanName, groomKoreanName, moveToStep, persistDraft, selectedTheme]);

  const autoSaveProgress = useCallback(async () => {
    if (isSubmitting || !hasDraftableInput || !canAutoSaveProgress) {
      return false;
    }

    const nextDraftPayload = buildDraftPayload();
    const nextSnapshot = JSON.stringify(nextDraftPayload);

    if (lastDraftSnapshotRef.current === nextSnapshot) {
      return false;
    }

    await persistDraft(nextDraftPayload.theme, {
      silent: true,
    });
    return true;
  }, [
    buildDraftPayload,
    canAutoSaveProgress,
    hasDraftableInput,
    isSubmitting,
    persistDraft,
  ]);

  const handleOpenPaymentModal = useCallback(() => {
    clearAuthError();

    if (isExpoWebPreview) {
      setNotice(
        'Expo 웹 빌드에서는 실제 페이지 생성 요청이 차단되어 있습니다. 라이브 앱이나 Next 운영 환경을 사용해 주세요.'
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
        'Expo 웹 빌드에서는 실제 페이지를 생성할 수 없습니다. 라이브 앱이나 Next 운영 환경을 사용해 주세요.'
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
    const createInput: MobileInvitationCreationInput = {
      slugBase,
      groomKoreanName: groomKoreanName.trim(),
      brideKoreanName: brideKoreanName.trim(),
      groomEnglishName: groomEnglishName.trim(),
      brideEnglishName: brideEnglishName.trim(),
      password: password.trim(),
      servicePlan: selectedPlan,
      theme: selectedTheme ?? DEFAULT_INVITATION_THEME,
    };
    const billingProductId = getMobileBillingPageCreationProductId(selectedPlan);

    let created = false;

    try {
      const purchase = await purchaseBillingProduct(billingProductId);
      created = await createInvitationPage(createInput, {
        billingPurchase: {
          appUserId: purchase.appUserId,
          productId: purchase.productIdentifier,
          transactionId: purchase.transactionIdentifier,
        },
      });
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Google Play 결제를 진행하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      );
    }

    setIsSubmitting(false);

    if (!created) {
      return;
    }

    if (editingDraftId) {
      await removeDraft(editingDraftId);
    }

    resetForm();
    setNotice(
      'Google Play 결제가 완료되어 청첩장을 생성했습니다. 운영 탭에서 식장 정보를 이어서 입력해 주세요.'
    );
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
    setNotice,
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
    decreaseTicketCount,
    increaseTicketCount,
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
    hasDraftableInput,
    handleStepTabPress,
    handlePreviousStep,
    handleSaveDraft,
    autoSaveProgress,
    handlePrimaryStepAction,
    handleConfirmCreate,
  };
}
