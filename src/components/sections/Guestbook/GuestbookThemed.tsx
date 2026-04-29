'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import CustomerEventClaimCard from '@/app/_components/CustomerEventClaimCard';
import FirebaseAuthLoginCard from '@/app/_components/FirebaseAuthLoginCard';
import { useAdmin } from '@/contexts';
import {
  appQueryKeys,
  FIFTEEN_MINUTES_MS,
  GUESTBOOK_GC_TIME_MS,
  GUESTBOOK_STALE_TIME_MS,
  THIRTY_MINUTES_MS,
} from '@/lib/appQuery';
import {
  addComment,
  deleteComment,
  getComments,
  type Comment,
} from '@/services/commentService';
import { getCustomerEventOwnershipStatus } from '@/services/customerEventService';
import { HeartIcon, HeartIconSimple } from '@/components/icons';

interface GuestbookThemedProps {
  pageSlug: string;
  styles: Record<string, string>;
  title: string;
  subtitle: string;
  statusColors: {
    success: string;
    error: string;
  };
  emptyIcon?: ReactNode;
}

type StatusTone = 'success' | 'error';

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function cx(...classNames: Array<string | undefined | null | false>) {
  return classNames.filter(Boolean).join(' ');
}

function hasClass(styles: Record<string, string>, className: string) {
  return Boolean(styles[className]);
}

function getGuestbookSubmitErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '메시지 등록에 실패했습니다.';
}

export default function GuestbookThemed({
  pageSlug,
  styles,
  title,
  subtitle,
  statusColors,
  emptyIcon,
}: GuestbookThemedProps) {
  const { authUser, isAdminLoggedIn, isLoggedIn, supportsInteractiveAuth } = useAdmin();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<StatusTone>('success');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [showClientManager, setShowClientManager] = useState(false);
  const [ownershipState, setOwnershipState] = useState<
    'unknown' | 'owner' | 'claimable' | 'different-owner' | 'missing'
  >('unknown');
  const [lastTitleInteraction, setLastTitleInteraction] = useState(0);
  const commentsQuery = useQuery({
    queryKey: appQueryKeys.guestbookComments(pageSlug),
    enabled: Boolean(pageSlug),
    queryFn: async () => getComments(pageSlug),
    staleTime: GUESTBOOK_STALE_TIME_MS,
    gcTime: GUESTBOOK_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const ownershipQuery = useQuery({
    queryKey: appQueryKeys.guestbookOwnership(pageSlug, authUser?.uid ?? null),
    enabled: !isAdminLoggedIn && isLoggedIn && Boolean(pageSlug),
    queryFn: async () => getCustomerEventOwnershipStatus(pageSlug, authUser?.uid),
    staleTime: FIFTEEN_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
    refetchOnWindowFocus: false,
  });
  const comments = commentsQuery.data ?? [];
  const isRefreshingComments = commentsQuery.isRefetching;

  const canManageComments = isAdminLoggedIn || ownershipState === 'owner';
  const commentsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(comments.length / commentsPerPage));
  const currentComments = comments.slice(
    (currentPage - 1) * commentsPerPage,
    currentPage * commentsPerPage
  );

  const commentsSectionClassName = styles.commentsSection;
  const commentsListClassName = styles.commentsList;
  const commentsGridClassName = styles.commentsGrid;
  const commentsCountClassName = styles.commentsCount ?? styles.commentCount;
  const formShellClassName = cx(styles.formContainer, styles.formCard);
  const authorIconClassName = styles.authorIcon ?? styles.commentAuthorIcon;
  const authorNameClassName = styles.authorName ?? styles.commentName ?? styles.commentAuthor;
  const pageNumberClassName = styles.pageNumber ?? styles.pageButton;
  const activePageClassName = styles.active ?? styles.pageButtonActive;
  const resolvedEmptyIcon =
    emptyIcon ?? (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 0,
        }}
      >
        <HeartIconSimple width={14} height={12} />
      </span>
    );

  const showStatus = (messageText: string, tone: StatusTone) => {
    setStatusTone(tone);
    setStatusMessage(messageText);
  };

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (isAdminLoggedIn) {
      setOwnershipState('owner');
      return;
    }

    if (!isLoggedIn) {
      setOwnershipState('unknown');
      return;
    }

    if (ownershipQuery.data) {
      setOwnershipState(ownershipQuery.data.status);
      return;
    }

    if (ownershipQuery.error) {
      setOwnershipState('unknown');
    }
  }, [
    authUser?.uid,
    isAdminLoggedIn,
    isLoggedIn,
    ownershipQuery.data,
    ownershipQuery.error,
    pageSlug,
  ]);

  useEffect(() => {
    if (!commentsQuery.error) {
      return;
    }

    console.error('Failed to load comments', commentsQuery.error);
    showStatus('방명록을 불러오지 못했습니다.', 'error');
  }, [commentsQuery.error]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !message.trim()) {
      showStatus('이름과 메시지를 입력해 주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addComment({
        pageSlug,
        author: name.trim(),
        message: message.trim(),
      });
      setName('');
      setMessage('');
      setCurrentPage(1);
      await queryClient.invalidateQueries({
        queryKey: appQueryKeys.guestbookComments(pageSlug),
      });
      showStatus('메시지가 등록되었습니다.', 'success');
    } catch (error) {
      console.error('Failed to add comment', error);
      showStatus(getGuestbookSubmitErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (comment: Comment) => {
    if (!canManageComments) {
      showStatus('관리 권한이 있는 계정으로 로그인한 뒤 삭제할 수 있습니다.', 'error');
      return;
    }

    if (!window.confirm('이 메시지를 삭제할까요?')) {
      return;
    }

    try {
      await deleteComment(comment.id, comment.collectionName);
      await queryClient.invalidateQueries({
        queryKey: appQueryKeys.guestbookComments(pageSlug),
      });
      showStatus('메시지를 삭제했습니다.', 'success');
    } catch (error) {
      console.error('Failed to delete comment', error);
      showStatus('메시지 삭제에 실패했습니다.', 'error');
    }
  };

  const handleTitleInteraction = () => {
    if (isAdminLoggedIn || !supportsInteractiveAuth) {
      return;
    }

    const now = Date.now();
    if (lastTitleInteraction && now - lastTitleInteraction < 320) {
      setShowClientManager((current) => !current);
      setLastTitleInteraction(0);
      return;
    }

    setLastTitleInteraction(now);
  };

  const pageNumbers = useMemo(() => {
    const maxPages = isMobile ? 3 : 5;
    if (totalPages <= maxPages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const sidePages = Math.floor((maxPages - 1) / 2);
    if (currentPage <= sidePages + 1) {
      return Array.from({ length: maxPages }, (_, index) => index + 1);
    }

    if (currentPage >= totalPages - sidePages) {
      return Array.from(
        { length: maxPages },
        (_, index) => totalPages - maxPages + index + 1
      );
    }

    return Array.from({ length: maxPages }, (_, index) => currentPage - sidePages + index);
  }, [currentPage, isMobile, totalPages]);

  const renderStatus = () => {
    if (!statusMessage) {
      return null;
    }

    if (statusTone === 'error' && styles.errorMessage) {
      return <p className={styles.errorMessage}>{statusMessage}</p>;
    }

    return (
      <p
        style={{
          margin: '0 0 1rem',
          textAlign: 'center',
          color: statusTone === 'error' ? statusColors.error : statusColors.success,
          fontSize: '0.92rem',
          fontWeight: 600,
        }}
      >
        {statusMessage}
      </p>
    );
  };

  const renderManagerBlock = () => {
    if (!showClientManager && !canManageComments) {
      return null;
    }

    if (showClientManager && !isLoggedIn) {
      return (
        <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.7rem' }}>
          <FirebaseAuthLoginCard
            compact
            title="로그인 후 방명록을 관리해 주세요"
            description="이메일 로그인이나 Google 로그인을 완료하면 현재 계정 UID 기준으로 청첩장 소유권을 확인합니다."
            helperText="기본 이메일 로그인과 Google 로그인만 지원합니다."
          />
        </div>
      );
    }

    if (showClientManager && !isAdminLoggedIn && ownershipState === 'claimable') {
      return (
        <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.7rem' }}>
          <CustomerEventClaimCard
            compact
            pageSlug={pageSlug}
            title="기존 청첩장을 현재 계정에 연결해 주세요"
            description="기존 페이지 비밀번호를 한 번 확인하면 이 계정으로 방명록을 계속 관리할 수 있습니다."
            helperText="연결 이후에는 Firebase 로그인만으로 방명록 관리가 가능합니다."
            onClaimed={async () => {
              setOwnershipState('owner');
              setShowClientManager(false);
              showStatus('현재 계정에 청첩장을 연결했습니다.', 'success');
            }}
          />
        </div>
      );
    }

    if (showClientManager && !isAdminLoggedIn && ownershipState === 'different-owner') {
      return (
        <div
          style={{
            marginTop: '0.9rem',
            display: 'grid',
            gap: '0.55rem',
            padding: '0.9rem 1rem',
            border: '1px solid rgba(248, 113, 113, 0.28)',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <strong style={{ fontSize: '0.95rem' }}>다른 계정에 연결된 청첩장입니다.</strong>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6 }}>
            현재 로그인한 계정으로는 이 방명록을 관리할 수 없습니다. 내 청첩장은 내 청첩장 관리 페이지에서 확인해 주세요.
          </p>
        </div>
      );
    }

    if (showClientManager && !isAdminLoggedIn && ownershipState === 'missing') {
      return (
        <div
          style={{
            marginTop: '0.9rem',
            display: 'grid',
            gap: '0.55rem',
            padding: '0.9rem 1rem',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            borderRadius: '14px',
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <strong style={{ fontSize: '0.95rem' }}>청첩장 정보를 찾지 못했습니다.</strong>
          <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6 }}>
            이 페이지와 연결된 청첩장 정보가 없어 방명록 관리 권한을 확인할 수 없습니다.
          </p>
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: '0.9rem',
          display: 'grid',
          gap: '0.7rem',
          padding: '0.9rem 1rem',
          border: '1px solid rgba(148, 163, 184, 0.24)',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: 1.6, textAlign: 'center' }}>
          {isAdminLoggedIn
            ? '관리자 권한 로그인 중입니다.'
            : '이 방명록을 관리할 수 있는 계정으로 로그인했습니다.'}
        </p>
      </div>
    );
  };

  const renderHeader = () => {
    const titleContent = <h2 className={styles.title}>{title}</h2>;

    const content = (
      <>
        {hasClass(styles, 'lemonDecoration') ? (
          <div className={styles.lemonDecoration}>🍋</div>
        ) : null}
        <div
          className={styles.titleSection}
          onDoubleClick={() => {
            if (!isAdminLoggedIn) {
              setShowClientManager((current) => !current);
            }
          }}
          onTouchEnd={() => {
            handleTitleInteraction();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (!isAdminLoggedIn) {
                setShowClientManager((current) => !current);
              }
            }
          }}
          role="button"
          tabIndex={0}
          title="제목을 두 번 눌러 방명록 관리 모드를 열 수 있습니다."
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {titleContent}
        </div>
        <p className={styles.subtitle}>{subtitle}</p>
        {renderManagerBlock()}
      </>
    );

    return styles.header ? <div className={styles.header}>{content}</div> : content;
  };

  const renderForm = () => {
    const content = (
      <>
        {hasClass(styles, 'cardGlow') ? <div className={styles.cardGlow} /> : null}
        {hasClass(styles, 'formHeader') ? (
          <div className={styles.formHeader}>
            {hasClass(styles, 'formIcon') ? <span className={styles.formIcon}>♡</span> : null}
            {hasClass(styles, 'formTitle') ? (
              <p className={styles.formTitle}>따뜻한 축하의 마음을 남겨 주세요.</p>
            ) : null}
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={cx(styles.formRow, styles.inputGroup)}>
            {hasClass(styles, 'label') ? (
              <label className={styles.label}>
                {hasClass(styles, 'labelIcon') ? (
                  <span className={styles.labelIcon}>♡</span>
                ) : null}
                이름
              </label>
            ) : null}
            <input
              type="text"
              className={styles.input}
              placeholder="이름"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={20}
              required
            />
          </div>

          <div className={cx(styles.formRow, styles.inputGroup)}>
            {hasClass(styles, 'label') ? (
              <label className={styles.label}>
                {hasClass(styles, 'labelIcon') ? (
                  <span className={styles.labelIcon}>♡</span>
                ) : null}
                메시지
              </label>
            ) : null}
            <textarea
              className={styles.textarea}
              placeholder="축하 메시지를 남겨 주세요."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              rows={4}
              required
            />
          </div>

          {hasClass(styles, 'guideText') ? (
            <div className={styles.guideText}>
              <p className={styles.guideMessage}>
                {hasClass(styles, 'guideIcon') ? (
                  <span className={styles.guideIcon}>♡</span>
                ) : null}
                진심을 담은 한마디를 적어 주세요.
              </p>
              <p className={styles.limitMessage}>
                {hasClass(styles, 'limitIcon') ? (
                  <span className={styles.limitIcon}>♡</span>
                ) : null}
                최대 500자까지 작성할 수 있습니다.
              </p>
            </div>
          ) : null}

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {hasClass(styles, 'buttonIcon') ? (
              <HeartIcon className={styles.pointHeart} />
            ) : null}
            {hasClass(styles, 'buttonText') ? (
              <span className={styles.buttonText}>
                {isSubmitting ? '등록 중...' : '메시지 남기기'}
              </span>
            ) : isSubmitting ? (
              '등록 중...'
            ) : (
              '메시지 남기기'
            )}
          </button>
        </form>
      </>
    );

    return formShellClassName ? <div className={formShellClassName}>{content}</div> : content;
  };

  const renderCommentsHeader = () => (
    <div className={styles.commentsHeader}>
      {hasClass(styles, 'commentsCountSection') ? (
        <div className={styles.commentsCountSection}>
          {hasClass(styles, 'commentsIcon') ? (
            <span className={styles.commentsIcon}>{resolvedEmptyIcon}</span>
          ) : null}
          <span className={commentsCountClassName}>
            총 <strong>{comments.length}</strong>개의 메시지
          </span>
        </div>
      ) : (
        <span className={commentsCountClassName}>
          총 <strong>{comments.length}</strong>개의 메시지
        </span>
      )}

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55rem',
          marginLeft: 'auto',
        }}
      >
        {styles.pageInfo && totalPages > 1 ? (
          <span className={styles.pageInfo}>
            {currentPage} / {totalPages}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void commentsQuery.refetch();
            void ownershipQuery.refetch();
          }}
          disabled={isRefreshingComments}
          style={{
            minHeight: '32px',
            padding: '0 12px',
            borderRadius: '999px',
            border: '1px solid rgba(148, 163, 184, 0.28)',
            background: 'rgba(255,255,255,0.82)',
            color: '#475569',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          {isRefreshingComments ? '새로고침 중' : '새로고침'}
        </button>
      </div>
    </div>
  );

  const renderCommentContent = (comment: Comment) => {
    const body = hasClass(styles, 'commentContent') ? (
      <div className={styles.commentContent}>
        {hasClass(styles, 'commentQuote') ? (
          <span className={styles.commentQuote}>"</span>
        ) : null}
        <p className={styles.commentMessage}>{comment.message}</p>
        {hasClass(styles, 'commentQuote') ? (
          <span className={styles.commentQuote}>"</span>
        ) : null}
      </div>
    ) : (
      <p className={styles.commentMessage}>{comment.message}</p>
    );

    const header = (
      <div className={styles.commentHeader}>
        {hasClass(styles, 'commentAuthorSection') ? (
          <div className={styles.commentAuthorSection}>
            {authorIconClassName ? (
              <span className={authorIconClassName}>{resolvedEmptyIcon}</span>
            ) : null}
            <span className={authorNameClassName}>{comment.author}</span>
          </div>
        ) : (
          <div className={styles.commentAuthor}>
            {authorIconClassName ? (
              <span className={authorIconClassName}>{resolvedEmptyIcon}</span>
            ) : null}
            <span className={authorNameClassName}>{comment.author}</span>
          </div>
        )}

        <div className={styles.commentActions}>
          {hasClass(styles, 'commentDateSection') ? (
            <div className={styles.commentDateSection}>
              <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
            </div>
          ) : (
            <span className={styles.commentDate}>{formatDate(comment.createdAt)}</span>
          )}

          {canManageComments ? (
            <button
              className={styles.deleteButton}
              onClick={() => void handleDelete(comment)}
              type="button"
            >
              삭제
            </button>
          ) : null}
        </div>
      </div>
    );

    const content = (
      <>
        {header}
        {body}
      </>
    );

    if (styles.commentCard) {
      return (
        <div
          key={`${comment.collectionName ?? 'comments'}:${comment.id}`}
          className={styles.commentItem}
        >
          <article className={styles.commentCard}>{content}</article>
        </div>
      );
    }

    return (
      <article
        key={`${comment.collectionName ?? 'comments'}:${comment.id}`}
        className={styles.commentItem}
      >
        {content}
      </article>
    );
  };

  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      {hasClass(styles, 'emptyIcon') ? (
        <span className={styles.emptyIcon}>{resolvedEmptyIcon}</span>
      ) : null}
      {hasClass(styles, 'emptyMessage') ? (
        <p className={styles.emptyMessage}>첫 축하 메시지를 남겨 주세요.</p>
      ) : null}
      {hasClass(styles, 'emptySubMessage') ? (
        <p className={styles.emptySubMessage}>여러분의 마음을 기다리고 있습니다.</p>
      ) : null}
      {!hasClass(styles, 'emptyMessage') ? (
        <p className={styles.emptyText}>첫 축하 메시지를 남겨 주세요.</p>
      ) : null}
    </div>
  );

  const renderCommentsBody = () => {
    if (currentComments.length === 0) {
      return renderEmptyState();
    }

    const items = currentComments.map((comment) => renderCommentContent(comment));
    return commentsGridClassName ? <div className={commentsGridClassName}>{items}</div> : items;
  };

  const renderPagination = () => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className={styles.pagination}>
        <button
          className={cx(styles.pageButton, currentPage === 1 && styles.disabled)}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={currentPage === 1}
          type="button"
        >
          {hasClass(styles, 'pageButtonIcon') ? (
            <span className={styles.pageButtonIcon}>‹</span>
          ) : null}
          {hasClass(styles, 'pageButtonText') ? (
            <span className={styles.pageButtonText}>이전</span>
          ) : (
            '이전'
          )}
        </button>

        <div className={styles.pageNumbers}>
          {pageNumbers.map((page) => (
            <button
              key={page}
              className={cx(pageNumberClassName, currentPage === page && activePageClassName)}
              onClick={() => setCurrentPage(page)}
              type="button"
            >
              {page}
            </button>
          ))}
        </div>

        <button
          className={cx(styles.pageButton, currentPage === totalPages && styles.disabled)}
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
          type="button"
        >
          {hasClass(styles, 'pageButtonText') ? (
            <span className={styles.pageButtonText}>다음</span>
          ) : (
            '다음'
          )}
          {hasClass(styles, 'pageButtonIcon') ? (
            <span className={styles.pageButtonIcon}>›</span>
          ) : null}
        </button>
      </div>
    );
  };

  const commentsBlock = (
    <div className={commentsListClassName}>
      {renderCommentsHeader()}
      {renderCommentsBody()}
    </div>
  );

  return (
    <section className={styles.container}>
      {hasClass(styles, 'spaceBackground') ? (
        <div className={styles.spaceBackground}>
          {hasClass(styles, 'stars') ? <div className={styles.stars} /> : null}
        </div>
      ) : null}

      {hasClass(styles, 'decorations') ? (
        <div className={styles.decorations}>
          {hasClass(styles, 'floatingPlanet1') ? <div className={styles.floatingPlanet1} /> : null}
          {hasClass(styles, 'floatingPlanet2') ? <div className={styles.floatingPlanet2} /> : null}
        </div>
      ) : null}

      {hasClass(styles, 'topDecoration') ? (
        <svg
          className={styles.topDecoration}
          viewBox="0 0 100 10"
          aria-hidden="true"
          style={{ color: 'var(--accent)' }}
        >
          <path d="M 0 5 Q 25 2, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      ) : null}

      {renderHeader()}
      {renderStatus()}
      {renderForm()}
      {commentsSectionClassName ? (
        <div className={commentsSectionClassName}>{commentsBlock}</div>
      ) : (
        commentsBlock
      )}
      {renderPagination()}

      {hasClass(styles, 'bottomDecoration') ? (
        <svg
          className={styles.bottomDecoration}
          viewBox="0 0 100 10"
          aria-hidden="true"
          style={{ color: 'var(--accent)' }}
        >
          <path d="M 0 5 Q 25 8, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      ) : null}
    </section>
  );
}
