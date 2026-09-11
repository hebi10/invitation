'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { gsap } from 'gsap';
import { useDialogLayer } from '@/hooks/useDialogLayer';
import { shouldShowWeddingIntro, weddingIntroSessionKey, type WeddingIntroStyle } from '@/lib/weddingIntro';
import styles from './WeddingIntro.module.css';

type Props = {
  style: WeddingIntroStyle; slug: string; groomName: string; brideName: string;
  date: string; imageUrl: string; theme?: string; preview?: boolean; onComplete?: () => void;
};

export default function WeddingIntro({ style, slug, groomName, brideName, date, imageUrl, theme = 'simple', preview = false, onComplete }: Props) {
  const [visible, setVisible] = useState(false);
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
            const openingTimeline = gsap.timeline({ paused: true, onComplete: complete });
            openingTimeline
              .to(select('[data-seal]'), { scale: 1.12, opacity: 0, duration: .3 })
              .to(select('[data-flap]'), { rotateX: -180, duration: .6, ease: 'power2.inOut' }, .15)
              .to(select('[data-letter]'), { yPercent: -48, duration: .8, ease: 'power3.out' }, .55)
              .to(select('[data-envelope-front]'), { y: 35, opacity: 0, duration: .65 }, .85)
              .to(element, { opacity: 0, duration: .5 }, 1.55);
            openEnvelopeRef.current = () => { setOpening(true); openingTimeline.play(); };
          } else {
            const timeline = gsap.timeline({ onComplete: complete });
            if (style === 'cinema') {
              const photo = element.querySelector<HTMLImageElement>('[data-photo]');
              const cover = preview ? null : document.querySelector<HTMLImageElement>('[data-wedding-cover-photo]');
              const destination = cover?.getBoundingClientRect();
              const stage = element.querySelector<HTMLElement>('[data-style="cinema"]');
              const origin = stage?.getBoundingClientRect();
              const canConnect = photo && cover && destination && origin && cover.complete && cover.naturalWidth > 0
                && destination.width > 0 && destination.height > 0 && destination.top < window.innerHeight && destination.bottom > 0;
              timeline
                .to(select('[data-shutter="top"]'), { yPercent: -100, duration: .85, ease: 'power3.inOut' }, 0)
                .to(select('[data-shutter="bottom"]'), { yPercent: 100, duration: .85, ease: 'power3.inOut' }, 0)
                .fromTo(select('[data-copy]'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .16, ease: 'power2.out' }, .5)
                .to(select('[data-copy]'), { y: -8, opacity: 0, duration: .4 }, 2.7);
              if (canConnect) {
                // Keep the real image in layout; GSAP restores its visibility on completion/skip.
                gsap.set(cover, { visibility: 'hidden' });
                gsap.set(stage, { overflow: 'visible' });
                gsap.set(photo, { position: 'fixed', left: origin.left, top: origin.top, width: origin.width, height: origin.height, objectPosition: getComputedStyle(cover).objectPosition });
                timeline
                  .to(element, { backgroundColor: 'rgba(30, 33, 31, 0)', duration: .8 }, 2.9)
                  .to(stage, { backgroundColor: 'rgba(38, 39, 35, 0)', duration: .8 }, 2.9)
                  .to(select('[data-photo-shade]'), { opacity: 0, duration: .8 }, 2.9)
                  .to(photo, { left: destination.left, top: destination.top, width: destination.width, height: destination.height, duration: 1.1, ease: 'power3.inOut' }, 2.9)
                  .to(select('[data-skip]'), { opacity: 0, duration: .25 }, 3.65);
              } else {
                // Standalone editor previews have no full-size cover to land on.
                if (photo) timeline.fromTo(photo, { scale: 1.06 }, { scale: 1, duration: 3.2, ease: 'power2.out' }, 0);
                timeline.to(element, { opacity: 0, duration: .6 }, 3.1);
              }
            } else {
              timeline.fromTo(select('[data-glow]'), { xPercent: -160, opacity: 0 }, { xPercent: 160, opacity: .8, duration: 2.1, ease: 'power1.inOut' }, 0)
                .fromTo(select('[data-spark]'), { opacity: 0, scale: .2, y: 12 }, { opacity: .7, scale: 1, y: -12, duration: 1, stagger: .045, yoyo: true, repeat: 1 }, 0);
              timeline.fromTo(select('[data-copy]'), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .14, ease: 'power2.out' }, .45)
              .to(element, { opacity: 0, duration: .45 }, 2.45);
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
  }, [visible, style, preview, complete]);

  if (!visible) return null;
  const names = <>{groomName}<span aria-hidden="true"> · </span>{brideName}</>;
  return createPortal(
    <div ref={root} className={styles.backdrop} role="dialog" aria-modal="true" aria-label={preview ? '첫 화면 연출 미리보기' : '결혼식 초대장 인트로'} data-wedding-intro={style} data-theme={theme}>
      <div className={styles.stage} data-style={style}>
        {style === 'cinema' ? <>
          {imageUrl ? <img className={styles.photo} data-photo src={imageUrl} alt="" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /> : null}
          <div className={styles.photoShade} data-photo-shade />
          <div className={styles.shutter} data-shutter="top" />
          <div className={styles.shutter} data-shutter="bottom" />
        </> : null}
        {style === 'light' ? <div className={styles.lights} aria-hidden="true">
          <div className={styles.glow} data-glow />
          {Array.from({ length: 18 }, (_, i) => <i key={i} data-spark style={{ '--x': `${8 + (i * 37) % 84}%`, '--y': `${12 + (i * 23) % 76}%`, '--size': `${2 + i % 3}px` } as CSSProperties} />)}
        </div> : null}
        {style === 'envelope' ? <div className={styles.envelopeScene}>
          <p className={styles.eyebrow}>A LETTER FOR YOU</p>
          <p className={styles.invite}>{groomName} · {brideName}의 초대장</p>
          <div className={styles.envelope} data-envelope>
            <div className={styles.letter} data-letter>
              <span className={styles.eyebrow}>WEDDING INVITATION</span>
              <h1 className={styles.names}>{names}</h1><p>{date}</p>
            </div>
            <div className={styles.envelopeFront} data-envelope-front />
            <div className={styles.flap} data-flap />
            <button className={styles.seal} data-seal data-dialog-initial-focus aria-label="봉인을 눌러 초대장 열기" disabled={opening} onClick={() => openEnvelopeRef.current()}>
              <img src="/images/wedding-intro/gold-seal.webp" alt="" width={88} height={88} />
            </button>
          </div>
          <p className={styles.envelopeHint}>{opening ? '초대장을 펼치고 있어요' : '금빛 봉인을 눌러 열어 주세요'}</p>
        </div> : <div className={styles.copy} tabIndex={-1} data-dialog-initial-focus>
          <p className={styles.eyebrow} data-copy>OUR WEDDING DAY</p>
          <h1 className={styles.names} data-copy>{names}</h1>
          {style !== 'cinema' ? <p className={styles.message} data-copy>우리의 가장 아름다운 시작에<br />함께해 주세요</p> : null}
          <p className={styles.date} data-copy>{date}</p>
        </div>}
        <button className={styles.skip} data-skip onClick={complete}>{preview ? '미리보기 닫기' : '건너뛰기'}</button>
      </div>
    </div>, document.body,
  );
}
