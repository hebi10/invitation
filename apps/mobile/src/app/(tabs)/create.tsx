import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { AccountHelpLinks } from '../../components/AccountHelpLinks';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { WebPreviewNotice } from '../../components/WebPreviewNotice';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { PaymentConfirmModal } from '../../features/create/components/PaymentConfirmModal';
import { listMobileCustomerInvitations } from '../../lib/apiAccount';
import { purchaseBillingProduct } from '../../lib/billing';
import { createRandomSuffix } from '../../lib/id';
import { DEFAULT_INVITATION_THEME } from '../../lib/invitationThemes';
import {
  getMobileBillingPageCreationProductId,
} from '../../lib/mobileBillingProducts';
import {
  getPendingBillingRequest,
  recoverPendingBillingPurchase,
  runPendingBillingPurchase,
  type PurchaseRequest,
} from '../../lib/pendingBillingPurchase';
import {
  INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS,
  INVITATION_PREMIUM_PRICE_KRW,
  INVITATION_PREMIUM_PRICE_LABEL,
} from '../../lib/invitationProductPolicy';
import type { MobileInvitationCreationInput } from '../../types/mobileInvitation';

function buildPrivateInvitationDraft(): MobileInvitationCreationInput {
  return {
    slugBase: `wedding-${createRandomSuffix(12)}`,
    groomKoreanName: '신랑 입력 전',
    brideKoreanName: '신부 입력 전',
    groomEnglishName: '',
    brideEnglishName: '',
    servicePlan: 'premium',
    theme: DEFAULT_INVITATION_THEME,
  };
}

export default function CreateScreen() {
  const router = useRouter();
  const isWebPreview = Platform.OS === 'web';
  const { apiBaseUrl, palette } = usePreferences();
  const {
    authError,
    clearAuthError,
    createInvitationPage,
    getCustomerIdToken,
    customerAuthError,
    customerSession,
    isCustomerAuthenticating,
    loginCustomer,
    logoutCustomer,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<PurchaseRequest | null>(null);
  const [pendingReady, setPendingReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [creationCompleted, setCreationCompleted] = useState(false);
  const autoOpenedForUid = useRef<string | null>(null);
  const pendingCheckVersion = useRef(0);
  const customerUid = customerSession?.uid ?? null;

  const refreshPending = useCallback(async () => {
    const version = ++pendingCheckVersion.current;
    const isCurrent = () => version === pendingCheckVersion.current;
    setPendingReady(false);
    try {
      if (!customerUid) {
        setPending(null);
        return;
      }
      const previous = await getPendingBillingRequest({ appUserId: customerUid, apiBaseUrl });
      if (isCurrent()) setPending(previous?.target.action === 'createInvitationPage' ? previous : null);
    } catch (error) {
      if (isCurrent()) setNotice(error instanceof Error ? error.message : '이전 결제 정보를 확인하지 못했습니다.');
    } finally {
      if (isCurrent()) setPendingReady(true);
    }
  }, [apiBaseUrl, customerUid]);

  useFocusEffect(useCallback(() => {
    void refreshPending();
  }, [refreshPending]));

  useEffect(() => {
    if (!customerUid || !pendingReady || pending || isWebPreview) return;
    if (autoOpenedForUid.current === customerUid) return;
    autoOpenedForUid.current = customerUid;
    setPaymentVisible(true);
  }, [customerUid, pending, pendingReady, isWebPreview]);

  const signIn = async () => {
    if (isCustomerAuthenticating || !email.trim() || !password) {
      if (!email.trim() || !password) setNotice('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    clearAuthError();
    setNotice('');
    const success = await loginCustomer(email.trim(), password);
    setPassword('');
    if (success) setEmail('');
    else setNotice('고객 계정 로그인을 확인하지 못했습니다. 입력 정보를 확인해 주세요.');
  };

  const finish = () => {
    setPaymentVisible(false);
    setPending(null);
    setNotice('');
    setCreationCompleted(true);
  };

  const recoverPurchase = async () => {
    if (!customerUid || isWebPreview || isSubmitting) return;
    setIsSubmitting(true);
    setNotice('기존 결제를 확인 중입니다. 추가 결제는 진행하지 않습니다.');
    try {
      const created = await recoverPendingBillingPurchase(
        { appUserId: customerUid, apiBaseUrl },
        (request, receipt) => {
          if (request.target.action !== 'createInvitationPage') {
            throw new Error('복구할 청첩장 제작 거래가 아닙니다.');
          }
          return createInvitationPage(request.target.input, { billingPurchase: receipt });
        }
      );
      if (created) finish();
      else setNotice('청첩장 생성 결과를 확인하지 못했습니다. 동일한 거래로 복구해 주세요.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '기존 결제를 복구하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
      void refreshPending();
    }
  };

  const confirmPurchase = async () => {
    if (!customerUid || isWebPreview || isSubmitting || !pendingReady || pending) return;
    setIsSubmitting(true);
    setNotice('');
    clearAuthError();
    const productId = getMobileBillingPageCreationProductId('premium');
    const input = buildPrivateInvitationDraft();
    const request: PurchaseRequest = {
      appUserId: customerUid,
      productId,
      apiBaseUrl,
      target: { action: 'createInvitationPage', input },
    };
    try {
      const idToken = await getCustomerIdToken();
      if (!idToken) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      await listMobileCustomerInvitations(apiBaseUrl, idToken);
      const created = await runPendingBillingPurchase(request, {
        purchase: () => purchaseBillingProduct(productId, { appUserId: customerUid }),
        fulfill: (receipt) => createInvitationPage(input, { billingPurchase: receipt }),
        onResume: () => setNotice('기존 거래를 추가 결제 없이 이어서 처리하고 있습니다.'),
      });
      if (created) finish();
      else setNotice('결제 후 청첩장 생성 결과를 확인하지 못했습니다. 복구를 이용해 주세요.');
    } catch (error) {
      setPaymentVisible(false);
      setNotice(error instanceof Error ? error.message : '결제를 진행하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
      void refreshPending();
    }
  };

  if (creationCompleted) {
    return (
      <AppScreen
        title="제작 시작"
        subtitle="결제 완료 → 비공개 초안 → 청첩장 정보 입력"
      >
        <View style={[styles.successPanel, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
          <Ionicons name="checkmark-circle-outline" size={48} color={palette.success} />
          <AppText variant="display" accessibilityRole="header" style={styles.successTitle}>
            결제가 완료되었습니다
          </AppText>
          <AppText variant="muted" style={styles.successDescription}>
            생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월 이용할 수 있는 비공개 청첩장이 준비되었습니다.
          </AppText>
        </View>
        <SectionCard title="새 청첩장 초안" badge="비공개" badgeTone="neutral">
          <View style={styles.summaryRow}>
            <AppText variant="muted">사용 가능한 디자인</AppText>
            <AppText>웨딩 디자인 5종</AppText>
          </View>
          <View style={styles.summaryRow}>
            <AppText variant="muted">이용 기간</AppText>
            <AppText>생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월</AppText>
          </View>
          <AppText variant="caption" color={palette.textMuted}>
            아직 하객에게 공개되지 않았습니다. 내용을 작성하고 미리본 뒤 공개 여부를 설정할 수 있습니다.
          </AppText>
        </SectionCard>
        <SectionCard
          title="이제 청첩장을 완성해 주세요"
          description="기본 정보·예식 일정·장소·인사말·사진·음악·공개 설정을 순서대로 입력합니다."
        >
          <ActionButton
            fullWidth
            onPress={() => {
              setCreationCompleted(false);
              router.replace('/guide');
            }}
          >
            마이페이지에서 편집 시작
          </ActionButton>
        </SectionCard>
      </AppScreen>
    );
  }

  return (
    <>
      <AppScreen
        title="청첩장 만들기"
        subtitle="고객 계정 로그인 → Google Play 결제 → 청첩장 정보 입력"
      >
        {isWebPreview ? (
          <WebPreviewNotice
            title="웹 생성 제한 안내"
            description="실제 결제는 Google Play 내부 테스트 또는 스토어 설치 앱에서 진행해 주세요."
          />
        ) : null}
        <View style={styles.progressRow} accessibilityLabel="청첩장 만들기 진행 단계">
          {[
            { number: 1, label: '로그인' },
            { number: 2, label: '결제' },
            { number: 3, label: '정보 입력' },
          ].map((step) => {
            const current = customerSession ? 2 : 1;
            const selected = step.number === current;
            return (
              <View
                key={step.number}
                style={[
                  styles.progressStep,
                  { backgroundColor: selected ? palette.accent : palette.surface, borderColor: selected ? palette.accent : palette.cardBorder },
                ]}
              >
                <AppText
                  variant="caption"
                  color={selected ? palette.surface : palette.textMuted}
                  style={styles.progressText}
                >
                  {step.number} {step.label}
                </AppText>
              </View>
            );
          })}
        </View>
        <SectionCard title="프리미엄 청첩장 · 단일 상품" badge={`${INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월 이용`} badgeTone="neutral">
          <AppText variant="display" style={styles.productPrice}>{INVITATION_PREMIUM_PRICE_LABEL}</AppText>
          <View style={styles.summaryRow}>
            <AppText variant="muted">웨딩 디자인 5종 모두 제공</AppText>
            <AppText style={styles.summaryStrong}>추가 요금 없음</AppText>
          </View>
          <AppText variant="caption" color={palette.textMuted}>
            결제 후 청첩장 주소가 자동 생성됩니다. 신랑·신부 이름, 예식 정보와 사진은 결제 후 입력합니다.
          </AppText>
        </SectionCard>

        {!customerSession ? (
          <SectionCard
            title="고객 계정 로그인"
            description="로그인한 계정으로 청첩장을 구매하고 관리합니다."
          >
            <TextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="이메일을 입력해 주세요"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="비밀번호를 입력해 주세요"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => void signIn()}
            />
            <ActionButton
              loading={isCustomerAuthenticating}
              onPress={() => void signIn()}
              fullWidth
            >
              로그인 후 결제 진행
            </ActionButton>
            <AccountHelpLinks />
          </SectionCard>
        ) : (
          <SectionCard title="고객 계정 확인" badge="로그인됨" badgeTone="success">
            <AppText variant="caption" color={palette.textMuted}>구매 및 관리 계정</AppText>
            <AppText selectable>{customerSession.email}</AppText>
            <ActionButton
              variant="secondary"
              disabled={isSubmitting}
              onPress={() => void logoutCustomer()}
              fullWidth
            >
              다른 계정으로 로그인
            </ActionButton>
          </SectionCard>
        )}

        {customerSession ? (
          pending ? (
            <SectionCard
              title="결제 복구"
              description="완료하지 못한 거래를 추가 결제 없이 이어서 처리합니다."
              badge="확인 필요"
              badgeTone="notice"
            >
              <View style={[styles.warning, { backgroundColor: palette.noticeSoft }]}>
                <AppText color={palette.notice} style={styles.summaryStrong}>
                  처리할 이전 결제가 있습니다.
                </AppText>
                <AppText color={palette.notice}>
                  새로 결제하지 말고 기존 거래를 먼저 확인해 주세요.
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText variant="muted">상품</AppText>
                <AppText>프리미엄 청첩장</AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText variant="muted">결제 상품 금액</AppText>
                <AppText>{INVITATION_PREMIUM_PRICE_LABEL}</AppText>
              </View>
              <ActionButton
                loading={isSubmitting}
                disabled={isWebPreview || !pendingReady}
                onPress={() => void recoverPurchase()}
                fullWidth
              >
                이전 결제 이어서 처리
              </ActionButton>
              <AppText variant="caption" color={palette.textMuted}>
                복구가 완료되지 않으면 네트워크와 로그인 계정을 확인하고 같은 거래로 재시도해 주세요. 복구 과정에서 신규 결제를 요청하지 않습니다.
              </AppText>
            </SectionCard>
          ) : (
            <SectionCard
              title="Google Play 결제"
              description="결제 확인 후 비공개 청첩장 초안이 생성됩니다."
            >
              <View style={styles.summaryRow}>
                <AppText variant="muted">프리미엄 청첩장</AppText>
                <AppText>{INVITATION_PREMIUM_PRICE_LABEL}</AppText>
              </View>
              {!pendingReady ? (
                <View style={styles.loading} accessibilityLiveRegion="polite">
                  <ActivityIndicator color={palette.accent}/>
                  <AppText variant="muted">이전 결제 기록 확인 중</AppText>
                </View>
              ) : null}
              <ActionButton
                onPress={() => setPaymentVisible(true)}
                disabled={isWebPreview || !pendingReady || isSubmitting}
                fullWidth
              >
                Google Play 결제 확인
              </ActionButton>
            </SectionCard>
          )
        ) : null}

        <View style={[styles.guidance, { backgroundColor: palette.surfaceMuted }]}>
          <AppText variant="caption" color={palette.textMuted}>
            결제 완료 후 비공개 청첩장이 생성됩니다. 예식 정보·사진·음악 등은 마이페이지에서 7단계로 입력합니다.
          </AppText>
        </View>
        {notice || customerAuthError || authError ? (
          <AppText color={palette.danger} accessibilityRole="alert">
            {notice || customerAuthError || authError}
          </AppText>
        ) : null}
      </AppScreen>

      <PaymentConfirmModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        onConfirm={() => void confirmPurchase()}
        loading={isSubmitting}
        authError={authError}
        notice={notice}
        hasPendingPurchase={Boolean(pending)}
        recoverySummary="기존 청첩장 제작 거래"
        onRecover={() => void recoverPurchase()}
        palette={palette}
        serviceName="프리미엄 청첩장"
        selectedThemeLabel="모든 웨딩 디자인"
        slugPreview="결제 후 자동 생성"
        totalPrice={INVITATION_PREMIUM_PRICE_KRW}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  progressRow: { flexDirection: 'row', gap: 8 },
  progressStep: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  progressText: { textAlign: 'center', fontWeight: '600' },
  productPrice: { fontSize: 30, lineHeight: 40, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryStrong: { fontWeight: '700' },
  guidance: { padding: 14 },
  warning: { padding: 12, gap: 6 },
  successPanel: {
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  successTitle: { textAlign: 'center' },
  successDescription: { textAlign: 'center' },
});
