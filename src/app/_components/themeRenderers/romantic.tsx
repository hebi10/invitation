'use client';

import { useEffect, useId, useRef, useState } from 'react';

import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import type { PersonInfo } from '@/types/invitationPage';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';
import {
  buildGoogleMapSearchUrl,
  buildKakaoMapSearchUrl,
  buildNaverMapSearchUrl,
} from '@/utils/kakaoMaps';

import {
  createWeddingThemeRenderer,
  getCeremonyAddress,
  getCeremonyContact,
  getCeremonySchedule,
  getMapDescription,
  getReceptionSchedule,
  getThemePageData,
  shouldShowGiftInfo,
} from '../weddingPageRenderers';
import styles from './romantic.module.css';
import RomanticLocationMap from './romanticLocationMap';
import {
  resolveRomanticInfoTab,
  shouldRenderRomanticGallery,
  shouldRenderRomanticLocation,
  type RomanticInfoTab,
} from './romanticState';

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
  brideName: string;
  groomName: string;
  images: string[];
  imagesLoading?: boolean;
  previewImages?: string[];
}

interface RomanticGuideItem {
  title: string;
  content: string;
}

interface RomanticScheduleDetail {
  time: string;
  location: string;
}

interface ContactTarget {
  name: string;
  phone?: string;
}

const INTRO_IMAGE_URL = '/images/intro_romantic.webp';
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

function hasText(value?: string) {
  return Boolean(value?.trim());
}

function formatTextWithBreaks(text: string) {
  return text.split('\n').map((line, index, lines) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

function hasFamilyMemberContent(member?: PersonInfo['father']) {
  return Boolean(
    hasText(member?.relation) || hasText(member?.name) || hasText(member?.phone)
  );
}

function hasPersonContent(person?: PersonInfo) {
  return Boolean(
    hasText(person?.name) ||
      hasText(person?.order) ||
      hasText(person?.phone) ||
      hasFamilyMemberContent(person?.father) ||
      hasFamilyMemberContent(person?.mother)
  );
}

function sanitizeGuideItems(items?: RomanticGuideItem[]) {
  return (items ?? []).filter((item) => hasText(item.title) || hasText(item.content));
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

function RomanticLoader({
  brideName,
  groomName,
  heroDateLine,
  heroImageUrl,
  onLoadComplete,
}: {
  brideName: string;
  groomName: string;
  heroDateLine: string;
  heroImageUrl?: string;
  onLoadComplete: () => void;
}) {
  const [progress, setProgress] = useState(0.08);
  const [currentMessage, setCurrentMessage] = useState(0);
  const resolvedHeroImageUrl = heroImageUrl || INTRO_IMAGE_URL;

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    const image = new Image();

    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(0.92, current + Math.max(0.025, (0.92 - current) * 0.18)));
    }, 160);
    const messageTimer = window.setInterval(() => {
      setCurrentMessage((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 900);

    const complete = () => {
      if (cancelled || settled) {
        return;
      }

      settled = true;
      window.clearInterval(progressTimer);
      window.clearInterval(messageTimer);
      setProgress(1);
      window.requestAnimationFrame(() => {
        if (!cancelled) {
          onLoadComplete();
        }
      });
    };

    const handleLoad = () => {
      if (typeof image.decode !== 'function') {
        complete();
        return;
      }

      void image.decode().catch(() => undefined).then(complete);
    };

    image.decoding = 'async';
    image.onload = handleLoad;
    image.onerror = complete;
    image.src = resolvedHeroImageUrl;

    if (image.complete) {
      handleLoad();
    }

    const timeout = window.setTimeout(complete, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
      window.clearInterval(messageTimer);
      window.clearTimeout(timeout);
    };
  }, [onLoadComplete, resolvedHeroImageUrl]);

  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderVisual}>
        <RomanticHeroVisual
          imageUrl={resolvedHeroImageUrl}
          alt=""
          imageClassName={styles.loaderImage}
          fallbackClassName={styles.loaderFallback}
          eager
        />
        <div className={styles.loaderOverlay} />
        <div className={styles.loaderDateLine}>{heroDateLine}</div>
        <div className={styles.loaderNames}>
          <span className={styles.loaderNamePrimary}>{groomName}</span>
          <span className={styles.loaderAmpersand}>&amp;</span>
          <span className={styles.loaderNamePrimary}>{brideName}</span>
        </div>
      </div>
      <h1 className={styles.loaderHeading}>Invitation</h1>
      <p className={styles.loaderSubtitle}>모바일 청첩장을 준비하고 있습니다.</p>
      <div
        className={styles.progressContainer}
        role="progressbar"
        aria-label="청첩장 준비 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className={styles.progressBar} style={{ transform: `scaleX(${progress})` }} />
      </div>
      <p className={styles.loadingText} role="status" aria-live="polite">
        {LOADING_MESSAGES[currentMessage]}
      </p>
    </div>
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
          <h3 className={styles.countdownTitle}>{expiredTitle}</h3>
          <p className={styles.countdownSubtitle}>{expiredSubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.countdownContainer}>
      <span className={styles.countdownIcon}>✦</span>
      <div className={styles.countdownContent}>
        <h3 className={styles.countdownTitle}>{title}</h3>
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

function RomanticCalendar({
  brideName,
  groomName,
  weddingDate,
}: {
  brideName: string;
  groomName: string;
  weddingDate: Date;
}) {
  const monthStart = new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 1);
  const daysInMonth = new Date(weddingDate.getFullYear(), weddingDate.getMonth() + 1, 0).getDate();
  const emptyDayCount = monthStart.getDay();
  const calendarCells = [
    ...Array.from({ length: emptyDayCount }, (_, index) => ({
      key: `empty-${index}`,
      day: null,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      key: `day-${index + 1}`,
      day: index + 1,
    })),
  ];

  return (
    <div className={styles.calendarPanel}>
      <div className={styles.calendarMonth}>
        {weddingDate.getFullYear()}년 {weddingDate.getMonth() + 1}월
      </div>
      <div className={styles.calendarWeekdays}>
        {WEEKDAY_LABELS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className={styles.calendarGrid}>
        {calendarCells.map((cell) =>
          cell.day ? (
            <div
              className={`${styles.calendarDay} ${
                cell.day === weddingDate.getDate() ? styles.calendarWeddingDay : ''
              }`}
              key={cell.key}
            >
              <span>{cell.day}</span>
              {cell.day === weddingDate.getDate() ? (
                <span className={styles.calendarMarker}>♡</span>
              ) : null}
            </div>
          ) : (
            <div className={styles.calendarDayEmpty} key={cell.key} />
          )
        )}
      </div>
      <p className={styles.calendarWeddingLabel}>
        {groomName} &amp; {brideName} 결혼식
      </p>
    </div>
  );
}

function RomanticFamilySection({
  bride,
  groom,
}: {
  bride?: PersonInfo;
  groom?: PersonInfo;
}) {
  const [contactModal, setContactModal] = useState<ContactTarget | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalTriggerRef = useRef<HTMLElement | null>(null);
  const hasGroomInfo = hasPersonContent(groom);
  const hasBrideInfo = hasPersonContent(bride);

  useEffect(() => {
    if (!contactModal) {
      const trigger = modalTriggerRef.current;
      if (trigger && typeof trigger.focus === 'function') {
        trigger.focus();
      }
      modalTriggerRef.current = null;
      return;
    }

    modalCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setContactModal(null);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const modal = modalContentRef.current;
      if (!modal) {
        return;
      }

      const focusableElements = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.tabIndex !== -1 && element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalCloseButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const isInsideModal = activeElement ? modal.contains(activeElement) : false;

      if (event.shiftKey) {
        if (!isInsideModal || activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!isInsideModal || activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contactModal]);

  if (!hasGroomInfo && !hasBrideInfo) {
    return null;
  }

  const openContactModal = (person: ContactTarget, triggerElement: HTMLElement) => {
    modalTriggerRef.current = triggerElement;
    setContactModal(person);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSms = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const renderPhoneButton = (person: ContactTarget) => {
    if (!person.phone) {
      return null;
    }

    return (
      <button
        type="button"
        className={styles.familyContactButton}
        onClick={(event) => openContactModal(person, event.currentTarget)}
        aria-label={`${person.name} 연락하기`}
      >
        ✆
      </button>
    );
  };

  const renderPersonColumn = (title: string, person?: PersonInfo) => {
    if (!hasPersonContent(person) || !person) {
      return null;
    }

    return (
      <div className={styles.familyColumn}>
        <div className={styles.familyRole}>{title}</div>
        {person.father && hasFamilyMemberContent(person.father) ? (
          <div className={styles.familyRow}>
            <span className={styles.familyRelation}>{person.father.relation}</span>
            <span className={styles.familyName}>{person.father.name}</span>
            {renderPhoneButton({
              name: person.father.name || `${title} 혼주`,
              phone: person.father.phone,
            })}
          </div>
        ) : null}
        {person.mother && hasFamilyMemberContent(person.mother) ? (
          <div className={styles.familyRow}>
            <span className={styles.familyRelation}>{person.mother.relation}</span>
            <span className={styles.familyName}>{person.mother.name}</span>
            {renderPhoneButton({
              name: person.mother.name || `${title} 혼주`,
              phone: person.mother.phone,
            })}
          </div>
        ) : null}
        {hasText(person.name) || hasText(person.order) || hasText(person.phone) ? (
          <div className={`${styles.familyRow} ${styles.familyMainRow}`}>
            {person.order ? <span className={styles.familyOrder}>{person.order}</span> : null}
            <span className={styles.familyName}>{person.name}</span>
            {renderPhoneButton({ name: person.name || title, phone: person.phone })}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className={styles.familySection}>
        <div className={styles.familyGrid}>
          {renderPersonColumn('신랑측', groom)}
          {renderPersonColumn('신부측', bride)}
        </div>
      </div>

      {contactModal ? (
        <div className={styles.contactModalOverlay} onClick={() => setContactModal(null)}>
          <div
            ref={modalContentRef}
            className={styles.contactModal}
            role="dialog"
            aria-modal="true"
            aria-label={`${contactModal.name} 연락처`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={modalCloseButtonRef}
              className={styles.contactModalClose}
              onClick={() => setContactModal(null)}
              aria-label="연락처 모달 닫기"
              type="button"
            >
              ×
            </button>
            <h3 className={styles.contactModalTitle}>{contactModal.name}</h3>
            <div className={styles.contactModalPhone}>{contactModal.phone}</div>
            {contactModal.phone ? (
              <div className={styles.contactModalActions}>
                <button
                  type="button"
                  className={styles.contactModalButton}
                  onClick={() => handleCall(contactModal.phone!)}
                >
                  전화
                </button>
                <button
                  type="button"
                  className={styles.contactModalButton}
                  onClick={() => handleSms(contactModal.phone!)}
                >
                  문자
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function RomanticScheduleSection({
  address,
  ceremony,
  date,
  reception,
  time,
  venue,
  venueGuide,
  wreathGuide,
}: {
  address: string;
  ceremony?: RomanticScheduleDetail;
  date: string;
  reception?: RomanticScheduleDetail;
  time: string;
  venue: string;
  venueGuide?: RomanticGuideItem[];
  wreathGuide?: RomanticGuideItem[];
}) {
  const sanitizedVenueGuide = sanitizeGuideItems(venueGuide);
  const sanitizedWreathGuide = sanitizeGuideItems(wreathGuide);
  const hasDetail =
    hasText(ceremony?.time) ||
    hasText(ceremony?.location) ||
    hasText(reception?.time) ||
    hasText(reception?.location);
  const hasGuide = sanitizedVenueGuide.length > 0 || sanitizedWreathGuide.length > 0;
  const hasSummary = hasText(date) || hasText(time) || hasText(venue) || hasText(address);
  const scheduleId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeTab, setActiveTab] = useState<RomanticInfoTab>(() =>
    hasSummary ? 'summary' : hasDetail ? 'detail' : 'guide'
  );
  const resolvedActiveTab = resolveRomanticInfoTab({
    activeTab,
    hasSummary,
    hasDetail,
    hasGuide,
  });

  useEffect(() => {
    if (resolvedActiveTab && resolvedActiveTab !== activeTab) {
      setActiveTab(resolvedActiveTab);
    }
  }, [activeTab, resolvedActiveTab]);

  if (!resolvedActiveTab) {
    return null;
  }

  const scheduleTabs = [
    ...(hasSummary
      ? [{ key: 'summary' as const, label: '예식 일정', icon: '일정' }]
      : []),
    ...(hasDetail ? [{ key: 'detail' as const, label: '세부 안내', icon: '세부' }] : []),
    ...(hasGuide ? [{ key: 'guide' as const, label: '안내사항', icon: '안내' }] : []),
  ];
  const focusTabAt = (index: number) => {
    const nextTab = scheduleTabs[index];
    if (!nextTab) {
      return;
    }

    setActiveTab(nextTab.key);
    window.requestAnimationFrame(() => tabRefs.current[index]?.focus());
  };
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % scheduleTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + scheduleTabs.length) % scheduleTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = scheduleTabs.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    focusTabAt(nextIndex);
  };

  const renderScheduleDetail = (
    label: string,
    detail?: RomanticScheduleDetail,
    fallbackLocation?: string
  ) => {
    if (!hasText(detail?.time) && !hasText(detail?.location) && !fallbackLocation) {
      return null;
    }

    return (
      <div className={styles.scheduleDetailCard}>
        <div className={styles.scheduleDetailLabel}>{label}</div>
        {hasText(detail?.time) ? (
          <div className={styles.scheduleDetailValue}>{detail?.time}</div>
        ) : null}
        <div className={styles.scheduleDetailMeta}>
          {detail?.location?.trim() || fallbackLocation}
        </div>
      </div>
    );
  };

  const renderGuideGroup = (title: string, items: RomanticGuideItem[]) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className={styles.guideGroup}>
        <h3 className={styles.guideGroupTitle}>{title}</h3>
        <div className={styles.guideList}>
          {items.map((item, index) => (
            <div className={styles.guideCard} key={`${title}-${item.title}-${index}`}>
              {hasText(item.title) ? (
                <div className={styles.guideCardTitle}>{item.title}</div>
              ) : null}
              {hasText(item.content) ? (
                <p className={styles.guideCardContent}>
                  {formatTextWithBreaks(item.content)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSummaryPanel = () => (
    <div className={styles.scheduleSummaryPanel}>
      <div className={styles.scheduleSummary}>
        {hasText(date) ? (
          <div className={styles.scheduleSummaryItem}>
            <span>예식일</span>
            <strong>{date}</strong>
          </div>
        ) : null}
        {hasText(time) ? (
          <div className={styles.scheduleSummaryItem}>
            <span>시간</span>
            <strong>{time}</strong>
          </div>
        ) : null}
        {hasText(venue) ? (
          <div className={styles.scheduleSummaryItem}>
            <span>예식장</span>
            <strong>{venue}</strong>
          </div>
        ) : null}
        {hasText(address) ? (
          <div className={styles.scheduleSummaryItem}>
            <span>주소</span>
            <strong>{address}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderDetailPanel = () => (
    <div className={styles.scheduleDetailPanel}>
      <div className={styles.scheduleDetailGrid}>
        {renderScheduleDetail('본식', ceremony, venue)}
        {renderScheduleDetail('피로연', reception)}
      </div>
      {!hasText(ceremony?.time) &&
      !hasText(ceremony?.location) &&
      !hasText(reception?.time) &&
      !hasText(reception?.location) ? (
        <div className={styles.scheduleEmpty}>현재 노출 가능한 세부 안내가 없습니다.</div>
      ) : null}
    </div>
  );

  const renderGuidePanel = () => (
    <div className={styles.scheduleGuidePanel}>
      {hasGuide ? (
        <div className={styles.guideSection}>
          {renderGuideGroup('예식장 안내', sanitizedVenueGuide)}
          {renderGuideGroup('화환 안내', sanitizedWreathGuide)}
        </div>
      ) : (
        <div className={styles.scheduleEmpty}>현재 노출 가능한 안내사항이 없습니다.</div>
      )}
    </div>
  );

  const renderPanel = () => {
    if (resolvedActiveTab === 'summary') {
      return renderSummaryPanel();
    }

    if (resolvedActiveTab === 'detail') {
      return renderDetailPanel();
    }

    return renderGuidePanel();
  };

  return (
    <section
      className={styles.section}
      id="wedding-info"
      aria-labelledby={`${scheduleId}-heading`}
    >
      <p className={styles.sectionLabel}>Information</p>
      <div className={styles.sectionDivider} />
      <h2 className={styles.sectionTitle} id={`${scheduleId}-heading`}>
        예식 안내
      </h2>

      {scheduleTabs.length > 1 ? (
        <div className={styles.scheduleTabs} role="tablist" aria-label="예식 안내 탭">
          {scheduleTabs.map((tab, index) => (
            <button
              key={tab.key}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`${scheduleId}-tab-${tab.key}`}
              type="button"
              className={`${styles.scheduleTabButton} ${
                resolvedActiveTab === tab.key ? styles.scheduleTabButtonActive : ''
              }`}
              role="tab"
              aria-selected={resolvedActiveTab === tab.key}
              aria-controls={`${scheduleId}-panel`}
              tabIndex={resolvedActiveTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span className={styles.scheduleTabLabel}>{tab.label}</span>
              <span className={styles.scheduleTabValue} aria-hidden="true">
                {tab.icon}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {scheduleTabs.length > 1 ? (
        <div
          className={styles.scheduleTabPanel}
          id={`${scheduleId}-panel`}
          role="tabpanel"
          aria-labelledby={`${scheduleId}-tab-${resolvedActiveTab}`}
          tabIndex={0}
        >
          {renderPanel()}
        </div>
      ) : (
        <div className={styles.scheduleTabPanel}>{renderPanel()}</div>
      )}
    </section>
  );
}

function RomanticGallery({
  brideName,
  groomName,
  images,
  imagesLoading = false,
  previewImages,
}: RomanticGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const lightboxTitleId = useId();
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  const lightboxCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const galleryTriggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lightboxTriggerIndexRef = useRef<number | null>(null);
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
      const triggerIndex = lightboxTriggerIndexRef.current;
      if (triggerIndex !== null) {
        window.requestAnimationFrame(() => galleryTriggerRefs.current[triggerIndex]?.focus());
      }
      lightboxTriggerIndexRef.current = null;
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lightboxCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedIndex(null);
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedIndex((current) =>
          current === null ? null : Math.max(0, current - 1)
        );
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedIndex((current) =>
          current === null ? null : Math.min(images.length - 1, current + 1)
        );
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const lightbox = lightboxRef.current;
      if (!lightbox) {
        return;
      }

      const focusableElements = Array.from(
        lightbox.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
      ).filter((element) => element.tabIndex !== -1 && element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        lightboxCloseButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const isInsideLightbox = activeElement ? lightbox.contains(activeElement) : false;

      if (event.shiftKey) {
        if (!isInsideLightbox || activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (!isInsideLightbox || activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
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
  const openLightbox = (index: number, triggerElement: HTMLButtonElement) => {
    lightboxTriggerIndexRef.current = index;
    galleryTriggerRefs.current[index] = triggerElement;
    setSelectedIndex(index);
  };
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
                ref={(element) => {
                  galleryTriggerRefs.current[index] = element;
                }}
                type="button"
                className={styles.galleryItem}
                aria-label={`${groomName}과 ${brideName}의 ${index + 1}번째 사진 크게 보기`}
                onClick={(event) => openLightbox(index, event.currentTarget)}
              >
                <img
                  src={image.preview}
                  alt={`${groomName}과 ${brideName}의 결혼식 사진 ${index + 1}`}
                  className={styles.galleryImage}
                  loading="lazy"
                  decoding="async"
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
          ref={lightboxRef}
          className={styles.galleryLightbox}
          role="dialog"
          aria-modal="true"
          aria-labelledby={lightboxTitleId}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedIndex(null);
            }
          }}
        >
          <h2 className={styles.visuallyHidden} id={lightboxTitleId}>
            {groomName}과 {brideName}의 결혼식 사진 확대 보기
          </h2>
          <button
            ref={lightboxCloseButtonRef}
            type="button"
            className={styles.galleryLightboxClose}
            aria-label="사진 확대 보기 닫기"
            onClick={() => setSelectedIndex(null)}
          >
            ×
          </button>

          {selectedIndex !== null && selectedIndex > 0 ? (
            <button
              type="button"
              className={`${styles.galleryLightboxNav} ${styles.galleryLightboxPrev}`}
              aria-label="이전 사진 보기"
              onClick={() => moveSelectedImage('prev')}
            >
              ‹
            </button>
          ) : null}

          {selectedIndex !== null && selectedIndex < galleryItems.length - 1 ? (
            <button
              type="button"
              className={`${styles.galleryLightboxNav} ${styles.galleryLightboxNext}`}
              aria-label="다음 사진 보기"
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
              alt={`${groomName}과 ${brideName}의 결혼식 사진 ${selectedIndex === null ? 1 : selectedIndex + 1} 확대 이미지`}
              className={styles.galleryLightboxImage}
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <div className={styles.galleryLightboxCounter} aria-live="polite" aria-atomic="true">
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
      const subtitle = pageData?.subtitle?.trim();

      return (
        <section className={styles.hero}>
          {state.heroImageUrl || state.mainImageUrl ? (
            <img
              src={state.heroImageUrl || state.mainImageUrl}
              alt={`${state.pageConfig.groomName}과 ${state.pageConfig.brideName}의 결혼식 대표 사진`}
              className={styles.heroImage}
            />
          ) : (
            <div className={styles.heroNoImage} />
          )}
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <h1 className={styles.heroNames}>
              <span className={styles.heroNamePrimary}>{state.pageConfig.groomName}</span>
              <span className={styles.heroAmpersand}>&amp;</span>
              <span className={styles.heroNamePrimary}>{state.pageConfig.brideName}</span>
            </h1>
            <p className={styles.heroVenue}>{state.pageConfig.venue}</p>
            {subtitle ? <p className={styles.heroSubtitle}>{subtitle}</p> : null}
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
          <h2 className={styles.sectionLabel} aria-label="초대 인사">
            Invitation
          </h2>
          <div className={styles.sectionDivider} />
          <p className={styles.greetingText}>
            {greeting || `${state.pageConfig.displayName} 결혼식에 초대합니다.`}
          </p>
          <p className={styles.greetingAuthor}>from. {greetingAuthor}</p>
          <RomanticFamilySection
            groom={state.pageConfig.couple.groom}
            bride={state.pageConfig.couple.bride}
          />
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
          <h2 className={styles.sectionLabel} aria-label="예식 날짜">
            Date
          </h2>
          <div className={styles.sectionDivider} />
          <div className={styles.dateCard}>
            <div className={styles.dateMain}>{state.weddingDate.getDate()}</div>
            <div className={styles.dateMeta}>{formatDateLabel(state.weddingDate)}</div>
            <div className={styles.dateMeta}>{eventTime}</div>
            <div className={styles.dateVenue}>{address || state.pageConfig.venue}</div>
          </div>
          <RomanticCalendar
            weddingDate={state.weddingDate}
            groomName={state.pageConfig.groomName}
            brideName={state.pageConfig.brideName}
          />
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
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const ceremony = getCeremonySchedule(state.pageConfig, pageData);
      const reception = getReceptionSchedule(state.pageConfig, pageData);

      return (
        <RomanticScheduleSection
          date={state.pageConfig.date}
          time={pageData?.ceremonyTime ?? ''}
          venue={state.pageConfig.venue}
          address={getCeremonyAddress(state.pageConfig, pageData)}
          ceremony={ceremony}
          reception={reception}
          venueGuide={pageData?.venueGuide}
          wreathGuide={pageData?.wreathGuide}
        />
      );
    },
    ({ state }) => {
      if (!shouldRenderRomanticGallery(state.galleryImageUrls, state.imagesLoading)) {
        return null;
      }

      return (
        <section className={`${styles.section} ${styles.sectionDark} ${styles.gallerySection}`}>
          <p className={styles.sectionLabel}>Gallery</p>
          <div className={styles.sectionDivider} />
          <h2 className={styles.sectionTitle}>우리의 이야기</h2>
          <RomanticGallery
            groomName={state.pageConfig.groomName}
            brideName={state.pageConfig.brideName}
            images={state.galleryImageUrls}
            previewImages={state.galleryPreviewImageUrls}
            imagesLoading={state.imagesLoading}
          />
        </section>
      );
    },
    ({ state }) => {
      const pageData = getThemePageData(state.pageConfig, 'romantic');
      const address = getCeremonyAddress(state.pageConfig, pageData);
      const contact = getCeremonyContact(state.pageConfig, pageData);
      const description = getMapDescription(state.pageConfig, pageData);
      const kakaoMap = pageData?.kakaoMap;

      if (
        !shouldRenderRomanticLocation({
          venue: state.pageConfig.venue,
          address,
          description,
          contact,
          latitude: kakaoMap?.latitude,
          longitude: kakaoMap?.longitude,
        })
      ) {
        return null;
      }

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
