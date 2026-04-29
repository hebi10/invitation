'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAdmin } from '@/contexts';
import {
  MOBILE_INVITATION_DELETE_REQUEST_PATH,
  MOBILE_INVITATION_PRIVACY_POLICY_PATH,
} from '@/app/privacy/mobile-invitation/content';
import {
  appQueryKeys,
  FIFTEEN_MINUTES_MS,
  GUESTBOOK_GC_TIME_MS,
  GUESTBOOK_STALE_TIME_MS,
  THIRTY_MINUTES_MS,
} from '@/lib/appQuery';
import { getEventTypeDisplayLabel } from '@/lib/eventTypes';
import {
  buildInvitationThemeRoutePath,
  getInvitationThemeLabel,
} from '@/lib/invitationThemes';
import {
  deleteCustomerEventGuestbookComment,
  type CustomerEventGuestbookComment,
  type CustomerOwnedEventSummary,
  listCustomerEventGuestbookComments,
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

function getCommentStatusLabel(status: CustomerEventGuestbookComment['status']) {
  switch (status) {
    case 'hidden':
      return '숨김';
    case 'pending_delete':
      return '삭제 예정';
    default:
      return '공개';
  }
}

const PRODUCT_TIERS: InvitationProductTier[] = ['standard', 'deluxe', 'premium'];
const GUESTBOOK_MODAL_PAGE_SIZE = 10;

function LegalFooter() {
  return (
    <footer className={styles.legalFooter} aria-label="서비스 정책 안내">
      <p className={styles.legalFooterLabel}>모바일 앱과 고객 데이터 안내</p>
      <div className={styles.legalFooterLinks}>
        <Link className={styles.legalFooterLink} href={MOBILE_INVITATION_PRIVACY_POLICY_PATH}>
          개인정보처리방침
        </Link>
        <Link className={styles.legalFooterLink} href={MOBILE_INVITATION_DELETE_REQUEST_PATH}>
          계정 및 데이터 삭제 요청
        </Link>
      </div>
    </footer>
  );
}

function getPaginationPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5;
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const firstPage = Math.min(
    Math.max(currentPage - Math.floor(maxVisiblePages / 2), 1),
    totalPages - maxVisiblePages + 1
  );

  return Array.from({ length: maxVisiblePages }, (_, index) => firstPage + index);
}

function getPageCreationCreditTotal(wallet: CustomerWalletSummary | null | undefined) {
  if (!wallet) {
    return 0;
  }

  return PRODUCT_TIERS.reduce(
    (sum, tier) => sum + wallet.pageCreationCredits[tier],
    0
  );
}

interface OwnedEventCardProps {
  authUid: string | null;
  event: CustomerOwnedEventSummary;
}

function OwnedEventCard({ authUid, event }: OwnedEventCardProps) {
  const queryClient = useQueryClient();
  const [guestbookOpen, setGuestbookOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [guestbookPage, setGuestbookPage] = useState(1);
  const [deletingCommentId, setDeletingCommentId] = useState('');
  const wizardHref = `/page-wizard/${encodeURIComponent(event.slug)}`;
  const previewThemes =
    event.availableThemes.length > 0 ? event.availableThemes : [event.defaultTheme];
  const previewLinks = previewThemes.map((theme) => ({
    theme,
    href: buildInvitationThemeRoutePath(event.slug, theme),
    label: getInvitationThemeLabel(theme),
    isDefault: theme === event.defaultTheme,
  }));
  const singlePreviewLink = previewLinks.length === 1 ? previewLinks[0] : null;
  const guestbookQueryKey = appQueryKeys.customerEventGuestbookComments(
    event.slug,
    authUid
  );
  const commentsQuery = useQuery<CustomerEventGuestbookComment[]>({
    queryKey: guestbookQueryKey,
    enabled: guestbookOpen && Boolean(authUid),
    queryFn: async () => listCustomerEventGuestbookComments(event.slug),
    staleTime: GUESTBOOK_STALE_TIME_MS,
    gcTime: GUESTBOOK_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) =>
      deleteCustomerEventGuestbookComment(event.slug, commentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: guestbookQueryKey,
      });
    },
    onSettled: () => setDeletingCommentId(''),
  });
  const comments = commentsQuery.data ?? [];
  const guestbookTotalPages = Math.max(
    1,
    Math.ceil(comments.length / GUESTBOOK_MODAL_PAGE_SIZE)
  );
  const currentGuestbookPage = Math.min(guestbookPage, guestbookTotalPages);
  const paginatedComments = comments.slice(
    (currentGuestbookPage - 1) * GUESTBOOK_MODAL_PAGE_SIZE,
    currentGuestbookPage * GUESTBOOK_MODAL_PAGE_SIZE
  );
  const guestbookPageStart =
    comments.length === 0
      ? 0
      : (currentGuestbookPage - 1) * GUESTBOOK_MODAL_PAGE_SIZE + 1;
  const guestbookPageEnd = Math.min(
    currentGuestbookPage * GUESTBOOK_MODAL_PAGE_SIZE,
    comments.length
  );
  const guestbookPageNumbers = getPaginationPageNumbers(
    currentGuestbookPage,
    guestbookTotalPages
  );
  const eventTitle = event.displayName || event.title || event.slug;
  const guestbookErrorMessage =
    commentsQuery.error instanceof Error
      ? commentsQuery.error.message
      : deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : '';

  const handleDeleteComment = (comment: CustomerEventGuestbookComment) => {
    if (
      !window.confirm(
        '선택한 방명록을 삭제 예정 상태로 변경할까요? 삭제 예정 댓글은 공개 화면에 보이지 않습니다.'
      )
    ) {
      return;
    }

    setDeletingCommentId(comment.id);
    deleteMutation.mutate(comment.id);
  };

  useEffect(() => {
    if (!guestbookOpen && !previewOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setGuestbookOpen(false);
        setPreviewOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [guestbookOpen, previewOpen]);

  useEffect(() => {
    if (!guestbookOpen || guestbookPage <= guestbookTotalPages) {
      return;
    }

    setGuestbookPage(guestbookTotalPages);
  }, [guestbookOpen, guestbookPage, guestbookTotalPages]);

  return (
    <>
      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardBadges}>
            <span className={styles.typeBadge}>
              {getEventTypeDisplayLabel(event.eventType)}
            </span>
          </div>
          <h2 className={styles.cardTitle}>{eventTitle}</h2>
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
          {singlePreviewLink ? (
            <Link
              className={styles.secondaryButton}
              href={singlePreviewLink.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              미리보기
            </Link>
          ) : (
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => setPreviewOpen(true)}
            >
              미리보기
            </button>
          )}
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => {
              setGuestbookPage(1);
              setGuestbookOpen(true);
            }}
          >
            방명록 확인
          </button>
        </div>
      </article>

      {previewOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewOpen(false);
            }
          }}
        >
          <section
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`preview-title-${event.eventId}`}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleStack}>
                <p className={styles.eyebrow}>Preview</p>
                <h3
                  className={styles.modalTitle}
                  id={`preview-title-${event.eventId}`}
                >
                  미리볼 디자인 선택
                </h3>
                <p className={styles.modalDescription}>
                  {eventTitle}에 연결된 디자인 중 하나를 선택해 공개 화면을 확인할 수 있습니다.
                </p>
              </div>
              <button
                className={styles.modalCloseButton}
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="미리보기 선택 팝업 닫기"
              >
                닫기
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.previewChoiceList}>
                {previewLinks.map((preview) => (
                  <Link
                    className={styles.previewChoiceLink}
                    href={preview.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={preview.theme}
                    onClick={() => setPreviewOpen(false)}
                  >
                    <span className={styles.previewChoiceText}>
                      <strong>{preview.label}</strong>
                      <span>{preview.href}</span>
                    </span>
                    {preview.isDefault ? (
                      <span className={styles.previewChoiceBadge}>기본</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {guestbookOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setGuestbookOpen(false);
            }
          }}
        >
          <section
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`guestbook-title-${event.eventId}`}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleStack}>
                <p className={styles.eyebrow}>Guestbook</p>
                <h3
                  className={styles.modalTitle}
                  id={`guestbook-title-${event.eventId}`}
                >
                  {eventTitle} 방명록
                </h3>
                <p className={styles.modalDescription}>
                  공개 청첩장에 남겨진 축하 메시지를 확인하고 관리할 수 있습니다.
                </p>
              </div>
              <button
                className={styles.modalCloseButton}
                type="button"
                onClick={() => setGuestbookOpen(false)}
                aria-label="방명록 팝업 닫기"
              >
                닫기
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.guestbookPanel}>
                <div className={styles.guestbookHeader}>
                  <h4 className={styles.guestbookTitle}>방명록 메시지</h4>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => void commentsQuery.refetch()}
                    disabled={commentsQuery.isFetching}
                  >
                    {commentsQuery.isFetching ? '새로고침 중' : '새로고침'}
                  </button>
                </div>

                {guestbookErrorMessage ? (
                  <p className={styles.error}>{guestbookErrorMessage}</p>
                ) : null}

                {commentsQuery.isFetching && !commentsQuery.data ? (
                  <p className={styles.cardMeta}>방명록을 불러오는 중입니다.</p>
                ) : null}

                {!commentsQuery.isFetching && comments.length === 0 ? (
                  <p className={styles.cardMeta}>아직 등록된 방명록이 없습니다.</p>
                ) : null}

                {comments.length > 0 ? (
                  <>
                    <div className={styles.guestbookList}>
                      {paginatedComments.map((comment) => (
                        <div className={styles.guestbookItem} key={comment.id}>
                          <div className={styles.guestbookItemHeader}>
                            <div>
                              <strong>{comment.author}</strong>
                              <p className={styles.guestbookMeta}>
                                {formatDate(comment.createdAt)} ·{' '}
                                {getCommentStatusLabel(comment.status)}
                              </p>
                            </div>
                            <button
                              className={styles.dangerButton}
                              type="button"
                              onClick={() => handleDeleteComment(comment)}
                              disabled={
                                deleteMutation.isPending ||
                                comment.status === 'pending_delete'
                              }
                            >
                              {deletingCommentId === comment.id ? '삭제 중' : '삭제'}
                            </button>
                          </div>
                          <p className={styles.guestbookMessage}>{comment.message}</p>
                        </div>
                      ))}
                    </div>

                    {guestbookTotalPages > 1 ? (
                      <div
                        className={styles.guestbookPagination}
                        aria-label="방명록 페이지 이동"
                      >
                        <p className={styles.guestbookPageSummary}>
                          {guestbookPageStart}-{guestbookPageEnd} / {comments.length}개
                        </p>
                        <div className={styles.guestbookPageControls}>
                          <button
                            className={styles.guestbookPageButton}
                            type="button"
                            onClick={() =>
                              setGuestbookPage((page) => Math.max(1, page - 1))
                            }
                            disabled={currentGuestbookPage === 1}
                          >
                            이전
                          </button>
                          {guestbookPageNumbers.map((page) => (
                            <button
                              className={
                                page === currentGuestbookPage
                                  ? `${styles.guestbookPageButton} ${styles.guestbookPageButtonActive}`
                                  : styles.guestbookPageButton
                              }
                              type="button"
                              key={page}
                              onClick={() => setGuestbookPage(page)}
                              aria-current={
                                page === currentGuestbookPage ? 'page' : undefined
                              }
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            className={styles.guestbookPageButton}
                            type="button"
                            onClick={() =>
                              setGuestbookPage((page) =>
                                Math.min(guestbookTotalPages, page + 1)
                              )
                            }
                            disabled={currentGuestbookPage === guestbookTotalPages}
                          >
                            다음
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default function MyInvitationsClient() {
  const { authUser, isLoggedIn, isAdminLoading, isAdminLoggedIn, logout } = useAdmin();
  const router = useRouter();
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
          <LegalFooter />
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
          <LegalFooter />
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
              {events.map((event) => (
                <OwnedEventCard
                  authUid={authUser?.uid ?? null}
                  event={event}
                  key={event.eventId}
                />
              ))}
            </div>
          </section>
        ) : null}

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        {loading ? (
          <section className={styles.loading}>이벤트 목록을 불러오는 중입니다.</section>
        ) : null}

        {!loading && events.length === 0 ? (
          <section className={styles.emptyState}>
            아직 연결된 이벤트가 없습니다. 새 이벤트를 만들거나 관리자에게 계정 연결을 요청해 주세요.
          </section>
        ) : null}

        <LegalFooter />
      </div>
    </main>
  );
}
