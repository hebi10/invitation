'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { gsap } from 'gsap';
import { useDialogLayer } from '@/hooks/useDialogLayer';
import { shouldShowWeddingIntro, weddingIntroSessionKey, type WeddingIntroStyle } from '@/lib/weddingIntro';
import styles from './WeddingIntro.module.css';

type Props = {
  style: WeddingIntroStyle; slug: string; groomName: string; brideName: string;
  date: string; imageUrl: string; theme?: string; preview?: boolean; connectToCover?: boolean; onComplete?: () => void;
};

export default function WeddingIntro({ style, slug, groomName, brideName, date, imageUrl, theme = 'simple', preview = false, connectToCover = !preview, onComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [opening, setOpening] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;
  const openEnvelopeRef = useRef<() => void>(() => {});
  const finished = useRef(false);
  const complete = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setVisible(false);
    if (!preview) {
      try { sessionStorage.setItem(weddingIntroSessionKey(slug), 'seen'); } catch { /* Storage is optional. */ }
    }
    completeRef.current?.();
  }, [slug, preview]);

  useLayoutEffect(() => {
    finished.current = false;
    setOpening(false);
    let seen = false;
    try { seen = sessionStorage.getItem(weddingIntroSessionKey(slug)) === 'seen'; } catch { /* Private mode can deny storage. */ }
    setResolved(true);
    if (shouldShowWeddingIntro({ style, preview, hash: window.location.hash, seen })) setVisible(true);
    else { setVisible(false); completeRef.current?.(); }
  }, [style, slug, preview]);

  useDialogLayer(root, { open: visible, onClose: complete });

  useEffect(() => {
    if (!visible || !root.current) return;
    const element = root.current;
    let disposed = false;
    let context: ReturnType<typeof gsap.context> | undefined;
    let fallback = window.setTimeout(complete, 5000);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => { if (preference.matches) complete(); };
    preference.addEventListener('change', onPreferenceChange);
    // A changed viewport invalidates the measured destination; reveal the cover safely.
    window.addEventListener('resize', complete);
    // A tap before the animation module is ready still opens the invitation.
    openEnvelopeRef.current = complete;

    if (preference.matches) {
      window.clearTimeout(fallback);
      if (style !== 'envelope') fallback = window.setTimeout(complete, 300);
    } else {
      void import('gsap').then(({ gsap }) => {
        if (disposed) return;
        context = gsap.context(() => {
          const select = gsap.utils.selector(element);
          if (style === 'envelope') {
            window.clearTimeout(fallback);
            gsap.fromTo(select('[data-envelope]'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .75, ease: 'power3.out' });
            const openingTimeline = gsap.timeline({ paused: true });
            openingTimeline
              .to(select('[data-seal]'), { scale: 1.04, opacity: 0, duration: .3 })
              .to(select('[data-envelope-title]'), { opacity: 0, duration: .3 }, .2)
              .to(select('[data-flap]'), { rotateX: -180, duration: .6, ease: 'power2.inOut' }, .15)
              .to(select('[data-letter]'), { yPercent: -38, duration: .9, ease: 'power3.out' }, .65)
              .to(select('[data-envelope-front]'), { y: 18, opacity: 0, duration: .65 }, 1)
              .call(() => context?.add(() => {
                const cover = connectToCover ? document.querySelector<HTMLImageElement>('[data-wedding-cover-photo]') : null;
                const card = element.querySelector<HTMLImageElement>('[data-letter-photo]');
                const flight = element.querySelector<HTMLImageElement>('[data-card-flight]');
                const origin = card?.getBoundingClientRect();
                const destination = cover?.getBoundingClientRect();
                const landing = gsap.timeline({ onComplete: complete });
                if (cover?.complete && cover.naturalWidth > 0 && flight && origin && destination && destination.width > 0 && origin.width > 0) {
                  gsap.set(cover, { visibility: 'hidden' });
                  gsap.set(card, { visibility: 'hidden' });
                  gsap.set(flight, { left: origin.left, top: origin.top, width: origin.width, height: origin.height, opacity: 1, objectPosition: getComputedStyle(cover).objectPosition });
                  landing
                    .to(select('[data-envelope-scene]'), { opacity: 0, duration: .45 }, 0)
                    .to([element, ...select('[data-style="envelope"]')], { backgroundColor: 'rgba(243, 238, 229, 0)', duration: .8 }, .1)
                    .to(flight, { left: destination.left, top: destination.top, width: destination.width, height: destination.height, duration: 1.1, ease: 'power3.inOut' }, 0)
                    .to(select('[data-skip]'), { opacity: 0, duration: .25 }, .75);
                } else landing.to(element, { opacity: 0, duration: .6 });
              }), [], 1.85);
            openEnvelopeRef.current = () => {
              setOpening(true);
              fallback = window.setTimeout(complete, 5000);
              openingTimeline.play();
            };
          } else {
            const timeline = gsap.timeline({ onComplete: complete });
            if (style === 'cinema') {
              const photo = element.querySelector<HTMLImageElement>('[data-photo]');
              const stage = element.querySelector<HTMLElement>('[data-style="cinema"]');
              timeline.eventCallback('onComplete', null);
              timeline
                .to(select('[data-shutter="top"]'), { yPercent: -100, duration: .85, ease: 'power3.inOut' }, 0)
                .to(select('[data-shutter="bottom"]'), { yPercent: 100, duration: .85, ease: 'power3.inOut' }, 0)
                .fromTo(select('[data-copy]'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .16, ease: 'power2.out' }, .5)
                .to(select('[data-copy]'), { y: -8, opacity: 0, duration: .4 }, 2.7);
              // The iframe's cover may still be loading at the start. Resolve its
              // current geometry at the handoff, after the name-reading interval.
              timeline.call(() => context?.add(() => {
                const cover = connectToCover ? document.querySelector<HTMLImageElement>('[data-wedding-cover-photo]') : null;
                const destination = cover?.getBoundingClientRect();
                const origin = stage?.getBoundingClientRect();
                const canConnect = photo && cover && destination && origin && cover.complete && cover.naturalWidth > 0
                  && destination.width > 0 && destination.height > 0;
                const landing = gsap.timeline({ onComplete: complete });
                if (canConnect) {
                  // Keep the real image in layout; GSAP restores its visibility on completion/skip.
                  gsap.set(cover, { visibility: 'hidden' });
                  gsap.set(stage, { overflow: 'visible' });
                  gsap.set(photo, { position: 'fixed', left: origin.left, top: origin.top, width: origin.width, height: origin.height, objectPosition: getComputedStyle(cover).objectPosition });
                  landing
                    .to(element, { backgroundColor: 'rgba(30, 33, 31, 0)', duration: .8 }, 0)
                    .to(stage, { backgroundColor: 'rgba(38, 39, 35, 0)', duration: .8 }, 0)
                    .to(select('[data-photo-shade]'), { opacity: 0, duration: .8 }, 0)
                    .to(photo, { left: destination.left, top: destination.top, width: destination.width, height: destination.height, duration: 1.1, ease: 'power3.inOut' }, 0)
                    .to(select('[data-skip]'), { opacity: 0, duration: .25 }, .75);
                } else {
                  landing.to(element, { opacity: 0, duration: .6 });
                }
              }), [], 2.9);
            } else {
              timeline
                .fromTo(select('[data-glow]'), { xPercent: -130, opacity: 0 }, { xPercent: 130, opacity: 1, duration: 2.8, ease: 'power1.inOut' }, 0)
                .fromTo(select('[data-copy]'), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .16, ease: 'power2.out' }, .2)
                .to(select('[data-copy]'), { opacity: 0, y: -6, duration: .45 }, 2.05)
                .to(select('[data-skip]'), { opacity: 0, duration: .3 }, 2.2)
                .to(element, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1.05, ease: 'power3.inOut' }, 2.25);
            }
          }
        }, element);
      }).catch(() => { if (!disposed) complete(); });
    }
    return () => {
      disposed = true;
      window.clearTimeout(fallback);
      preference.removeEventListener('change', onPreferenceChange);
      window.removeEventListener('resize', complete);
      context?.revert();
      openEnvelopeRef.current = complete;
    };
  }, [visible, style, connectToCover, complete]);

  // Portals cannot render on the server. Cover the first HTML paint inline until
  // the layout effect can decide whether to show the intro or reveal the page.
  if (!resolved && style !== 'none') return <>
    <div className={styles.backdrop} data-wedding-intro-pending="true" data-wedding-intro-style={style} aria-hidden="true">
      <div className={styles.stage} data-style={style} />
    </div>
    <noscript><style>{'[data-wedding-intro-pending="true"] { display: none !important; }'}</style></noscript>
  </>;
  if (!visible) return null;
  const names = <>{groomName}<span aria-hidden="true"> · </span>{brideName}</>;
  return createPortal(
    <div ref={root} className={styles.backdrop} role="dialog" aria-modal="true" aria-label={preview ? '첫 화면 연출 미리보기' : '결혼식 초대장 인트로'} data-wedding-intro={style} data-wedding-intro-style={style} data-theme={theme}>
      <div className={styles.stage} data-style={style}>
        {style === 'cinema' ? <>
          {imageUrl ? <img className={styles.photo} data-photo src={imageUrl} alt="" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /> : null}
          <div className={styles.photoShade} data-photo-shade />
          <div className={styles.shutter} data-shutter="top" />
          <div className={styles.shutter} data-shutter="bottom" />
        </> : null}
        {style === 'light' ? <div className={styles.lights} aria-hidden="true">
          <div className={styles.glow} data-glow />
        </div> : null}
        {style === 'envelope' ? <div className={styles.envelopeScene} data-envelope-scene>
          <p className={styles.invite} tabIndex={-1} data-dialog-initial-focus data-envelope-title>당신께 도착한 초대장</p>
          <div className={styles.envelope} data-envelope>
            <div className={styles.letter} data-letter>
              {imageUrl ? <img className={styles.letterPhoto} data-letter-photo src={imageUrl} alt="" /> : null}
              <h1 className={styles.names}>{names}</h1><p>{date}</p>
            </div>
            <div className={styles.envelopeFront} data-envelope-front />
            <div className={styles.address} data-envelope-front><span>소중한 당신께</span><span>{groomName} · {brideName} 드림</span></div>
            <div className={styles.flap} data-flap />
            <button className={styles.seal} data-seal aria-label="봉인을 눌러 초대장 열기" disabled={opening} onClick={() => openEnvelopeRef.current()}>
              <img src="/images/wedding-intro/gold-seal.webp" alt="" width={88} height={88} />
            </button>
          </div>
          <p className={styles.envelopeHint}>{opening ? '초대장을 펼치고 있어요' : '금빛 봉인을 눌러 열어 주세요'}</p>
        </div> : <div className={styles.copy} tabIndex={-1} data-dialog-initial-focus>
          {style === 'cinema' ? <p className={styles.eyebrow} data-copy>OUR WEDDING DAY</p> : <p className={styles.lightGreeting} data-copy>소중한 당신께</p>}
          <h1 className={styles.names} data-copy>{names}</h1>
          {style !== 'cinema' ? <p className={styles.message} data-copy>서로의 빛이 되어<br />함께 걸어가려 합니다.</p> : null}
          <p className={styles.date} data-copy>{date}</p>
        </div>}
        {style === 'envelope' && imageUrl ? <img className={styles.cardFlight} data-card-flight src={imageUrl} alt="" /> : null}
        <button className={styles.skip} data-skip onClick={complete}>{preview && !connectToCover ? '미리보기 닫기' : '건너뛰기'}</button>
      </div>
    </div>, document.body,
  );
}
