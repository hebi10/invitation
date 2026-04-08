'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { HeartIconSimple } from '@/components/icons';
import { AdminProvider, useAdmin } from '@/contexts';
import { getMemoryPageBySlug } from '@/services/memoryPageService';
import type {
  MemoryGalleryCategory,
  MemoryGalleryImage,
  MemoryPage,
} from '@/types/memoryPage';

import styles from './page.module.css';

const GALLERY_CATEGORY_LABELS: Record<MemoryGalleryCategory, string> = {
  preWedding: '예식 전',
  ceremony: '본식',
  afterParty: '애프터',
  snap: '스냅',
  etc: '기타',
};

const COMMENTS_PER_PAGE = 5;
const GALLERY_BREAKPOINTS = {
  0: {
    slidesPerView: 1.15,
    spaceBetween: 14,
  },
  640: {
    slidesPerView: 2.1,
    spaceBetween: 16,
  },
  1024: {
    slidesPerView: 3.05,
    spaceBetween: 18,
  },
} as const;

const LIGHTBOX_FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const LIGHTBOX_RENDER_RADIUS = 2;

const HEART_GLYPH_SET = new Set(['♡', '♥', '❤']);

function isHeartGlyph(value: string) {
  return HEART_GLYPH_SET.has(value);
}

function renderHeartDecoratedTitle(title: string) {
  const segments = title.split(/([♡♥❤])/g).filter((segment) => segment.length > 0);
  const hasHeartGlyph = segments.some((segment) => isHeartGlyph(segment));

  if (!hasHeartGlyph) {
    return title;
  }

  return segments.map((segment, index) => {
    if (isHeartGlyph(segment)) {
      return (
        <HeartIconSimple
          key={`memory-title-heart-${index}`}
          className={styles.heroTitleHeartIcon}
          width={20}
          height={17}
        />
      );
    }

    return <Fragment key={`memory-title-text-${index}`}>{segment}</Fragment>;
  });
}

function formatCommentDate(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order - right.order);
}

function upsertMetaTag(selector: string, attributes: Record<string, string>) {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function upsertCanonicalLink(href: string) {
  if (typeof document === 'undefined') {
    return;
  }

  let link = document.head.querySelector(
    'link[rel="canonical"]'
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = href;
}

function applyMemoryMetadata(
  memoryPage: MemoryPage | null,
  status: 'loading' | 'ready' | 'notfound'
) {
  if (typeof document === 'undefined') {
    return;
  }

  if (!memoryPage || status !== 'ready') {
    document.title = '추억 페이지';
    upsertMetaTag('meta[name="description"]', {
      name: 'description',
      content: '결혼식 이후의 사진과 기록을 다시 보는 추억 페이지입니다.',
    });
    upsertMetaTag('meta[name="robots"]', {
      name: 'robots',
      content: 'noindex, nofollow',
    });
    return;
  }

  const title = memoryPage.seoTitle || memoryPage.title;
  const description = memoryPage.seoDescription || memoryPage.introMessage;
  const image =
    memoryPage.heroThumbnailUrl ||
    memoryPage.heroImage?.thumbnailUrl ||
    memoryPage.heroImage?.url ||
    memoryPage.galleryImages[0]?.thumbnailUrl ||
    memoryPage.galleryImages[0]?.url ||
    '';
  const shouldIndex =
    memoryPage.enabled && memoryPage.visibility === 'public' && !memoryPage.seoNoIndex;
  const robots = shouldIndex ? 'index, follow' : 'noindex, nofollow';
  const canonicalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  document.title = title;
  upsertMetaTag('meta[name="description"]', {
    name: 'description',
    content: description,
  });
  upsertMetaTag('meta[name="robots"]', { name: 'robots', content: robots });
  upsertMetaTag('meta[property="og:title"]', {
    property: 'og:title',
    content: title,
  });
  upsertMetaTag('meta[property="og:description"]', {
    property: 'og:description',
    content: description,
  });
  upsertMetaTag('meta[property="og:type"]', {
    property: 'og:type',
    content: 'website',
  });

  if (image) {
    upsertMetaTag('meta[property="og:image"]', {
      property: 'og:image',
      content: image,
    });
    upsertMetaTag('meta[name="twitter:image"]', {
      name: 'twitter:image',
      content: image,
    });
  }

  upsertMetaTag('meta[name="twitter:card"]', {
    name: 'twitter:card',
    content: 'summary_large_image',
  });
  upsertMetaTag('meta[name="twitter:title"]', {
    name: 'twitter:title',
    content: title,
  });
  upsertMetaTag('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: description,
  });

  if (canonicalUrl) {
    upsertMetaTag('meta[property="og:url"]', {
      property: 'og:url',
      content: canonicalUrl,
    });
    upsertCanonicalLink(canonicalUrl);
  }
}

interface MemoryPageClientProps {
  slug: string;
}

function MemoryPageClientBody({ slug }: MemoryPageClientProps) {
  const { isAdminLoggedIn, isAdminLoading } = useAdmin();
  const [memoryPage, setMemoryPage] = useState<MemoryPage | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [commentPage, setCommentPage] = useState(1);
  const [lightboxStartIndex, setLightboxStartIndex] = useState<number | null>(null);
  const [lightboxActiveIndex, setLightboxActiveIndex] = useState(0);
  const lightboxDialogRef = useRef<HTMLDivElement | null>(null);
  const lightboxCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    let cancelled = false;

    const loadMemoryPage = async () => {
      setStatus('loading');
      setCommentPage(1);
      setLightboxStartIndex(null);
      setLightboxActiveIndex(0);

      try {
        const fetchedMemoryPage = await getMemoryPageBySlug(slug);

        if (cancelled) {
          return;
        }

        if (!fetchedMemoryPage) {
          setMemoryPage(null);
          setStatus('notfound');
          return;
        }

        if (
          !isAdminLoggedIn &&
          (!fetchedMemoryPage.enabled || fetchedMemoryPage.visibility === 'private')
        ) {
          setMemoryPage(null);
          setStatus('notfound');
          return;
        }

        setMemoryPage(fetchedMemoryPage);
        setStatus('ready');
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setMemoryPage(null);
          setStatus('notfound');
        }
      }
    };

    void loadMemoryPage();

    return () => {
      cancelled = true;
    };
  }, [isAdminLoading, isAdminLoggedIn, slug]);

  useEffect(() => {
    applyMemoryMetadata(memoryPage, status);
  }, [memoryPage, status]);

  const orderedImages = useMemo(
    () => sortByOrder(memoryPage?.galleryImages ?? []),
    [memoryPage]
  );
  const visibleComments = useMemo(
    () =>
      sortByOrder((memoryPage?.selectedComments ?? []).filter((comment) => comment.isVisible)),
    [memoryPage]
  );
  const timelineItems = useMemo(
    () =>
      sortByOrder(
        (memoryPage?.timelineItems ?? []).filter(
          (item) => item.title || item.description
        )
      ),
    [memoryPage]
  );
  const galleryGroups = useMemo(
    () =>
      (Object.entries(GALLERY_CATEGORY_LABELS) as Array<
        [MemoryGalleryCategory, string]
      >)
        .map(([category, label]) => ({
          category,
          label,
          images: orderedImages.filter((image) => image.category === category),
        }))
        .filter((group) => group.images.length > 0),
    [orderedImages]
  );
  const heroImage = memoryPage?.heroImage ?? orderedImages[0] ?? null;
  const totalCommentPages = Math.max(
    1,
    Math.ceil(visibleComments.length / COMMENTS_PER_PAGE)
  );
  const paginatedComments = visibleComments.slice(
    (commentPage - 1) * COMMENTS_PER_PAGE,
    commentPage * COMMENTS_PER_PAGE
  );
  const isLightboxOpen = lightboxStartIndex !== null;
  const lightboxImage =
    isLightboxOpen && orderedImages.length > 0
      ? orderedImages[lightboxActiveIndex] ?? orderedImages[lightboxStartIndex ?? 0] ?? null
      : null;
  const heroImageUrl = heroImage?.url ?? '';
  const heroPlaceholderUrl =
    memoryPage?.heroThumbnailUrl || heroImage?.thumbnailUrl || heroImageUrl;
  const heroImageAlt =
    heroImage?.caption?.trim() ||
    `${memoryPage?.groomName ?? ''} ${memoryPage?.brideName ?? ''} 결혼식 대표 사진`.trim();
  const heroImageTransformStyle = memoryPage
    ? {
        objectPosition: `${memoryPage.heroImageCrop.focusX}% ${memoryPage.heroImageCrop.focusY}%`,
        transform: `scale(${memoryPage.heroImageCrop.zoom})`,
        transformOrigin: `${memoryPage.heroImageCrop.focusX}% ${memoryPage.heroImageCrop.focusY}%`,
      }
    : undefined;

  useEffect(() => {
    setCommentPage(1);
  }, [slug]);

  useEffect(() => {
    if (commentPage > totalCommentPages) {
      setCommentPage(totalCommentPages);
    }
  }, [commentPage, totalCommentPages]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLightboxOpen]);

  const openLightboxByImage = useCallback(
    (targetImage: MemoryGalleryImage, triggerElement?: HTMLElement | null) => {
      const nextIndex = orderedImages.findIndex((image) => image.id === targetImage.id);
      if (nextIndex < 0) {
        return;
      }

      if (triggerElement) {
        lightboxTriggerRef.current = triggerElement;
      } else if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        lightboxTriggerRef.current = document.activeElement;
      }

      setLightboxStartIndex(nextIndex);
      setLightboxActiveIndex(nextIndex);
    },
    [orderedImages]
  );

  const closeLightbox = useCallback(() => {
    setLightboxStartIndex(null);
  }, []);

  useEffect(() => {
    if (!isLightboxOpen) {
      const trigger = lightboxTriggerRef.current;
      if (trigger && typeof trigger.focus === 'function') {
        trigger.focus();
      }
      lightboxTriggerRef.current = null;
      return;
    }

    lightboxCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = lightboxDialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(LIGHTBOX_FOCUSABLE_SELECTOR)
      ).filter((element) => element.tabIndex !== -1 && element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        lightboxCloseButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const isInsideDialog = activeElement ? dialog.contains(activeElement) : false;

      if (event.shiftKey) {
        if (!isInsideDialog || activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!isInsideDialog || activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeLightbox, isLightboxOpen]);

  if (status === 'notfound') {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.stateCard}>
            <h1 className={styles.stateTitle}>추억 페이지를 찾을 수 없습니다.</h1>
            <p className={styles.stateDescription}>
              아직 공개되지 않았거나 주소가 잘못되었습니다. 관리자에서 생성 후 공개하면 같은 주소에서 다시 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>추억 페이지를 불러오는 중입니다.</div>
      </main>
    );
  }

  if (!memoryPage) {
    return null;
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          {heroImage ? (
            <button
              type="button"
              className={styles.heroMediaButton}
              onClick={(event) => openLightboxByImage(heroImage, event.currentTarget)}
            >
              <span className={styles.heroImageShell}>
                {heroPlaceholderUrl && heroPlaceholderUrl !== heroImageUrl ? (
                  <img
                    className={`${styles.heroImage} ${styles.heroImagePlaceholder}`}
                    src={heroPlaceholderUrl}
                    alt=""
                    loading="eager"
                    decoding="async"
                    aria-hidden="true"
                    style={heroImageTransformStyle}
                  />
                ) : null}
                <img
                  className={styles.heroImage}
                  src={heroImageUrl}
                  alt={heroImageAlt}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  style={heroImageTransformStyle}
                />
              </span>
            </button>
          ) : null}
          <div className={styles.heroBody}>
            <div className={styles.heroChips}>
              {isAdminLoggedIn &&
              (!memoryPage.enabled || memoryPage.visibility === 'private') ? (
                <span className={styles.heroChip}>관리자 미리보기</span>
              ) : null}
              {memoryPage.visibility === 'unlisted' ? (
                <span className={styles.heroChip}>링크 전용</span>
              ) : null}
            </div>
            <h1 className={styles.heroTitle}>{renderHeartDecoratedTitle(memoryPage.title)}</h1>
            {memoryPage.subtitle ? (
              <p className={styles.heroSubtitle}>{memoryPage.subtitle}</p>
            ) : null}
            <div className={styles.heroMeta}>
              <span>{memoryPage.weddingDate}</span>
              <span>{memoryPage.venueName}</span>
            </div>
            <p className={styles.heroIntro}>{memoryPage.introMessage}</p>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>결혼식 요약</span>
            <h2 className={styles.sectionTitle}>
              {memoryPage.groomName} · {memoryPage.brideName}
            </h2>
          </div>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>예식 날짜</span>
              <strong className={styles.summaryValue}>{memoryPage.weddingDate}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>예식 장소</span>
              <strong className={styles.summaryValue}>{memoryPage.venueName}</strong>
            </div>
            <div className={`${styles.summaryItem} ${styles.summaryWide}`}>
              <span className={styles.summaryLabel}>장소 주소</span>
              <strong className={styles.summaryValue}>{memoryPage.venueAddress}</strong>
            </div>
          </div>
        </section>

        {galleryGroups.length > 0 ? (
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>사진 갤러리</span>
              <h2 className={styles.sectionTitle}>그날의 장면들</h2>
            </div>
            <div className={styles.gallerySections}>
              {galleryGroups.map((group) => (
                <div key={group.category} className={styles.galleryGroup}>
                  <h3 className={styles.galleryGroupTitle}>{group.label}</h3>
                  <Swiper
                    className={styles.gallerySwiper}
                    modules={[Pagination, A11y]}
                    lazyPreloadPrevNext={2}
                    pagination={
                      group.images.length > 1
                        ? { clickable: true, dynamicBullets: true }
                        : false
                    }
                    grabCursor={group.images.length > 1}
                    watchOverflow={true}
                    breakpoints={GALLERY_BREAKPOINTS}
                  >
                    {group.images.map((image) => (
                      <SwiperSlide key={image.id} className={styles.gallerySlide}>
                        <button
                          type="button"
                          className={styles.galleryFigure}
                          onClick={(event) => openLightboxByImage(image, event.currentTarget)}
                        >
                          <img
                            className={styles.galleryThumb}
                            src={image.thumbnailUrl || image.url}
                            alt={image.caption || image.name}
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="swiper-lazy-preloader" aria-hidden="true" />
                          {image.caption ? (
                            <span className={styles.galleryCaption}>{image.caption}</span>
                          ) : null}
                        </button>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {visibleComments.length > 0 ? (
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>축하 메시지</span>
              <h2 className={styles.sectionTitle}>함께 남겨주신 마음</h2>
            </div>
            <div className={styles.commentList}>
              {paginatedComments.map((comment) => (
                <article key={comment.id} className={styles.commentCard}>
                  <p className={styles.commentMessage}>{comment.message}</p>
                  <div className={styles.commentMeta}>
                    <strong>{comment.author}</strong>
                    <span>{formatCommentDate(comment.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>

            {totalCommentPages > 1 ? (
              <div className={styles.commentPagination}>
                <p className={styles.commentPaginationInfo}>
                  {visibleComments.length}개 중 {(commentPage - 1) * COMMENTS_PER_PAGE + 1}-
                  {Math.min(commentPage * COMMENTS_PER_PAGE, visibleComments.length)}개 표시
                </p>
                <div className={styles.commentPaginationControls}>
                  <button
                    type="button"
                    className={styles.commentPaginationButton}
                    onClick={() => setCommentPage((page) => Math.max(1, page - 1))}
                    disabled={commentPage === 1}
                  >
                    이전
                  </button>

                  <div className={styles.commentPaginationNumbers}>
                    {Array.from({ length: totalCommentPages }, (_, index) => index + 1).map(
                      (pageNumber) => (
                        <button
                          key={pageNumber}
                          type="button"
                          className={`${styles.commentPaginationButton} ${
                            commentPage === pageNumber
                              ? styles.commentPaginationButtonActive
                              : ''
                          }`}
                          onClick={() => setCommentPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.commentPaginationButton}
                    onClick={() =>
                      setCommentPage((page) => Math.min(totalCommentPages, page + 1))
                    }
                    disabled={commentPage === totalCommentPages}
                  >
                    다음
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {timelineItems.length > 0 ? (
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>하루의 흐름</span>
              <h2 className={styles.sectionTitle}>순서대로 다시 보는 결혼식 기록</h2>
            </div>
            <div className={styles.timelineList}>
              {timelineItems.map((item, index) => (
                <article key={item.id} className={styles.timelineItem}>
                  <div className={styles.timelineIndex}>{index + 1}</div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineHeader}>
                      <strong>{item.title}</strong>
                      {item.eventTime ? <span>{item.eventTime}</span> : null}
                    </div>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className={`${styles.panel} ${styles.thankYouPanel}`}>
          <span className={styles.sectionLabel}>감사 인사</span>
          <h2 className={styles.sectionTitle}>함께해주셔서 감사합니다</h2>
          <p className={styles.thankYouMessage}>{memoryPage.thankYouMessage}</p>
        </section>
      </div>

      {isLightboxOpen && lightboxStartIndex !== null ? (
        <div
          className={styles.lightboxBackdrop}
          role="presentation"
          onClick={closeLightbox}
        >
          <div
            className={styles.lightboxDialog}
            ref={lightboxDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="추억 페이지 이미지 슬라이드"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              ref={lightboxCloseButtonRef}
              className={styles.lightboxClose}
              onClick={closeLightbox}
              aria-label="라이트박스 닫기"
            >
              닫기
            </button>

            <Swiper
              key={`${slug}-${lightboxStartIndex}`}
              className={styles.lightboxSwiper}
              modules={[Navigation, Pagination, Keyboard, A11y]}
              initialSlide={lightboxStartIndex}
              navigation={orderedImages.length > 1}
              pagination={
                orderedImages.length > 1 ? { type: 'fraction' } : false
              }
              keyboard={{ enabled: true }}
              a11y={{
                enabled: true,
                prevSlideMessage: '이전 이미지',
                nextSlideMessage: '다음 이미지',
              }}
              watchOverflow={true}
              onSwiper={(swiper) => setLightboxActiveIndex(swiper.activeIndex)}
              onSlideChange={(swiper) => setLightboxActiveIndex(swiper.activeIndex)}
            >
              {orderedImages.map((image, index) => {
                const shouldRenderImage =
                  Math.abs(index - lightboxActiveIndex) <= LIGHTBOX_RENDER_RADIUS;

                return (
                  <SwiperSlide key={image.id} className={styles.lightboxSlide}>
                    {shouldRenderImage ? (
                      <img
                        className={styles.lightboxImage}
                        src={image.url}
                        alt={image.caption || image.name}
                        loading={index === lightboxActiveIndex ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    ) : (
                      <div className={styles.lightboxImagePlaceholder} aria-hidden="true" />
                    )}
                  </SwiperSlide>
                );
              })}
            </Swiper>

            {lightboxImage ? (
              <>
                <div className={styles.lightboxMeta}>
                  <strong>{GALLERY_CATEGORY_LABELS[lightboxImage.category]}</strong>
                  <span>{`${lightboxActiveIndex + 1} / ${orderedImages.length}`}</span>
                </div>
                {lightboxImage.caption ? (
                  <p className={styles.lightboxCaption}>{lightboxImage.caption}</p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function MemoryPageClient({ slug }: MemoryPageClientProps) {
  return (
    <AdminProvider>
      <MemoryPageClientBody slug={slug} />
    </AdminProvider>
  );
}
