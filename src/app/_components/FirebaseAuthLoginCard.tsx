'use client';

import { useEffect, useState } from 'react';

import { useAdmin } from '@/contexts';

import styles from './FirebaseAuthLoginCard.module.css';

interface FirebaseAuthLoginCardProps {
  title: string;
  description: string;
  requireAdmin?: boolean;
  allowSignUp?: boolean;
  compact?: boolean;
  helperText?: string | null;
  initialMode?: 'login' | 'register';
}

export default function FirebaseAuthLoginCard({
  title,
  description,
  requireAdmin = false,
  allowSignUp = true,
  compact = false,
  helperText = null,
  initialMode = 'login',
}: FirebaseAuthLoginCardProps) {
  const {
    authUser,
    login,
    loginWithGoogle,
    refreshSession,
    register,
    sendVerificationEmail,
  } = useAdmin();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<
    'email' | 'google' | 'verification' | 'refresh' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [canResendVerification, setCanResendVerification] = useState(false);

  const isRegisterMode = allowSignUp && mode === 'register';

  useEffect(() => {
    if (!isRegisterMode || !authUser || authUser.emailVerified) {
      return;
    }

    setCanResendVerification(true);
    setNoticeMessage((currentMessage) =>
      currentMessage ||
      '회원가입이 완료됐습니다. 이메일 받은 편지함에서 인증 링크를 확인한 뒤 청첩장을 생성해 주세요.'
    );
  }, [authUser, isRegisterMode]);

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading('email');
    setErrorMessage('');
    setNoticeMessage('');
    setCanResendVerification(false);

    const result = isRegisterMode
      ? await register(email, password)
      : await login(email, password);

    if (!result.success) {
      setErrorMessage(result.errorMessage ?? '로그인에 실패했습니다.');
      setLoading(null);
      return;
    }

    if (requireAdmin && !result.isAdmin) {
      setErrorMessage('관리자 권한이 없는 계정입니다.');
      setLoading(null);
      return;
    }

    setPassword('');
    if (isRegisterMode) {
      setCanResendVerification(result.requiresEmailVerification === true);
      setNoticeMessage(
        result.verificationEmailSent
          ? '인증 메일을 보냈습니다. 받은 편지함에서 인증 링크를 확인해 주세요. 메일이 없으면 스팸 메일함도 확인해 주세요.'
          : '계정은 생성됐지만 인증 메일 발송을 확인하지 못했습니다. 아래 버튼으로 인증 메일을 다시 보낼 수 있습니다.'
      );
    }
    setLoading(null);
  };

  const handleResendVerificationEmail = async () => {
    setLoading('verification');
    setErrorMessage('');
    setNoticeMessage('');

    const result = await sendVerificationEmail();
    if (!result.success) {
      setErrorMessage(
        result.errorMessage ?? '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
      );
      setLoading(null);
      return;
    }

    if (result.alreadyVerified) {
      setCanResendVerification(false);
      setNoticeMessage('이메일 인증이 이미 완료되었습니다. 내 청첩장 페이지로 이동해 주세요.');
      setLoading(null);
      return;
    }

    setCanResendVerification(true);
    setNoticeMessage(
      '인증 메일을 다시 보냈습니다. 받은 편지함에서 인증 링크를 확인해 주세요. 메일이 없으면 스팸 메일함도 확인해 주세요.'
    );
    setLoading(null);
  };

  const handleRefreshVerificationStatus = async () => {
    setLoading('refresh');
    setErrorMessage('');
    setNoticeMessage('');

    const snapshot = await refreshSession();
    if (snapshot.authUser?.emailVerified) {
      setCanResendVerification(false);
      setNoticeMessage('이메일 인증이 확인되었습니다. 내 청첩장 페이지로 이동합니다.');
      setLoading(null);
      return;
    }

    setCanResendVerification(true);
    setNoticeMessage(
      '아직 이메일 인증이 확인되지 않았습니다. 받은 편지함의 인증 링크를 먼저 열어 주세요. 메일이 없으면 스팸 메일함도 확인해 주세요.'
    );
    setLoading(null);
  };

  const handleGoogleLogin = async () => {
    setLoading('google');
    setErrorMessage('');
    setNoticeMessage('');
    setCanResendVerification(false);

    const result = await loginWithGoogle();
    if (!result.success) {
      setErrorMessage(result.errorMessage ?? 'Google 로그인에 실패했습니다.');
      setLoading(null);
      return;
    }

    if (requireAdmin && !result.isAdmin) {
      setErrorMessage('관리자 권한이 없는 계정입니다.');
      setLoading(null);
      return;
    }

    setLoading(null);
  };

  return (
    <section className={`${styles.card} ${compact ? styles.cardCompact : ''}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>

      {allowSignUp ? (
        <div className={styles.modeRow}>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'login' ? styles.modeButtonActive : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMessage('');
              setNoticeMessage('');
              setCanResendVerification(false);
            }}
          >
            로그인
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${mode === 'register' ? styles.modeButtonActive : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMessage('');
              setNoticeMessage('');
              setCanResendVerification(false);
            }}
          >
            회원가입
          </button>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleEmailSubmit}>
        <label className={styles.field}>
          <span className={styles.label}>이메일</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>비밀번호</span>
          <input
            className={styles.input}
            type="password"
            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력해 주세요."
            required
          />
        </label>

        {helperText ? <p className={styles.helper}>{helperText}</p> : null}
        {noticeMessage ? <p className={styles.notice}>{noticeMessage}</p> : null}
        {canResendVerification ? (
          <div className={styles.noticeActions}>
            <button
              type="button"
              className={styles.resendButton}
              onClick={() => void handleRefreshVerificationStatus()}
              disabled={loading !== null}
            >
              {loading === 'refresh' ? '인증 상태 확인 중...' : '인증 상태 확인'}
            </button>
            <button
              type="button"
              className={styles.resendButton}
              onClick={() => void handleResendVerificationEmail()}
              disabled={loading !== null}
            >
              {loading === 'verification' ? '인증 메일 보내는 중...' : '인증 메일 다시 보내기'}
            </button>
          </div>
        ) : null}
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <button className={styles.primaryButton} type="submit" disabled={loading !== null}>
          {loading === 'email'
            ? '처리 중...'
            : isRegisterMode
              ? '회원가입'
              : '이메일로 로그인'}
        </button>
      </form>

      <div className={styles.divider}>
        <span>또는</span>
      </div>

      <button
        type="button"
        className={styles.googleButton}
        onClick={() => void handleGoogleLogin()}
        disabled={loading !== null}
      >
        {loading === 'google' ? 'Google 로그인 중...' : 'Google로 로그인'}
      </button>
    </section>
  );
}
