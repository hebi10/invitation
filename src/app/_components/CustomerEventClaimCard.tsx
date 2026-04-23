'use client';

import Link from 'next/link';
import { useState } from 'react';

import { claimOwnedCustomerEvent } from '@/services/customerEventService';

import styles from './CustomerEventClaimCard.module.css';

interface CustomerEventClaimCardProps {
  pageSlug?: string;
  title: string;
  description: string;
  helperText?: string | null;
  compact?: boolean;
  onClaimed?: (slug: string) => void | Promise<void>;
}

export default function CustomerEventClaimCard({
  pageSlug = '',
  title,
  description,
  helperText = null,
  compact = false,
  onClaimed,
}: CustomerEventClaimCardProps) {
  const [pageSlugInput, setPageSlugInput] = useState(pageSlug);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const usesFixedPageSlug = pageSlug.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await claimOwnedCustomerEvent({
        pageSlugOrUrl: usesFixedPageSlug ? pageSlug : pageSlugInput,
        password,
      });
      setPassword('');
      if (!usesFixedPageSlug) {
        setPageSlugInput(result.slug);
      }
      setSuccessMessage('이 계정에 청첩장을 연결했습니다. 이제 바로 관리할 수 있습니다.');
      await onClaimed?.(result.slug);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '기존 청첩장 연결에 실패했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`${styles.card} ${compact ? styles.cardCompact : ''}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>

      {helperText ? <p className={styles.helper}>{helperText}</p> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        {!usesFixedPageSlug ? (
          <label className={styles.field}>
            <span className={styles.label}>청첩장 링크 또는 주소</span>
            <input
              className={styles.input}
              type="text"
              autoComplete="off"
              value={pageSlugInput}
              onChange={(event) => setPageSlugInput(event.target.value)}
              placeholder="https://... 또는 shin-minje-kim-hyunji"
              required
            />
          </label>
        ) : null}

        <label className={styles.field}>
          <span className={styles.label}>기존 페이지 비밀번호</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="기존에 설정한 페이지 비밀번호를 입력해 주세요"
            required
          />
        </label>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

        <button className={styles.primaryButton} type="submit" disabled={loading}>
          {loading ? '연결하는 중...' : '내 계정에 연결하기'}
        </button>
      </form>

      <div className={styles.actions}>
        <Link className={styles.linkButton} href={`/my-invitations`}>
          내 청첩장 보기
        </Link>
      </div>
    </section>
  );
}
