'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { gsap } from 'gsap';
import { useDialogLayer } from '@/hooks/useDialogLayer';
import { shouldShowWeddingIntro, weddingIntroSessionKey, type WeddingIntroStyle } from '@/lib/weddingIntro';
import tokens from './QuietInvitationTokens.module.css';
import styles from './WeddingIntro.module.css';

type Props = {
  style: WeddingIntroStyle;
  slug: string;
  groomName: string;
  brideName: string;
  date: string;
  imageUrl: string;
  theme?: string;
  preview?: boolean;
  connectToCover?: boolean;
  onComplete?: () => void;
};

export default function WeddingIntro({
  style, slug, groomName, brideName, date, imageUrl,
  theme = 'simple', preview = false, connectToCover = !preview, onComplete,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [opening, setOpening] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const openingRef = useRef(false);
  const finished = useRef(false);
  const openLetterRef = useRef<() => void>(() => {});
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const complete = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setVisible(false);
    if (!preview) {
      try {
        sessionStorage.setItem(weddingIntroSessionKey(slug), 'seen');
      } catch {
        // Session storage is optional in restrictive browsers.
      }
    }
    completeRef.current?.();
  }, [slug, preview]);

  useLayoutEffect(() => {
    finished.current = false;
    openingRef.current = false;
    setOpening(false);
    let seen = false;
    try {
      seen = sessionStorage.getItem(weddingIntroSessionKey(slug)) === 'seen';
    } catch {
      // Private browsing may deny access.
    }

    setResolved(true);
    if (shouldShowWeddingIntro({ style, preview, hash: window.location.hash, seen })) {
      setVisible(true);
    } else {
      setVisible(false);
      completeRef.current?.();
    }
  }, [style, slug, preview]);

  useDialogLayer(root, { open: visible, onClose: complete });

  useEffect(() => {
    const element = root.current;
    if (!visible || !element) return;

    let disposed = false;
    let animation: ReturnType<typeof gsap.context> | undefined;
    const timeouts = new Set<number>();
    const startedAt = window.performance.now();
    const later = (callback: () => void, delay: number) => {
      const id = window.setTimeout(() => {
        timeouts.delete(id);
        callback();
      }, delay);
      timeouts.add(id);
    };
    const clearTimeouts = () => {
      timeouts.forEach((id) => window.clearTimeout(id));
      timeouts.clear();
    };

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => {
      if (preference.matches && (style !== 'envelope' || openingRef.current)) {
        complete();
      }
    };
    preference.addEventListener('change', onPreferenceChange);

    const beginLetter = () => {
      if (openingRef.current || finished.current) return;
      openingRef.current = true;
      setOpening(true);
      if (preference.matches) {
        complete();
        return;
      }
      later(complete, 1550);
    };
    openLetterRef.current = beginLetter;

    if (preference.matches) {
      if (style !== 'envelope') later(complete, 0);
    } else {
      const totalDuration = style === 'cinema' ? 2800 : 2400;
      if (style !== 'envelope') later(complete, totalDuration + 1000);

      void import('gsap').then(({ gsap }) => {
        if (disposed || finished.current) return;

        animation = gsap.context(() => {
          if (style === 'envelope') {
            if (openingRef.current) return;
            const timeline = gsap.timeline({ paused: true, onComplete: complete });
            timeline
              .to('[data-letter-card]', { y: -12, duration: 0.58, ease: 'power3.out' }, 0)
              .to(element, { opacity: 0, duration: 0.42, ease: 'power2.inOut' }, 0.68);
            element.dataset.motionDriver = 'gsap';
            openLetterRef.current = () => {
              if (openingRef.current || finished.current) return;
              openingRef.current = true;
              setOpening(true);
              if (preference.matches) {
                complete();
                return;
              }
              later(complete, 1550);
              timeline.play();
            };
          } else {
            const elapsed = window.performance.now() - startedAt;
            const delay = Math.max(0, (totalDuration - 420 - elapsed) / 1000);
            gsap.to(element, {
              opacity: 0,
              duration: 0.42,
              delay,
              ease: 'power2.inOut',
              onComplete: complete,
            });
          }
        }, element);
      }).catch(() => {
        // CSS entrance and the guarded completion timeout remain functional.
      });
    }

    return () => {
      disposed = true;
      clearTimeouts();
      preference.removeEventListener('change', onPreferenceChange);
      animation?.revert();
      openLetterRef.current = complete;
    };
  }, [visible, style, complete]);

  useEffect(() => {
    if (!visible || style !== 'cinema' || !connectToCover) return;
    const introPhoto = root.current?.querySelector<HTMLImageElement>('[data-intro-photo]');
    const cover = document.querySelector<HTMLImageElement>('[data-wedding-cover-photo]');
    if (introPhoto && cover) {
      introPhoto.style.objectPosition = window.getComputedStyle(cover).objectPosition;
    }
  }, [visible, style, connectToCover, imageUrl]);

  if (!resolved && style !== 'none') {
    return (
      <>
        <div
          className={[styles.backdrop, tokens.quietInvitation].join(' ')}
          data-wedding-intro-pending="true"
          data-wedding-intro-style={style}
          data-intro-style={style}
          aria-hidden="true"
        >
          <div className={styles.stage} data-style={style} />
        </div>
        <noscript>
          <style>{'[data-wedding-intro-pending="true"] { display: none !important; }'}</style>
        </noscript>
      </>
    );
  }
  if (!visible) return null;

  const names = <>{groomName} <span aria-hidden="true">·</span> {brideName}</>;
  const skipLabel = preview && !connectToCover ? '미리보기 닫기' : '건너뛰기';

  return createPortal(
    <div
      ref={root}
      className={[styles.backdrop, tokens.quietInvitation].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={preview ? '첫 화면 연출 미리보기' : '결혼식 초대장 인트로'}
      data-wedding-intro={style}
      data-wedding-intro-style={style}
      data-intro-style={style}
      data-theme={theme}
      data-intro-opening={opening ? 'true' : 'false'}
    >
      <div className={styles.stage} data-style={style}>
        {style === 'light' ? (
          <div className={styles.lightScene}>
            <div className={styles.lightContent} tabIndex={-1} data-dialog-initial-focus data-intro-copy>
              <div className={styles.rule} data-intro-rule aria-hidden="true" />
              <p className={styles.greeting} data-intro-lead>소중한 분께</p>
              <h1 className={styles.names} data-intro-names>{names}</h1>
              <p className={styles.message} data-intro-message>저희 두 사람의 새로운 시작에<br />소중한 분들을 초대합니다.</p>
              <p className={styles.date} data-intro-date>{date}</p>
            </div>
            <p className={styles.lightFooter} aria-hidden="true">INVITATION</p>
          </div>
        ) : null}

        {style === 'cinema' ? (
          <div className={styles.cinemaScene}>
            {imageUrl ? (
              <img
                key={imageUrl}
                className={styles.photo}
                data-intro-photo
                src={imageUrl}
                alt=""
                loading="eager"
                fetchPriority="high"
                onError={(event) => { event.currentTarget.hidden = true; }}
              />
            ) : null}
            <div className={styles.photoShade} aria-hidden="true" />
            <div className={styles.cinemaCopy} tabIndex={-1} data-dialog-initial-focus data-intro-copy>
              <p className={styles.cinemaOverline} data-intro-lead>WEDDING DAY</p>
              <h1 className={styles.cinemaNames} data-intro-names>{names}</h1>
              <p className={styles.cinemaDate} data-intro-date>{date}</p>
            </div>
          </div>
        ) : null}

        {style === 'envelope' ? (
          <div className={styles.envelopeScene}>
            <p className={styles.envelopeTitle} tabIndex={-1} data-dialog-initial-focus>당신께 전하는 작은 초대</p>
            <div className={styles.letterCard} data-letter-card>
              <div className={styles.letterRule} aria-hidden="true" />
              <p className={styles.letterEyebrow}>WEDDING INVITATION</p>
              <h1 className={styles.letterNames}>{names}</h1>
              <div className={styles.letterDivider} aria-hidden="true" />
              <p className={styles.letterDate}>{date}</p>
            </div>
            <button
              type="button"
              className={styles.openButton}
              data-letter-open
              disabled={opening}
              onClick={() => openLetterRef.current()}
            >
              {opening ? '초대장 여는 중' : '초대장 열기'}
            </button>
            <p className={styles.letterHint}>카드를 열면 청첩장 본문으로 이어집니다.</p>
          </div>
        ) : null}

        <button type="button" className={styles.skip} data-skip onClick={complete}>
          {skipLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
