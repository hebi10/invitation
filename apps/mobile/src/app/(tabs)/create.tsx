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
import { INVITATION_PREMIUM_PRICE_KRW } from '../../lib/invitationProductPolicy';
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
    router.replace('/guide');
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

  return (
    <>
      <AppScreen
        title="만들기"
        subtitle="고객 계정 로그인 → Google Play 결제 → 청첩장 정보 입력"
      >
        {isWebPreview ? <WebPreviewNotice
          title="웹 생성 제한 안내"
          description="실제 결제는 Google Play 내부 테스트 또는 스토어 설치 앱에서 진행해 주세요."
        /> : null}

        {!customerSession ? (
          <SectionCard title="1. 고객 계정 로그인"
            description="로그인한 계정에 구매한 청첩장이 등록됩니다.">
            <TextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="가입한 이메일"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="비밀번호"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => void signIn()}
            />
            <ActionButton loading={isCustomerAuthenticating}
              onPress={() => void signIn()} fullWidth>로그인</ActionButton>
            <AccountHelpLinks />
          </SectionCard>
        ) : (
          <SectionCard title="1. 고객 계정 확인" badge="로그인됨" badgeTone="success">
            <AppText variant="muted" selectable>{customerSession.email}</AppText>
            <ActionButton variant="secondary" disabled={isSubmitting}
              onPress={() => void logoutCustomer()} fullWidth>다른 계정으로 로그인</ActionButton>
          </SectionCard>
        )}

        <SectionCard title="2. 프리미엄 청첩장 결제"
          description="결제 완료 후 비공개 청첩장 초안을 만들고 정보 입력 화면으로 이동합니다.">
          <AppText variant="display">5,000원</AppText>
          <AppText variant="muted">기본 6개월 · 웨딩 디자인 전체 포함</AppText>
          <AppText variant="caption" color={palette.textMuted}>
            예식 정보·신랑 신부 이름·사진은 결제 후 입력합니다. 청첩장 주소는 자동 생성됩니다.
          </AppText>
          {!pendingReady && customerSession ? (
            <View style={styles.loading}>
              <ActivityIndicator color={palette.accent}/>
              <AppText variant="muted">이전 결제 기록 확인 중</AppText>
            </View>
          ) : null}
          {pending ? (
            <>
              <AppText variant="muted">
                완료하지 못한 제작 결제가 있습니다. 새 결제 없이 이전 거래부터 복구해 주세요.
              </AppText>
              <ActionButton loading={isSubmitting} disabled={isWebPreview}
                onPress={() => void recoverPurchase()} fullWidth>이전 결제 이어서 처리</ActionButton>
            </>
          ) : (
            <ActionButton
              onPress={() => setPaymentVisible(true)}
              disabled={!customerSession || isWebPreview || !pendingReady || isSubmitting}
              fullWidth
            >Google Play 결제 확인</ActionButton>
          )}
        </SectionCard>

        <SectionCard title="3. 결제 후 정보 입력"
          description="결제된 비공개 초안을 마이페이지에서 수정합니다.">
          <AppText variant="muted">
            신랑·신부 이름, 예식 일정, 장소, 인사말, 사진, 음악, 공개 설정을 차례로 입력한 뒤 디자인별 미리보기와 공유 링크를 확인할 수 있습니다.
          </AppText>
          <ActionButton variant="secondary" onPress={() => router.push('/guide')} fullWidth>
            마이페이지에서 내 청첩장 보기
          </ActionButton>
        </SectionCard>

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
});
