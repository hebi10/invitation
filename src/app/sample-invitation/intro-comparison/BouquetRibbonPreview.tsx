'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './IntroComparison.module.css';

const poster = '/images/wedding-intro/bouquet-ribbon.webp';
const animation = '/images/wedding-intro/bouquet-ribbon.gif';
const motionPreference = '(prefers-reduced-motion: reduce)';
const playbackDuration = 2000;

export default function BouquetRibbonPreview({ names, date }: { names: string; date: string }) {
  const plays = useRef(0);
  const timer = useRef<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    const motion = window.matchMedia(motionPreference);
    const stopIfReduced = () => {
      if (motion.matches) {
        window.clearTimeout(timer.current ?? undefined);
        setPlaying(null);
      }
    };
    motion.addEventListener('change', stopIfReduced);
    return () => {
      motion.removeEventListener('change', stopIfReduced);
      window.clearTimeout(timer.current ?? undefined);
    };
  }, []);

  function showPoster() {
    window.clearTimeout(timer.current ?? undefined);
    timer.current = null;
    setPlaying(null);
  }

  function play() {
    if (playing !== null || window.matchMedia(motionPreference).matches) return;
    plays.current += 1;
    setPlaying(plays.current);
    timer.current = window.setTimeout(showPoster, 8000);
  }

  function handleLoad() {
    if (playing === null) return;
    window.clearTimeout(timer.current ?? undefined);
    timer.current = window.setTimeout(showPoster, playbackDuration);
  }

  const src = playing === null ? poster : `${animation}?play=${playing}`;

  return (
    <>
      <div className={styles.bouquetArt}>
        <Image
          key={src}
          data-bouquet-art
          src={src}
          alt="샴페인색 실크 리본을 두른 아이보리 웨딩 부케"
          width={336}
          height={336}
          unoptimized
          onLoad={handleLoad}
          onError={playing === null ? undefined : showPoster}
        />
      </div>
      <div className={styles.details}>
        <p className={styles.names}>{names}</p>
        <p className={styles.date}>{date}</p>
      </div>
      <button type="button" className={`${styles.action} ${styles.bouquetControl}`} onClick={play} aria-disabled={playing !== null}>
        {playing === null ? '연출 보기' : '재생 중'}
      </button>
      <p className={styles.stillMessage}>동작 줄이기 설정으로 정지 화면을 표시합니다.</p>
    </>
  );
}
