'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';
import { AccessDeniedPage } from '@/utils';
import type { EventPageReadyState } from '../eventPageState';
import { useEventInvitationState } from '../eventPageState';
import type { EventInvitationRouteOptions } from '../eventPageThemes';
import {
  GENERAL_EVENT_DEFAULT_THEME,
  getGeneralEventTheme,
  normalizeGeneralEventThemeKey,
  type GeneralEventThemeKey,
} from './generalEventThemes';
import styles from './GeneralEventInvitationPage.module.css';

type GeneralEventRouteOptions = Omit<EventInvitationRouteOptions, 'theme'> & {
  theme: GeneralEventThemeKey;
};

type GeneralEventProgramItem = {
  time: string;
  title: string;
  description?: string;
};

type GeneralEventPageData = NonNullable<EventPageReadyState['pageConfig']['pageData']> & {
  programItems?: GeneralEventProgramItem[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
};

const DEFAULT_PROGRAM_ITEMS: GeneralEventProgramItem[] = [
  {
    time: '18:00',
    title: '게스트 입장 및 웰컴 드링크',
    description: '행사장 안내와 네트워킹 시간이 준비됩니다.',
  },
  {
    time: '18:30',
    title: '오프닝 세리머니',
    description: '행사 취지와 주요 프로그램을 소개합니다.',
  },
  {
    time: '19:10',
    title: '메인 프로그램',
    description: '공연, 발표, 시상 등 행사의 핵심 순서를 진행합니다.',
  },
  {
    time: '20:30',
    title: '네트워킹 및 클로징',
    description: '참석자와 자유롭게 인사를 나누는 시간입니다.',
  },
];

function buildDateFromPage(page: EventPageReadyState['pageConfig']) {
  const date = page.weddingDateTime;
  const candidate = new Date(date.year, date.month, date.day, date.hour, date.minute);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function formatEventDate(date: Date | null, fallback: string) {
  if (!date) {
    return fallback || '일정 미정';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function formatEventTime(date: Date | null, fallback?: string) {
  if (!date) {
    return fallback?.trim() || '시간 미정';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function calculateCountdown(targetDate: Date | null) {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function useCountdown(targetDate: Date | null) {
  const [countdown, setCountdown] = useState(() => calculateCountdown(targetDate));

  useEffect(() => {
    setCountdown(calculateCountdown(targetDate));
    const timer = window.setInterval(
      () => setCountdown(calculateCountdown(targetDate)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [targetDate]);

  return countdown;
}

function SectionHeader({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionLabel}>{label}</span>
      <h2 className={styles.sectionTitle}>{title}</h2>
    </div>
  );
}

function RsvpSection() {
  const [attendance, setAttendance] = useState<'attend' | 'absent'>('attend');
  const [name, setName] = useState('');
  const [meal, setMeal] = useState('미정');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  return (
    <section className={styles.section}>
      <SectionHeader label="RSVP" title="참석 여부" />
      <div className={styles.rsvpCard}>
        <form
          className={styles.rsvpForm}
          onSubmit={(event) => {
            event.preventDefault();
            setStatus(
              name.trim()
                ? '참석 응답을 확인했습니다. 별도 RSVP 저장소 연결 후 운영 데이터로 저장됩니다.'
                : '성함을 입력해 주세요.'
            );
          }}
        >
          <div className={styles.segmented}>
            <button
              type="button"
              className={`${styles.segmentedButton} ${
                attendance === 'attend' ? styles.segmentedButtonActive : ''
              }`}
              onClick={() => setAttendance('attend')}
            >
              참석
            </button>
            <button
              type="button"
              className={`${styles.segmentedButton} ${
                attendance === 'absent' ? styles.segmentedButtonActive : ''
              }`}
              onClick={() => setAttendance('absent')}
            >
              불참
            </button>
          </div>
          <label className={styles.fieldLabel}>
            성함
            <input
              className={styles.input}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="홍길동"
            />
          </label>
          <label className={styles.fieldLabel}>
            식사 옵션
            <select
              className={styles.select}
              value={meal}
              onChange={(event) => setMeal(event.target.value)}
            >
              <option value="미정">미정</option>
              <option value="식사 예정">식사 예정</option>
              <option value="식사 안 함">식사 안 함</option>
              <option value="비건">비건</option>
            </select>
          </label>
          <label className={styles.fieldLabel}>
            메시지
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="주최자에게 남길 메시지"
            />
          </label>
          <button className={styles.submitButton} type="submit">
            RSVP 보내기
          </button>
          {status ? <p className={styles.statusMessage}>{status}</p> : null}
          <input type="hidden" value={attendance} readOnly />
          <input type="hidden" value={meal} readOnly />
          <input type="hidden" value={message} readOnly />
        </form>
      </div>
    </section>
  );
}

function GeneralEventInvitationBody({
  state,
  visualTheme,
}: {
  state: EventPageReadyState;
  visualTheme: GeneralEventThemeKey;
}) {
  const theme = getGeneralEventTheme(visualTheme);
  const [introVisible, setIntroVisible] = useState(true);
  const page = state.pageConfig;
  const pageData = (page.pageData ?? {}) as GeneralEventPageData;
  const eventDate = buildDateFromPage(page);
  const countdown = useCountdown(eventDate);
  const features = resolveInvitationFeatures(page.productTier, page.features);
  const programItems =
    pageData.programItems?.filter((item) => item.time.trim() && item.title.trim()) ??
    DEFAULT_PROGRAM_ITEMS;
  const dateLabel = formatEventDate(eventDate, page.date);
  const timeLabel = formatEventTime(eventDate, pageData.ceremonyTime);
  const venueName = pageData.venueName?.trim() || page.venue || '장소 미정';
  const address = pageData.ceremonyAddress?.trim() || pageData.mapDescription?.trim() || '';
  const greeting =
    pageData.greetingMessage?.trim() ||
    `${page.displayName || '행사'}에 소중한 분들을 초대합니다.\n함께 자리해 주시면 더 뜻깊은 시간이 되겠습니다.`;

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  const cssVars = {
    '--general-event-bg': theme.background,
    '--general-event-surface': theme.surface,
    '--general-event-muted-surface': theme.mutedSurface,
    '--general-event-text': theme.text,
    '--general-event-sub-text': theme.subText,
    '--general-event-border': theme.border,
    '--general-event-accent': theme.accent,
    '--general-event-accent-text': theme.accentText,
    '--general-event-hero-bg': theme.heroBackground,
    '--general-event-intro-bg': theme.introBackground,
    '--general-event-title-font': theme.titleFont,
    '--general-event-body-font': theme.bodyFont,
  } as CSSProperties;

  return (
    <main className={styles.page} style={cssVars}>
      <div className={`${styles.intro} ${introVisible ? '' : styles.introHidden}`}>
        <div className={styles.introMark}>{theme.isVivid ? '!' : '*'}</div>
        <p className={styles.introTitle}>{theme.shortLabel}</p>
      </div>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.label}>General Event</span>
            <div>
              <h1 className={styles.heroTitle}>{page.displayName || page.metadata.title}</h1>
              <p className={styles.heroSubtitle}>
                {page.description || pageData.subtitle || '소중한 자리에 초대합니다.'}
              </p>
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.metaItem}>
                <span>Date</span>
                <strong>{dateLabel}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Time</span>
                <strong>{timeLabel}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Venue</span>
                <strong>{venueName}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader label="Greeting" title="초대의 글" />
          <p className={styles.greetingText}>{greeting}</p>
        </section>

        <section className={styles.section}>
          <SectionHeader label="Program" title="행사 일정" />
          <div className={styles.programList}>
            {programItems.map((item) => (
              <article className={styles.programItem} key={`${item.time}-${item.title}`}>
                <strong className={styles.programTime}>{item.time}</strong>
                <div>
                  <h3 className={styles.programTitle}>{item.title}</h3>
                  {item.description ? (
                    <p className={styles.programDesc}>{item.description}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader label="D-Day" title="행사까지 남은 시간" />
          <div className={styles.countdownGrid}>
            {[
              ['Days', countdown.days],
              ['Hours', countdown.hours],
              ['Minutes', countdown.minutes],
              ['Seconds', countdown.seconds],
            ].map(([label, value]) => (
              <div className={styles.countBox} key={label}>
                <strong className={styles.countValue}>{value}</strong>
                <span className={styles.countLabel}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader label="Location" title="오시는 길" />
          <div className={styles.locationCard}>
            <h3 className={styles.locationTitle}>{venueName}</h3>
            {address ? <p className={styles.locationAddress}>{address}</p> : null}
            {pageData.mapUrl?.trim() ? (
              <a
                className={styles.linkButton}
                href={pageData.mapUrl}
                target="_blank"
                rel="noreferrer"
              >
                지도 열기
              </a>
            ) : null}
          </div>
        </section>

        <RsvpSection />

        {features.showGuestbook ? (
          <section className={styles.section}>
            <GuestbookThemed
              pageSlug={page.slug}
              styles={styles}
              title="방명록"
              subtitle="참석자와 지인이 남긴 축하 메시지를 확인할 수 있습니다."
              statusColors={{ success: theme.accent, error: '#ff8a8a' }}
            />
          </section>
        ) : null}

        <footer className={styles.footer}>
          <strong>{page.displayName || 'General Event'}</strong>
          <span>
            문의 {pageData.contactName?.trim() || pageData.ceremonyContact?.trim() || '주최자'}
            {pageData.contactEmail?.trim() ? ` · ${pageData.contactEmail}` : ''}
          </span>
        </footer>
      </div>
    </main>
  );
}

export default function GeneralEventInvitationPage(options: GeneralEventRouteOptions) {
  const visualTheme = normalizeGeneralEventThemeKey(options.theme, GENERAL_EVENT_DEFAULT_THEME);
  const state = useEventInvitationState({
    ...options,
    theme: 'emotional',
    eventType: 'general-event',
  });

  if (state.status === 'blocked') {
    return (
      <AccessDeniedPage
        message={state.blockMessage}
        actionLabel={state.isRefreshingPage ? '다시 불러오는 중...' : '다시 불러오기'}
        actionDisabled={state.isRefreshingPage}
        onAction={() => {
          void state.refreshPage();
        }}
      />
    );
  }

  if (state.status !== 'ready') {
    return null;
  }

  return <GeneralEventInvitationBody state={state} visualTheme={visualTheme} />;
}
