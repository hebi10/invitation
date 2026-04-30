'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import GuestbookThemed from '@/components/sections/Guestbook/GuestbookThemed';
import { resolveInvitationFeatures } from '@/lib/invitationProducts';

import type { EventPageReadyState } from '../../eventPageState';
import {
  buildOpeningInvitationViewModel,
  type OpeningInvitationViewModel,
} from '../openingAdapter';
import { getOpeningTheme, type OpeningThemeKey } from '../openingThemes';
import styles from '../OpeningInvitationPage.module.css';

type OpeningThemeRendererProps = {
  state: EventPageReadyState;
  theme: OpeningThemeKey;
};

function calculateCountdown(targetDate: Date) {
  const diff = Math.max(0, targetDate.getTime() - Date.now());

  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function useCountdown(targetDate: Date) {
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

function IntroScreen({
  model,
  hidden,
  onEnter,
}: {
  model: OpeningInvitationViewModel;
  hidden: boolean;
  onEnter: () => void;
}) {
  return (
    <div className={`${styles.intro} ${hidden ? styles.introHidden : ''}`}>
      <div className={styles.logoMark} aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <path
            d="M22 6C29 13 29 20 22 27C15 20 15 13 22 6Z"
            fill="currentColor"
            opacity="0.8"
          />
          <path
            d="M22 27C30 25 35 29 36 37C28 38 23 35 22 27Z"
            fill="currentColor"
            opacity="0.58"
          />
          <path
            d="M22 27C14 25 9 29 8 37C16 38 21 35 22 27Z"
            fill="currentColor"
            opacity="0.58"
          />
        </svg>
      </div>
      <h1 className={styles.introTitle}>{model.businessName}</h1>
      <p className={styles.introText}>{model.tagline}</p>
      <button type="button" className={styles.introButton} onClick={onEnter}>
        초대장 열기
      </button>
    </div>
  );
}

function OpeningInvitationSections({
  model,
  state,
}: {
  model: OpeningInvitationViewModel;
  state: EventPageReadyState;
}) {
  const countdown = useCountdown(model.openingDate);
  const features = resolveInvitationFeatures(
    state.pageConfig.productTier,
    state.pageConfig.features
  );

  return (
    <>
      <nav className={styles.tabNav} aria-label="개업 초대장 섹션">
        {[
          ['greeting', '인사말'],
          ['brand', '소개'],
          ['countdown', '카운트다운'],
          ['benefits', '혜택'],
          ['location', '오시는 길'],
          ['guestbook', '방명록'],
        ].map(([id, label]) => (
          <a className={styles.navButton} href={`#${id}`} key={id}>
            {label}
          </a>
        ))}
      </nav>

      <section className={styles.section} id="greeting">
        <SectionHeader label="Invitation" title="새로운 시작에 초대합니다" />
        <p className={styles.messageText}>{model.greeting}</p>
      </section>

      <section className={styles.section} id="brand">
        <SectionHeader label="Brand" title="브랜드 소개" />
        <div className={styles.cardGrid}>
          {model.brandItems.map((item, index) => (
            <article className={styles.infoCard} key={`${item.title}-${index}`}>
              <h3 className={styles.cardTitle}>{item.title || '소개'}</h3>
              <p className={styles.cardText}>{item.content}</p>
            </article>
          ))}
        </div>
      </section>

      {features.showCountdown ? (
        <section className={styles.section} id="countdown">
          <SectionHeader label="Countdown" title="오픈까지 남은 시간" />
          <div className={styles.countdownGrid}>
            {[
              ['Days', countdown.days],
              ['Hours', countdown.hours],
              ['Min', countdown.minutes],
              ['Sec', countdown.seconds],
            ].map(([label, value]) => (
              <div className={styles.countBox} key={label}>
                <strong className={styles.countValue}>
                  {String(value).padStart(2, '0')}
                </strong>
                <span className={styles.countLabel}>{label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section} id="benefits">
        <SectionHeader label="Benefits" title="오픈 기념 혜택" />
        <div className={styles.cardGrid}>
          {model.benefitItems.map((item, index) => (
            <article className={styles.benefitCard} key={`${item.title}-${index}`}>
              <h3 className={styles.cardTitle}>{item.title || '혜택'}</h3>
              <p className={styles.cardText}>{item.content}</p>
            </article>
          ))}
        </div>
      </section>

      {model.galleryImageUrls.length > 0 || model.coverImageUrl ? (
        <section className={styles.section}>
          <SectionHeader label="Gallery" title="매장 이미지" />
          <div className={styles.galleryGrid}>
            {[model.coverImageUrl, ...model.galleryImageUrls]
              .filter(Boolean)
              .slice(0, 6)
              .map((imageUrl, index) => (
                <div className={styles.galleryItem} key={`${imageUrl}-${index}`}>
                  <img src={imageUrl} alt={`${model.businessName} 매장 이미지 ${index + 1}`} />
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section} id="location">
        <SectionHeader label="Location" title="오시는 길" />
        <div className={styles.locationCard}>
          <h3 className={styles.cardTitle}>{model.venueName}</h3>
          {model.address ? <p className={styles.locationText}>{model.address}</p> : null}
          {model.mapDescription ? (
            <p className={styles.locationText}>{model.mapDescription}</p>
          ) : null}
          {model.contact ? <p className={styles.locationText}>문의 {model.contact}</p> : null}
          {model.mapUrl ? (
            <a className={styles.primaryButton} href={model.mapUrl} target="_blank" rel="noreferrer">
              지도 열기
            </a>
          ) : null}
        </div>
      </section>

      {features.showGuestbook ? (
        <section className={styles.section} id="guestbook">
          <GuestbookThemed
            pageSlug={state.pageConfig.slug}
            styles={styles}
            title="방명록"
            subtitle="개업을 축하하는 메시지를 남겨 주세요."
            statusColors={{ success: 'var(--opening-accent)', error: '#d45757' }}
          />
        </section>
      ) : null}

      <footer className={styles.footer}>
        <strong>{model.businessName}</strong>
        <p className={styles.footerText}>
          {model.footerInfo || `${model.openingDateLabel} ${model.openingTimeLabel} 오픈`}
        </p>
      </footer>
    </>
  );
}

export function OpeningThemeRenderer({ state, theme }: OpeningThemeRendererProps) {
  const visualTheme = getOpeningTheme(theme);
  const model = buildOpeningInvitationViewModel(state);
  const [introHidden, setIntroHidden] = useState(false);
  const cssVars = useMemo(
    () =>
      ({
        '--opening-bg': visualTheme.background,
        '--opening-surface': visualTheme.surface,
        '--opening-muted-surface': visualTheme.mutedSurface,
        '--opening-text': visualTheme.text,
        '--opening-sub-text': visualTheme.subText,
        '--opening-accent': visualTheme.accent,
        '--opening-accent-text': visualTheme.accentText,
        '--opening-border': visualTheme.border,
        '--opening-hero-bg': visualTheme.heroBackground,
        '--opening-hero-text': visualTheme.key === 'opening-modern' ? '#f0ede8' : '#f5efe6',
        '--opening-intro-bg': visualTheme.introBackground,
        '--opening-title-font': visualTheme.titleFont,
        '--opening-body-font': visualTheme.bodyFont,
      }) as CSSProperties,
    [visualTheme]
  );

  return (
    <main
      className={styles.page}
      style={cssVars}
      aria-label={`${model.businessName} 개업 초대장`}
    >
      <IntroScreen
        model={model}
        hidden={introHidden}
        onEnter={() => setIntroHidden(true)}
      />
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>Grand Opening</span>
            <div>
              <h1 className={styles.heroTitle}>{model.businessName}</h1>
              <p className={styles.brandName}>{model.brandName}</p>
              <p className={styles.brandName}>{model.tagline}</p>
            </div>
            {model.coverImageUrl ? (
              <div className={styles.heroImage}>
                <img src={model.coverImageUrl} alt={`${model.businessName} 대표 이미지`} />
              </div>
            ) : (
              <div className={styles.heroImage}>
                <div className={styles.imageFallback}>Grand Opening</div>
              </div>
            )}
            <div className={styles.heroMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Open Date</span>
                <strong>{model.openingDateLabel}</strong>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Open Time</span>
                <strong>{model.openingTimeLabel}</strong>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Place</span>
                <strong>{model.venueName}</strong>
              </div>
            </div>
          </div>
        </section>
        <OpeningInvitationSections model={model} state={state} />
      </div>
    </main>
  );
}
