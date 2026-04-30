'use client';

import { useEffect, useState, type CSSProperties } from 'react';

import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../eventPageState';
import {
  buildGeneralEventViewModel,
  type GeneralEventViewModel,
} from '../generalEventAdapter';
import {
  getGeneralEventTheme,
  type GeneralEventThemeKey,
} from '../generalEventThemes';
import styles from '../GeneralEventInvitationPage.module.css';

type GeneralEventThemeRendererProps = {
  state: EventPageReadyState;
  theme: GeneralEventThemeKey;
};

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

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionLabel}>{label}</span>
      <h2 className={styles.sectionTitle}>{title}</h2>
    </div>
  );
}

function RsvpSection() {
  return (
    <section className={styles.section}>
      <SectionHeader label="RSVP" title="참석 여부" />
      <div className={styles.rsvpCard}>
        <p className={styles.statusMessage}>
          참석 응답 기능은 준비 중입니다. 참석 여부는 주최자 연락처로 직접 안내 부탁드립니다.
        </p>
      </div>
    </section>
  );
}

function GeneralEventBody({
  state,
  visualTheme,
  model,
}: {
  state: EventPageReadyState;
  visualTheme: GeneralEventThemeKey;
  model: GeneralEventViewModel;
}) {
  const theme = getGeneralEventTheme(visualTheme);
  const [introVisible, setIntroVisible] = useState(true);
  const countdown = useCountdown(model.eventDate);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );

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
              <h1 className={styles.heroTitle}>{model.title}</h1>
              <p className={styles.heroSubtitle}>{model.subtitle}</p>
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.metaItem}>
                <span>Date</span>
                <strong>{model.dateLabel}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Time</span>
                <strong>{model.timeLabel}</strong>
              </div>
              <div className={styles.metaItem}>
                <span>Venue</span>
                <strong>{model.venueName}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeader label="Greeting" title="초대의 글" />
          <p className={styles.greetingText}>{model.greeting}</p>
        </section>

        <section className={styles.section}>
          <SectionHeader label="Program" title="행사 일정" />
          <div className={styles.programList}>
            {model.programItems.map((item) => (
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
            <h3 className={styles.locationTitle}>{model.venueName}</h3>
            {model.address ? <p className={styles.locationAddress}>{model.address}</p> : null}
            {model.mapUrl ? (
              <a
                className={styles.linkButton}
                href={model.mapUrl}
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
              pageSlug={state.pageConfig.slug}
              styles={styles}
              title="방명록"
              subtitle="참석자와 지인이 남긴 축하 메시지를 확인할 수 있습니다."
              statusColors={{ success: theme.accent, error: '#ff8a8a' }}
            />
          </section>
        ) : null}

        <footer className={styles.footer}>
          <strong>{model.title}</strong>
          <span>
            문의 {model.contactName || '주최자'}
            {model.contactEmail ? ` · ${model.contactEmail}` : ''}
          </span>
        </footer>
      </div>
    </main>
  );
}

export function GeneralEventThemeRenderer({
  state,
  theme,
}: GeneralEventThemeRendererProps) {
  const model = buildGeneralEventViewModel(state);
  return <GeneralEventBody state={state} visualTheme={theme} model={model} />;
}
