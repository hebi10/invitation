'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { gsap } from 'gsap';
import comparison from './IntroComparison.module.css';
import styles from './SealedInvitationPreview.module.css';

type SealState = 'closed' | 'opening' | 'opened';

interface SealedInvitationPreviewProps {
  names: string;
  date: string;
  photoSrc: string;
}

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export default function SealedInvitationPreview({ names, date, photoSrc }: SealedInvitationPreviewProps) {
  const [state, setState] = useState<SealState>('closed');
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = stage.current;
    if (state !== 'opening' || !element) return;

    let active = true;
    let animation: ReturnType<typeof gsap.context> | undefined;
    const preference = window.matchMedia(reducedMotionQuery);
    const finish = () => {
      if (active) setState('opened');
    };
    const updatePreference = () => {
      if (preference.matches) finish();
    };
    const deadline = window.setTimeout(finish, 1600);
    preference.addEventListener('change', updatePreference);

    void import('gsap').then(({ gsap }) => {
      if (!active) return;
      if (preference.matches) {
        finish();
        return;
      }

      animation = gsap.context(() => {
        gsap.timeline({ onComplete: finish })
          .to('[data-seal-piece="left"]', { xPercent: -34, rotation: -16, autoAlpha: 0, duration: 0.27 }, 0)
          .to('[data-seal-piece="right"]', { xPercent: 34, rotation: 16, autoAlpha: 0, duration: 0.27 }, 0)
          .to('[data-seal-flap]', { rotationX: -164, duration: 0.43, ease: 'power2.inOut' }, 0.17)
          .set('[data-seal-flap]', { zIndex: 1 }, 0.39)
          .to('[data-seal-letter]', { yPercent: -60, duration: 0.56, ease: 'power3.out' }, 0.42);
      }, element);
    }).catch(finish);

    return () => {
      active = false;
      window.clearTimeout(deadline);
      preference.removeEventListener('change', updatePreference);
      animation?.revert();
    };
  }, [state]);

  function toggleInvitation() {
    if (state === 'opening') return;
    if (state === 'opened') {
      setState('closed');
      return;
    }

    setState(window.matchMedia(reducedMotionQuery).matches ? 'opened' : 'opening');
  }

  const action = state === 'closed' ? '초대장 열기' : state === 'opening' ? '초대장 여는 중' : '다시 보기';

  return (
    <div className={styles.preview} data-seal-state={state}>
      <div className={styles.stage} ref={stage} aria-hidden="true">
        <div className={styles.envelope}>
          <div className={styles.envelopeBack} />
          <div className={styles.letter} data-seal-letter>
            {state !== 'closed' && (
              <>
                <div className={styles.cover} data-seal-cover>
                  <Image src={photoSrc} alt="" fill sizes="(min-width: 960px) 250px, 64vw" />
                </div>
                <p className={styles.letterNames}>{names}</p>
              </>
            )}
          </div>
          <div className={styles.envelopeFront} />
          <div className={styles.flap} data-seal-flap />
          <div className={styles.seal}>
            <span className={styles.sealPiece} data-seal-piece="left" />
            <span className={styles.sealPiece} data-seal-piece="right" />
          </div>
        </div>
      </div>
      <div className={comparison.details}>
        <p className={comparison.names}>{names}</p>
        <p className={comparison.date}>{date}</p>
      </div>
      <button type="button" className={comparison.action} aria-disabled={state === 'opening'} onClick={toggleInvitation}>
        {action}
      </button>
    </div>
  );
}
