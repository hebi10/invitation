'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { useAdmin } from '@/contexts';
import { buildConnectReturnTo } from '@/lib/customerAuthReturn';
import {
  consumeCustomerOwnershipInvite,
  inspectOwnershipInvite,
  type OwnershipInviteStatus,
} from '@/services/eventOwnershipInviteService';

import styles from '../connect.module.css';

type ConnectState =
  | 'reading-link'
  | 'checking-link'
  | 'login-required'
  | 'admin-blocked'
  | 'verification-required'
  | 'confirm-account'
  | 'connecting'
  | 'expired'
  | 'consumed'
  | 'invalid'
  | 'different-owner'
  | 'error';

interface ConnectOwnershipClientProps {
  slug: string;
}

async function createTokenMarker(token: string) {
  const tokenBytes = new TextEncoder().encode(token);
  const digest = await window.crypto.subtle.digest('SHA-256', tokenBytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

function toTerminalState(
  status: Exclude<OwnershipInviteStatus, 'valid'>
): Exclude<ConnectState, 'reading-link' | 'checking-link' | 'login-required' | 'admin-blocked' | 'verification-required' | 'confirm-account' | 'connecting' | 'error'> {
  return status;
}

function getTerminalContent(state: ConnectState) {
  switch (state) {
    case 'expired':
      return {
        title: '연결 링크가 만료되었습니다.',
        description: '관리자에게 새로운 고객 연결 링크를 요청해 주세요.',
      };
    case 'consumed':
      return {
        title: '이미 사용된 연결 링크입니다.',
        description: '연결한 계정으로 로그인했다면 내 청첩장 목록에서 확인할 수 있습니다.',
      };
    case 'different-owner':
      return {
        title: '이미 다른 고객에게 연결된 청첩장입니다.',
        description: '연결 대상이 맞는지 관리자에게 확인해 주세요.',
      };
    case 'invalid':
      return {
        title: '유효한 연결 링크가 아닙니다.',
        description: '전달받은 링크 전체를 다시 열거나 관리자에게 새 링크를 요청해 주세요.',
      };
    default:
      return null;
  }
}

export default function ConnectOwnershipClient({ slug }: ConnectOwnershipClientProps) {
  const router = useRouter();
  const {
    authUser,
    isLoggedIn,
    isAdminLoggedIn,
    isAdminLoading,
    sendVerificationEmail,
    refreshSession: refreshAuthUser,
    logout,
  } = useAdmin();
  const [state, setState] = useState<ConnectState>('reading-link');
  const [token, setToken] = useState('');
  const [tokenMarker, setTokenMarker] = useState('');
  const [linkValidated, setLinkValidated] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationAction, setVerificationAction] = useState<
    'resend' | 'refresh' | 'logout' | null
  >(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const attemptedConsumeRef = useRef<string | null>(null);
  const switchingAccountRef = useRef(false);
  const authUid = authUser?.uid;
  const emailVerified = authUser?.emailVerified === true;

  useEffect(() => {
    let cancelled = false;

    const readLink = async () => {
      const fragment = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const nextToken = new URLSearchParams(fragment).get('token')?.trim() ?? '';
      if (!nextToken) {
        setState('invalid');
        return;
      }

      try {
        const marker = await createTokenMarker(nextToken);
        if (cancelled) {
          return;
        }

        setToken(nextToken);
        setTokenMarker(marker);
        setState('checking-link');
      } catch {
        if (!cancelled) {
          setErrorMessage('연결 링크를 안전하게 확인하지 못했습니다. 브라우저를 새로고침해 주세요.');
          setState('error');
        }
      }
    };

    void readLink();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token || !tokenMarker) {
      return;
    }

    let cancelled = false;
    setLinkValidated(false);
    setErrorMessage('');
    setState('checking-link');

    inspectOwnershipInvite(slug, token)
      .then((invite) => {
        if (cancelled) {
          return;
        }

        setDisplayName(invite.displayName);
        if (invite.status === 'valid') {
          setLinkValidated(true);
          return;
        }

        setLinkValidated(false);
        setState(toTerminalState(invite.status));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : '청첩장 연결 링크를 확인하지 못했습니다.'
        );
        setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [retryNonce, slug, token, tokenMarker]);

  useEffect(() => {
    if (!linkValidated || !token || !tokenMarker) {
      return;
    }

    if (isAdminLoading) {
      setState('checking-link');
      return;
    }

    if (!isLoggedIn || !authUid) {
      attemptedConsumeRef.current = null;
      setState('login-required');
      return;
    }

    if (isAdminLoggedIn) {
      attemptedConsumeRef.current = null;
      setState('admin-blocked');
      return;
    }

    if (!emailVerified) {
      attemptedConsumeRef.current = null;
      setState('verification-required');
      return;
    }

    const attemptKey = `${authUid}:${slug}:${tokenMarker}`;
    if (attemptedConsumeRef.current === attemptKey) {
      return;
    }

    attemptedConsumeRef.current = null;
    setState('confirm-account');
  }, [
    authUid,
    emailVerified,
    isAdminLoading,
    isAdminLoggedIn,
    isLoggedIn,
    linkValidated,
    slug,
    token,
    tokenMarker,
  ]);

  const confirmAccountConnection = async () => {
    if (
      state !== 'confirm-account' || !linkValidated || !token || !tokenMarker ||
      isAdminLoading || !isLoggedIn || isAdminLoggedIn || !authUser?.emailVerified ||
      attemptedConsumeRef.current || switchingAccountRef.current
    ) {
      return;
    }

    const attemptKey = `${authUser.uid}:${slug}:${tokenMarker}`;
    attemptedConsumeRef.current = attemptKey;
    setState('connecting');
    setErrorMessage('');

    try {
      await consumeCustomerOwnershipInvite(slug, token, authUser.uid);
      if (attemptedConsumeRef.current === attemptKey) {
        router.replace(`/page-wizard/${encodeURIComponent(slug)}`);
      }
    } catch (error) {
      if (attemptedConsumeRef.current !== attemptKey) return;

      try {
        const invite = await inspectOwnershipInvite(slug, token);
        if (attemptedConsumeRef.current !== attemptKey) return;
        if (invite.status !== 'valid') {
          attemptedConsumeRef.current = null;
          setLinkValidated(false);
          setState(toTerminalState(invite.status));
          return;
        }
      } catch {
        // The safe consume error below is more useful than a secondary inspect failure.
      }

      if (attemptedConsumeRef.current !== attemptKey) return;
      attemptedConsumeRef.current = null;
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '청첩장을 계정에 연결하지 못했습니다.'
      );
      setState('error');
    }
  };

  const resendVerification = async () => {
    setVerificationAction('resend');
    setVerificationMessage('');
    const result = await sendVerificationEmail();
    setVerificationMessage(
      result.success
        ? result.alreadyVerified
          ? '이메일 인증이 이미 완료되었습니다. 인증 상태를 다시 확인해 주세요.'
          : '인증 메일을 보냈습니다. 받은 편지함과 스팸 메일함을 확인해 주세요.'
        : result.errorMessage ?? '인증 메일을 보내지 못했습니다.'
    );
    setVerificationAction(null);
  };

  const refreshVerification = async () => {
    setVerificationAction('refresh');
    setVerificationMessage('');
    const snapshot = await refreshAuthUser();
    setVerificationMessage(
      snapshot.authUser?.emailVerified
        ? '이메일 인증을 확인했습니다. 연결할 계정을 확인해 주세요.'
        : '아직 인증되지 않았습니다. 이메일의 인증 링크를 먼저 열어 주세요.'
    );
    setVerificationAction(null);
  };

  const logoutCurrentUser = async () => {
    if (switchingAccountRef.current || attemptedConsumeRef.current) return;
    switchingAccountRef.current = true;
    setVerificationAction('logout');
    setVerificationMessage('');
    setErrorMessage('');
    try {
      await logout();
    } catch {
      setErrorMessage('로그아웃하지 못했습니다. 현재 계정을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      switchingAccountRef.current = false;
      setVerificationAction(null);
    }
  };

  const terminalContent = getTerminalContent(state);
  const pageName = displayName || slug;

  return (
    <main className={styles.page} data-operation-ui>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>{pageName}</h1>
          <p className={styles.description}>
            청첩장을 관리할 계정을 확인하고 연결하면 편집을 시작할 수 있습니다.
          </p>
        </header>

        {state === 'login-required' ? (
          <div className={styles.authSlot}>
            <FirebaseAuthLoginCard
              title="고객 계정으로 계속하기"
              description="청첩장을 관리할 계정으로 로그인하거나 새로 가입해 주세요."
              helperText="이메일 가입은 인증을 마친 뒤 연결할 계정을 확인해 주세요."
              returnTo={buildConnectReturnTo(slug, token)}
              allowSignUp
            />
          </div>
        ) : (
          <section className={styles.statusCard} aria-live="polite">
            {state === 'reading-link' || state === 'checking-link' ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                <h2 className={styles.statusTitle}>연결 링크를 확인하고 있습니다.</h2>
                <p className={styles.statusDescription}>잠시만 기다려 주세요.</p>
              </>
            ) : null}

            {state === 'connecting' ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                <h2 className={styles.statusTitle}>청첩장을 계정에 연결하고 있습니다.</h2>
                <p className={styles.statusDescription}>완료되면 편집 화면으로 이동합니다.</p>
              </>
            ) : null}

            {state === 'confirm-account' ? (
              <>
                <h2 className={styles.statusTitle}>이 계정에 청첩장을 연결할까요?</h2>
                <p className={styles.statusDescription}>
                  {authUser?.email ?? '현재 로그인한 계정'}에 {pageName} 청첩장을 연결합니다.
                  연결 후 이 계정으로 내용을 확인하고 편집할 수 있습니다.
                </p>
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryButton}
                    disabled={verificationAction !== null}
                    onClick={() => void confirmAccountConnection()}>
                    이 계정으로 연결
                  </button>
                  <button type="button" className={styles.secondaryButton}
                    disabled={verificationAction !== null}
                    onClick={() => void logoutCurrentUser()}>
                    {verificationAction === 'logout' ? '계정 전환 중' : '다른 계정 사용'}
                  </button>
                </div>
              </>
            ) : null}

            {state === 'admin-blocked' ? (
              <>
                <h2 className={styles.statusTitle}>고객에게 전달할 연결 링크입니다.</h2>
                <p className={styles.statusDescription}>
                  현재 관리자 계정으로 로그인되어 있습니다. 이 링크를 고객에게 전달하거나 청첩장을 관리할 고객 계정으로 로그인해 주세요.
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={verificationAction !== null}
                    onClick={() => void logoutCurrentUser()}
                  >
                    {verificationAction === 'logout' ? '로그아웃 중' : '다른 고객 계정으로 로그인'}
                  </button>
                </div>
              </>
            ) : null}

            {state === 'verification-required' ? (
              <>
                <h2 className={styles.statusTitle}>이메일 인증이 필요합니다.</h2>
                <p className={styles.statusDescription}>
                  {authUser?.email ?? '현재 계정'}으로 보낸 인증 링크를 연 뒤 인증 상태를 확인해 주세요.
                </p>
                {verificationMessage ? (
                  <p className={styles.notice}>{verificationMessage}</p>
                ) : null}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={verificationAction !== null}
                    onClick={() => void refreshVerification()}
                  >
                    {verificationAction === 'refresh' ? '확인 중' : '인증 상태 확인'}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={verificationAction !== null}
                    onClick={() => void resendVerification()}
                  >
                    {verificationAction === 'resend' ? '전송 중' : '인증 메일 다시 보내기'}
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    disabled={verificationAction !== null}
                    onClick={() => void logoutCurrentUser()}
                  >
                    다른 계정으로 로그인
                  </button>
                </div>
              </>
            ) : null}

            {terminalContent ? (
              <>
                <h2 className={styles.statusTitle}>{terminalContent.title}</h2>
                <p className={styles.statusDescription}>{terminalContent.description}</p>
                <div className={styles.actions}>
                  <Link className={styles.primaryButton} href="/my-invitations">
                    내 청첩장 확인
                  </Link>
                  <Link className={styles.secondaryButton} href="/">
                    홈으로 이동
                  </Link>
                </div>
              </>
            ) : null}

            {state === 'error' ? (
              <>
                <h2 className={styles.statusTitle}>연결을 완료하지 못했습니다.</h2>
                <p className={styles.errorMessage}>
                  {errorMessage || '잠시 후 다시 시도해 주세요.'}
                </p>
                <div className={styles.actions}>
                  {token && tokenMarker ? (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => setRetryNonce((current) => current + 1)}
                    >
                      다시 시도
                    </button>
                  ) : null}
                  <Link className={styles.secondaryButton} href="/my-invitations">
                    내 청첩장으로 이동
                  </Link>
                </div>
              </>
            ) : null}
            {state !== 'error' && errorMessage ? (
              <p className={styles.errorMessage} role="alert">{errorMessage}</p>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
