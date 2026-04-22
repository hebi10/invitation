import { Redirect, type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { AppText } from '../components/AppText';
import { LoginCard } from '../components/LoginCard';
import { WebPreviewNotice } from '../components/WebPreviewNotice';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { RecentLinkedInvitationsSection } from '../features/login/components/RecentLinkedInvitationsSection';
import { useNoticeToast } from '../hooks/useNoticeToast';
import {
  canActivateLinkedInvitationCard,
  getLinkedInvitationCards,
  type LinkedInvitationCard,
} from '../lib/linkedInvitationCards';
import { extractPageSlugFromIdentifier } from '../lib/pageSlug';
import { copyTextWithFallback, readClipboardText } from '../lib/textTransfer';

function resolveNextPath(value: string | string[] | undefined): Href {
  const next = Array.isArray(value) ? value[0] : value;
  if (typeof next !== 'string' || !next.trim().startsWith('/')) {
    return '/manage';
  }

  return next.trim() as Href;
}

function resolveLinkToken(value: string | string[] | undefined) {
  const token = Array.isArray(value) ? value[0] : value;
  return typeof token === 'string' ? token.trim() : '';
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    next?: string | string[];
    linkToken?: string | string[];
  }>();
  const nextPath = resolveNextPath(params.next);
  const linkToken = resolveLinkToken(params.linkToken);
  const {
    authError,
    isAuthenticated,
    isReady: isAuthReady,
    login,
    loginWithLinkToken,
    activateStoredSession,
    clearAuthError,
  } = useAuth();
  const { isReady: isPreferencesReady, palette } = usePreferences();
  const isExpoWebPreview = Platform.OS === 'web';
  const isBootstrapping = !(isAuthReady && isPreferencesReady);
  const [pageIdentifier, setPageIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [recentCards, setRecentCards] = useState<LinkedInvitationCard[]>([]);
  const [isLoadingRecentCards, setIsLoadingRecentCards] = useState(false);
  const [activatingRecentSlug, setActivatingRecentSlug] = useState<string | null>(null);
  const lastHandledLinkTokenRef = useRef<string | null>(null);

  useNoticeToast(notice);
  useNoticeToast(authError, { tone: 'error' });

  const loadRecentCards = useCallback(async () => {
    setIsLoadingRecentCards(true);

    try {
      const cards = await getLinkedInvitationCards();
      setRecentCards(
        [...cards]
          .sort((left, right) => right.updatedAt - left.updatedAt)
          .slice(0, 4)
      );
    } finally {
      setIsLoadingRecentCards(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isBootstrapping || isExpoWebPreview || isAuthenticated) {
        return undefined;
      }

      void loadRecentCards();
      return undefined;
    }, [isAuthenticated, isBootstrapping, isExpoWebPreview, loadRecentCards])
  );

  useEffect(() => {
    if (
      isBootstrapping ||
      isExpoWebPreview ||
      isAuthenticated ||
      !linkToken ||
      lastHandledLinkTokenRef.current === linkToken
    ) {
      return;
    }

    lastHandledLinkTokenRef.current = linkToken;
    clearAuthError();
    setNotice('앱 연동 링크를 확인하고 있습니다.');

    void (async () => {
      const authenticated = await loginWithLinkToken(linkToken);
      if (!authenticated) {
        return;
      }

      setPassword('');
      router.replace(nextPath);
    })();
  }, [
    clearAuthError,
    isAuthenticated,
    isBootstrapping,
    isExpoWebPreview,
    linkToken,
    loginWithLinkToken,
    nextPath,
    router,
  ]);

  const handleChangePageIdentifier = useCallback(
    (value: string) => {
      clearAuthError();
      setPageIdentifier(value);
    },
    [clearAuthError]
  );

  const handleChangePassword = useCallback(
    (value: string) => {
      clearAuthError();
      setPassword(value);
    },
    [clearAuthError]
  );

  const handleLogin = async () => {
    clearAuthError();
    const authenticated = await login(pageIdentifier, password);
    if (!authenticated) {
      return;
    }

    setPassword('');
    router.replace(nextPath);
  };

  const handlePaste = useCallback(async () => {
    const clipboardText = await readClipboardText();

    if (!clipboardText?.trim()) {
      setNotice('붙여넣을 내용을 읽지 못했습니다. 입력칸을 길게 눌러 붙여넣기를 사용해 주세요.');
      return;
    }

    clearAuthError();
    setPageIdentifier(clipboardText.trim());
    setNotice(
      extractPageSlugFromIdentifier(clipboardText)
        ? '청첩장 링크 또는 주소를 입력창에 붙여넣었습니다.'
        : '붙여넣은 내용을 확인해 주세요.'
    );
  }, [clearAuthError]);

  const handlePrepareRelink = useCallback(
    (card: LinkedInvitationCard) => {
      clearAuthError();
      setPassword('');
      setPageIdentifier(card.publicUrl?.trim() || card.slug);
      setNotice(`${card.displayName.trim() || '청첩장'}의 비밀번호를 다시 입력해 주세요.`);
    },
    [clearAuthError]
  );

  const handleCopyLinkedInvitationLink = useCallback(async (card: LinkedInvitationCard) => {
    const address = card.publicUrl?.trim() || card.slug;

    if (!address) {
      setNotice('복사할 청첩장 주소를 아직 확인하지 못했습니다.');
      return;
    }

    try {
      const method = await copyTextWithFallback(address);
      setNotice(
        method === 'clipboard'
          ? '청첩장 주소를 복사했습니다.'
          : '이 기기에서는 복사 대신 공유창을 열었습니다.'
      );
    } catch {
      setNotice('청첩장 주소를 전달하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }, []);

  const handleContinueLinkedInvitation = useCallback(
    async (card: LinkedInvitationCard) => {
      if (!canActivateLinkedInvitationCard(card) || !card.session) {
        handlePrepareRelink(card);
        return;
      }

      clearAuthError();
      setActivatingRecentSlug(card.slug);
      setNotice(`${card.displayName.trim() || '청첩장'}을 불러오는 중입니다.`);

      try {
        const activated = await activateStoredSession(card.session);
        if (!activated) {
          handlePrepareRelink(card);
          return;
        }

        setPassword('');
        router.replace(nextPath);
      } finally {
        setActivatingRecentSlug(null);
      }
    },
    [activateStoredSession, clearAuthError, handlePrepareRelink, nextPath, router]
  );

  if (isBootstrapping) {
    return (
      <AppScreen
        title="청첩장 연동"
        subtitle="저장된 연동 상태와 운영 권한을 확인하고 있습니다."
      >
        <View style={styles.loadingRow}>
          <ActivityIndicator color={palette.accent} />
          <AppText variant="muted">자동 연동 상태를 확인하는 중입니다.</AppText>
        </View>
      </AppScreen>
    );
  }

  if (isExpoWebPreview) {
    return (
      <AppScreen
        title="웹 미리보기"
        subtitle="Expo 웹 빌드에서는 실제 로그인과 운영 편집 기능을 제한합니다."
        contentContainerStyle={styles.screenContent}
      >
        <WebPreviewNotice />
        <ActionButton
          variant="secondary"
          onPress={() => router.replace('/')}
          fullWidth
          style={styles.bottomAction}
        >
          메인 화면으로 이동
        </ActionButton>
      </AppScreen>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={nextPath} />;
  }

  return (
    <AppScreen
      title="청첩장 연동"
      subtitle="청첩장 링크 또는 주소와 연동 비밀번호만 입력하면 운영 화면으로 바로 이어집니다."
      contentContainerStyle={styles.screenContent}
    >
      <LoginCard
        pageIdentifier={pageIdentifier}
        password={password}
        onChangePageIdentifier={handleChangePageIdentifier}
        onChangePassword={handleChangePassword}
        onPaste={() => void handlePaste()}
        onSubmit={handleLogin}
      />
      {!isLoadingRecentCards || recentCards.length ? (
        <RecentLinkedInvitationsSection
          cards={recentCards}
          palette={palette}
          activatingSlug={activatingRecentSlug}
          onContinue={(card) => void handleContinueLinkedInvitation(card)}
          onPrepareRelink={handlePrepareRelink}
          onCopyLink={(card) => void handleCopyLinkedInvitationLink(card)}
        />
      ) : null}
      <ActionButton
        variant="secondary"
        onPress={() => router.replace('/')}
        fullWidth
        style={styles.bottomAction}
      >
        메인 화면으로 이동
      </ActionButton>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenContent: {
    flexGrow: 1,
  },
  bottomAction: {
    marginTop: 'auto',
  },
});
