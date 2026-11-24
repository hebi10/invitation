'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import BouquetRibbonPreview from './BouquetRibbonPreview';
import PhotoDevelopmentPreview from './PhotoDevelopmentPreview';
import SealedInvitationPreview from './SealedInvitationPreview';
import styles from './AutomaticIntro.module.css';

export type IntroVariant = 'bouquet' | 'seal' | 'portrait';

interface Props {
  variant: IntroVariant;
  names: string;
  date: string;
  photoSrc: string;
  children: ReactNode;
  presentation?: 'comparison' | 'page';
}

const introDuration = 2480;
const visibleArea = 0.55;

export default function AutomaticIntro({ variant, names, date, photoSrc, children, presentation = 'comparison' }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'waiting' | 'playing' | 'cover'>('waiting');

  useEffect(() => {
    const element = root.current;
    if (!element) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    let timeout: number | undefined;

    const showCover = () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
      setPhase('cover');
    };

    const start = () => {
      if (motion.matches) {
        showCover();
        return;
      }
      observer?.disconnect();
      setPhase('playing');
      timeout = window.setTimeout(showCover, introDuration);
    };

    const preferenceChanged = () => {
      if (motion.matches) showCover();
    };

    motion.addEventListener('change', preferenceChanged);
    if (presentation === 'page' || !('IntersectionObserver' in window)) {
      start();
    } else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.intersectionRatio >= visibleArea)) start();
      }, { threshold: visibleArea });
      observer.observe(element);
    }

    return () => {
      observer?.disconnect();
      window.clearTimeout(timeout);
      motion.removeEventListener('change', preferenceChanged);
    };
  }, [presentation]);

  return (
    <div ref={root} className={styles.sequence} data-intro-sequence={variant} data-intro-phase={phase}>
      {children}
      {phase === 'playing' ? (
        <div
          aria-hidden="true"
          className={presentation === 'page' ? `${styles.opening} ${styles.pageOpening}` : styles.opening}
          style={{ '--opening-duration': `${introDuration}ms` } as CSSProperties}
          data-intro-overlay
        >
          <div className={styles.artwork}>
            {variant === 'bouquet' && <BouquetRibbonPreview />}
            {variant === 'seal' && <SealedInvitationPreview names={names} date={date} photoSrc={photoSrc} />}
            {variant === 'portrait' && <PhotoDevelopmentPreview photoSrc={photoSrc} />}
          </div>
          {presentation === 'page' ? (
            <div className={styles.details}>
              <p>{names}</p>
              <p>{date}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
