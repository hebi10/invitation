import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { ChoiceChip } from '../../components/ChoiceChip';
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { WebPreviewNotice } from '../../components/WebPreviewNotice';
import {
  designThemes,
  servicePlans,
  ticketPricing,
} from '../../constants/content';
import { useAuth } from '../../contexts/AuthContext';
import { useDrafts } from '../../contexts/DraftsContext';
import { useInvitationOps } from '../../contexts/InvitationOpsContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { adjustMobileInvitationTicketCount } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import {
  buildPageSlugBaseFromEnglishNames,
  isValidEnglishName,
} from '../../lib/pageSlug';
import {
  buildLinkedInvitationCardFromPageSummary,
  getLinkedInvitationCards,
  mergeLinkedInvitationCard,
  setLinkedInvitationCards as persistLinkedInvitationCards,
  type LinkedInvitationCard,
} from '../../lib/linkedInvitationCards';
import type {
  MobileInvitationProductTier,
  MobileInvitationThemeKey,
} from '../../types/mobileInvitation';

const FLOW_GUIDE_ITEMS = [
  '신랑·신부 한글 이름, 영문 이름, 페이지 비밀번호를 먼저 확인합니다.',
  '서비스와 디자인을 선택하고, 필요한 경우 추가 티켓 수량도 함께 정합니다.',
  '결제 확인 팝업을 거친 뒤 바로 페이지를 생성하고 운영 탭으로 이동합니다.',
] as const;

const TICKET_USAGE_ITEMS = [
  '티켓 1장: 1개월 연장',
  '티켓 1장: 디자인 변경',
  '티켓 2장: 같은 청첩장에 다른 디자인 추가',
  '티켓 2장: 서비스 업그레이드',
] as const;

const TICKET_UNIT_PRICE = ticketPricing.unitPrice;
const TICKET_DISCOUNT_BUNDLE_SIZE = ticketPricing.bundleSize;
const TICKET_BUNDLE_PRICE = ticketPricing.bundlePrice;
const TICKET_PRESET_COUNTS = [0, 1, 3, 6] as const;
const MAX_TICKET_COUNT = 12;

type CreateValidationRule = {
  section: 'input' | 'selection';
  label: string;
  passed: boolean;
  errorMessage: string;
};

type TicketPurchaseSuccessState = {
  ticketCount: number;
  targetDisplayName: string;
  nextTicketCount: number;
};

function calculateTicketPrice(ticketCount: number) {
  const bundleCount = Math.floor(ticketCount / TICKET_DISCOUNT_BUNDLE_SIZE);
  const remainderCount = ticketCount % TICKET_DISCOUNT_BUNDLE_SIZE;

  return bundleCount * TICKET_BUNDLE_PRICE + remainderCount * TICKET_UNIT_PRICE;
}

function buildCreateValidationRules(input: {
  groomKoreanName: string;
  brideKoreanName: string;
  groomEnglishName: string;
  brideEnglishName: string;
  slugPreview: string;
  password: string;
  confirmPassword: string;
  selectedTheme: MobileInvitationThemeKey | null;
}): CreateValidationRule[] {
  const groomKoreanName = input.groomKoreanName.trim();
  const brideKoreanName = input.brideKoreanName.trim();
  const groomEnglishName = input.groomEnglishName.trim();
  const brideEnglishName = input.brideEnglishName.trim();
  const password = input.password.trim();
  const confirmPassword = input.confirmPassword.trim();

  return [
    {
      label: '신랑 한글 이름',
      section: 'input',
      passed: Boolean(groomKoreanName),
      errorMessage: '신랑 한글 이름을 입력해 주세요.',
    },
    {
      label: '신부 한글 이름',
      section: 'input',
      passed: Boolean(brideKoreanName),
      errorMessage: '신부 한글 이름을 입력해 주세요.',
    },
    {
      label: '신랑 영문 이름',
      section: 'input',
      passed: Boolean(groomEnglishName) && isValidEnglishName(groomEnglishName),
      errorMessage: !groomEnglishName
        ? '신랑 영문 이름을 입력해 주세요.'
        : '신랑 영문 이름은 영문, 공백, 하이픈만 사용할 수 있습니다.',
    },
    {
      label: '신부 영문 이름',
      section: 'input',
      passed: Boolean(brideEnglishName) && isValidEnglishName(brideEnglishName),
      errorMessage: !brideEnglishName
        ? '신부 영문 이름을 입력해 주세요.'
        : '신부 영문 이름은 영문, 공백, 하이픈만 사용할 수 있습니다.',
    },
    {
      label: 'URL 슬러그 생성',
      section: 'input',
      passed: Boolean(input.slugPreview),
      errorMessage: '영문 이름으로 사용할 페이지 주소를 만들 수 없습니다.',
    },
    {
      label: '페이지 비밀번호',
      section: 'input',
      passed: password.length >= 4,
      errorMessage: !password
        ? '페이지 비밀번호를 입력해 주세요.'
        : '페이지 비밀번호는 4자 이상으로 입력해 주세요.',
    },
    {
      label: '비밀번호 확인',
      section: 'input',
      passed: Boolean(confirmPassword) && password === confirmPassword,
      errorMessage: !confirmPassword
        ? '비밀번호 확인을 입력해 주세요.'
        : '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
    },
    {
      label: '디자인 선택',
      section: 'selection',
      passed: Boolean(input.selectedTheme),
      errorMessage: '디자인을 먼저 선택해 주세요.',
    },
  ];
}

export default function CreateScreen() {
  const router = useRouter();
  const isExpoWebPreview = Platform.OS === 'web';
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
  const { apiBaseUrl, palette } = usePreferences();
  const {
    authError,
    clearAuthError,
    createInvitationPage,
    isAuthenticating,
    session,
  } = useAuth();
  const { pageSummary, refreshDashboard, adjustTicketCount } = useInvitationOps();
  const { drafts, removeDraft, saveDraft } = useDrafts();

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
  const [ticketOnlyModalVisible, setTicketOnlyModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);
  const [handledTicketIntentKey, setHandledTicketIntentKey] = useState<string | null>(null);
  const [linkedInvitationCards, setLinkedInvitationCards] = useState<LinkedInvitationCard[]>([]);
  const [selectedTicketTargetSlug, setSelectedTicketTargetSlug] = useState<string | null>(null);
  const [isTicketPurchaseSubmitting, setIsTicketPurchaseSubmitting] = useState(false);
  const [ticketPurchaseSuccess, setTicketPurchaseSuccess] =
    useState<TicketPurchaseSuccessState | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const [inputSectionOffsetY, setInputSectionOffsetY] = useState(0);
  const [selectionSectionOffsetY, setSelectionSectionOffsetY] = useState(0);

  const selectedPlanInfo = useMemo(
    () => servicePlans.find((plan) => plan.tier === selectedPlan) ?? servicePlans[0],
    [selectedPlan]
  );
  const selectedThemeInfo = useMemo(
    () => designThemes.find((theme) => theme.key === selectedTheme) ?? null,
    [selectedTheme]
  );
  const ticketPrice = useMemo(() => calculateTicketPrice(ticketCount), [ticketCount]);
  const discountedBundleCount = Math.floor(ticketCount / TICKET_DISCOUNT_BUNDLE_SIZE);
  const remainderTicketCount = ticketCount % TICKET_DISCOUNT_BUNDLE_SIZE;
  const totalPrice = selectedPlanInfo.price + ticketPrice;
  const slugPreview = useMemo(
    () => buildPageSlugBaseFromEnglishNames(groomEnglishName, brideEnglishName),
    [brideEnglishName, groomEnglishName]
  );
  const publicUrlPreview = useMemo(() => {
    const baseUrl = apiBaseUrl.replace(/\/+$/g, '');
    return slugPreview ? `${baseUrl}/${slugPreview}` : `${baseUrl}/...`;
  }, [apiBaseUrl, slugPreview]);
  const normalizedDraftId = Array.isArray(draftIdParam) ? draftIdParam[0] : draftIdParam;
  const normalizedTicketIntent = Array.isArray(ticketIntentParam)
    ? ticketIntentParam[0]
    : ticketIntentParam;
  const normalizedTargetPlan = Array.isArray(targetPlanParam) ? targetPlanParam[0] : targetPlanParam;
  const normalizedTargetTheme = Array.isArray(targetThemeParam)
    ? targetThemeParam[0]
    : targetThemeParam;

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

      nextCards = [mergedCurrentCard, ...nextCards.filter((item) => item.slug !== mergedCurrentCard.slug)];
      await persistLinkedInvitationCards(nextCards);
    }

    setLinkedInvitationCards(nextCards);
  }, [pageSummary, session]);

  const validationRules = useMemo(
    () =>
      buildCreateValidationRules({
        groomKoreanName,
        brideKoreanName,
        groomEnglishName,
        brideEnglishName,
        slugPreview,
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
      slugPreview,
    ]
  );

  const validationChecklist = useMemo(
    () => validationRules.map(({ label, passed }) => ({ label, passed })),
    [validationRules]
  );

  const validationMessages = useMemo(
    () => validationRules.filter((rule) => !rule.passed).map((rule) => rule.errorMessage),
    [validationRules]
  );

  const selectedTicketTargetCard = useMemo(
    () =>
      linkedInvitationCards.find((item) => item.slug === selectedTicketTargetSlug) ??
      linkedInvitationCards[0] ??
      null,
    [linkedInvitationCards, selectedTicketTargetSlug]
  );

  const hasTicketPurchaseTarget = Boolean(selectedTicketTargetCard);
  const hasLinkedInvitation = hasTicketPurchaseTarget;
  const storedTicketCount = selectedTicketTargetCard?.ticketCount ?? 0;

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

    if (
      normalizedTargetPlan === 'standard' ||
      normalizedTargetPlan === 'deluxe' ||
      normalizedTargetPlan === 'premium'
    ) {
      setSelectedPlan(normalizedTargetPlan);
    }

    if (normalizedTargetTheme === 'emotional' || normalizedTargetTheme === 'simple') {
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

    setHandledTicketIntentKey(intentKey);
  }, [
    handledTicketIntentKey,
    normalizedTargetPlan,
    normalizedTargetTheme,
    normalizedTicketIntent,
  ]);

  const resetForm = () => {
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
    setTicketOnlyModalVisible(false);
    clearAuthError();
  };

  const updateTicketCount = (nextCount: number) => {
    setTicketCount(Math.max(0, Math.min(MAX_TICKET_COUNT, nextCount)));
  };

  const handleSaveDraft = async () => {
    if (!groomKoreanName.trim() || !brideKoreanName.trim()) {
      setNotice('초안 저장 전에는 신랑·신부 한글 이름을 먼저 입력해 주세요.');
      return;
    }

    if (!selectedTheme) {
      setNotice('초안 저장 전에는 디자인을 먼저 선택해 주세요.');
      scrollRef.current?.scrollTo({ y: selectionSectionOffsetY, animated: true });
      return;
    }

    const savedDraftId = await saveDraft(
      {
        servicePlan: selectedPlan,
        theme: selectedTheme ?? 'emotional',
        pageIdentifier: slugPreview,
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
  };

  const handleOpenPaymentModal = () => {
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
      scrollRef.current?.scrollTo({
        y: firstInvalidRule?.section === 'selection' ? selectionSectionOffsetY : inputSectionOffsetY,
        animated: true,
      });
      return;
    }

    setNotice('');
    setPaymentModalVisible(true);
  };

  const handleOpenTicketOnlyModal = () => {
    clearAuthError();

    if (!selectedTicketTargetCard?.session) {
      setNotice('연동된 청첩장이 있을 때만 티켓만 구매할 수 있습니다. 먼저 페이지를 연동해 주세요.');
      return;
    }

    if (ticketCount <= 0) {
      setNotice('티켓만 구매하려면 먼저 티켓 수량을 선택해 주세요.');
      return;
    }

    setNotice('');
    setTicketOnlyModalVisible(true);
  };

  const handleConfirmTicketOnlyPurchase = async () => {
    clearAuthError();
    setNotice('');

    if (!selectedTicketTargetCard?.session) {
      setNotice('연동된 청첩장이 없어서 티켓을 적립할 수 없습니다. 먼저 페이지를 연동해 주세요.');
      return;
    }

    const purchaseTargetDisplayName =
      selectedTicketTargetCard.displayName.trim() || selectedTicketTargetCard.slug;

    setIsTicketPurchaseSubmitting(true);

    // 현재 활성 청첩장이 아닌 다른 연동 카드에 적립할 때는,
    // 해당 카드에 저장된 세션 토큰으로 직접 서버를 호출해야 한다.
    const nextTicketCount =
      session && selectedTicketTargetCard.slug === session.pageSlug
        ? await adjustTicketCount(ticketCount)
        : await adjustMobileInvitationTicketCount(
            apiBaseUrl,
            selectedTicketTargetCard.slug,
            selectedTicketTargetCard.session.token,
            ticketCount
          )
            .then((response) => response.ticketCount)
            .catch((error) => {
              setNotice(
                error instanceof Error
                  ? error.message
                  : '티켓을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
              );
              return null;
            });

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
    setTicketCount(0);
    setTicketPurchaseSuccess({
      ticketCount,
      targetDisplayName: purchaseTargetDisplayName,
      nextTicketCount,
    });
  };

  const handleConfirmCreate = async () => {
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
      scrollRef.current?.scrollTo({
        y: firstInvalidRule?.section === 'selection' ? selectionSectionOffsetY : inputSectionOffsetY,
        animated: true,
      });
      return;
    }

    setIsSubmitting(true);
    clearAuthError();

    const created = await createInvitationPage({
      slugBase: slugPreview,
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
  };

  return (
    <>
      <AppScreen
        title="구매"
        subtitle="구매 탭에서는 제작 초안을 기기에 저장하고, 결제 확인 시점에만 실제 페이지를 생성합니다."
        scrollRef={scrollRef}
      >
        {isExpoWebPreview ? (
          <WebPreviewNotice
            title="웹 생성 제한 안내"
            description="Expo 웹 빌드에서는 실제 페이지 생성 요청을 보내지 않습니다."
          />
        ) : null}

        <SectionCard
          title="진행 안내"
          description="구매 탭에서는 입력 정보 확인부터 페이지 생성 후 운영 이동까지 같은 흐름으로 처리합니다."
        >
          <BulletList items={[...FLOW_GUIDE_ITEMS]} />
        </SectionCard>

        <View onLayout={(event) => setInputSectionOffsetY(event.nativeEvent.layout.y)}>
        <SectionCard
          title="1. 입력 정보 확인"
          description="신랑·신부 한글 이름과 영문 이름을 확인하면, 영문 이름 기준으로 페이지 URL이 자동 생성됩니다."
          badge={validationMessages.length === 0 ? '입력 완료' : `${validationMessages.length}개 확인 필요`}
        >
          <TextField
            label="신랑 한글 이름"
            value={groomKoreanName}
            onChangeText={setGroomKoreanName}
            placeholder="예: 김신랑"
          />
          <TextField
            label="신부 한글 이름"
            value={brideKoreanName}
            onChangeText={setBrideKoreanName}
            placeholder="예: 나신부"
          />
          <TextField
            label="신랑 영문 이름"
            value={groomEnglishName}
            onChangeText={setGroomEnglishName}
            placeholder="예: kim-shinlang"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="신부 영문 이름"
            value={brideEnglishName}
            onChangeText={setBrideEnglishName}
            placeholder="예: na-sinbu"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="페이지 비밀번호"
            value={password}
            onChangeText={setPassword}
            placeholder="페이지별 비밀번호 입력"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <TextField
            label="비밀번호 확인"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="비밀번호를 한 번 더 입력"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleOpenPaymentModal}
          />

          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText variant="caption" style={styles.previewLabel}>
              생성될 URL 미리보기
            </AppText>
            <AppText style={styles.previewValue}>
              {publicUrlPreview}
            </AppText>
          </View>

          <View style={styles.validationList}>
            {validationChecklist.map((item) => (
              <View key={item.label} style={styles.validationRow}>
                <AppText
                  variant="caption"
                  color={item.passed ? palette.accent : palette.danger}
                  style={styles.validationState}
                >
                  {item.passed ? '완료' : '확인 필요'}
                </AppText>
                <AppText style={styles.validationText}>
                  {item.label}
                </AppText>
              </View>
            ))}
          </View>

          {validationMessages.length > 0 ? (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: palette.dangerSoft,
                  borderColor: palette.danger,
                },
              ]}
            >
              {validationMessages.map((message) => (
                <AppText
                  key={message}
                  variant="caption"
                  color={palette.danger}
                  style={styles.noticeText}
                >
                  · {message}
                </AppText>
              ))}
            </View>
          ) : null}
        </SectionCard>
        </View>

        <View onLayout={(event) => setSelectionSectionOffsetY(event.nativeEvent.layout.y)}>
        <SectionCard
          title="2. 서비스와 디자인 선택"
          description="서비스에 따라 기본 기능과 가격이 달라지고, 디자인은 생성 직후 기본 테마로 적용됩니다."
        >
          <View style={styles.chipRow}>
            {servicePlans.map((plan) => (
              <ChoiceChip
                key={plan.name}
                label={`${plan.name} · ${formatPrice(plan.price)}`}
                selected={selectedPlan === plan.tier}
                onPress={() => setSelectedPlan(plan.tier)}
              />
            ))}
          </View>
          <AppText variant="muted" style={styles.helperText}>
            {selectedPlanInfo.description}
          </AppText>
          <BulletList items={selectedPlanInfo.features} />

          <View
            style={[
              styles.divider,
              {
                backgroundColor: palette.cardBorder,
              },
            ]}
          />

          <View style={styles.chipRow}>
            <ChoiceChip
              label="선택하기"
              selected={selectedTheme === null}
              onPress={() => setSelectedTheme(null)}
            />
            {designThemes.map((theme) => (
              <ChoiceChip
                key={theme.key}
                label={theme.label}
                selected={selectedTheme === theme.key}
                onPress={() => setSelectedTheme(theme.key)}
              />
            ))}
          </View>
          <AppText variant="muted" style={styles.helperText}>
            선택한 디자인: {selectedThemeInfo?.description ?? '아직 디자인을 선택하지 않았습니다.'}
          </AppText>
        </SectionCard>
        </View>

        <SectionCard
          title="추가 티켓 구매"
          description="티켓은 수량만 먼저 구매하고, 사용 범위는 아래 정책에 따라 적용됩니다."
          badge={`${ticketCount}장`}
        >
          <AppText variant="muted" style={styles.helperText}>
            1장당 4,000원이며 3장 구매 시 10,000원으로 계산됩니다.
          </AppText>

          <View style={styles.ticketPresetRow}>
            {TICKET_PRESET_COUNTS.map((count) => (
              <ChoiceChip
                key={count}
                label={`${count}장`}
                selected={ticketCount === count}
                onPress={() => updateTicketCount(count)}
              />
            ))}
          </View>

          <View
            style={[
              styles.ticketCounterCard,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="추가 티켓 1장 줄이기"
              accessibilityHint="구매할 티켓 수량을 1장 줄입니다."
              accessibilityState={{ disabled: ticketCount <= 0 }}
              disabled={ticketCount <= 0}
              onPress={() => updateTicketCount(ticketCount - 1)}
              style={[
                styles.ticketCounterButton,
                { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                ticketCount <= 0 ? styles.ticketCounterButtonDisabled : null,
              ]}
            >
              <AppText variant="title" style={styles.ticketCounterButtonLabel}>
                -
              </AppText>
            </Pressable>
            <View style={styles.ticketCounterValueBox}>
              <AppText variant="title" style={styles.ticketCounterValue}>
                {ticketCount}
              </AppText>
              <AppText variant="caption" style={styles.ticketCounterCaption}>
                구매할 티켓 장수
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="추가 티켓 1장 늘리기"
              accessibilityHint="구매할 티켓 수량을 1장 늘립니다."
              accessibilityState={{ disabled: ticketCount >= MAX_TICKET_COUNT }}
              disabled={ticketCount >= MAX_TICKET_COUNT}
              onPress={() => updateTicketCount(ticketCount + 1)}
              style={[
                styles.ticketCounterButton,
                { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                ticketCount >= MAX_TICKET_COUNT ? styles.ticketCounterButtonDisabled : null,
              ]}
            >
              <AppText variant="title" style={styles.ticketCounterButtonLabel}>
                +
              </AppText>
            </Pressable>
          </View>

          <View
            style={[
              styles.ticketSummaryCard,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <AppText style={styles.ticketSummaryText}>
              3장 할인 묶음: {discountedBundleCount}개
            </AppText>
            <AppText style={styles.ticketSummaryText}>
              낱장 계산: {remainderTicketCount}장
            </AppText>
            <AppText color={palette.accent} style={styles.ticketSummaryText}>
              티켓 금액: {formatPrice(ticketPrice)}
            </AppText>
          </View>

          <BulletList items={[...TICKET_USAGE_ITEMS]} />

          <AppText variant="muted" style={styles.helperText}>
            {hasLinkedInvitation
              ? `현재 선택된 적립 대상: ${
                  selectedTicketTargetCard?.displayName.trim() || selectedTicketTargetCard?.slug || '-'
                } · 보유 티켓 ${storedTicketCount}장`
              : '연동된 청첩장이 있을 때만 티켓만 구매를 사용할 수 있습니다.'}
          </AppText>

          <ActionButton
            variant="secondary"
            onPress={handleOpenTicketOnlyModal}
            disabled={ticketCount <= 0 || !hasLinkedInvitation}
            fullWidth
          >
            티켓만 구매
          </ActionButton>
        </SectionCard>

        <SectionCard
          title="3. 결제 확인과 페이지 생성"
          description="현재는 실제 결제 연동 대신 확인 팝업만 띄우고, 확인 즉시 페이지를 생성한 뒤 운영 탭으로 이동합니다."
        >
          <View style={styles.summaryRow}>
            <AppText style={styles.summaryLabel}>기본 서비스</AppText>
            <AppText style={styles.summaryValue}>
              {formatPrice(selectedPlanInfo.price)}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText style={styles.summaryLabel}>추가 티켓</AppText>
            <AppText style={styles.summaryValue}>
              {ticketCount}장 / {formatPrice(ticketPrice)}
            </AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText style={styles.summaryLabel}>예상 총액</AppText>
            <AppText variant="title" color={palette.accent} style={styles.totalLabel}>
              {formatPrice(totalPrice)}
            </AppText>
          </View>

          {notice ? (
            <AppText variant="caption" color={palette.accent} style={styles.helperText}>
              {notice}
            </AppText>
          ) : null}

          {authError ? (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: palette.dangerSoft,
                  borderColor: palette.danger,
                },
              ]}
            >
              <AppText variant="caption" color={palette.danger} style={styles.noticeText}>
                {authError}
              </AppText>
            </View>
          ) : null}

          <View style={styles.actionColumn}>
            <ActionButton variant="secondary" onPress={() => void handleSaveDraft()} fullWidth>
              제작 초안 저장
            </ActionButton>
            <ActionButton
              onPress={handleOpenPaymentModal}
              disabled={isExpoWebPreview}
              fullWidth
            >
              결제 확인 팝업 열기
            </ActionButton>
          </View>
        </SectionCard>
      </AppScreen>

      <Modal
        visible={paymentModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="결제 확인 팝업 닫기"
            style={[
              styles.modalBackdrop,
              {
                backgroundColor: palette.background,
                opacity: 0.78,
              },
            ]}
            onPress={() => setPaymentModalVisible(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="title" style={styles.modalTitle}>
                결제 확인
              </AppText>
              <AppText variant="muted" style={styles.modalDescription}>
                실제 결제는 아직 연결하지 않았습니다. 이 팝업에서 확인을 누르면 페이지를 생성하고 운영 탭으로 바로 이동합니다.
              </AppText>

              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>서비스</AppText>
                <AppText style={styles.summaryValue}>
                  {selectedPlanInfo.name}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>디자인</AppText>
                <AppText style={styles.summaryValue}>
                  {selectedThemeInfo?.label ?? '선택 필요'}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>추가 티켓</AppText>
                <AppText style={styles.summaryValue}>
                  {ticketCount}장 / {formatPrice(ticketPrice)}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>생성 URL</AppText>
                <AppText style={styles.summaryValue}>
                  {slugPreview}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>결제 예정 금액</AppText>
                <AppText variant="title" color={palette.accent} style={styles.totalLabel}>
                  {formatPrice(totalPrice)}
                </AppText>
              </View>

              {authError ? (
                <AppText variant="caption" color={palette.danger} style={styles.modalErrorText}>
                  {authError}
                </AppText>
              ) : null}

              <View style={styles.actionColumn}>
                <ActionButton
                  variant="secondary"
                  onPress={() => setPaymentModalVisible(false)}
                  fullWidth
                >
                  다시 확인하기
                </ActionButton>
                <ActionButton
                  onPress={() => void handleConfirmCreate()}
                  loading={isSubmitting || isAuthenticating}
                  fullWidth
                >
                  확인 후 페이지 생성
                </ActionButton>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={ticketOnlyModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setTicketOnlyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="티켓 전용 결제 확인 팝업 닫기"
            style={[
              styles.modalBackdrop,
              {
                backgroundColor: palette.background,
                opacity: 0.78,
              },
            ]}
            onPress={() => setTicketOnlyModalVisible(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="title" style={styles.modalTitle}>
                티켓 전용 결제 확인
              </AppText>
              <AppText variant="muted" style={styles.modalDescription}>
                이 창은 추가 티켓만 먼저 결제하려는 경우를 위한 확인 단계입니다.
                실제 결제는 아직 연결하지 않았고, 현재는 금액과 사용 범위만 확인할 수 있습니다.
              </AppText>

              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>티켓 수량</AppText>
                <AppText style={styles.summaryValue}>{ticketCount}장</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>3장 할인 묶음</AppText>
                <AppText style={styles.summaryValue}>{discountedBundleCount}개</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>낱장 계산</AppText>
                <AppText style={styles.summaryValue}>{remainderTicketCount}장</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>티켓 결제 예정 금액</AppText>
                <AppText variant="title" color={palette.accent} style={styles.totalLabel}>
                  {formatPrice(ticketPrice)}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>적립 대상</AppText>
                <AppText style={styles.summaryValue}>
                  {selectedTicketTargetCard?.displayName?.trim() ||
                    selectedTicketTargetCard?.slug ||
                    '연동된 청첩장이 필요합니다'}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>현재 보유 티켓</AppText>
                <AppText style={styles.summaryValue}>{storedTicketCount}장</AppText>
              </View>

              {linkedInvitationCards.length > 1 ? (
                <View style={styles.actionColumn}>
                  <AppText variant="caption" style={styles.summaryLabel}>
                    티켓 적립 대상 선택
                  </AppText>
                  <View style={styles.chipRow}>
                    {linkedInvitationCards.map((item) => (
                      <ChoiceChip
                        key={`ticket-target-${item.slug}`}
                        label={item.displayName.trim() || item.slug}
                        selected={selectedTicketTargetCard?.slug === item.slug}
                        onPress={() => setSelectedTicketTargetSlug(item.slug)}
                      />
                    ))}
                  </View>
                  <AppText variant="muted" style={styles.helperText}>
                    선택한 청첩장에 티켓이 적립되고, 운영 탭에서도 같은 수량을 바로 확인할 수 있습니다.
                  </AppText>
                </View>
              ) : null}

              <BulletList items={[...TICKET_USAGE_ITEMS]} />

              {notice ? (
                <AppText variant="caption" color={palette.accent} style={styles.helperText}>
                  {notice}
                </AppText>
              ) : null}

              {authError ? (
                <View
                  style={[
                    styles.noticeBox,
                    {
                      backgroundColor: palette.dangerSoft,
                      borderColor: palette.danger,
                    },
                  ]}
                >
                  <AppText variant="caption" color={palette.danger} style={styles.noticeText}>
                    {authError}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.actionColumn}>
                <ActionButton
                  variant="secondary"
                  onPress={() => setTicketOnlyModalVisible(false)}
                  fullWidth
                >
                  다시 확인하기
                </ActionButton>
                <ActionButton
                  onPress={handleConfirmTicketOnlyPurchase}
                  loading={isTicketPurchaseSubmitting}
                  fullWidth
                >
                  티켓 전용 결제 확인
                </ActionButton>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={ticketPurchaseSuccess !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setTicketPurchaseSuccess(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="티켓 구매 완료 팝업 닫기"
            style={[
              styles.modalBackdrop,
              {
                backgroundColor: palette.background,
                opacity: 0.78,
              },
            ]}
            onPress={() => setTicketPurchaseSuccess(null)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <View style={styles.modalScrollContent}>
              <AppText variant="title" style={styles.modalTitle}>
                구매 완료됐습니다
              </AppText>
              <AppText variant="muted" style={styles.modalDescription}>
                선택한 청첩장에 티켓 적립이 정상적으로 완료되었습니다.
              </AppText>

              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>적립 대상</AppText>
                <AppText style={styles.summaryValue}>
                  {ticketPurchaseSuccess?.targetDisplayName ?? '-'}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>구매한 티켓</AppText>
                <AppText style={styles.summaryValue}>
                  {ticketPurchaseSuccess?.ticketCount ?? 0}장
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>현재 보유 티켓</AppText>
                <AppText variant="title" color={palette.accent} style={styles.totalLabel}>
                  {ticketPurchaseSuccess?.nextTicketCount ?? 0}장
                </AppText>
              </View>

              <ActionButton onPress={() => setTicketPurchaseSuccess(null)} fullWidth>
                확인
              </ActionButton>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperText: {
    lineHeight: 21,
  },
  divider: {
    height: 1,
    opacity: 0.7,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  previewLabel: {
    fontWeight: '700',
  },
  previewValue: {
    fontWeight: '700',
  },
  validationList: {
    gap: 8,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationState: {
    width: 60,
    fontWeight: '800',
  },
  validationText: {
    flex: 1,
    lineHeight: 20,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  noticeText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  ticketPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketCounterCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  ticketCounterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCounterButtonDisabled: {
    opacity: 0.45,
  },
  ticketCounterButtonLabel: {
    fontWeight: '800',
  },
  ticketCounterValueBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  ticketCounterValue: {
    fontWeight: '800',
  },
  ticketCounterCaption: {
    fontWeight: '600',
  },
  ticketSummaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  ticketSummaryText: {
    lineHeight: 20,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    lineHeight: 20,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  totalLabel: {
    fontWeight: '800',
  },
  actionColumn: {
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    gap: 14,
    paddingBottom: 2,
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalDescription: {
    lineHeight: 21,
  },
  modalErrorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
});
