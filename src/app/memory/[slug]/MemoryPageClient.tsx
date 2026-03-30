'use client';

import { notFound } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AdminProvider, useAdmin } from '@/contexts';
import { getMemoryPageBySlug } from '@/services/memoryPageService';
import type {
  MemoryGalleryCategory,
  MemoryGalleryImage,
  MemoryPage,
} from '@/types/memoryPage';

import styles from './page.module.css';

const GALLERY_CATEGORY_LABELS: Record<MemoryGalleryCategory, string> = {
  preWedding: '식전',
  ceremony: '본식',
  afterParty: '식후',
  snap: '스냅',
  etc: '기타',
};

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

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = href;
}

function applyMemoryMetadata(memoryPage: MemoryPage | null, status: 'loading' | 'ready' | 'notfound') {
  if (typeof document === 'undefined') {
    return;
  }

  if (!memoryPage || status !== 'ready') {
    document.title = '추억 페이지';
    upsertMetaTag('meta[name="description"]', {
      name: 'description',
      content: '결혼식 이후 사진과 기록을 다시 보는 추억 페이지입니다.',
    });
    upsertMetaTag('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' });
    return;
  }

  const title = memoryPage.seoTitle || memoryPage.title;
  const description = memoryPage.seoDescription || memoryPage.introMessage;
  const image = memoryPage.heroImage?.url || memoryPage.galleryImages[0]?.url || '';
  const shouldIndex = memoryPage.enabled && memoryPage.visibility === 'public' && !memoryPage.seoNoIndex;
  const robots = shouldIndex ? 'index, follow' : 'noindex, nofollow';
  const canonicalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  document.title = title;
  upsertMetaTag('meta[name="description"]', { name: 'description', content: description });
  upsertMetaTag('meta[name="robots"]', { name: 'robots', content: robots });
  upsertMetaTag('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMetaTag('meta[property="og:description"]', {
    property: 'og:description',
    content: description,
  });
  upsertMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'website' });

  if (image) {
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image', content: image });
    upsertMetaTag('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
  }

  upsertMetaTag('meta[name="twitter:card"]', {
    name: 'twitter:card',
    content: 'summary_large_image',
  });
  upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMetaTag('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: description,
  });

  if (canonicalUrl) {
    upsertMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isAdminLoading) {
      return;
    }

    let cancelled = false;

    const loadMemoryPage = async () => {
      setStatus('loading');
      setLightboxIndex(null);

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

        if (!isAdminLoggedIn && (!fetchedMemoryPage.enabled || fetchedMemoryPage.visibility === 'private')) {
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

  const orderedImages = useMemo(() => sortByOrder(memoryPage?.galleryImages ?? []), [memoryPage]);
  const visibleComments = useMemo(
    () => sortByOrder((memoryPage?.selectedComments ?? []).filter((comment) => comment.isVisible)),
    [memoryPage]
  );
  const timelineItems = useMemo(
    () => sortByOrder((memoryPage?.timelineItems ?? []).filter((item) => item.title || item.description)),
    [memoryPage]
  );
  const galleryGroups = useMemo(
    () =>
      Object.entries(GALLERY_CATEGORY_LABELS)
        .map(([category, label]) => ({
          category,
          label,
          images: orderedImages.filter((image) => image.category === category),
        }))
        .filter((group) => group.images.length > 0),
    [orderedImages]
  );

  const heroImage = memoryPage?.heroImage ?? orderedImages[0] ?? null;
  const lightboxImage = lightboxIndex !== null ? orderedImages[lightboxIndex] ?? null : null;

  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxIndex(null);
      }

      if (event.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null ? prev : (prev - 1 + orderedImages.length) % orderedImages.length
        );
      }

      if (event.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev === null ? prev : (prev + 1) % orderedImages.length
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, orderedImages.length]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxIndex]);

  const openLightboxByImage = (targetImage: MemoryGalleryImage) => {
    const nextIndex = orderedImages.findIndex((image) => image.id === targetImage.id);
    if (nextIndex >= 0) {
      setLightboxIndex(nextIndex);
    }
  };

  if (status === 'notfound') {
    notFound();
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
            <button type="button" className={styles.heroMediaButton} onClick={() => openLightboxByImage(heroImage)}>
              <img
                className={styles.heroImage}
                src={heroImage.url}
                alt={heroImage.name}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                style={{
                  objectPosition: `${memoryPage.heroImageCrop.focusX}% ${memoryPage.heroImageCrop.focusY}%`,
                  transform: `scale(${memoryPage.heroImageCrop.zoom})`,
                  transformOrigin: `${memoryPage.heroImageCrop.focusX}% ${memoryPage.heroImageCrop.focusY}%`,
                }}
              />
            </button>
          ) : null}
          <div className={styles.heroBody}>
            <div className={styles.heroChips}>
              {isAdminLoggedIn && (!memoryPage.enabled || memoryPage.visibility === 'private') ? (
                <span className={styles.heroChip}>관리자 미리보기</span>
              ) : null}
              {memoryPage.visibility === 'unlisted' ? (
                <span className={styles.heroChip}>링크 전용</span>
              ) : null}
            </div>
            <h1 className={styles.heroTitle}>{memoryPage.title}</h1>
            {memoryPage.subtitle ? <p className={styles.heroSubtitle}>{memoryPage.subtitle}</p> : null}
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
              {memoryPage.groomName} ♥ {memoryPage.brideName}
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
                  <div className={styles.galleryGrid}>
                    {group.images.map((image) => (
                      <button key={image.id} type="button" className={styles.galleryFigure} onClick={() => openLightboxByImage(image)}>
                        <img className={styles.galleryThumb} src={image.url} alt={image.caption || image.name} loading="lazy" decoding="async" />
                        {image.caption ? <span className={styles.galleryCaption}>{image.caption}</span> : null}
                      </button>
                    ))}
                  </div>
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
              {visibleComments.map((comment) => (
                <article key={comment.id} className={styles.commentCard}>
                  <p className={styles.commentMessage}>{comment.message}</p>
                  <div className={styles.commentMeta}>
                    <strong>{comment.author}</strong>
                    <span>{formatCommentDate(comment.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
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
          <h2 className={styles.sectionTitle}>함께해주셔서 감사합니다.</h2>
          <p className={styles.thankYouMessage}>{memoryPage.thankYouMessage}</p>
        </section>
      </div>

      {lightboxImage ? (
        <div className={styles.lightboxBackdrop} role="presentation" onClick={() => setLightboxIndex(null)}>
          <div className={styles.lightboxDialog} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.lightboxClose} onClick={() => setLightboxIndex(null)}>
              닫기
            </button>
            {orderedImages.length > 1 ? (
              <>
                <button type="button" className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={() => setLightboxIndex((prev) => (prev === null ? 0 : (prev - 1 + orderedImages.length) % orderedImages.length))}>
                  이전
                </button>
                <button type="button" className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={() => setLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % orderedImages.length))}>
                  다음
                </button>
              </>
            ) : null}
            <img className={styles.lightboxImage} src={lightboxImage.url} alt={lightboxImage.caption || lightboxImage.name} loading="eager" decoding="async" />
            <div className={styles.lightboxMeta}>
              <strong>{GALLERY_CATEGORY_LABELS[lightboxImage.category]}</strong>
              <span>{lightboxIndex !== null ? `${lightboxIndex + 1} / ${orderedImages.length}` : null}</span>
            </div>
            {lightboxImage.caption ? <p className={styles.lightboxCaption}>{lightboxImage.caption}</p> : null}
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
