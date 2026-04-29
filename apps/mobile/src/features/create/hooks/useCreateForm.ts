import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { useAuth } from '../../../contexts/AuthContext';
import type { useDrafts } from '../../../contexts/DraftsContext';
import { checkMobileInvitationSlugAvailability } from '../../../lib/api';
import { purchaseBillingProduct } from '../../../lib/billing';
import { createRandomSuffix } from '../../../lib/id';
import { DEFAULT_INVITATION_THEME } from '../../../lib/invitationThemes';
import { getMobileBillingPageCreationProductId } from '../../../lib/mobileBillingProducts';
import { validatePageSlugBase } from '../../../lib/pageSlug';
import type {
  CreateDraftItem,
  MobileInvitationCreationInput,
  MobileInvitationProductTier,
  MobileInvitationSlugAvailabilityReason,
  MobileInvitationThemeKey,
} from '../../../types/mobileInvitation';
import {
  buildCreateValidationRules,
  buildSuggestedCreateSlugBase,
  calculateTicketPrice,
  CREATE_STEPS,
  designThemes,
  getAdjacentSupportedTicketCount,
  getCreateSlugAvailabilityMessage,
  normalizeSupportedCreateTicketCount,
  servicePlans,
  TICKET_UNIT_PRICE,
  type CreateStepKey,
} from '../shared';
import { useCreateDraftSync } from './useCreateDraftSync';
import { useCreateTicketIntent } from './useCreateTicketIntent';

type DraftStore = Pick<ReturnType<typeof useDrafts>, 'drafts' | 'removeDraft' | 'saveDraft'>;
type AuthActions = Pick<
  ReturnType<typeof useAuth>,
  | 'clearAuthError'
  | 'createInvitationPage'
  | 'customerAuthError'
  | 'customerSession'
  | 'isCustomerAuthenticating'
  | 'loginCustomer'
  | 'logoutCustomer'
>;

type UseCreateFormOptions = DraftStore &
  AuthActions & {
    apiBaseUrl: string;
    isExpoWebPreview: boolean;
  };

type CreateSlugAvailabilityState = {
  status: 'idle' | 'checking' | 'resolved' | 'error';
  normalizedSlugBase: string;
  available: boolean;
  reason: MobileInvitationSlugAvailabilityReason | 'error';
};

type DraftPayloadOverrides = Partial<{
  servicePlan: MobileInvitationProductTier;
  theme: MobileInvitationThemeKey;
  pageIdentifier: string;
  groomName: string;
  brideName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  estimatedPrice: number;
  ticketCount: number;
}>;

const INITIAL_SLUG_AVAILABILITY_STATE: CreateSlugAvailabilityState = {
  status: 'idle',
  normalizedSlugBase: '',
  available: false,
  reason: 'required',
};

export function useCreateForm({
  apiBaseUrl,
  drafts,
  saveDraft,
  removeDraft,
  clearAuthError,
  createInvitationPage,
  customerAuthError,
  customerSession,
  isCustomerAuthenticating,
  loginCustomer,
  logoutCustomer,
  isExpoWebPreview,
}: UseCreateFormOptions) {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] =
    useState<MobileInvitationProductTier>('standard');
  const [selectedTheme, setSelectedTheme] =
    useState<MobileInvitationThemeKey | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [groomKoreanName, setGroomKoreanName] = useState('');
  const [brideKoreanName, setBrideKoreanName] = useState('');
  const [groomEnglishName, setGroomEnglishName] = useState('');
  const [brideEnglishName, setBrideEnglishName] = useState('');
  const [slugSuggestionSeed, setSlugSuggestionSeed] = useState(() => createRandomSuffix(6));
  const [pageIdentifier, setPageIdentifier] = useState('');
  const [hasCustomPageIdentifier, setHasCustomPageIdentifier] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ticketCount, setTicketCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<CreateStepKey>('info');
  const [slugAvailability, setSlugAvailability] = useState<CreateSlugAvailabilityState>(
    INITIAL_SLUG_AVAILABILITY_STATE
  );
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
  const totalPrice = selectedPlanInfo.price + ticketPrice;

  const suggestedSlugBase = useMemo(() => {
    if (!groomEnglishName.trim() && !brideEnglishName.trim()) {
      return '';
    }

    return buildSuggestedCreateSlugBase(
      groomEnglishName.trim(),
      brideEnglishName.trim(),
      slugSuggestionSeed
    );
  }, [brideEnglishName, groomEnglishName, slugSuggestionSeed]);

  useEffect(() => {
    if (hasCustomPageIdentifier) {
      return;
    }

    setPageIdentifier(suggestedSlugBase);
  }, [hasCustomPageIdentifier, suggestedSlugBase]);

  const effectivePageIdentifier = useMemo(() => {
    if (hasCustomPageIdentifier) {
      return pageIdentifier;
    }

    return pageIdentifier || suggestedSlugBase;
  }, [hasCustomPageIdentifier, pageIdentifier, suggestedSlugBase]);

  const slugValidation = useMemo(
    () => validatePageSlugBase(effectivePageIdentifier),
    [effectivePageIdentifier]
  );
  const slugBase = slugValidation.normalizedSlugBase;

  const publicUrlPreview = useMemo(() => {
    const baseUrl = apiBaseUrl.replace(/\/+$/g, '');
    const previewSlug = slugBase || suggestedSlugBase;

    return previewSlug ? `${baseUrl}/${previewSlug}` : `${baseUrl}/...`;
  }, [apiBaseUrl, slugBase, suggestedSlugBase]);

  useEffect(() => {
    const trimmedIdentifier = effectivePageIdentifier.trim();

    if (!trimmedIdentifier) {
      setSlugAvailability(INITIAL_SLUG_AVAILABILITY_STATE);
      return;
    }

    if (!slugValidation.isValid) {
      setSlugAvailability({
        status: 'resolved',
        normalizedSlugBase: slugValidation.normalizedSlugBase,
        available: false,
        reason: slugValidation.reason ?? 'invalid',
      });
      return;
    }

    let cancelled = false;
    const normalizedSlugBase = slugValidation.normalizedSlugBase;

    setSlugAvailability({
      status: 'checking',
      normalizedSlugBase,
      available: false,
      reason: 'ok',
    });

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const response = await checkMobileInvitationSlugAvailability(
            apiBaseUrl,
            normalizedSlugBase
          );

          if (cancelled) {
            return;
          }

          setSlugAvailability({
            status: 'resolved',
            normalizedSlugBase: response.normalizedSlugBase,
            available: response.available,
            reason: response.reason,
          });
        } catch {
          if (cancelled) {
            return;
          }

          setSlugAvailability({
            status: 'error',
            normalizedSlugBase,
            available: false,
            reason: 'error',
          });
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    apiBaseUrl,
    effectivePageIdentifier,
    slugValidation.isValid,
    slugValidation.normalizedSlugBase,
    slugValidation.reason,
  ]);

  const pageIdentifierHelperText = useMemo(() => {
    const isRecommended = !hasCustomPageIdentifier;
    const trimmedIdentifier = effectivePageIdentifier.trim();

    if (!trimmedIdentifier) {
      return getCreateSlugAvailabilityMessage('required', {
        isRecommended,
      });
    }

    if (!slugValidation.isValid) {
      return getCreateSlugAvailabilityMessage(slugValidation.reason ?? 'invalid', {
        isRecommended,
      });
    }

    if (slugAvailability.status === 'checking') {
      return getCreateSlugAvailabilityMessage('checking', {
        isRecommended,
      });
    }

    if (slugAvailability.status === 'error') {
      return getCreateSlugAvailabilityMessage('error', {
        isRecommended,
      });
    }

    if (slugAvailability.normalizedSlugBase !== slugValidation.normalizedSlugBase) {
      return getCreateSlugAvailabilityMessage('checking', {
        isRecommended,
      });
    }

    return getCreateSlugAvailabilityMessage(slugAvailability.reason, {
      isRecommended,
    });
  }, [
    effectivePageIdentifier,
    hasCustomPageIdentifier,
    slugAvailability.normalizedSlugBase,
    slugAvailability.reason,
    slugAvailability.status,
    slugValidation.isValid,
    slugValidation.normalizedSlugBase,
    slugValidation.reason,
  ]);

  const validationRules = useMemo(
    () =>
      buildCreateValidationRules({
        groomKoreanName,
        brideKoreanName,
        groomEnglishName,
        brideEnglishName,
        pageIdentifier: effectivePageIdentifier,
        password,
        confirmPassword,
        selectedTheme,
      }),
    [
      brideKoreanName,
      brideEnglishName,
      confirmPassword,
      effectivePageIdentifier,
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
        ? '4단계 결제 확인 준비가 끝났습니다.'
        : '4단계 결제 전 입력 내용을 다시 확인해 주세요.';
    }

    if (currentStep === 'ticket') {
      return '3단계 추가 티켓 구성을 확인하고 있습니다.';
    }

    if (currentStep === 'selection') {
      return selectionValidationMessages.length === 0
        ? '2단계 서비스와 디자인 선택을 마쳤습니다.'
        : '2단계 서비스와 디자인 선택을 진행해 주세요.';
    }

    return infoValidationMessages.length === 0
      ? '1단계 기본 정보 입력이 끝났습니다.'
      : '1단계 기본 정보와 주소를 입력해 주세요.';
  }, [
    currentStep,
    infoValidationMessages.length,
    selectionValidationMessages.length,
    validationMessages.length,
  ]);

  const moveToStep = useCallback((nextStep: CreateStepKey) => {
    setCurrentStep(nextStep);
  }, []);

  const handlePageIdentifierChange = useCallback(
    (value: string) => {
      setPageIdentifier(value);

      const trimmedValue = value.trim();

      if (!trimmedValue) {
        setHasCustomPageIdentifier(false);
        return;
      }

      const normalizedValue = validatePageSlugBase(value).normalizedSlugBase;
      setHasCustomPageIdentifier(
        Boolean(suggestedSlugBase) && normalizedValue === suggestedSlugBase ? false : true
      );
    },
    [suggestedSlugBase]
  );

  const buildDraftPayload = useCallback(
    (overrides: DraftPayloadOverrides = {}) => ({
      servicePlan: overrides.servicePlan ?? selectedPlan,
      theme: overrides.theme ?? selectedTheme ?? DEFAULT_INVITATION_THEME,
      pageIdentifier:
        overrides.pageIdentifier ??
        (hasCustomPageIdentifier ? effectivePageIdentifier.trim() : ''),
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
      brideKoreanName,
      brideEnglishName,
      effectivePageIdentifier,
      groomEnglishName,
      groomKoreanName,
      hasCustomPageIdentifier,
      selectedPlan,
      selectedTheme,
      ticketCount,
      totalPrice,
    ]
  );

  const applyDraft = useCallback(
    (draft: CreateDraftItem) => {
      const nextSeed = createRandomSuffix(6);
      const storedPageIdentifier = draft.pageIdentifier.trim();
      const storedGroomEnglishName = draft.groomEnglishName?.trim() ?? '';
      const storedBrideEnglishName = draft.brideEnglishName?.trim() ?? '';
      const nextSuggestedSlugBase =
        storedPageIdentifier ||
        (storedGroomEnglishName || storedBrideEnglishName
          ? buildSuggestedCreateSlugBase(
              storedGroomEnglishName,
              storedBrideEnglishName,
              nextSeed
            )
          : '');

      setSelectedPlan(draft.servicePlan);
      setSelectedTheme(draft.theme);
      setGroomKoreanName(draft.groomName);
      setBrideKoreanName(draft.brideName);
      setGroomEnglishName(storedGroomEnglishName);
      setBrideEnglishName(storedBrideEnglishName);
      setSlugSuggestionSeed(nextSeed);
      setHasCustomPageIdentifier(Boolean(storedPageIdentifier));
      setPageIdentifier(storedPageIdentifier || nextSuggestedSlugBase);
      setPassword('');
      setConfirmPassword('');
      setTicketCount(normalizeSupportedCreateTicketCount(draft.ticketCount));
      setPaymentModalVisible(false);
      setCurrentStep('info');
      setSlugAvailability(INITIAL_SLUG_AVAILABILITY_STATE);
      lastDraftSnapshotRef.current = JSON.stringify(
        buildDraftPayload({
          servicePlan: draft.servicePlan,
          theme: draft.theme,
          pageIdentifier: draft.pageIdentifier,
          groomName: draft.groomName,
          brideName: draft.brideName,
          groomEnglishName: storedGroomEnglishName,
          brideEnglishName: storedBrideEnglishName,
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
          (hasCustomPageIdentifier && effectivePageIdentifier.trim()) ||
          password.trim() ||
          confirmPassword.trim() ||
          selectedTheme ||
          ticketCount > 0 ||
          selectedPlan !== 'standard'
      ),
    [
      brideKoreanName,
      brideEnglishName,
      confirmPassword,
      effectivePageIdentifier,
      groomEnglishName,
      groomKoreanName,
      hasCustomPageIdentifier,
      password,
      selectedPlan,
      selectedTheme,
      ticketCount,
    ]
  );

  const canAutoSaveProgress = useMemo(
    () =>
      Boolean(
        groomKoreanName.trim() &&
          brideKoreanName.trim() &&
          groomEnglishName.trim() &&
          brideEnglishName.trim()
      ),
    [brideKoreanName, brideEnglishName, groomEnglishName, groomKoreanName]
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
    setCustomerPassword('');
    setGroomKoreanName('');
    setBrideKoreanName('');
    setGroomEnglishName('');
    setBrideEnglishName('');
    setSlugSuggestionSeed(createRandomSuffix(6));
    setPageIdentifier('');
    setHasCustomPageIdentifier(false);
    setPassword('');
    setConfirmPassword('');
    setTicketCount(0);
    setSlugAvailability(INITIAL_SLUG_AVAILABILITY_STATE);
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

  const handleCustomerLogin = useCallback(async () => {
    const loggedIn = await loginCustomer(customerEmail, customerPassword);
    if (loggedIn) {
      setCustomerPassword('');
      setNotice('고객 계정으로 로그인되었습니다.');
      return;
    }

    setNotice(customerAuthError ?? '고객 로그인 정보를 다시 확인해 주세요.');
  }, [customerAuthError, customerEmail, customerPassword, loginCustomer]);

  const handleCustomerLogout = useCallback(async () => {
    await logoutCustomer();
    setCustomerPassword('');
    setNotice('고객 계정 로그아웃이 완료되었습니다.');
  }, [logoutCustomer]);

  const handleSaveDraft = useCallback(async () => {
    if (
      !groomKoreanName.trim() ||
      !brideKoreanName.trim() ||
      !groomEnglishName.trim() ||
      !brideEnglishName.trim()
    ) {
      setNotice('초안 저장 전에는 신랑·신부의 한글 이름과 영문 이름을 모두 입력해 주세요.');
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
        '작성 중인 초안을 저장했습니다. 다음에도 같은 화면에서 이어서 만들 수 있습니다.',
    });
  }, [
    brideEnglishName,
    brideKoreanName,
    groomEnglishName,
    groomKoreanName,
    moveToStep,
    persistDraft,
    selectedTheme,
  ]);

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
        'Expo 웹 미리보기에서는 실제 페이지 생성 요청을 보낼 수 없습니다. 모바일 앱이나 Next 운영 환경에서 진행해 주세요.'
      );
      return;
    }

    if (!customerSession) {
      setNotice('고객 계정으로 로그인한 뒤 결제를 진행해 주세요.');
      moveToStep('info');
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
    customerSession,
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
        'Expo 웹 미리보기에서는 실제 페이지를 만들 수 없습니다. 모바일 앱이나 Next 운영 환경에서 진행해 주세요.'
      );
      setPaymentModalVisible(false);
      return;
    }

    if (!customerSession) {
      setNotice('고객 계정으로 로그인한 뒤 결제를 진행해 주세요.');
      setPaymentModalVisible(false);
      moveToStep('info');
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
      const purchase = await purchaseBillingProduct(billingProductId, {
        appUserId: customerSession.uid,
      });
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
      'Google Play 결제가 완료되어 청첩장을 만들었습니다. 운영 화면에서 상세 정보를 이어서 입력해 주세요.'
    );
    router.replace('/manage');
  }, [
    brideKoreanName,
    brideEnglishName,
    clearAuthError,
    createInvitationPage,
    customerSession,
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
    customerEmail,
    setCustomerEmail,
    customerPassword,
    setCustomerPassword,
    customerSession,
    customerAuthError,
    isCustomerAuthenticating,
    handleCustomerLogin,
    handleCustomerLogout,
    groomKoreanName,
    setGroomKoreanName,
    brideKoreanName,
    setBrideKoreanName,
    groomEnglishName,
    setGroomEnglishName,
    brideEnglishName,
    setBrideEnglishName,
    pageIdentifier,
    setPageIdentifier: handlePageIdentifierChange,
    pageIdentifierHelperText,
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
    ticketUnitPrice: TICKET_UNIT_PRICE,
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
