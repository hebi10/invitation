import { INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS } from '../../lib/invitationProductPolicy';
import { Image } from 'expo-image';
import ringsRibbonImage from '../../../assets/editorial/rings-ribbon.webp';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { WebPreviewNotice } from '../../components/WebPreviewNotice';
import { PaymentConfirmModal } from '../../features/create/components/PaymentConfirmModal';
import { createStyles as styles } from '../../features/create/createStyles';
import { useCreateForm } from '../../features/create/hooks/useCreateForm';
import {
  CREATE_STEPS,
  designThemes,
  CREATE_PAGE_IDENTIFIER_MAX_LENGTH,
  STICKY_CTA_BAR_COMPACT_HEIGHT,
  STICKY_CTA_BAR_HEIGHT,
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
  const [measuredStickyBarHeight, setMeasuredStickyBarHeight] = useState(0);

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
  } = useAuth();
  const { pageSummary } = useInvitationOps();
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

  const isCompactStickyBar = width < 390;
  const stickyBarHeight = isCompactStickyBar
    ? STICKY_CTA_BAR_COMPACT_HEIGHT
    : STICKY_CTA_BAR_HEIGHT;
  const stickyBarBottomInset = Math.max(insets.bottom, 12);
  const screenBottomPadding = Math.max(
    stickyBarHeight + stickyBarBottomInset + 24,
    measuredStickyBarHeight + 24
  );

  useNoticeToast(createForm.notice);
  useNoticeToast(authError, { tone: 'error' });

  useEffect(() => {
    autoSaveProgressRef.current = createForm.autoSaveProgress;
  }, [createForm.autoSaveProgress]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [createForm.currentStep]);

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

  const pendingInput = createForm.pendingCreation?.target.action === 'createInvitationPage' ? createForm.pendingCreation.target.input : null;
  const pendingCreationSummary = pendingInput ? `${pendingInput.groomKoreanName} · ${pendingInput.brideKoreanName} / ${pendingInput.slugBase} / ${designThemes.find((theme) => theme.key === pendingInput.theme)?.label ?? '선택한 디자인'}` : '';

  if (createForm.creationCompleted) {
    return <AppScreen title="결제가 완료되었습니다" subtitle="청첩장 제작을 시작해 주세요.">
      <SectionCard title="프리미엄 청첩장 준비 완료" description="아직 하객에게 공개되지 않은 초안입니다.">
        <AppText>기본 이용 기간 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월이 시작되었습니다. 예식 정보와 사진을 입력하고 미리보기를 확인한 뒤 공개해 주세요.</AppText>
        {pageSummary?.displayPeriod.endDate ? <AppText>이용 종료일: {new Date(pageSummary.displayPeriod.endDate).toLocaleDateString('ko-KR')}</AppText> : null}
        <ActionButton onPress={createForm.handleStartEditing} fullWidth>청첩장 제작 시작</ActionButton>
      </SectionCard>
    </AppScreen>;
  }

  return (
    <>
      <View style={[styles.screenRoot, { backgroundColor: palette.background }]}>
        <AppScreen
          title="만들기"
          subtitle="기본 정보를 준비하고 디자인과 결제 내용을 확인하세요."
          scrollRef={scrollRef}
          contentContainerStyle={{ paddingBottom: screenBottomPadding }}
        >
          {isExpoWebPreview ? (
            <WebPreviewNotice
              title="웹 생성 제한 안내"
              description="웹에서는 제작 초안을 준비할 수 있습니다. 결제와 청첩장 생성은 앱에서 진행해 주세요."
            />
          ) : null}

          {pendingInput ? <SectionCard title="완료되지 않은 제작 결제가 있습니다" description={pendingCreationSummary} badge="복구 필요" badgeTone="notice">
            <AppText>현재 작성 내용과 별개로, 결제 당시의 이름·주소·디자인으로 이어서 처리합니다. 추가 결제는 없습니다.</AppText>
            <ActionButton loading={createForm.isSubmitting} disabled={isExpoWebPreview} onPress={() => void createForm.handleRecoverCreation()} fullWidth>이전 결제 이어서 처리</ActionButton>
          </SectionCard> : null}
          </SectionCard> : null}

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
                        backgroundColor: isSelected ? palette.accentSoft : palette.surface,
                        borderColor: isSelected ? palette.accent : palette.cardBorder,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={isSelected ? palette.accent : palette.textMuted}
                      style={styles.stepTabIndex}
                    >
                      {isCompleted && !isSelected ? '완료' : index + 1}
                    </AppText>
                    <AppText variant="caption" style={styles.stepTabLabel}>
                      {step.label}
                    </AppText>
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
                description="PC와 같은 고객 계정으로 로그인하면 생성한 청첩장을 함께 관리할 수 있습니다."
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
                  label="신랑 영문 이름 (선택)"
                  value={createForm.groomEnglishName}
                  onChangeText={createForm.setGroomEnglishName}
                  placeholder="예: minje-shin"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TextField
                  label="신부 영문 이름 (선택)"
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
              title="2. 디자인 확인"
              description="프리미엄 청첩장 한 가지 상품으로, 모든 웨딩 디자인이 포함됩니다."
              badge={
                createForm.selectionValidationMessages.length === 0
                  ? '구성 확인'
                  : `${createForm.selectionValidationMessages.length}개 확인 필요`
              }
              badgeTone={
                createForm.selectionValidationMessages.length === 0 ? 'success' : 'notice'
              }
            >
              <Image
                source={ringsRibbonImage}
                style={styles.selectionBannerImage}
                contentFit="cover"
                alt="화이트 플라워와 결혼 반지로 구성한 웨딩 이미지"
              />
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
                  프리미엄 청첩장
                </AppText>
                <AppText variant="display" style={styles.selectionSummaryValue}>
                  {formatPrice(createForm.selectedPlanInfo.price)}
                </AppText>
                <AppText variant="muted">
                  기본 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월 · 웨딩 디자인 5종 모두 포함
                </AppText>
              </View>

              <AppText variant="muted" style={styles.selectionSummaryDescription}>
                갤러리 최대 18장, 배경음악, 카카오톡 카드 공유, 캘린더·카운트다운과 방명록을 제공합니다.
                제작 후 미리보기에서 원하는 디자인을 확인할 수 있습니다.
              </AppText>
              <View style={styles.themePreviewSection}>
                <AppText variant="title">디자인 샘플 미리보기</AppText>
                <ThemePreviewGallery tier={createForm.selectedPlanInfo.tier} />
              </View>

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
              title="3. 결제 확인"
              description="이름과 청첩장 주소, 이용 기간과 금액을 확인해 주세요."
              badge={createForm.validationMessages.length === 0 ? '결제 준비 완료' : '확인 필요'}
              badgeTone={createForm.validationMessages.length === 0 ? 'success' : 'notice'}
              variant="emphasis"
            >
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>두 사람의 이름</AppText>
                <AppText style={styles.summaryValue}>{createForm.groomKoreanName} · {createForm.brideKoreanName}</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>청첩장 주소</AppText>
                <AppText style={styles.summaryValue}>{createForm.publicUrlPreview}</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>제작 상품</AppText>
                <AppText style={styles.summaryValue}>{createForm.selectedPlanInfo.name}</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>사용 가능한 디자인</AppText>
                <AppText style={styles.summaryValue}>
                  모든 웨딩 디자인
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText style={styles.summaryLabel}>기본 이용 기간</AppText>
                <AppText style={styles.summaryValue}>
                  생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월
                </AppText>
              </View>
              <View
                style={[
                  styles.summaryRow,
                  styles.paymentTotalRow,
                  { backgroundColor: palette.surface, borderColor: palette.cardBorder },
                ]}
              >
                <AppText style={styles.summaryLabel}>결제 예정 금액</AppText>
                <AppText variant="display" style={styles.totalLabel}>
                  {formatPrice(createForm.totalPrice)}
                </AppText>
              </View>

              <View style={styles.actionColumn}>
                <ActionButton variant="secondary" onPress={() => void createForm.handleSaveDraft()} fullWidth>
                  제작 초안 저장
                </ActionButton>
              </View>
              <AppText variant="caption">제작 결제 5,000원에 모든 디자인과 기능이 포함됩니다. 기본 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월 이후 내 청첩장에서 5,000원 결제로 6개월씩 연장할 수 있습니다.</AppText>
            </SectionCard>
          ) : null}
        </AppScreen>

        <View
          onLayout={(event) => setMeasuredStickyBarHeight(event.nativeEvent.layout.height)}
          style={[
            styles.stickyBar,
            isCompactStickyBar ? styles.stickyBarCompact : null,
            {
              backgroundColor: palette.surfaceMuted,
              paddingBottom: stickyBarBottomInset,
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
        notice={createForm.notice}
        hasPendingPurchase={Boolean(createForm.pendingCreation)}
        recoverySummary={pendingCreationSummary}
        onRecover={() => void createForm.handleRecoverCreation()}
        palette={palette}
        serviceName={createForm.selectedPlanInfo.name}
        selectedThemeLabel="모든 웨딩 디자인"
        slugPreview={createForm.publicUrlPreview}
        totalPrice={createForm.totalPrice}
      />

    </>
  );
}
