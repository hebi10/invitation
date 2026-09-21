import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountHelpLinks } from '../../components/AccountHelpLinks';
import { ThemePreviewGallery } from '../../components/ThemePreviewGallery';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { ChoiceChip } from '../../components/ChoiceChip';
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { WebPreviewNotice } from '../../components/WebPreviewNotice';
import { PaymentConfirmModal } from '../../features/create/components/PaymentConfirmModal';
import { TicketOnlyPurchaseModal } from '../../features/create/components/TicketOnlyPurchaseModal';
import { TicketPurchaseSuccessModal } from '../../features/create/components/TicketPurchaseSuccessModal';
import { createStyles as styles } from '../../features/create/createStyles';
import { useCreateForm } from '../../features/create/hooks/useCreateForm';
import { useCreateTicketPurchase } from '../../features/create/hooks/useCreateTicketPurchase';
import {
  CREATE_STEPS,
  CREATE_PAGE_IDENTIFIER_MAX_LENGTH,
  MAX_TICKET_COUNT,
  STICKY_CTA_BAR_COMPACT_HEIGHT,
  STICKY_CTA_BAR_HEIGHT,
  TICKET_PRESET_COUNTS,
  TICKET_USAGE_ITEMS,
  servicePlans,
} from '../../features/create/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useAppFeedback } from '../../contexts/AppFeedbackContext';
import { useDrafts } from '../../contexts/DraftsContext';
import { useInvitationOps } from '../../contexts/InvitationOpsContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useNoticeToast } from '../../hooks/useNoticeToast';
import { formatPrice } from '../../lib/format';

export default function CreateScreen() {
  const isExpoWebPreview = Platform.OS === 'web';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const autoSaveProgressRef = useRef<(() => Promise<boolean>) | null>(null);
  const ticketOnlySectionAnimation = useRef(new Animated.Value(0)).current;
  const [isTicketOnlySectionExpanded, setIsTicketOnlySectionExpanded] = useState(false);
  const [isTicketOnlySectionVisible, setIsTicketOnlySectionVisible] = useState(false);

  const { apiBaseUrl, palette } = usePreferences();
  const { showToast } = useAppFeedback();
  const {
    authError,
    clearAuthError,
    createInvitationPage,
    customerAuthError,
    customerSession,
    isAuthenticating,
    isCustomerAuthenticating,
    loginCustomer,
    logoutCustomer,
    session,
  } = useAuth();
  const { pageSummary, refreshDashboard } = useInvitationOps();
  const { drafts, removeDraft, saveDraft } = useDrafts();

  const createForm = useCreateForm({
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
  });

  const ticketPurchase = useCreateTicketPurchase({
    apiBaseUrl,
    pageSummary,
    session,
    customerSession,
    refreshDashboard,
    clearAuthError,
    setNotice: createForm.setNotice,
  });

  const isCompactStickyBar = width < 390;
  const stickyBarHeight = isCompactStickyBar
    ? STICKY_CTA_BAR_COMPACT_HEIGHT
    : STICKY_CTA_BAR_HEIGHT;
  const stickyBarBottomInset = Math.max(insets.bottom, 12);
  const screenBottomPadding = stickyBarHeight + stickyBarBottomInset + 24;

  useNoticeToast(createForm.notice);
  useNoticeToast(authError, { tone: 'error' });

  useEffect(() => {
    autoSaveProgressRef.current = createForm.autoSaveProgress;
  }, [createForm.autoSaveProgress]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [createForm.currentStep]);

  useEffect(() => {
    if (isTicketOnlySectionExpanded) {
      setIsTicketOnlySectionVisible(true);
    }

    ticketOnlySectionAnimation.stopAnimation();
    Animated.timing(ticketOnlySectionAnimation, {
      toValue: isTicketOnlySectionExpanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isTicketOnlySectionExpanded) {
        setIsTicketOnlySectionVisible(false);
      }
    });
  }, [isTicketOnlySectionExpanded, ticketOnlySectionAnimation]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void autoSaveProgressRef.current?.().then((didAutoSave) => {
          if (didAutoSave) {
            showToast('입력 중인 내용을 임시 저장했습니다.', {
              tone: 'success',
            });
          }
        });
      };
    }, [showToast])
  );

  const ticketOnlySectionSummary =
    ticketPurchase.ticketOnlyCount > 0
      ? `${ticketPurchase.ticketOnlyCount}장이 선택되어 있습니다.`
      : '필요할 때만 펼쳐서 티켓 수량을 정할 수 있습니다.';
  const ticketOnlyAnimatedStyle = {
    maxHeight: ticketOnlySectionAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1200],
    }),
    opacity: ticketOnlySectionAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        translateY: ticketOnlySectionAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
    ],
  } as const;

  return (
    <>
      <View style={[styles.screenRoot, { backgroundColor: palette.background }]}>
        <AppScreen
          title="구매"
          subtitle="기본 정보를 입력하고 서비스를 선택해 청첩장을 만들어 보세요."
          scrollRef={scrollRef}
          contentContainerStyle={{ paddingBottom: screenBottomPadding }}
        >
          {isExpoWebPreview ? (
            <WebPreviewNotice
              title="웹 생성 제한 안내"
              description="Expo 웹 빌드에서는 실제 페이지 생성 요청을 보내지 않습니다."
            />
          ) : null}

          <View style={styles.stepTabsSection}>
            <AppText variant="caption" color={palette.textMuted} style={styles.stepTabsCaption}>
              현재 단계: {createForm.currentStepIndex + 1} / {CREATE_STEPS.length} ·{' '}
              {createForm.currentStepInfo.label}
            </AppText>
            <View style={styles.stepTabsRow}>
              {CREATE_STEPS.map((step, index) => {
                const isSelected = createForm.currentStep === step.key;
                const isCompleted = createForm.stepCompletion[step.key];

                return (
                  <Pressable
                    key={step.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${index + 1}단계 ${step.label}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => createForm.handleStepTabPress(step.key)}
                    style={[
                      styles.stepTab,
                      {
                        backgroundColor: isSelected
                          ? palette.accentSoft
                          : isCompleted
                            ? palette.successSoft
                            : palette.surface,
                        borderColor: isSelected
                          ? palette.accent
                          : isCompleted
                            ? palette.success
                            : palette.cardBorder,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={isSelected ? palette.accent : isCompleted ? palette.success : palette.textMuted}
                      style={styles.stepTabIndex}
                    >
                      {index + 1}
                    </AppText>
                    <AppText style={styles.stepTabLabel}>{step.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {createForm.notice ? (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: palette.noticeSoft,
                  borderColor: palette.notice,
                },
              ]}
            >
              <AppText variant="caption" color={palette.notice} style={styles.noticeText}>
                {createForm.notice}
              </AppText>
            </View>
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

          {createForm.currentStep === 'info' ? (
            <>
              <SectionCard
                title="고객 계정 로그인"
                description="PC와 같은 고객 계정으로 로그인하면 생성한 청첩장이 내 이벤트에도 바로 연결됩니다."
                badge={createForm.customerSession ? '로그인됨' : '필수'}
                badgeTone={createForm.customerSession ? 'success' : 'notice'}
              >
                {createForm.customerSession ? (
                  <View
                    style={[
                      styles.securityGuideCard,
                      {
                        backgroundColor: palette.surfaceMuted,
                        borderColor: palette.cardBorder,
                      },
                    ]}
                  >
                    <AppText variant="caption" style={styles.previewLabel}>
                      로그인 계정
                    </AppText>
                    <AppText style={styles.helperText}>
                      {createForm.customerSession.email}
                    </AppText>
                    <ActionButton
                      variant="secondary"
                      onPress={() => void createForm.handleCustomerLogout()}
                      loading={createForm.isCustomerAuthenticating}
                      fullWidth
                    >
                      로그아웃
                    </ActionButton>
                  </View>
                ) : (
                  <>
                    <TextField
                      label="이메일"
                      value={createForm.customerEmail}
                      onChangeText={createForm.setCustomerEmail}
                      placeholder="가입한 이메일 입력"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                    <TextField
                      label="비밀번호"
                      value={createForm.customerPassword}
                      onChangeText={createForm.setCustomerPassword}
                      placeholder="비밀번호 입력"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={() => void createForm.handleCustomerLogin()}
                    />
                    <ActionButton
                      onPress={() => void createForm.handleCustomerLogin()}
                      loading={createForm.isCustomerAuthenticating}
                      fullWidth
                    >
                      고객 계정으로 로그인
                    </ActionButton>
                    <AccountHelpLinks />
                  </>
                )}

                {createForm.customerAuthError ? (
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
                      {createForm.customerAuthError}
                    </AppText>
                  </View>
                ) : null}
              </SectionCard>

              <SectionCard
                title="1. 기본 정보"
                description="청첩장에 표시할 이름과 사용할 주소를 먼저 확인합니다."
                badge={
                  createForm.basicValidationMessages.length === 0
                    ? '입력 완료'
                    : `${createForm.basicValidationMessages.length}개 확인 필요`
                }
                badgeTone={createForm.basicValidationMessages.length === 0 ? 'success' : 'notice'}
              >
                <TextField
                  label="신랑 한글 이름"
                  value={createForm.groomKoreanName}
                  onChangeText={createForm.setGroomKoreanName}
                  placeholder="예: 김신랑"
                />
                <TextField
                  label="신부 한글 이름"
                  value={createForm.brideKoreanName}
                  onChangeText={createForm.setBrideKoreanName}
                  placeholder="예: 나신부"
                />
                <TextField
                  label="신랑 영문 이름"
                  value={createForm.groomEnglishName}
                  onChangeText={createForm.setGroomEnglishName}
                  placeholder="예: minje-shin"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextField
                  label="신부 영문 이름"
                  value={createForm.brideEnglishName}
                  onChangeText={createForm.setBrideEnglishName}
                  placeholder="예: hyunji-kim"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextField
                  label="청첩장 주소"
                  value={createForm.pageIdentifier}
                  onChangeText={createForm.setPageIdentifier}
                  placeholder="예: wedding-minji-seungho"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={CREATE_PAGE_IDENTIFIER_MAX_LENGTH}
                  helperText={createForm.pageIdentifierHelperText}
                />

                <View
                  style={[
                    styles.securityGuideCard,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.cardBorder,
                    },
                  ]}
                >
                  <AppText variant="caption" style={styles.previewLabel}>
                    청첩장 링크 미리보기
                  </AppText>
                  <AppText variant="muted" style={styles.helperText}>
                    {createForm.publicUrlPreview}
                  </AppText>
                </View>

                {createForm.basicValidationMessages.length > 0 ? (
                  <View
                    style={[
                      styles.noticeBox,
                      {
                        backgroundColor: palette.dangerSoft,
                        borderColor: palette.danger,
                      },
                    ]}
                  >
                    {createForm.basicValidationMessages.map((message) => (
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
            </>
          ) : null}

          {createForm.currentStep === 'selection' ? (
            <SectionCard
              title="2. 서비스 선택"
              description="모든 서비스는 하위 서비스를 포함합니다."
              badge={
                createForm.selectionValidationMessages.length === 0
                  ? '선택 완료'
                  : `${createForm.selectionValidationMessages.length}개 확인 필요`
              }
              badgeTone={
                createForm.selectionValidationMessages.length === 0 ? 'success' : 'notice'
              }
            >
              <View style={styles.chipRow}>
                {servicePlans.map((plan) => (
                  <ChoiceChip
                    key={plan.name}
                    label={plan.name}
                    selected={createForm.selectedPlan === plan.tier}
                    onPress={() => createForm.setSelectedPlan(plan.tier)}
                  />
                ))}
              </View>

              <View
                style={[
                  styles.selectionSummaryCard,
                  {
                    backgroundColor: palette.surfaceMuted,
                    borderColor: palette.cardBorder,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.textMuted} style={styles.selectionSummaryLabel}>
                  현재 선택한 서비스
                </AppText>
                <AppText variant="title" style={styles.selectionSummaryValue}>
                  {createForm.selectedPlanInfo.name} · {formatPrice(createForm.selectedPlanInfo.price)}
                </AppText>
                <View style={styles.selectionFeatureRow}>
                  {createForm.selectedPlanHighlights.map((feature) => (
                    <View
                      key={`selected-plan-${feature}`}
                      style={[
                        styles.selectionFeatureChip,
                        {
                          backgroundColor: palette.accentSoft,
                        },
                      ]}
                    >
                      <AppText variant="caption" color={palette.textMuted}>
                        {feature}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: palette.cardBorder,
                  },
                ]}
              />

              <AppText variant="muted" style={styles.selectionSummaryDescription}>
                청첩장을 한 번 만들면 주소 뒤에 디자인 이름을 붙여 모든 웨딩 디자인을 열 수 있습니다. 샘플은 미리보기용입니다.
              </AppText>
              <ThemePreviewGallery tier={createForm.selectedPlanInfo.tier} />

              {createForm.selectionValidationMessages.length > 0 ? (
                <View
                  style={[
                    styles.noticeBox,
                    {
                      backgroundColor: palette.dangerSoft,
                      borderColor: palette.danger,
                    },
                  ]}
                >
                  {createForm.selectionValidationMessages.map((message) => (
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
          ) : null}

          {createForm.currentStep === 'review' ? (
            <SectionCard
              title="3. 확인 및 결제"
              description="선택한 구성과 금액을 마지막으로 확인한 뒤 결제를 진행합니다."
              badge={createForm.validationMessages.length === 0 ? '결제 준비 완료' : '확인 필요'}
              badgeTone={createForm.validationMessages.length === 0 ? 'success' : 'notice'}
              variant="emphasis"
            >
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>선택한 서비스</AppText>
                <AppText style={styles.summaryValue}>{createForm.selectedPlanInfo.name}</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>사용 가능한 디자인</AppText>
                <AppText style={styles.summaryValue}>
                  모든 웨딩 디자인
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>기본 서비스 금액</AppText>
                <AppText style={styles.summaryValue}>
                  {formatPrice(createForm.selectedPlanInfo.price)}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>예상 총액</AppText>
                <AppText variant="display" style={styles.totalLabel}>
                  {formatPrice(createForm.totalPrice)}
                </AppText>
              </View>

              <View style={styles.actionColumn}>
                <ActionButton variant="secondary" onPress={() => void createForm.handleSaveDraft()} fullWidth>
                  제작 초안 저장
                </ActionButton>
              </View>
            </SectionCard>
          ) : null}
          <SectionCard
            title="티켓 구매"
            description="이미 연동된 청첩장에 필요한 티켓만 별도로 적립합니다."
            badge={`${ticketPurchase.ticketOnlyCount}장`}
            badgeTone="neutral"
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isTicketOnlySectionExpanded ? '티켓만 구매 영역 접기' : '티켓만 구매 영역 펼치기'
              }
              accessibilityState={{ expanded: isTicketOnlySectionExpanded }}
              onPress={() => setIsTicketOnlySectionExpanded((current) => !current)}
              style={[
                styles.ticketOnlySectionToggle,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <View style={styles.ticketOnlySectionToggleCopy}>
                <AppText style={styles.ticketOnlySectionToggleTitle}>
                  {isTicketOnlySectionExpanded ? '구매 옵션 접기' : '구매 옵션 열기'}
                </AppText>
                <AppText variant="muted" style={styles.ticketOnlySectionToggleDescription}>
                  {ticketOnlySectionSummary}
                </AppText>
              </View>
              <Ionicons
                name={isTicketOnlySectionExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={palette.textMuted}
              />
            </Pressable>

            {isTicketOnlySectionVisible ? (
              <Animated.View
                style={[
                  styles.ticketOnlySectionBody,
                  ticketOnlyAnimatedStyle,
                  { pointerEvents: isTicketOnlySectionExpanded ? 'auto' : 'none' },
                ]}
              >
                <AppText variant="muted" style={styles.helperText}>
                  새 청첩장 생성과 별개로, 기간 연장·업그레이드에 쓸 티켓만 먼저 구매할 수 있습니다.
                </AppText>

                <View style={styles.ticketPresetRow}>
                  {TICKET_PRESET_COUNTS.map((count) => (
                    <ChoiceChip
                      key={`ticket-only-${count}`}
                      label={`${count}장`}
                      selected={ticketPurchase.ticketOnlyCount === count}
                      onPress={() => ticketPurchase.updateTicketOnlyCount(count)}
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
                    accessibilityLabel="이전 티켓 상품으로 이동"
                    accessibilityHint="지원되는 이전 티켓 상품 수량으로 이동합니다."
                    accessibilityState={{ disabled: ticketPurchase.ticketOnlyCount <= 0 }}
                    disabled={ticketPurchase.ticketOnlyCount <= 0}
                    onPress={ticketPurchase.decreaseTicketOnlyCount}
                    style={[
                      styles.ticketCounterButton,
                      { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                      ticketPurchase.ticketOnlyCount <= 0
                        ? styles.ticketCounterButtonDisabled
                        : null,
                    ]}
                  >
                    <AppText variant="title" style={styles.ticketCounterButtonLabel}>
                      -
                    </AppText>
                  </Pressable>
                  <View style={styles.ticketCounterValueBox}>
                    <AppText variant="title" style={styles.ticketCounterValue}>
                      {ticketPurchase.ticketOnlyCount}
                    </AppText>
                    <AppText variant="caption" style={styles.ticketCounterCaption}>
                      티켓만 별도 구매 수량
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="다음 티켓 상품으로 이동"
                    accessibilityHint="지원되는 다음 티켓 상품 수량으로 이동합니다."
                    accessibilityState={{ disabled: ticketPurchase.ticketOnlyCount >= MAX_TICKET_COUNT }}
                    disabled={ticketPurchase.ticketOnlyCount >= MAX_TICKET_COUNT}
                    onPress={ticketPurchase.increaseTicketOnlyCount}
                    style={[
                      styles.ticketCounterButton,
                      { borderColor: palette.cardBorder, backgroundColor: palette.surface },
                      ticketPurchase.ticketOnlyCount >= MAX_TICKET_COUNT
                        ? styles.ticketCounterButtonDisabled
                        : null,
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
                  <View style={styles.summaryRow}>
                    <AppText style={styles.summaryLabel}>장당 금액</AppText>
                    <AppText style={styles.summaryValue}>
                      {formatPrice(ticketPurchase.ticketUnitPrice)}
                    </AppText>
                  </View>
                  <View style={styles.summaryRow}>
                    <AppText style={styles.summaryLabel}>티켓 금액</AppText>
                    <AppText style={styles.summaryValue}>
                      {formatPrice(ticketPurchase.ticketPrice)}
                    </AppText>
                  </View>
                  <View style={styles.summaryRow}>
                    <AppText style={styles.summaryLabel}>적립 대상</AppText>
                    <AppText style={styles.summaryValue}>{ticketPurchase.selectedTargetLabel}</AppText>
                  </View>
                  <View style={styles.summaryRow}>
                    <AppText style={styles.summaryLabel}>현재 보유 티켓</AppText>
                    <AppText style={styles.summaryValue}>{ticketPurchase.storedTicketCount}장</AppText>
                  </View>
                </View>

                <BulletList items={[...TICKET_USAGE_ITEMS]} />

                <ActionButton
                  variant="secondary"
                  onPress={ticketPurchase.handleOpenTicketOnlyModal}
                  disabled={
                    ticketPurchase.ticketOnlyCount <= 0 || !ticketPurchase.hasLinkedInvitation
                  }
                  fullWidth
                >
                  티켓만 구매
                </ActionButton>

                <AppText variant="muted" style={styles.helperText}>
                  {ticketPurchase.hasLinkedInvitation
                    ? '결제가 끝나면 선택한 연동 청첩장에 티켓이 바로 적립됩니다.'
                    : '티켓만 구매는 연동된 청첩장이 있을 때만 사용할 수 있습니다. 먼저 페이지를 연동해 주세요.'}
                </AppText>
              </Animated.View>
            ) : null}
          </SectionCard>

        </AppScreen>

        <View
          style={[
            styles.stickyBar,
            isCompactStickyBar ? styles.stickyBarCompact : null,
            {
              backgroundColor: palette.surface,
              borderTopColor: palette.cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.stickyBarContent,
              isCompactStickyBar ? styles.stickyBarContentCompact : null,
              { minHeight: stickyBarHeight },
            ]}
          >
            <View style={styles.stickyPriceBox}>
              <AppText variant="caption" style={styles.stickyPriceLabel}>
                총액
              </AppText>
              <AppText
                variant={isCompactStickyBar ? 'body' : 'title'}
                style={styles.stickyPriceValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {formatPrice(createForm.totalPrice)}
              </AppText>
            </View>
            <View
              style={[
                styles.stickyActionRow,
                isCompactStickyBar ? styles.stickyActionRowCompact : null,
              ]}
            >
              {createForm.showPreviousCta ? (
                <ActionButton
                  variant="secondary"
                  onPress={createForm.handlePreviousStep}
                  style={[
                    styles.stickySecondaryActionButton,
                    isCompactStickyBar ? styles.stickyActionButtonCompact : null,
                  ]}
                >
                  이전
                </ActionButton>
              ) : null}
              <ActionButton
                onPress={createForm.handlePrimaryStepAction}
                disabled={createForm.currentStep === 'review' && isExpoWebPreview}
                loading={createForm.currentStep === 'review' && (createForm.isSubmitting || isAuthenticating)}
                style={[
                  styles.stickyPrimaryActionButton,
                  isCompactStickyBar ? styles.stickyActionButtonCompact : null,
                ]}
              >
                {createForm.primaryCtaLabel}
              </ActionButton>
            </View>
          </View>
        </View>
      </View>

      <PaymentConfirmModal
        visible={createForm.paymentModalVisible}
        onClose={createForm.closePaymentModal}
        onConfirm={() => void createForm.handleConfirmCreate()}
        loading={createForm.isSubmitting || isAuthenticating}
        authError={authError}
        palette={palette}
        serviceName={createForm.selectedPlanInfo.name}
        selectedThemeLabel="모든 웨딩 디자인"
        slugPreview={createForm.publicUrlPreview}
        totalPrice={createForm.totalPrice}
      />

      <TicketOnlyPurchaseModal
        visible={ticketPurchase.ticketOnlyModalVisible}
        onClose={ticketPurchase.closeTicketOnlyModal}
        onConfirm={ticketPurchase.handleConfirmTicketOnlyPurchase}
        loading={ticketPurchase.isTicketPurchaseSubmitting}
        authError={authError}
        notice={createForm.notice}
        palette={palette}
        ticketCount={ticketPurchase.ticketOnlyCount}
        ticketUnitPrice={ticketPurchase.ticketUnitPrice}
        ticketPrice={ticketPurchase.ticketPrice}
        ticketUsageItems={TICKET_USAGE_ITEMS}
        targetOptions={ticketPurchase.ticketTargetOptions}
        selectedTargetSlug={ticketPurchase.selectedTicketTargetSlug}
        selectedTargetLabel={ticketPurchase.selectedTargetLabel}
        currentStoredTicketCount={ticketPurchase.storedTicketCount}
        onSelectTarget={ticketPurchase.setSelectedTicketTargetSlug}
      />

      <TicketPurchaseSuccessModal
        visible={ticketPurchase.ticketPurchaseSuccess !== null}
        onClose={ticketPurchase.closeTicketPurchaseSuccess}
        palette={palette}
        success={ticketPurchase.ticketPurchaseSuccess}
      />
    </>
  );
}
