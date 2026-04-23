'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import CustomerEventClaimCard from '@/app/_components/CustomerEventClaimCard';
import { useAdmin } from '@/contexts';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import {
  listOwnedCustomerEvents,
  type CustomerOwnedEventSummary,
} from '@/services/customerEventService';

import styles from './page.module.css';

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return '기록 없음';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function MyInvitationsClient() {
  const { authUser, isLoggedIn, isAdminLoading, logout } = useAdmin();
  const [events, setEvents] = useState<CustomerOwnedEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOwnedEvents = async () => {
    if (!authUser?.uid) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const nextEvents = await listOwnedCustomerEvents(authUser.uid);
      setEvents(nextEvents);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '이벤트 목록을 불러오지 못했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminLoading || !isLoggedIn) {
      return;
    }

    void loadOwnedEvents();
  }, [authUser?.uid, isAdminLoading, isLoggedIn]);

  const handleClaimed = async () => {
    await loadOwnedEvents();
  };

  if (isAdminLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.loading}>로그인 상태를 확인하는 중입니다.</section>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>My Invitations</p>
            <h1 className={styles.title}>내 이벤트</h1>
            <p className={styles.description}>
              로그인한 계정에 연결된 이벤트 페이지를 확인하고 수정할 수 있습니다.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/login">
                로그인
              </Link>
              <Link className={styles.secondaryButton} href="/signup">
                회원가입
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroHeader}>
            <div>
              <p className={styles.eyebrow}>My Invitations</p>
              <h1 className={styles.title}>내 이벤트</h1>
              <p className={styles.description}>
                연결된 이벤트 페이지를 확인하고 바로 수정할 수 있습니다.
              </p>
            </div>
            <div className={styles.summaryStack}>
              <span className={styles.summaryItem}>{authUser?.email ?? '이메일 없음'}</span>
              <span className={styles.summaryItem}>연결된 이벤트 {events.length}개</span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/page-wizard">
              새 이벤트 만들기
            </Link>
            <button className={styles.secondaryButton} type="button" onClick={() => void logout()}>
              로그아웃
            </button>
          </div>
        </section>

        {events.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>내 이벤트 목록</h2>
            </div>
            <div className={styles.grid}>
              {events.map((event) => {
                const publicHref = `/${event.slug}/${event.defaultTheme}`;
                const wizardHref = `/page-wizard/${encodeURIComponent(event.slug)}`;

                return (
                  <article className={styles.card} key={event.eventId}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardBadges}>
                        <span className={styles.typeBadge}>
                          {getEventTypeDisplayLabel(event.eventType)}
                        </span>
                      </div>
                      <h2 className={styles.cardTitle}>
                        {event.displayName || event.title || event.slug}
                      </h2>
                      <p className={styles.cardMeta}>주소 /{event.slug}</p>
                      <p className={styles.cardMeta}>기본 테마 {event.defaultTheme}</p>
                      <p className={styles.cardMeta}>마지막 수정 {formatDate(event.updatedAt)}</p>
                    </div>

                    <div className={styles.actions}>
                      <Link className={styles.primaryButton} href={wizardHref}>
                        수정하기
                      </Link>
                      <Link className={styles.secondaryButton} href={publicHref}>
                        미리보기
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>기존 이벤트 연결</h2>
            <p className={styles.sectionDescription}>
              예전에 만든 이벤트 페이지가 있으면 링크 또는 주소와 기존 비밀번호로 연결해 주세요.
            </p>
          </div>
          <CustomerEventClaimCard
            pageSlug=""
            title="기존 이벤트 가져오기"
            description="기존 페이지 비밀번호를 확인하면 현재 계정에 이벤트 페이지를 연결할 수 있습니다."
            helperText="청첩장 링크 전체를 붙여넣거나 주소만 입력해도 됩니다."
            onClaimed={handleClaimed}
          />
        </section>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        {loading ? (
          <section className={styles.loading}>이벤트 목록을 불러오는 중입니다.</section>
        ) : null}

        {!loading && events.length === 0 ? (
          <section className={styles.emptyState}>
            아직 연결된 이벤트가 없습니다. 새로 만들거나 기존 페이지를 연결해 주세요.
          </section>
        ) : null}
      </div>
    </main>
  );
}
