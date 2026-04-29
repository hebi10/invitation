'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import CustomerEventClaimCard from '@/app/_components/CustomerEventClaimCard';
import { useAdmin } from '@/contexts';
import {
  appQueryKeys,
  FIFTEEN_MINUTES_MS,
  THIRTY_MINUTES_MS,
} from '@/lib/appQuery';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import {
  type CustomerOwnedEventSummary,
  listOwnedCustomerEvents,
} from '@/services/customerEventService';
import { getCustomerWalletSnapshot } from '@/services/customerWalletService';
import type { CustomerWalletSummary } from '@/types/customerWallet';
import type { InvitationProductTier } from '@/types/invitationPage';

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

const PRODUCT_TIERS: InvitationProductTier[] = ['standard', 'deluxe', 'premium'];

function getPageCreationCreditTotal(wallet: CustomerWalletSummary | null | undefined) {
  if (!wallet) {
    return 0;
  }

  return PRODUCT_TIERS.reduce(
    (sum, tier) => sum + wallet.pageCreationCredits[tier],
    0
  );
}

export default function MyInvitationsClient() {
  const { authUser, isLoggedIn, isAdminLoading, isAdminLoggedIn, logout } = useAdmin();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createEventNotice, setCreateEventNotice] = useState('');
  const eventsQuery = useQuery<CustomerOwnedEventSummary[]>({
    queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
    enabled: !isAdminLoading && isLoggedIn && Boolean(authUser?.uid),
    queryFn: async () => listOwnedCustomerEvents(authUser?.uid ?? ''),
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnWindowFocus: false,
  });
  const walletQuery = useQuery<CustomerWalletSummary>({
    queryKey: appQueryKeys.customerWallet(authUser?.uid ?? null),
    enabled: !isAdminLoading && isLoggedIn && Boolean(authUser?.uid),
    queryFn: async () => getCustomerWalletSnapshot(authUser?.uid ?? ''),
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnWindowFocus: false,
  });
  const events = eventsQuery.data ?? [];
  const wallet = walletQuery.data ?? null;
  const pageCreationCreditTotal = getPageCreationCreditTotal(wallet);
  const operationTicketBalance = wallet?.operationTicketBalance ?? 0;
  const canCreateFromWallet = pageCreationCreditTotal > 0;
  const walletLoading = walletQuery.isFetching && !walletQuery.data;
  const loading = eventsQuery.isFetching && !eventsQuery.data;
  const refreshing = eventsQuery.isRefetching || walletQuery.isRefetching;
  const errorMessage =
    eventsQuery.error instanceof Error
      ? eventsQuery.error.message
      : walletQuery.error instanceof Error
        ? walletQuery.error.message
        : '';

  const handleClaimed = async (slug: string) => {
    await queryClient.invalidateQueries({
      queryKey: appQueryKeys.ownedCustomerEvents(authUser?.uid ?? null),
    });
    await eventsQuery.refetch();
    await walletQuery.refetch();

    if (slug.trim()) {
      router.push(`/page-wizard/${encodeURIComponent(slug.trim())}`, {
        scroll: false,
      });
    }
  };

  const handleCreateEvent = () => {
    if (walletLoading) {
      setCreateEventNotice('보유 제작권을 확인하는 중입니다. 잠시 후 다시 눌러 주세요.');
      return;
    }

    if (canCreateFromWallet) {
      setCreateEventNotice('');
      router.push('/my-invitations/create', { scroll: false });
      return;
    }

    if (!isAdminLoggedIn) {
      setCreateEventNotice(
        operationTicketBalance > 0
          ? '운영 티켓은 보유 중이지만 새 이벤트 생성에는 제작권이 필요합니다. 제작권이 필요하면 관리자에게 문의해 주세요.'
          : '보유한 제작권이 없습니다. 새 이벤트가 필요하면 관리자에게 문의해 주세요.'
      );
      return;
    }

    setCreateEventNotice('');
    router.push('/page-wizard', { scroll: false });
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
              <span className={styles.summaryItem}>
                보유 제작권 {pageCreationCreditTotal}개
              </span>
              <span className={styles.summaryItem}>운영 티켓 {operationTicketBalance}장</span>
            </div>
          </div>

          <div className={styles.heroActions}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={handleCreateEvent}
              disabled={walletLoading}
            >
              {walletLoading ? '제작권 확인 중' : '새 이벤트 만들기'}
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                void eventsQuery.refetch();
                void walletQuery.refetch();
              }}
              disabled={refreshing}
            >
              {refreshing ? '새로고침 중' : '새로고침'}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => void logout()}>
              로그아웃
            </button>
          </div>
          {createEventNotice ? (
            <p className={styles.notice} role="status">
              {createEventNotice}
            </p>
          ) : null}
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
                      <Link
                        className={styles.primaryButton}
                        href={wizardHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        수정하기
                      </Link>
                      <Link
                        className={styles.secondaryButton}
                        href={publicHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
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
