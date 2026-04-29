'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import {
  appQueryKeys,
  GUESTBOOK_GC_TIME_MS,
  GUESTBOOK_STALE_TIME_MS,
} from '@/lib/appQuery';
import {
  addComment,
  getComments,
  type Comment,
} from '@/services/commentService';
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
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<StatusTone>('success');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const commentsQuery = useQuery({
    queryKey: appQueryKeys.guestbookComments(pageSlug),
    enabled: Boolean(pageSlug),
    queryFn: async () => getComments(pageSlug),
    staleTime: GUESTBOOK_STALE_TIME_MS,
    gcTime: GUESTBOOK_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const comments = commentsQuery.data ?? [];
  const isRefreshingComments = commentsQuery.isRefetching;

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

  const renderHeader = () => {
    const titleContent = <h2 className={styles.title}>{title}</h2>;

    const content = (
      <>
        {hasClass(styles, 'lemonDecoration') ? (
          <div className={styles.lemonDecoration}>🍋</div>
        ) : null}
        <div className={styles.titleSection}>
          {titleContent}
        </div>
        <p className={styles.subtitle}>{subtitle}</p>
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
