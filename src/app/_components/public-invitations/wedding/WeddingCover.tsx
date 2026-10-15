'use client';

import { useState, type ReactNode } from 'react';
import type { InvitationPage } from '@/types/invitationPage';
import type { InvitationThemeKey } from '@/lib/invitationThemes';
import { normalizeWeddingCoverSettings, resolveWeddingCoverTextPosition, type WeddingCoverSettings } from '@/lib/weddingCover';
import styles from './WeddingCover.module.css';
import './WeddingFonts.css';
import VowCover from './vow/VowCover';

interface Props {
  theme: InvitationThemeKey;
  page: InvitationPage;
  imageUrl: string;
  time?: string;
  titleId?: string;
  settings?: WeddingCoverSettings;
}

export default function WeddingCover({ theme, page, imageUrl, time, titleId = 'wedding-cover-title', settings }: Props) {
  const [imageState, setImageState] = useState({ url: imageUrl, failed: false });
  if (imageState.url !== imageUrl) {
    setImageState({ url: imageUrl, failed: false });
  }
  const hasPhoto = Boolean(imageUrl && !(imageState.url === imageUrl && imageState.failed));
  const cover = normalizeWeddingCoverSettings(settings ?? page.pageData?.weddingCover);
  const position = hasPhoto ? resolveWeddingCoverTextPosition(theme, cover.textPosition) : 'below';
  const overlay = position !== 'below';
  const names = <><span>{page.groomName}</span><span aria-hidden="true" className={styles.join}>·</span><span>{page.brideName}</span></>;
  const date = <p className={styles.date} data-wedding-motion="copy"><span>{page.date}</span>{time ? <span>{time}</span> : null}</p>;
  const heading = (className = styles.names, children: ReactNode = names) => (
    <h1 data-wedding-motion="copy" id={titleId} className={className}>{children}</h1>
  );
  const photo = hasPhoto ? (
    <div className={styles.photoFrame} data-wedding-cover-frame>
      <img src={imageUrl} alt={`${page.displayName} 대표 사진`} className={styles.photo}
        style={{ objectPosition: `${cover.focusX}% ${cover.focusY}%` }}
        data-wedding-cover-photo loading="eager" decoding="async"
        onError={() => setImageState({ url: imageUrl, failed: true })} />
      {overlay ? <div className={styles.photoCopy}>
        {heading(theme === 'classic-r' ? styles.editorialNames : styles.names,
          <><span>{page.groomName}</span><span aria-hidden="true" className={styles.join}>{theme === 'romantic' ? '&' : theme === 'vow' ? '그리고' : '·'}</span><span>{page.brideName}</span></>)}
      </div> : null}
    </div>
  ) : null;

  if (theme === 'vow') return (
    <section className={`${styles.cover} ${styles.vow}`} data-cover-position={position} aria-labelledby={titleId}>
      {photo}
      <div data-wedding-cover-details><VowCover page={page} time={time} titleId={titleId} showNames={!overlay} /></div>
    </section>
  );
  if (theme === 'romantic') return (
    <section className={`${styles.cover} ${styles.photographic}`} data-cover-position={position} aria-labelledby={titleId}>
      {photo}
      <div className={styles.details} data-wedding-cover-details>
        {!overlay ? heading(styles.names, <>
          <span>{page.groomName}</span><span aria-hidden="true" className={styles.join}>&amp;</span><span>{page.brideName}</span>
        </>) : null}
        <div className={styles.photoMeta}>{date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p></div>
      </div>
    </section>
  );

  if (theme === 'emotional') return (
    <section className={`${styles.cover} ${styles.letter}`} data-cover-position={position} aria-labelledby={titleId}>
      {photo}
      <div className={styles.details} data-wedding-cover-details>
        <p className={styles.conceptIntroduction} data-wedding-motion="copy">평생을 함께하고 싶은<br />사람을 만났습니다.</p>
        <div className={styles.letterHeading}>
          {!overlay ? heading(styles.names, <>
            <span>{page.groomName}</span><span>{page.brideName}</span>
          </>) : null}
          <div className={styles.letterSprig} aria-hidden="true" />
        </div>
        <div className={styles.letterMeta}>
          {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
        </div>
      </div>
    </section>
  );

  if (theme === 'classic-r') return (
    <section className={`${styles.cover} ${styles.editorial}`} data-cover-position={position} aria-labelledby={titleId}>
      {photo}
      <div className={styles.details} data-wedding-cover-details>
        <p className={styles.editorialHeading}>WEDDING INVITATION</p>
        {!overlay ? heading(styles.editorialNames, <>
          <span>{page.groomName}</span><span>{page.brideName}</span>
        </>) : null}
        <div className={styles.editorialMeta}>
          <p className={styles.date} data-wedding-motion="copy">
            <span>{page.weddingDateTime.year}.{String(page.weddingDateTime.month + 1).padStart(2, '0')}.{String(page.weddingDateTime.day).padStart(2, '0')} {new Date(Date.UTC(page.weddingDateTime.year, page.weddingDateTime.month, page.weddingDateTime.day)).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()}</span>
            {time ? <span>· {time}</span> : null}
          </p>
          <p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
        </div>
      </div>
    </section>
  );

  if (theme === 'gyeol') return (
    <section className={`${styles.cover} ${styles.traditional}`} data-cover-position={position} aria-labelledby={titleId}>
      {photo}
      <div className={styles.details} data-wedding-cover-details>
        <div className={styles.traditionalFrame}>
          <p className={styles.traditionalEyebrow}>WEDDING INVITATION</p>
          <div className={styles.traditionalTitle}>
            {!overlay ? heading() : null}
            <p className={styles.conceptIntroduction}>소중한 날에 귀한 걸음으로 함께해 주세요.</p>
          </div>
          {date}<p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
        </div>
      </div>
    </section>
  );

  return (
    <section className={`${styles.cover} ${styles.basic}`} data-cover-position={position} aria-labelledby={titleId}>
      {photo}
      <div className={styles.details} data-wedding-cover-details>
        {!overlay ? heading() : null}
        <p className={styles.basicDate} data-wedding-motion="copy">
          {page.weddingDateTime.year}.{String(page.weddingDateTime.month + 1).padStart(2, '0')}.{String(page.weddingDateTime.day).padStart(2, '0')}
        </p>
        <p className={styles.basicSchedule} data-wedding-motion="copy">
          <span>{new Date(Date.UTC(page.weddingDateTime.year, page.weddingDateTime.month, page.weddingDateTime.day)).toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'UTC' })}</span>
          {time ? <span>{time}</span> : null}
        </p>
        <p className={styles.venue} data-wedding-motion="copy">{page.venue}</p>
      </div>
    </section>
  );
}
