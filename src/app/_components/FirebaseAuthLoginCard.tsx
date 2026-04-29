'use client';

import { useState } from 'react';

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
  const { login, loginWithGoogle, register } = useAdmin();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  const isRegisterMode = allowSignUp && mode === 'register';

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading('email');
    setErrorMessage('');
    setNoticeMessage('');

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
      setNoticeMessage(
        result.verificationEmailSent
          ? '인증 메일을 보냈습니다. 이메일 받은 편지함에서 인증 링크를 확인한 뒤 청첩장을 생성해 주세요.'
          : '계정은 생성됐지만 인증 메일을 보내지 못했습니다. 다시 로그인한 뒤 인증 메일을 요청해 주세요.'
      );
    }
    setLoading(null);
  };

  const handleGoogleLogin = async () => {
    setLoading('google');
    setErrorMessage('');
    setNoticeMessage('');

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
            }}
          >
            이메일 가입
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
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <button className={styles.primaryButton} type="submit" disabled={loading !== null}>
          {loading === 'email'
            ? '처리 중...'
            : isRegisterMode
              ? '이메일 계정 만들기'
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
