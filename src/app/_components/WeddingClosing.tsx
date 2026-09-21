import React from 'react';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import type { InvitationPage } from '@/types/invitationPage';

import styles from './WeddingClosing.module.css';

export interface WeddingClosingProps {
  groomName: string;
  brideName: string;
  theme: InvitationThemeKey;
  className?: string;
  weddingDateTime?: InvitationPage['weddingDateTime'];
  imageUrl?: string;
}

export function WeddingClosing({
  groomName,
  brideName,
  theme,
  className,
  weddingDateTime,
  imageUrl,
}: WeddingClosingProps) {
  const closingClassName = [styles.closing, className].filter(Boolean).join(' ');

  return (
    <footer
      className={closingClassName}
      data-wedding-closing
      data-theme={theme}
      aria-label={`${groomName}과 ${brideName}의 결혼식 초대 마무리`}
    >
      {theme === 'simple' ? (
        <>
          <p className={styles.simpleNames}>{groomName} · {brideName}</p>
          <p className={styles.simpleThanks}>귀한 걸음과 따뜻한 마음에 감사드립니다</p>
          {weddingDateTime ? <p className={styles.simpleDate}>{weddingDateTime.year}. {String(weddingDateTime.month + 1).padStart(2, '0')}. {String(weddingDateTime.day).padStart(2, '0')}</p> : null}
        </>
      ) : theme === 'classic-r' ? (
        <>
          <p className={styles.modernEyebrow}>OUR WEDDING DAY</p>
          <p className={styles.modernNames}>{groomName}<br />{brideName}</p>
          {weddingDateTime ? <p className={styles.modernDate}>{weddingDateTime.year}. {String(weddingDateTime.month + 1).padStart(2, '0')}. {String(weddingDateTime.day).padStart(2, '0')}</p> : null}
          <p className={styles.modernThanks}>THANK YOU</p>
          <p className={styles.modernMessage}>귀한 걸음과 따뜻한 마음에 감사드립니다</p>
        </>
      ) : theme === 'romantic' ? (
        <>
          {imageUrl ? <img className={styles.photoFinalImage} src={imageUrl} alt={`${groomName} · ${brideName}의 웨딩 사진`} loading="lazy" decoding="async" /> : null}
          <div className={styles.photoFinalCopy}>
            <p className={styles.photoFinalPhrase}>Always together</p>
            <p className={styles.photoFinalNames}>{groomName} · {brideName}</p>
            <p className={styles.photoFinalThanks}>귀한 걸음과 따뜻한 마음에<br />감사드립니다</p>
            {weddingDateTime ? <p className={styles.photoFinalDate}>{weddingDateTime.year}. {String(weddingDateTime.month + 1).padStart(2, '0')}. {String(weddingDateTime.day).padStart(2, '0')}</p> : null}
          </div>
        </>
      ) : theme === 'gyeol' ? (
        <>
          <div className={styles.classicMonogram} aria-hidden="true">
            {[groomName, brideName].map((name) => Array.from(name.trim())[0]).filter(Boolean).join(' · ')}
          </div>
          <p className={styles.classicNames}>{groomName} · {brideName}</p>
          <p className={styles.classicThanks}>귀한 걸음과 따뜻한 마음에<br />감사드립니다</p>
          {weddingDateTime ? <p className={styles.classicDate}>{weddingDateTime.year}. {String(weddingDateTime.month + 1).padStart(2, '0')}. {String(weddingDateTime.day).padStart(2, '0')}</p> : null}
        </>
      ) : (<>
      <p>{groomName} · {brideName}</p>
      <span aria-hidden="true" />
      <p>귀한 걸음과 따뜻한 마음에 감사드립니다</p>
      </>)}
    </footer>
  );
}
