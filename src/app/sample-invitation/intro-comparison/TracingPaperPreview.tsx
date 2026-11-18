'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type UIEvent } from 'react';
import comparison from './IntroComparison.module.css';
import styles from './TracingPaperPreview.module.css';

interface Props {
  names: string;
  date: string;
  photoSrc: string;
}

export default function TracingPaperPreview({ names, date, photoSrc }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => () => {
    if (scrollFrame.current === null) return;
    window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
  }, []);

  function movePaper(event: UIEvent<HTMLDivElement>) {
    if (scrollFrame.current !== null) return;

    const scroller = event.currentTarget;
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = null;
      const distance = scroller.scrollHeight - scroller.clientHeight;
      const progress = distance > 0 ? Math.min(Math.max(scroller.scrollTop / distance, 0), 1) : 0;

      scroller.style.setProperty('--tracing-progress', String(progress));
      setRevealed(progress >= 0.98);
    });
  }

  function togglePaper() {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = revealed ? 0 : scroller.scrollHeight - scroller.clientHeight;
  }

  return (
    <>
      <div
        ref={scrollRef}
        className={styles.scroller}
        role="region"
        aria-label="트레이싱지 표지"
        aria-describedby="tracing-scroll-hint"
        tabIndex={0}
        onScroll={movePaper}
        data-tracing-scroll
      >
        <div className={styles.track}>
          <div className={styles.stage}>
            {photoFailed || !photoSrc ? (
              <p className={styles.photoFallback}>사진을 불러올 수 없습니다.</p>
            ) : (
              <Image
                className={styles.photo}
                src={photoSrc}
                alt={`${names} 대표 사진`}
                fill
                sizes="(min-width: 960px) 32vw, (min-width: 520px) 440px, 92vw"
                loading="eager"
                onError={() => setPhotoFailed(true)}
                data-tracing-photo
              />
            )}
            <div className={styles.paper} aria-hidden="true" data-tracing-paper>
              <span className={styles.paperNames}>{names}</span>
              <span className={styles.paperDate}>{date}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={comparison.details}>
        <p className={comparison.names}>{names}</p>
        <p className={comparison.date}>{date}</p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={comparison.action} onClick={togglePaper}>
          {revealed ? '다시 보기' : '사진 바로 보기'}
        </button>
        <p id="tracing-scroll-hint" className={styles.hint}>사진 위에서 아래로 스크롤</p>
      </div>
    </>
  );
}
