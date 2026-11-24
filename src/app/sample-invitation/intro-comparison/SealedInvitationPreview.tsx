'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import type { gsap } from 'gsap';
import styles from './SealedInvitationPreview.module.css';

interface SealedInvitationPreviewProps {
  names: string;
  date: string;
  photoSrc: string;
}

const closedEnvelope = '/images/wedding-intro/seal-closed.webp';
const openEnvelope = '/images/wedding-intro/seal-open.webp';
const sceneSizes = '(max-width: 520px) 100vw, 520px';

export default function SealedInvitationPreview({ names, date, photoSrc }: SealedInvitationPreviewProps) {
  const stage = useRef<HTMLDivElement>(null);
  const open = useRef<HTMLDivElement>(null);
  const pocket = useRef<HTMLDivElement>(null);
  const letter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = stage.current;
    const openLayer = open.current;
    const frontLayer = pocket.current;
    const letterLayer = letter.current;
    if (!element || !openLayer || !frontLayer || !letterLayer) return;

    let active = true;
    let animation: ReturnType<typeof gsap.context> | undefined;
    const startedAt = performance.now();

    void import('gsap').then(({ gsap: animationLibrary }) => {
      if (!active) return;
      animation = animationLibrary.context(() => {
        const timeline = animationLibrary.timeline({ paused: true });
        timeline
          .to(openLayer, { opacity: 1, duration: 0.45, ease: 'sine.inOut' }, 0.22)
          .set(frontLayer, { opacity: 1 }, 0.67)
          .set(letterLayer, { autoAlpha: 1, yPercent: 90 }, 0.67)
          .to(letterLayer, { yPercent: 0, duration: 0.76, ease: 'power3.out' }, 0.67);
        timeline.play(Math.min((performance.now() - startedAt) / 1000, timeline.duration()));
      }, element);
    }).catch(() => {
      // The closed image remains in place until the shared transition reveals the cover.
    });

    return () => {
      active = false;
      animation?.revert();
    };
  }, []);

  return (
    <div className={styles.stage} ref={stage} data-seal-scene>
      <div className={styles.artboard}>
        <Image className={styles.image} src={closedEnvelope} alt="" fill sizes={sceneSizes} unoptimized loading="eager" data-seal-art="closed" />
        <div className={styles.open} ref={open}>
          <Image className={styles.image} src={openEnvelope} alt="" fill sizes={sceneSizes} unoptimized loading="eager" data-seal-art="open" />
        </div>
        <div className={styles.slot}>
          <div className={styles.letter} ref={letter}>
            <div className={styles.photo} data-seal-cover>
              <Image src={photoSrc} alt="" fill sizes="(max-width: 520px) 52vw, 270px" loading="eager" />
            </div>
            <p className={styles.names}>{names}</p>
            <p className={styles.date}>{date}</p>
          </div>
        </div>
        <div className={styles.pocket} ref={pocket}>
          <Image className={styles.image} src={openEnvelope} alt="" fill sizes={sceneSizes} unoptimized loading="eager" />
        </div>
      </div>
    </div>
  );
}
