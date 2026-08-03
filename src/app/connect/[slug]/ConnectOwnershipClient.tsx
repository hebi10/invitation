'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { useAdmin } from '@/contexts';
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
  | 'verification-required'
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
): Exclude<ConnectState, 'reading-link' | 'checking-link' | 'login-required' | 'verification-required' | 'connecting' | 'error'> {
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
  }, [slug, token, tokenMarker]);

  useEffect(() => {
    if (!linkValidated || !token || !tokenMarker) {
      return;
    }

    if (isAdminLoading) {
      setState('checking-link');
      return;
    }

    if (!isLoggedIn || !authUser) {
      setState('login-required');
      return;
    }

    if (!authUser.emailVerified) {
      setState('verification-required');
      return;
    }

    const attemptKey = `${authUser.uid}:${slug}:${tokenMarker}`;
    if (attemptedConsumeRef.current === attemptKey) {
      return;
    }

    attemptedConsumeRef.current = attemptKey;
    setState('connecting');
    setErrorMessage('');

    consumeCustomerOwnershipInvite(slug, token)
      .then(() => {
        router.replace(`/page-wizard/${encodeURIComponent(slug)}`);
      })
      .catch(async (error) => {
        attemptedConsumeRef.current = null;

        try {
          const invite = await inspectOwnershipInvite(slug, token);
          if (invite.status !== 'valid') {
            setState(toTerminalState(invite.status));
            return;
          }
        } catch {
          // The safe consume error below is more useful than a secondary inspect failure.
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : '청첩장을 계정에 연결하지 못했습니다.'
        );
        setState('error');
      });
  }, [
    authUser,
    isAdminLoading,
    isLoggedIn,
    linkValidated,
    retryNonce,
    router,
    slug,
    token,
    tokenMarker,
  ]);

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
        ? '이메일 인증을 확인했습니다. 청첩장을 연결합니다.'
        : '아직 인증되지 않았습니다. 이메일의 인증 링크를 먼저 열어 주세요.'
    );
    setVerificationAction(null);
  };

  const logoutCurrentUser = async () => {
    setVerificationAction('logout');
    await logout();
    setVerificationMessage('');
    setVerificationAction(null);
  };

  const terminalContent = getTerminalContent(state);
  const pageName = displayName || slug;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>청첩장 계정 연결</p>
          <h1 className={styles.title}>{pageName}</h1>
          <p className={styles.description}>
            로그인 또는 회원가입을 마치면 이 청첩장을 바로 편집할 수 있습니다.
          </p>
        </header>

        {state === 'login-required' ? (
          <div className={styles.authSlot}>
            <FirebaseAuthLoginCard
              title="고객 계정으로 계속하기"
              description="청첩장을 관리할 계정으로 로그인하거나 새로 가입해 주세요."
              helperText="이메일 가입은 인증 메일 확인 후 자동으로 연결됩니다."
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
                  {linkValidated ? (
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
          </section>
        )}
      </div>
    </main>
  );
}
