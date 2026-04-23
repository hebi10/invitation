'use client';

import { useEffect, useRef, useState } from 'react';

import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import WeddingLoaderMessage, {
  type WeddingLoaderMessageBaseProps,
} from '@/components/sections/WeddingLoader/WeddingLoaderMessage';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import {
  buildGoogleMapSearchUrl,
  buildKakaoMapSearchUrl,
  buildNaverMapSearchUrl,
  loadKakaoMapsSdk,
} from '@/utils/kakaoMaps';

import {
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getMapDescription,
  getThemePageData,
  shouldShowGiftInfo,
} from '../weddingPageRenderers';
import styles from './romantic.module.css';

interface BankAccount {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

interface RomanticCountdownProps {
  expiredSubtitle: string;
  expiredTitle: string;
  targetDate: Date;
  title: string;
}

interface RomanticGalleryProps {
  images: string[];
  imagesLoading?: boolean;
  previewImages?: string[];
}

interface RomanticKakaoMapConfig {
  latitude: number;
  longitude: number;
  level?: number;
  markerTitle?: string;
}

const INTRO_IMAGE_URL = '/images/intro_romantic.png';
const LOADING_MESSAGES = [
  '\uCC08\uB300\uC7A5\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.',
  '\uC0AC\uC9C4\uACFC \uC2DD\uC21C\uC744 \uBD88\uB7EC\uC624\uACE0 \uC788\uC2B5\uB2C8\uB2E4.',
  '\uC544\uB984\uB2E4\uC6B4 \uC21C\uAC04\uC744 \uC815\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.',
];

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function formatDateLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_LABELS[date.getDay()]})`;
}

function formatHeroDateLabel(date: Date) {
  return `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, '0')} / ${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function getDisplayTime(date: Date, ceremonyTime: string) {
  if (ceremonyTime.trim()) {
    return ceremonyTime.trim();
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function RomanticHeroVisual({
  alt,
  eager = false,
  fallbackClassName,
  imageClassName,
  imageUrl,
}: {
  alt: string;
  eager?: boolean;
  fallbackClassName: string;
  imageClassName: string;
  imageUrl?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  if (!imageUrl || hasError) {
    return <div className={fallbackClassName} />;
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={imageClassName}
      loading={eager ? 'eager' : undefined}
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}

function hasValidRomanticKakaoCoordinates(config?: RomanticKakaoMapConfig) {
  if (!config) {
    return false;
  }

  return (
    Number.isFinite(config.latitude) &&
    Number.isFinite(config.longitude) &&
    !(config.latitude === 0 && config.longitude === 0)
  );
}

function RomanticLocationMap({
  address,
  kakaoMapConfig,
  venueName,
}: {
  address: string;
  kakaoMapConfig?: RomanticKakaoMapConfig;
  venueName: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [controlEnabled, setControlEnabled] = useState(false);
  const hasAddress = Boolean(address.trim());
  const hasCoordinates = hasValidRomanticKakaoCoordinates(kakaoMapConfig);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (!hasAddress && !hasCoordinates) {
      setIsMapLoaded(true);
      return;
    }

    let cancelled = false;

    void loadKakaoMapsSdk()
      .then(() => {
        if (cancelled) {
          return;
        }

        const kakao = (window as Window & { kakao?: any }).kakao;
        const container = mapRef.current;

        if (!container || !kakao?.maps) {
          setIsMapLoaded(true);
          return;
        }

        try {
          container.innerHTML = '';

          const map = new kakao.maps.Map(container, {
            center: hasCoordinates
              ? new kakao.maps.LatLng(kakaoMapConfig!.latitude, kakaoMapConfig!.longitude)
              : new kakao.maps.LatLng(37.5665, 126.978),
            level: kakaoMapConfig?.level || 3,
          });

          mapInstanceRef.current = map;

          const finalizeMap = (coords: any, markerTitle: string) => {
            map.setCenter(coords);

            const marker = new kakao.maps.Marker({
              map,
              position: coords,
            });

            const infowindow = new kakao.maps.InfoWindow({
              content: `<div style="width:200px;text-align:center;padding:6px 0;font-size:12px;font-weight:bold;">${markerTitle}</div>`,
            });

            infowindow.open(map, marker);

            window.setTimeout(() => {
              map.relayout();
              map.setCenter(coords);
            }, 50);

            map.setZoomable(false);
            map.setDraggable(false);
            setIsMapLoaded(true);
          };

          if (hasCoordinates && kakaoMapConfig) {
            const coords = new kakao.maps.LatLng(kakaoMapConfig.latitude, kakaoMapConfig.longitude);
            finalizeMap(coords, kakaoMapConfig.markerTitle || venueName);
            return;
          }

          const geocoder = new kakao.maps.services.Geocoder();

          geocoder.addressSearch(address.trim(), (result: any, status: any) => {
            if (cancelled) {
              return;
            }

            if (status === kakao.maps.services.Status.OK && result?.[0]) {
              const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
              finalizeMap(coords, venueName);
              return;
            }

            setIsMapLoaded(true);
          });
        } catch {
          setIsMapLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsMapLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, hasAddress, hasCoordinates, isClient, kakaoMapConfig, venueName]);

  const toggleControl = () => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    setControlEnabled((current) => {
      const next = !current;
      map.setZoomable(next);
      map.setDraggable(next);
      return next;
    });
  };

  if (!hasAddress && !hasCoordinates) {
    return (
      <div className={styles.mapPlaceholder}>
        <div className={styles.mapLabel}>{venueName}</div>
      </div>
    );
  }

  return (
    <div className={styles.mapPlaceholder}>
      {isClient ? <div ref={mapRef} className={styles.mapFrame} /> : null}
      {!isMapLoaded ? (
        <div className={styles.mapLoading}>{'\uC9C0\uB3C4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.'}</div>
      ) : null}
      {!controlEnabled && isMapLoaded ? <div className={styles.mapInteractionShield} /> : null}
      <button type="button" className={styles.mapControlButton} onClick={toggleControl}>
        {controlEnabled ? '\uC9C0\uB3C4 \uACE0\uC815' : '\uC9C0\uB3C4 \uC6C0\uC9C1\uC774\uAE30'}
      </button>
      <div className={styles.mapLabel}>{venueName}</div>
    </div>
  );
}

function RomanticLoader({
  brideName,
  groomName,
  heroDateLine,
  heroImageUrl,
  onLoadComplete,
}: WeddingLoaderMessageBaseProps & {
  heroDateLine: string;
  heroImageUrl?: string;
}) {
  return (
    <WeddingLoaderMessage
      brideName={brideName}
      groomName={groomName}
      onLoadComplete={onLoadComplete}
      duration={2600}
      styles={styles}
      loadingMessages={LOADING_MESSAGES}
      minLoadTime={1600}
      messageClassName={styles.loadingText}
      renderHero={(themeStyles) => (
        <div className={themeStyles.loaderVisual}>
          <RomanticHeroVisual
            imageUrl={heroImageUrl || INTRO_IMAGE_URL}
            alt=""
            imageClassName={themeStyles.loaderImage}
            fallbackClassName={themeStyles.loaderFallback}
            eager
          />
          <div className={themeStyles.loaderOverlay} />
          <div className={themeStyles.loaderDateLine}>{heroDateLine}</div>
          <div className={themeStyles.loaderNames}>
            <span>{groomName}</span>
            <span className={themeStyles.loaderAmpersand}>&amp;</span>
            <span>{brideName}</span>
          </div>
        </div>
      )}
      renderHeading={({ styles: themeStyles }) => (
        <h1 className={themeStyles.loaderHeading}>Invitation</h1>
      )}
      renderSubtitle={(themeStyles) => (
        <p className={themeStyles.loaderSubtitle}>모바일 청첩장을 준비하고 있습니다.</p>
      )}
    />
  );
}

function RomanticCountdown({
  expiredSubtitle,
  expiredTitle,
  targetDate,
  title,
}: RomanticCountdownProps) {
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const difference = targetDate.getTime() - now;

      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    updateTime();
    const timer = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  if (isExpired) {
    return (
      <div className={styles.countdownContainer}>
        <span className={styles.countdownIcon}>✦</span>
        <div className={styles.countdownContent}>
          <h4 className={styles.countdownTitle}>{expiredTitle}</h4>
          <p className={styles.countdownSubtitle}>{expiredSubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.countdownContainer}>
      <span className={styles.countdownIcon}>✦</span>
      <div className={styles.countdownContent}>
        <h4 className={styles.countdownTitle}>{title}</h4>
        <div className={styles.countdownTimeDisplay}>
          <div className={styles.countdownTimeUnit}>
            <div className={styles.countdownTimeNumber}>{String(timeLeft.days).padStart(2, '0')}</div>
            <div className={styles.countdownTimeLabel}>일</div>
          </div>
          <div className={styles.countdownSeparator}>:</div>
          <div className={styles.countdownTimeUnit}>
            <div className={styles.countdownTimeNumber}>{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className={styles.countdownTimeLabel}>시간</div>
          </div>
          <div className={styles.countdownSeparator}>:</div>
          <div className={styles.countdownTimeUnit}>
            <div className={styles.countdownTimeNumber}>{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className={styles.countdownTimeLabel}>분</div>
          </div>
          <div className={styles.countdownSeparator}>:</div>
          <div className={styles.countdownTimeUnit}>
            <div className={styles.countdownTimeNumber}>{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className={styles.countdownTimeLabel}>초</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RomanticGallery({ images, imagesLoading = false, previewImages }: RomanticGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef({ x: 0, y: 0 });

  const resetTouchGesture = () => {
    touchStartRef.current = null;
    touchDeltaRef.current = { x: 0, y: 0 };
  };

  const moveSelectedImage = (direction: 'prev' | 'next') => {
    setSelectedIndex((current) => {
      if (current === null) {
        return null;
      }

      if (direction === 'prev') {
        return Math.max(0, current - 1);
      }

      return Math.min(images.length - 1, current + 1);
    });
  };

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedIndex(null);
        return;
      }

      if (event.key === 'ArrowLeft') {
        setSelectedIndex((current) =>
          current === null ? null : Math.max(0, current - 1)
        );
      }

      if (event.key === 'ArrowRight') {
        setSelectedIndex((current) =>
          current === null ? null : Math.min(images.length - 1, current + 1)
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [images.length, selectedIndex]);

  if (images.length === 0 && !imagesLoading) {
    return null;
  }

  const galleryItems = images.map((image, index) => ({
    full: image,
    preview: previewImages?.[index] ?? image,
  }));
  const visibleItems = galleryItems.slice(0, visibleCount);
  const hasMore = galleryItems.length > visibleCount;
  const remainingCount = Math.max(galleryItems.length - visibleCount, 0);
  const selectedImage = selectedIndex === null ? null : galleryItems[selectedIndex];
  const handleLightboxTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      resetTouchGesture();
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    touchDeltaRef.current = { x: 0, y: 0 };
  };
  const handleLightboxTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    touchDeltaRef.current = { x: deltaX, y: deltaY };

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      event.preventDefault();
    }
  };
  const handleLightboxTouchEnd = () => {
    if (!touchStartRef.current) {
      return;
    }

    const { x: deltaX, y: deltaY } = touchDeltaRef.current;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

    if (isHorizontalSwipe) {
      if (deltaX > 0) {
        moveSelectedImage('prev');
      } else {
        moveSelectedImage('next');
      }
    }

    resetTouchGesture();
  };

  return (
    <>
      <div className={styles.galleryGrid}>
        {visibleItems.length > 0
          ? visibleItems.map((image, index) => (
              <button
                key={`${image.full}-${index}`}
                type="button"
                className={styles.galleryItem}
                onClick={() => setSelectedIndex(index)}
              >
                <img
                  src={image.preview}
                  alt={`갤러리 이미지 ${index + 1}`}
                  className={styles.galleryImage}
                />
              </button>
            ))
          : Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={`${styles.galleryItem} ${styles.galleryPlaceholder}`} />
            ))}
      </div>

      {galleryItems.length > 6 ? (
        <div className={styles.galleryButtonRow}>
          {hasMore ? (
            <button
              type="button"
              className={styles.galleryButton}
              onClick={() =>
                setVisibleCount((current) => Math.min(current + 6, galleryItems.length))
              }
            >
              사진 {remainingCount}장 더 보기
            </button>
          ) : (
            <button
              type="button"
              className={styles.galleryButton}
              onClick={() => setVisibleCount(6)}
            >
              처음으로
            </button>
          )}
        </div>
      ) : null}

      {selectedImage ? (
        <div
          className={styles.galleryLightbox}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedIndex(null);
            }
          }}
        >
          <button
            type="button"
            className={styles.galleryLightboxClose}
            onClick={() => setSelectedIndex(null)}
          >
            ×
          </button>

          {selectedIndex !== null && selectedIndex > 0 ? (
            <button
              type="button"
              className={`${styles.galleryLightboxNav} ${styles.galleryLightboxPrev}`}
              onClick={() => moveSelectedImage('prev')}
            >
              ‹
            </button>
          ) : null}

          {selectedIndex !== null && selectedIndex < galleryItems.length - 1 ? (
            <button
              type="button"
              className={`${styles.galleryLightboxNav} ${styles.galleryLightboxNext}`}
              onClick={() => moveSelectedImage('next')}
            >
              ›
            </button>
          ) : null}

          <div
            className={styles.galleryLightboxInner}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            onTouchCancel={resetTouchGesture}
          >
            <img
              src={selectedImage.full}
              alt={`확대 이미지 ${selectedIndex === null ? 1 : selectedIndex + 1}`}
              className={styles.galleryLightboxImage}
              draggable={false}
            />
            <div className={styles.galleryLightboxCounter}>
              {selectedIndex === null ? 1 : selectedIndex + 1} / {galleryItems.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RomanticGiftSection({
  brideAccounts,
  groomAccounts,
  message,
}: {
  brideAccounts: BankAccount[];
  groomAccounts: BankAccount[];
  message: string;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const renderAccounts = (title: string, accounts: BankAccount[]) => (
    <div className={styles.accountSection}>
      <h3 className={styles.accountTitle}>{title}</h3>
      {accounts.map((account, index) => {
        const key = `${title}-${index}`;
        const value = `${account.bank} ${account.accountNumber}`;

        return (
          <div className={styles.accountCard} key={key}>
            <div className={styles.accountHeader}>
              <div>
                <div className={styles.accountName}>{account.accountHolder}</div>
                <div className={styles.accountRole}>{title}</div>
              </div>
              <button
                type="button"
                className={styles.copyButton}
                onClick={async () => {
                  const copied = await copyTextToClipboard(value);
                  if (!copied) {
                    return;
                  }

                  setCopiedKey(key);
                  window.setTimeout(() => {
                    setCopiedKey((current) => (current === key ? null : current));
                  }, 1800);
                }}
              >
                {copiedKey === key ? '복사됨' : '계좌 복사'}
              </button>
            </div>
            <div className={styles.accountInfo}>{account.bank}</div>
            <div className={styles.accountInfoMonospace}>{account.accountNumber}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <p className={styles.sectionMessage}>
        {message.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
      {groomAccounts.length > 0 ? renderAccounts('신랑측 계좌', groomAccounts) : null}
      {brideAccounts.length > 0 ? renderAccounts('신부측 계좌', brideAccounts) : null}
    </div>
  );
}

export default createWeddingThemeRenderer({
  ariaLabelSuffix: ' (Romantic)',
  rootClassName: styles.romanticTheme,
  renderLoader: ({ state }) => {
    const pageData = getThemePageData(state.pageConfig, 'romantic');
    const heroTime = getDisplayTime(state.weddingDate, pageData?.ceremonyTime || '');
    const heroDateLine = `${formatHeroDateLabel(state.weddingDate)} / ${heroTime}`;

    return (
      <RomanticLoader
        groomName={state.pageConfig.groomName}
        brideName={state.pageConfig.brideName}
        heroDateLine={heroDateLine}
        heroImageUrl={state.heroImageUrl || state.mainImageUrl}
        onLoadComplete={() => state.setIsLoading(false)}
      />
    );
  },
  sections: [
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const heroDate = formatHeroDateLabel(state.weddingDate);
      const heroTime = getDisplayTime(state.weddingDate, pageData?.ceremonyTime || '');

      return (
        <section className={styles.hero}>
          {state.heroImageUrl || state.mainImageUrl ? (
            <img
              src={state.heroImageUrl || state.mainImageUrl}
              alt={`${state.pageConfig.groomName} ${state.pageConfig.brideName} 메인 이미지`}
              className={styles.heroImage}
            />
          ) : (
            <div className={styles.heroNoImage} />
          )}
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <h1 className={styles.heroNames}>
              <span>{state.pageConfig.groomName}</span>
              <span className={styles.heroAmpersand}>&amp;</span>
              <span>{state.pageConfig.brideName}</span>
            </h1>
            <p className={styles.heroVenue}>{state.pageConfig.venue}</p>
            <div className={styles.heroDateLine}>
              {heroDate} / {heroTime}
            </div>
          </div>
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const greeting = pageData?.greetingMessage ?? '';
      const greetingAuthor =
        pageData?.greetingAuthor ?? `${state.pageConfig.groomName} & ${state.pageConfig.brideName}`;

      return (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Invitation</p>
          <div className={styles.sectionDivider} />
          <p className={styles.greetingText}>
            {greeting || `${state.pageConfig.displayName} 결혼식에 초대합니다.`}
          </p>
          <p className={styles.greetingAuthor}>from. {greetingAuthor}</p>
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const features = resolveInvitationFeatures(
        state.pageConfig.productTier,
        state.pageConfig.features
      );
      const address = getCeremonyAddress(state.pageConfig, pageData);
      const eventTime = getDisplayTime(state.weddingDate, pageData?.ceremonyTime || '');

      return (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <p className={styles.sectionLabel}>Date</p>
          <div className={styles.sectionDivider} />
          <div className={styles.dateCard}>
            <div className={styles.dateMain}>{state.weddingDate.getDate()}</div>
            <div className={styles.dateMeta}>{formatDateLabel(state.weddingDate)}</div>
            <div className={styles.dateMeta}>{eventTime}</div>
            <div className={styles.dateVenue}>{address || state.pageConfig.venue}</div>
          </div>
          {features.showCountdown ? (
            <>
              <p className={styles.sectionLabel}>D-DAY</p>
              <RomanticCountdown
                targetDate={state.weddingDate}
                title="Wedding Countdown"
                expiredTitle="축하합니다. 예식이 진행 중이거나 마무리되었어요."
                expiredSubtitle="아름다운 하루로 오래 기억되길 바랍니다."
              />
            </>
          ) : null}
        </section>
      );
    },
    ({ state }) => (
      <section className={`${styles.section} ${styles.sectionDark} ${styles.gallerySection}`}>
        <p className={styles.sectionLabel}>Gallery</p>
        <div className={styles.sectionDivider} />
        <h2 className={styles.sectionTitle}>우리의 이야기</h2>
        <RomanticGallery
          images={state.galleryImageUrls}
          previewImages={state.galleryPreviewImageUrls}
          imagesLoading={state.imagesLoading}
        />
      </section>
    ),
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const address = getCeremonyAddress(state.pageConfig, pageData);
      const contact = getCeremonyContact(state.pageConfig, pageData);
      const description = getMapDescription(state.pageConfig, pageData);
      const rows = [
        {
          icon: '✦',
          label: '\uC608\uC2DD\uC7A5',
          value: state.pageConfig.venue,
        },
        {
          icon: '⌂',
          label: '\uC8FC\uC18C',
          value: address,
        },
        {
          icon: '≡',
          label: '\uC548\uB0B4',
          value: description,
        },
        {
          icon: '☎',
          label: '\uC5F0\uB77D\uCC98',
          value: contact,
        },
      ].filter((row) => row.value?.trim());

      return (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Location</p>
          <div className={styles.sectionDivider} />
          <h2 className={styles.sectionTitle}>{'\uCC3E\uC544\uC624\uC2DC\uB294 \uAE38'}</h2>

          <RomanticLocationMap
            venueName={state.pageConfig.venue}
            address={address}
            kakaoMapConfig={pageData?.kakaoMap}
          />

          <div className={styles.locationRows}>
            {rows.map((row) => (
              <div className={styles.locationRow} key={row.label}>
                <div className={styles.locationIcon}>{row.icon}</div>
                <div className={styles.locationText}>
                  <div className={styles.locationLabel}>{row.label}</div>
                  <div className={styles.locationValue}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>

          {address ? (
            <div className={styles.mapActions}>
              <button
                type="button"
                className={styles.mapAction}
                onClick={() => window.open(buildGoogleMapSearchUrl(address), '_blank')}
              >
                Google Map
              </button>
              <button
                type="button"
                className={styles.mapAction}
                onClick={() => window.open(buildNaverMapSearchUrl(address), '_blank')}
              >
                Naver Map
              </button>
              <button
                type="button"
                className={styles.mapAction}
                onClick={() => window.open(buildKakaoMapSearchUrl(address), '_blank')}
              >
                Kakao Map
              </button>
            </div>
          ) : null}
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const groomAccounts = pageData?.giftInfo?.groomAccounts ?? state.giftInfo?.groomAccounts ?? [];
      const brideAccounts = pageData?.giftInfo?.brideAccounts ?? state.giftInfo?.brideAccounts ?? [];
      const message =
        pageData?.giftInfo?.message ??
        state.giftInfo?.message ??
        '축하해 주시는 마음만으로도 충분히 감사합니다.';

      if (!shouldShowGiftInfo(state)) {
        return null;
      }

      return (
        <section className={`${styles.section} ${styles.sectionAlt}`}>
          <p className={styles.sectionLabel}>Gift</p>
          <div className={styles.sectionDivider} />
          <h2 className={styles.sectionTitle}>마음 전하기</h2>
          <RomanticGiftSection
            groomAccounts={groomAccounts}
            brideAccounts={brideAccounts}
            message={message}
          />
        </section>
      );
    },
    ({ state }) => {
      const features = resolveInvitationFeatures(
        state.pageConfig.productTier,
        state.pageConfig.features
      );

      if (!features.showGuestbook) {
        return null;
      }

      return (
        <section className={`${styles.section} ${styles.sectionDark}`}>
          <p className={styles.sectionLabel}>Guestbook</p>
          <div className={styles.sectionDivider} />
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="방명록"
            subtitle="두 분께 전하고 싶은 한마디를 남겨 주세요."
            statusColors={{
              success: '#7a5c5c',
              error: '#b94b5a',
            }}
          />
        </section>
      );
    },
    ({ state }) => (
      <footer className={styles.footer}>
        <div className={styles.footerHeart}>♡</div>
        <div className={styles.footerNames}>
          {state.pageConfig.groomName} &amp; {state.pageConfig.brideName}
        </div>
        <div className={styles.footerDate}>
          {formatDateLabel(state.weddingDate)} / {state.pageConfig.venue}
        </div>
        <div className={styles.footerDivider} />
        <p className={styles.footerText}>함께하는 가장 큰 날로 기억되길 바랍니다.</p>
      </footer>
    ),
  ],
});
