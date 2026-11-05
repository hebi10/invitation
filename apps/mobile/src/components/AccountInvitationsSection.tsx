import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { getOwnedInvitationStatus } from '../features/manage/ownedInvitationPresentation';
import { listMobileCustomerInvitations } from '../lib/apiAccount';
import type { MobileCustomerOwnedEvent } from '../types/mobileInvitation';
import { ActionButton } from './ActionButton';
import { AppText } from './AppText';
import { InvitationSummaryCard } from './InvitationSummaryCard';
import { SectionCard } from './SectionCard';
import { TextField } from './TextField';

export function AccountInvitationsSection() {
  const { apiBaseUrl, palette } = usePreferences();
  const {
    customerSession,
    customerAuthError,
    isCustomerAuthenticating,
    loginCustomer,
    logoutCustomer,
    getCustomerIdToken,
    activateOwnedInvitation,
    isAuthenticating,
    session,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [items, setItems] = useState<MobileCustomerOwnedEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);

  const refreshAccountList = useCallback(async (isCancelled: () => boolean) => {
    setItems([]);
    setLoaded(false);
    setError('');
    if (!customerSession?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getCustomerIdToken();
      if (!token) throw new Error('로그인 상태가 만료되었습니다. 다시 로그인해 주세요.');
      const owned = await listMobileCustomerInvitations(apiBaseUrl, token);
      if (!isCancelled()) setItems(owned);
    } catch (failure) {
      if (!isCancelled()) {
        setError(failure instanceof Error ? failure.message : '계정 청첩장 목록을 불러오지 못했습니다.');
      }
    } finally {
      if (!isCancelled()) {
        setLoaded(true);
        setLoading(false);
      }
    }
  }, [apiBaseUrl, customerSession?.uid, getCustomerIdToken]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    void refreshAccountList(() => cancelled);
    return () => { cancelled = true; };
  }, [refreshAccountList]));

  const signIn = async () => {
    if (!email.trim() || !password) {
      setError('계정 이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setError('');
    const succeeded = await loginCustomer(email.trim(), password);
    setPassword('');
    if (succeeded) {
      setEmail('');
      void refreshAccountList(() => false);
    }
  };

  const openInvitation = async (slug: string) => {
    if (session?.pageSlug === slug || openingSlug || isAuthenticating) return;
    setOpeningSlug(slug);
    setError('');
    try {
      const opened = await activateOwnedInvitation(slug);
      if (opened) router.replace('/');
      else setError('청첩장을 열지 못했습니다. 계정 소유권과 로그인 상태를 확인해 주세요.');
    } finally {
      setOpeningSlug(null);
    }
  };

  if (!customerSession?.uid) {
    return (
      <SectionCard
        title="고객 계정 로그인"
        description="로그인하면 PC와 앱에서 만든 모든 청첩장을 함께 관리할 수 있습니다."
      >
        <TextField
          label="고객 계정 이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="이메일"
        />
        <TextField
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => void signIn()}
          placeholder="비밀번호"
        />
        {error || customerAuthError ? (
          <AppText color={palette.danger} accessibilityRole="alert">
            {error || customerAuthError}
          </AppText>
        ) : null}
        <ActionButton onPress={() => void signIn()} loading={isCustomerAuthenticating} fullWidth>
          로그인하고 청첩장 조회
        </ActionButton>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="계정별 전체 청첩장"
      description="이 계정에서 제작한 청첩장을 전부 표시합니다. 기기 연동 목록의 8개 제한과 별도입니다."
      badge={loaded && !error ? `${items.length}개` : undefined}
    >
      <View style={styles.accountRow}>
        <AppText variant="caption" color={palette.textMuted} style={styles.accountEmail}>
          {customerSession.email}
        </AppText>
        <ActionButton
          variant="secondary"
          disabled={loading}
          onPress={() => void refreshAccountList(() => false)}
        >
          새로고침
        </ActionButton>
      </View>
      {loading ? (
        <View style={styles.loadingRow} accessibilityLiveRegion="polite">
          <ActivityIndicator color={palette.accent} size="small" />
          <AppText variant="muted">계정의 청첩장을 불러오는 중입니다.</AppText>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.errorState, { backgroundColor: palette.dangerSoft, borderColor: palette.danger }]}>
          <AppText color={palette.danger} accessibilityRole="alert">{error}</AppText>
          <ActionButton
            variant="secondary"
            disabled={loading}
            onPress={() => void refreshAccountList(() => false)}
            fullWidth
          >
            목록 다시 불러오기
          </ActionButton>
        </View>
      ) : null}
      {!loading && loaded && !error && items.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: palette.surfaceMuted }]}>
          <AppText variant="title">계정에 등록된 청첩장이 없습니다</AppText>
          <AppText variant="muted">
            새 청첩장을 만들거나 다른 고객 계정으로 로그인해 주세요.
          </AppText>
          <ActionButton variant="secondary" onPress={() => router.push('/create')} fullWidth>
            새 청첩장 만들기
          </ActionButton>
        </View>
      ) : null}
      <AccountOwnedWeddingCards
        items={items}
        currentSlug={session?.pageSlug}
        openingSlug={openingSlug}
        busy={isAuthenticating}
        onOpen={(slug) => void openInvitation(slug)}
      />
      <ActionButton variant="secondary" fullWidth onPress={() => { setItems([]); void logoutCustomer(); }}>
        고객 계정 로그아웃
      </ActionButton>
    </SectionCard>
  );
}

export function AccountOwnedWeddingCards({
  items,
  currentSlug,
  openingSlug,
  busy,
  onOpen,
}: {
  items: MobileCustomerOwnedEvent[];
  currentSlug?: string | null;
  openingSlug?: string | null;
  busy?: boolean;
  onOpen: (slug: string) => void;
}) {
  const { palette } = usePreferences();

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const isSelected = currentSlug === item.slug;
        const status = getOwnedInvitationStatus(item);

        return (
          <InvitationSummaryCard
            key={item.eventId}
            palette={palette}
            name={item.displayName || item.title || item.slug}
            contextLabel={isSelected ? '현재 관리 중 · 계정 소유' : '고객 계정에 등록된 청첩장'}
            themeKey={item.defaultTheme}
            imageUrl={item.coverImageUrl}
            dateLabel={item.eventDateLabel ? `예식일 ${item.eventDateLabel}` : '예식일 미입력'}
            statusLabel={status.label}
            statusTone={status.tone}
            selected={isSelected}
          >
            <AppText variant="caption" color={palette.textMuted} selectable>
              청첩장 주소 · /{item.slug}
            </AppText>
            <ActionButton
              fullWidth
              variant="secondary"
              loading={openingSlug === item.slug}
              disabled={Boolean(openingSlug) || busy || isSelected}
              onPress={() => onOpen(item.slug)}
            >
              {isSelected ? '현재 관리 중' : '이 청첩장 관리·수정'}
            </ActionButton>
          </InvitationSummaryCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  accountRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  accountEmail: { flex: 1, minWidth: 120 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorState: { borderWidth: 1, borderRadius: 0, padding: 14, gap: 12 },
  emptyState: { padding: 16, gap: 12 },
});
